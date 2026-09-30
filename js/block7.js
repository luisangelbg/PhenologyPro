/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 7: irrigation scheduling.
   Reads state.balance (the crop, soil and sowing of Block 6) and state.eto;
   writes state.irrigation: the rule chosen, the calendar of every year, the
   strategies compared, the design figures and the savings. */

(function () {

  const two = (es, en) => L2(es, en);
  const STAGE = { ini: ['Inicial', 'Initial'], dev: ['Desarrollo', 'Development'], mid: ['Media', 'Mid'], late: ['Final', 'Late'] };
  let viewYear = null, systemId = null;

  function ready() { return state.balance && state.balance.params && state.eto && state.eto.daily; }

  function fillSelects() {
    const s = el('b7System'); const cur = s.value;
    s.innerHTML = Irrig7.SYSTEMS.map(x => `<option value="${x.id}">${T(x.es, x.en)} · ${Math.round(x.eff * 100)} %</option>`).join('') + `<option value="custom">${T('— Otra eficiencia —', '— Other efficiency —')}</option>`;
    s.value = cur || 'sprinkler';
  }
  function applySystem() {
    const id = el('b7System').value; if (systemId === id) return;
    systemId = id;
    const s = Irrig7.SYSTEMS.find(x => x.id === id);
    if (s) el('b7Eff').value = s.eff;
  }
  function ruleFromPage() {
    const eff = Math.max(0.2, Math.min(1, parseNum(el('b7Eff').value) || 0.75));
    const mode = el('b7Mode').value;
    const common = { efficiency: eff, stopBefore: Math.max(0, parseNum(el('b7Stop').value) || 0), minInterval: Math.max(1, parseNum(el('b7MinInt').value) || 1), startAfter: Math.max(0, parseNum(el('b7Start').value) || 0) };
    const depthFixed = el('b7Refill').value === 'fixed' ? (parseNum(el('b7Depth').value) || 30) : null;
    if (mode === 'raw') return Object.assign({ mode: 'auto', trigger: 1, depth: depthFixed }, common);
    if (mode === 'deficit') return Object.assign({ mode: 'auto', trigger: Math.max(1, parseNum(el('b7Deficit').value) || 1.3), depth: depthFixed }, common);
    if (mode === 'interval') return Object.assign({ mode: 'interval', interval: Math.max(1, parseNum(el('b7Interval').value) || 7), depth: depthFixed }, common);
    return Object.assign({ mode: 'depth', depth: parseNum(el('b7Depth').value) || 30 }, common);
  }
  function showModeFields() {
    const mode = el('b7Mode').value;
    el('b7DeficitWrap').style.display = mode === 'deficit' ? '' : 'none';
    el('b7IntervalWrap').style.display = mode === 'interval' ? '' : 'none';
    el('b7RefillWrap').style.display = mode === 'depth' ? 'none' : '';
    el('b7DepthWrap').style.display = (mode === 'depth' || el('b7Refill').value === 'fixed') ? '' : 'none';
  }

  function run() {
    if (!ready()) { el('b7Body').style.display = 'none'; el('b7Empty').style.display = ''; return; }
    el('b7Empty').style.display = 'none'; el('b7Body').style.display = '';
    applySystem(); showModeFields();
    const p = Object.assign({}, state.balance.params);
    if (el('b7Presow').checked) p.dr0 = 0;
    const rule = ruleFromPage();
    const rows = state.weather.rows, eto = state.eto.daily;
    const all = Irrig7.runAll(rows, eto, p, rule);
    const eff = rule.efficiency;
    const st = Irrig7.strategies(rows, eto, p, { eff, deficit: Math.max(1, parseNum(el('b7Deficit').value) || 1.3), interval: Math.max(1, parseNum(el('b7Interval').value) || 7), depth: parseNum(el('b7Depth').value) || 30, stopBefore: rule.stopBefore, minInterval: rule.minInterval });
    const mg = Irrig7.monthlyGross(all);
    const capacity = parseNum(el('b7Capacity').value) || 0;
    const des = Irrig7.design(all, p, eff);
    const cust = { interval: parseNum(el('b7CustInt').value) || 10, depth: parseNum(el('b7CustDepth').value) || 40, eff, stopBefore: rule.stopBefore };
    const sav = Irrig7.savings(rows, eto, p, cust, all);
    state.irrigation = { params: p, rule, all, strategies: st, monthly: mg, design: des, savings: sav, capacity, cust };
    if (viewYear == null || !all.years.some(r => r.y === viewYear)) viewYear = all.medianYear;
    renderContext(p);
    renderSummary(p, all, rule, des);
    renderYearPicker(all);
    drawYear(all, p, capacity);
    renderStrategies(st, p);
    renderMonthly(mg);
    renderDesign(des, eff, capacity);
    renderSavings(sav, cust);
    Plots7.years('b7Years', all.years);
    Plots7.strategies('b7Strategies', st);
    Plots7.monthly('b7Monthly', mg);
    Fig.decorate(el('panel-7'));
    el('b7Continue').disabled = !STEPS.find(s => s.n === 8).ready;
    document.dispatchEvent(new CustomEvent('irrigationchange'));
  }

  function renderContext(p) {
    const len = p.L.ini + p.L.dev + p.L.mid + p.L.late;
    el('b7Context').innerHTML = two(`Cultivo <b>${T(p.crop.es, p.crop.en)}</b>, siembra el ${p.d} de ${monthName(p.m)}, ${len} días de ciclo, suelo de ${p.taw} mm/m con raíz hasta ${p.zMax} m (ADT máxima ${fmtMm(p.taw * p.zMax, 0)}, AFA ${fmtMm(p.taw * p.zMax * p.p, 0)} con p = ${p.p}), ETo por ${state.eto.method === 'pm' ? 'Penman–Monteith' : state.eto.method}. Todo eso se cambia en los Bloques 5 y 6.`,
      `Crop <b>${T(p.crop.es, p.crop.en)}</b>, sown on ${monthName(p.m)} ${p.d}, ${len}-day cycle, soil of ${p.taw} mm/m with roots down to ${p.zMax} m (maximum TAW ${fmtMm(p.taw * p.zMax, 0)}, RAW ${fmtMm(p.taw * p.zMax * p.p, 0)} with p = ${p.p}), ETo by ${state.eto.method === 'pm' ? 'Penman–Monteith' : state.eto.method}. All of that is changed in Blocks 5 and 6.`);
  }
  function renderSummary(p, all, rule, des) {
    const s = all.summary;
    if (!s) { el('b7Tiles').innerHTML = ''; el('b7Status').innerHTML = two('Ningún año tiene datos suficientes.', 'No year has enough data.'); return; }
    const gross = Irrig7.statOf(all.years.map(r => r.totals.Igross));
    const tiles = [
      [T('Riegos por temporada', 'Irrigations per season'), `${Math.round(s.events.median)}`, T(`mediana · de ${s.events.min} a ${s.events.max}`, `median · from ${s.events.min} to ${s.events.max}`)],
      [T('Lámina neta', 'Net depth'), fmtMm(s.I.median, 0), T(`P80 ${fmtMm(s.I.p80, 0)} · año seco`, `P80 ${fmtMm(s.I.p80, 0)} · dry year`)],
      [T('Lámina bruta', 'Gross depth'), fmtMm(gross.median, 0), T(`eficiencia ${fmtPct(rule.efficiency, 0)} · P80 ${fmtMm(gross.p80, 0)} = ${fmtNum(gross.p80 * 10, 0)} m³/ha`, `efficiency ${fmtPct(rule.efficiency, 0)} · P80 ${fmtMm(gross.p80, 0)} = ${fmtNum(gross.p80 * 10, 0)} m³/ha`)],
      [T('Rendimiento relativo', 'Relative yield'), fmtPct(s.relYield.median, 0) + Help.tag('kyield', s.relYield.median), T(`P20 ${fmtPct(s.relYield.p20, 0)} · ${Math.round(s.stressDays.median)} días con estrés`, `P20 ${fmtPct(s.relYield.p20, 0)} · ${Math.round(s.stressDays.median)} stress days`), s.relYield.median >= 0.9 ? 'ok' : 'warn'],
      [T('Percolación', 'Percolation'), fmtMm(s.dp.median, 0), T('lluvia sobre suelo lleno y riego de más', 'rain on a full soil and over-irrigation'), s.dp.median > 0.3 * (s.I.median + s.pe.median) ? 'warn' : ''],
      [T('Capacidad de diseño', 'Design capacity'), des.capacity != null ? fmtFixed(des.capacity, 1) + ' mm/d' : '—', des.capacity != null ? T(`ETc máxima P90 ${fmtFixed(des.etcP90, 1)} mm/d ÷ eficiencia = ${fmtNum(des.capacity * 10, 0)} m³/ha/día`, `peak ETc P90 ${fmtFixed(des.etcP90, 1)} mm/d ÷ efficiency = ${fmtNum(des.capacity * 10, 0)} m³/ha/day`) : ''],
    ];
    statTiles('b7Tiles', tiles);
    const MODE = { auto: rule.trigger > 1 ? T(`regando cuando el agotamiento llega al ${Math.round(rule.trigger * 100)} % del AFA`, `irrigating when depletion reaches ${Math.round(rule.trigger * 100)} % of RAW`) : T('regando al agotar el agua fácilmente aprovechable', 'irrigating when the readily available water runs out'), interval: T(`regando cada ${rule.interval} días`, `irrigating every ${rule.interval} days`), depth: T(`regando ${rule.depth} mm netos cuando el suelo los ha gastado`, `applying ${rule.depth} mm net when the soil has spent them`) };
    el('b7Status').innerHTML = T(`Con ${T(p.crop.es, p.crop.en)} sembrado el ${p.d} de ${monthName(p.m)} y ${MODE[rule.mode]}${rule.depth != null && rule.mode !== 'depth' ? ` con láminas de ${rule.depth} mm` : ''}, hacen falta <b>${Math.round(s.events.median)} riegos</b> y <b>${fmtMm(gross.median, 0)} brutos</b> en el año mediano (${fmtMm(gross.p80, 0)} en el seco), que dejan el rendimiento en ${fmtPct(s.relYield.median, 0)}. ${s.events.median === 0 ? 'La lluvia cubre la demanda en el año mediano: el riego solo hará falta en los años secos que muestra la figura de abajo.' : s.dp.median > 20 ? `Se pierden ${fmtMm(s.dp.median, 0)} por percolación: parte es lluvia que cayó sobre un suelo recién regado, inevitable sin pronóstico.` : 'La percolación es baja: el calendario sigue de cerca la demanda.'}`,
      `With ${T(p.crop.es, p.crop.en)} sown on ${monthName(p.m)} ${p.d} and ${MODE[rule.mode]}${rule.depth != null && rule.mode !== 'depth' ? ` with ${rule.depth} mm applications` : ''}, it takes <b>${Math.round(s.events.median)} irrigations</b> and <b>${fmtMm(gross.median, 0)} gross</b> in the median year (${fmtMm(gross.p80, 0)} in the dry one), leaving the yield at ${fmtPct(s.relYield.median, 0)}. ${s.events.median === 0 ? 'Rain covers the demand in the median year: irrigation is only needed in the dry years the figure below shows.' : s.dp.median > 20 ? `${fmtMm(s.dp.median, 0)} are lost to percolation: part is rain that fell on a freshly irrigated soil, unavoidable without a forecast.` : 'Percolation is low: the calendar tracks the demand closely.'}`);
  }
  function renderYearPicker(all) {
    const s = el('b7Year');
    s.innerHTML = all.years.map(r => `<option value="${r.y}">${r.y}${r.y === all.medianYear ? ' · ' + T('mediano', 'median') : ''} · ${r.totals.events} ${T('riegos', 'irr.')} · ${fmtMm(r.totals.Igross, 0)}</option>`).join('');
    s.value = String(viewYear);
  }
  function drawYear(all, p, capacity) {
    const r = all.years.find(x => x.y === viewYear) || null;
    Plots7.calendar('b7Calendar', r, p.L);
    Plots6.depletion('b7Depletion', r);
    const cal = Irrig7.calendar(r, p, capacity);
    const cols = [
      { key: 'n', label: '#', num: true, get: (x, i) => cal.indexOf(x) + 1 },
      { key: 'date', label: T('Fecha', 'Date'), get: x => fmtDate(x.date) }, { key: 'day', label: T('Día del ciclo', 'Day of cycle'), num: true },
      { key: 'stage', label: T('Etapa', 'Stage'), get: x => T(STAGE[x.stage][0], STAGE[x.stage][1]) }, { key: 'interval', label: T('Días desde el anterior', 'Days since last'), num: true, get: x => x.interval == null ? '—' : x.interval },
      { key: 'drBefore', label: T('Agotamiento (mm)', 'Depletion (mm)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'raw', label: 'AFA', num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'net', label: T('Lámina neta', 'Net depth'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'gross', label: T('Lámina bruta', 'Gross depth'), num: true, fmt: v => fmtFixed(v, 1) },
      { key: 'm3', label: 'm³/ha', num: true, get: x => fmtNum(x.gross * 10, 0) },
    ];
    if (capacity > 0) cols.push({ key: 'hours', label: T('Horas de riego', 'Irrigation hours'), num: true, fmt: v => fmtFixed(v, 1) });
    buildTable('b7CalTable', cols, cal);
    el('b7CalNote').innerHTML = r ? two(`${r.y}: ${cal.length} riegos, ${fmtMm(r.totals.I, 0)} netos y ${fmtMm(r.totals.Igross, 0)} brutos; lluvia ${fmtMm(r.totals.P, 0)}; rendimiento relativo ${fmtPct(r.relYield, 0)}. Las fechas son las de ese año; en la práctica el calendario se sigue con el balance al día, no con las fechas fijas.`, `${r.y}: ${cal.length} irrigations, ${fmtMm(r.totals.I, 0)} net and ${fmtMm(r.totals.Igross, 0)} gross; rain ${fmtMm(r.totals.P, 0)}; relative yield ${fmtPct(r.relYield, 0)}. The dates are those of that year; in practice the calendar is followed with the balance kept up to date, not with fixed dates.`) : '';
  }
  function renderStrategies(st, p) {
    buildTable('b7StratTable', [
      { key: 'name', label: T('Estrategia', 'Strategy'), get: s => T(s.es, s.en) },
      { key: 'events', label: T('Riegos', 'Irrigations'), num: true, get: s => s.events ? Math.round(s.events.median) : '—' },
      { key: 'net', label: T('Neta (mm)', 'Net (mm)'), num: true, get: s => s.I ? fmtNum(s.I.median, 0) : '—' },
      { key: 'gross', label: T('Bruta (mm)', 'Gross (mm)'), num: true, get: s => s.gross ? fmtNum(s.gross.median, 0) : '—' },
      { key: 'grossP80', label: T('Bruta año seco', 'Gross dry year'), num: true, get: s => s.gross ? fmtNum(s.gross.p80, 0) : '—' },
      { key: 'ry', label: T('Rend. relativo', 'Rel. yield'), html: true, num: true, get: s => s.relYield ? fmtPct(s.relYield.median, 0) + Help.tag('kyield', s.relYield.median) : '—' },
      { key: 'ry20', label: 'P20', num: true, get: s => s.relYield ? fmtPct(s.relYield.p20, 0) : '—' },
      { key: 'dp', label: T('Percolación', 'Percolation'), num: true, get: s => s.dp ? fmtNum(s.dp.median, 0) : '—' },
      { key: 'def', label: T('Déficit', 'Deficit'), num: true, get: s => s.deficit ? fmtNum(s.deficit.median, 0) : '—' },
    ], st);
    const raw = st.find(s => s.id === 'raw'), none = st.find(s => s.id === 'none'), def = st.find(s => s.id === 'deficit');
    if (raw && none && raw.all.summary && none.all.summary) {
      const gain = raw.relYield.median - none.relYield.median;
      el('b7StratNote').innerHTML = two(`Regar al agotar el AFA sube el rendimiento relativo de ${fmtPct(none.relYield.median, 0)} (temporal) a ${fmtPct(raw.relYield.median, 0)} con ${fmtMm(raw.gross.median, 0)} brutos: ${gain > 0.02 ? `cada 100 mm brutos compran ${fmtPct(gain / raw.gross.median * 100, 0)} de rendimiento` : 'en este sitio la lluvia ya cubre casi toda la demanda y el riego apenas añade'}. ${def && def.all.summary ? (raw.gross.median - def.gross.median >= 0 ? `El déficit controlado ahorra ${fmtMm(raw.gross.median - def.gross.median, 0)} y cuesta ${fmtPct(raw.relYield.median - def.relYield.median, 0)} de rendimiento.` : `El déficit controlado no ahorra aquí: aplica ${fmtMm(def.gross.median - raw.gross.median, 0)} más (riega más tarde y rellena una cubeta más vacía) y cuesta ${fmtPct(raw.relYield.median - def.relYield.median, 0)} de rendimiento.`) : ''} El intervalo fijo y la lámina fija se comparan contra eso: lo que apliquen de más percola, lo que apliquen de menos se paga en estrés.`,
        `Irrigating at RAW depletion raises the relative yield from ${fmtPct(none.relYield.median, 0)} (rain-fed) to ${fmtPct(raw.relYield.median, 0)} with ${fmtMm(raw.gross.median, 0)} gross: ${gain > 0.02 ? `every 100 mm gross buy ${fmtPct(gain / raw.gross.median * 100, 0)} of yield` : 'at this site rain already covers almost the whole demand and irrigation adds little'}. ${def && def.all.summary ? `${raw.gross.median - def.gross.median >= 0 ? `The controlled deficit saves ${fmtMm(raw.gross.median - def.gross.median, 0)} and costs ${fmtPct(raw.relYield.median - def.relYield.median, 0)} of yield.` : `The controlled deficit saves nothing here: it applies ${fmtMm(def.gross.median - raw.gross.median, 0)} more (it irrigates later and refills an emptier bucket) and costs ${fmtPct(raw.relYield.median - def.relYield.median, 0)} of yield.`}` : ''} The fixed interval and the fixed depth are compared against that: what they apply in excess percolates, what they apply short is paid in stress.`);
    }
  }
  function renderMonthly(mg) {
    buildTable('b7MonthTable', [{ key: 'm', label: T('Mes', 'Month'), get: x => monthName(x.m) }, { key: 'median', label: T('Bruta, año mediano (mm)', 'Gross, median year (mm)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'p80', label: T('Año seco (P80)', 'Dry year (P80)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'max', label: T('Máximo', 'Maximum'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'share', label: T('Años con riego', 'Years with irrigation'), num: true, fmt: v => fmtPct(v, 0) }], mg.filter(x => x.max > 0));
  }
  function renderDesign(des, eff, capacity) {
    if (!des.grossSeason) { el('b7Design').innerHTML = ''; return; }
    el('b7Design').innerHTML = `<ul>
      <li>${two(`ETc máxima de la media estación: ${fmtFixed(des.etcP90, 2)} mm/día (P90 de los días entre años; máximo absoluto ${fmtFixed(des.etcMax, 2)}). El sistema debe poder aplicar <b>${fmtFixed(des.capacity, 1)} mm/día brutos</b> = ${fmtNum(des.capacity * 10, 0)} m³/ha/día con ${fmtPct(eff, 0)} de eficiencia${capacity > 0 ? `; el tuyo aplica ${fmtFixed(capacity, 1)} mm/día, ${capacity >= des.capacity ? '<b>suficiente</b>' : '<b>insuficiente en el pico</b>'}` : ''}.`,
        `Peak ETc of the mid-season: ${fmtFixed(des.etcP90, 2)} mm/day (P90 of the days across years; absolute maximum ${fmtFixed(des.etcMax, 2)}). The system must be able to apply <b>${fmtFixed(des.capacity, 1)} mm/day gross</b> = ${fmtNum(des.capacity * 10, 0)} m³/ha/day at ${fmtPct(eff, 0)} efficiency${capacity > 0 ? `; yours applies ${fmtFixed(capacity, 1)} mm/day, ${capacity >= des.capacity ? '<b>enough</b>' : '<b>short at the peak</b>'}` : ''}.`)}</li>
      <li>${two(`Lámina bruta de la temporada para planear: ${fmtMm(des.grossSeason.p80, 0)} (P80, cuatro de cada cinco años bastan) = <b>${fmtNum(des.m3haSeason, 0)} m³/ha</b>; el año mediano pide ${fmtMm(des.grossSeason.median, 0)} y el peor del registro ${fmtMm(des.grossSeason.max, 0)}.`,
        `Gross seasonal depth to plan for: ${fmtMm(des.grossSeason.p80, 0)} (P80, four years out of five suffice) = <b>${fmtNum(des.m3haSeason, 0)} m³/ha</b>; the median year asks ${fmtMm(des.grossSeason.median, 0)} and the worst on record ${fmtMm(des.grossSeason.max, 0)}.`)}</li>
      <li>${two(`Riego más grande del registro: ${fmtMm(des.maxNet, 0)} netos en una sola aplicación; ${Math.round(des.events.p80)} riegos en el año seco.`, `Largest irrigation on record: ${fmtMm(des.maxNet, 0)} net in one application; ${Math.round(des.events.p80)} irrigations in the dry year.`)}</li></ul>`;
  }
  function renderSavings(sav, cust) {
    const box = el('b7Savings');
    if (!sav) { box.innerHTML = ''; return; }
    box.innerHTML = two(`Regando por costumbre cada ${cust.interval} días con ${cust.depth} mm brutos se aplican ${fmtMm(sav.custGross.median, 0)} en ${Math.round(sav.custEvents.median)} riegos, para un rendimiento relativo de ${fmtPct(sav.custYield.median, 0)} y ${fmtMm(sav.custDP.median, 0)} percolados. El calendario por balance aplica ${fmtMm(sav.ruleGross.median, 0)} en ${Math.round(sav.ruleEvents.median)} riegos, con rendimiento de ${fmtPct(sav.ruleYield.median, 0)}: <b>${sav.savedMm >= 0 ? `ahorra ${fmtMm(sav.savedMm, 0)} (${fmtPct(sav.savedPct, 0)})` : `aplica ${fmtMm(-sav.savedMm, 0)} más`}</b> ${sav.ruleYield.median >= sav.custYield.median - 0.005 ? 'sin perder rendimiento' : `perdiendo ${fmtPct(sav.custYield.median - sav.ruleYield.median, 0)} de rendimiento`}.`,
      `Irrigating by habit every ${cust.interval} days with ${cust.depth} mm gross applies ${fmtMm(sav.custGross.median, 0)} in ${Math.round(sav.custEvents.median)} irrigations, for a relative yield of ${fmtPct(sav.custYield.median, 0)} and ${fmtMm(sav.custDP.median, 0)} percolated. The balance calendar applies ${fmtMm(sav.ruleGross.median, 0)} in ${Math.round(sav.ruleEvents.median)} irrigations, with a yield of ${fmtPct(sav.ruleYield.median, 0)}: <b>${sav.savedMm >= 0 ? `it saves ${fmtMm(sav.savedMm, 0)} (${fmtPct(sav.savedPct, 0)})` : `it applies ${fmtMm(-sav.savedMm, 0)} more`}</b> ${sav.ruleYield.median >= sav.custYield.median - 0.005 ? 'without losing yield' : `losing ${fmtPct(sav.custYield.median - sav.ruleYield.median, 0)} of yield`}.`);
  }

  function exportCalendar() {
    const s = state.irrigation; if (!s) return;
    const r = s.all.years.find(x => x.y === viewYear); if (!r) return;
    const cal = Irrig7.calendar(r, s.params, s.capacity);
    const lines = ['n,date,dayOfCycle,stage,daysSinceLast,depletion_mm,RAW_mm,net_mm,gross_mm,m3_ha,hours'].concat(cal.map((x, i) => [i + 1, toISO(x.date), x.day, x.stage, x.interval == null ? '' : x.interval, x.drBefore.toFixed(1), x.raw.toFixed(1), x.net.toFixed(1), x.gross.toFixed(1), (x.gross * 10).toFixed(0), x.hours == null ? '' : x.hours.toFixed(1)].join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + `_calendario_riego_${r.y}.csv`, 'text/csv;charset=utf-8');
  }
  function exportYears() {
    const s = state.irrigation; if (!s) return;
    const lines = ['year,sowing,events,net_mm,gross_mm,rain_mm,effective_mm,percolation_mm,stressDays,relYield'].concat(s.all.years.map(r => [r.y, toISO(r.start), r.totals.events, r.totals.I.toFixed(1), r.totals.Igross.toFixed(1), r.totals.P.toFixed(1), r.totals.Pe.toFixed(1), r.totals.DP.toFixed(1), r.totals.stressDays, r.relYield.toFixed(3)].join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_riego_por_anio.csv', 'text/csv;charset=utf-8');
  }

  function wire() {
    fillSelects();
    el('b7System').addEventListener('change', () => { systemId = null; run(); });
    ['b7Eff', 'b7Mode', 'b7Refill', 'b7Depth', 'b7Deficit', 'b7Interval', 'b7Stop', 'b7Start', 'b7MinInt', 'b7Presow', 'b7Capacity', 'b7CustInt', 'b7CustDepth'].forEach(id => el(id).addEventListener('change', () => { if (id === 'b7Eff') { el('b7System').value = 'custom'; systemId = 'custom'; } run(); }));
    el('b7Year').addEventListener('change', () => { viewYear = +el('b7Year').value; if (state.irrigation) drawYear(state.irrigation.all, state.irrigation.params, state.irrigation.capacity); });
    /* from the button, a long run shows the common waiting window */
    el('b7Run').addEventListener('click', () => { const w = ppWork('Simulando el riego', 'Simulating irrigation'); ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); });
    el('b7ToBalance').addEventListener('click', () => goStep(6));
    el('b7Continue').addEventListener('click', () => goStep(8));
    el('b7ExportCal').addEventListener('click', exportCalendar);
    el('b7ExportYears').addEventListener('click', exportYears);
    document.addEventListener('balancechange', () => { state.irrigation = null; if (document.querySelector('#panel-7.active')) run(); });
    document.addEventListener('weatherchange', () => { state.irrigation = null; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 7 && !state.irrigation) { const w = state.weather ? ppWork('Simulando el riego', 'Simulating irrigation') : null; ppAfterPaint(() => { if (state.weather && !state.eto && window.Block5) Block5.run(); if (state.eto && !state.balance && window.Block6) Block6.run(); run(); if (!ready() && w) w._failed = true; }, w); } });
    document.addEventListener('langchange', () => { fillSelects(); if (document.querySelector('#panel-7.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block7 = { run };
})();
