/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 4: degree-days and thermal time on the site's series.
   Reads state.weather and state.climate, writes state.degreeDays. */

(function () {

  const two = (es, en) => L2(es, en);
  const METHOD_NAMES = { average: ['Promedio', 'Average'], capped: ['Promedio acotado (maíz)', 'Capped average (maize)'], triangle: ['Triángulo simple', 'Single triangle'], sine: ['Seno simple', 'Single sine'], doubleTriangle: ['Triángulo doble', 'Double triangle'], doubleSine: ['Seno doble', 'Double sine'], chu: ['Unidades calor de Ontario', 'Ontario crop heat units'] };
  const CUT_NAMES = { none: ['sin corte', 'no cut-off'], horizontal: ['horizontal', 'horizontal'], intermediate: ['intermedio', 'intermediate'], vertical: ['vertical', 'vertical'] };
  let cropId = null;

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300; }

  function fillCrops() {
    const s = el('b4Crop'); const cur = s.value;
    s.innerHTML = `<option value="custom">${T('— Parámetros propios —', '— Custom parameters —')}</option>` + Crops.LIST.map(c => `<option value="${c.id}">${T(c.es, c.en)}</option>`).join('');
    s.value = cur || 'maize';
  }
  function applyCrop() {
    const c = Crops.byId(el('b4Crop').value);
    if (!c) { cropId = null; return; }
    if (cropId === c.id) return;
    cropId = c.id;
    el('b4Base').value = c.tbase; el('b4Upper').value = c.tupper; el('b4Method').value = c.method || 'average';
    const gm = Crops.gddToMaturity(c);
    el('b4Target').value = gm != null ? gm : '';
    el('b4Season').value = Crops.seasonLength(c);
  }
  function params() {
    const c = Crops.byId(el('b4Crop').value);
    return {
      crop: c, method: el('b4Method').value, base: parseNum(el('b4Base').value) || 0, upper: parseNum(el('b4Upper').value), cutoff: el('b4Cutoff').value,
      m: +el('b4SowM').value, d: Math.max(1, Math.min(31, parseNum(el('b4SowD').value) || 1)),
      target: parseNum(el('b4Target').value), season: Math.max(30, Math.min(400, parseNum(el('b4Season').value) || 150)),
      stopAtFrost: el('b4Frost').checked, frostThr: state.climate && state.climate.fr ? state.climate.fr.threshold : 0,
    };
  }

  function run() {
    if (!ready()) { el('b4Body').style.display = 'none'; el('b4Empty').style.display = ''; return; }
    el('b4Empty').style.display = 'none'; el('b4Body').style.display = '';
    applyCrop();
    const p = params();
    const rows = state.weather.rows;
    const dd = Therm4.daily(rows, p);
    const by = Therm4.byYear(rows, dd, p.m, p.d, { target: p.target, horizon: p.season + 60, season: p.season, stopAtFrost: p.stopAtFrost, frostThr: p.frostThr });
    const med = Therm4.medianCurve(by.years);
    const map = Therm4.sowingMap(rows, dd, { step: 5, season: p.season, target: p.target, stopAtFrost: p.stopAtFrost, frostThr: p.frostThr });
    const months = Therm4.monthly(rows, dd);
    const ann = Therm4.annual(rows, dd);
    const midYear = by.years.length ? by.years[Math.floor(by.years.length / 2)] : null;
    const cmp = midYear ? Therm4.compareMethods(rows, midYear.i0, p.season, p.base, p.upper == null ? 30 : p.upper) : null;
    state.degreeDays = { params: p, dd, by, med, map, months, annual: ann, cmp, cmpYear: midYear ? midYear.y : null };
    renderSummary(p, by, months, ann);
    renderYears(p, by);
    renderCalendar(months);
    renderMap(p, map);
    renderMethods(p, cmp);
    Plots4.spaghetti('b4Spaghetti', by, med, { target: p.target, stages: p.crop && p.crop.stages ? p.crop.stages : null, stopAtFrost: p.stopAtFrost });
    Plots4.calendar('b4Calendar', months, p.base);
    Plots4.sowingTotals('b4MapTotals', map, p.target, p.season);
    Plots4.sowingDays('b4MapDays', map);
    Plots4.yearly('b4Yearly', ann);
    if (cmp) Plots4.methods('b4Methods', cmp);
    Fig.decorate(el('panel-4'));
    document.dispatchEvent(new CustomEvent('gddchange'));
  }

  function renderSummary(p, by, months, ann) {
    const totYear = ann.length ? Stat.mean(ann.map(a => a.total)) : null;
    const unit = p.method === 'chu' ? 'CHU' : '°C·d';
    const tiles = [
      [T('°C·d por año', `${unit} per year`), totYear != null ? fmtNum(totYear, 0) : '—', T(`base ${fmtTemp(p.base, 1)} · ${T(METHOD_NAMES[p.method][0], METHOD_NAMES[p.method][1])}`, `base ${fmtTemp(p.base, 1)} · ${T(METHOD_NAMES[p.method][0], METHOD_NAMES[p.method][1])}`)],
      [T('Mes más cálido', 'Warmest month'), (() => { const best = months.reduce((a, b) => (b.perDay != null && (a.perDay == null || b.perDay > a.perDay) ? b : a), months[0]); return best.perDay != null ? `${monthName(best.m, true)} · ${fmtFixed(best.perDay, 1)}` : '—'; })(), T(`${unit} por día en promedio`, `${unit} per day on average`)],
      [T(`Días a la meta`, 'Days to the target'), by.days ? `${Math.round(by.days.median)}` : '—', by.days ? T(`mediana · P20 ${Math.round(by.days.p20)} · P80 ${Math.round(by.days.p80)} · ${by.days.n} años`, `median · P20 ${Math.round(by.days.p20)} · P80 ${Math.round(by.days.p80)} · ${by.days.n} years`) : (p.target ? T('no se alcanza', 'not reached') : T('sin meta', 'no target')), by.days ? '' : (p.target ? 'bad' : '')],
      [T('Años que la alcanzan', 'Years reaching it'), by.pReached != null && p.target ? fmtPct(by.pReached, 0) : '—', p.target ? T(`sembrando el ${p.d} de ${monthName(p.m)}${p.stopAtFrost ? '; ' + by.frostEnded + ' cortados por helada' : ''}`, `sowing on ${monthName(p.m)} ${p.d}${p.stopAtFrost ? '; ' + by.frostEnded + ' cut by frost' : ''}`) : '', by.pReached != null && p.target ? (by.pReached >= 0.8 ? 'ok' : by.pReached >= 0.5 ? 'warn' : 'bad') : ''],
      [T(`${unit} en la temporada`, `${unit} in the season`), by.total ? fmtNum(by.total.median, 0) : '—', by.total ? T(`${p.season} días · CV entre años ${fmtPct(by.total.cv, 0)}`, `${p.season} days · CV between years ${fmtPct(by.total.cv, 0)}`) : ''],
    ];
    statTiles('b4Tiles', tiles);
    const st = el('b4Status');
    if (!by.years.length) { st.innerHTML = two('No hay ningún año con datos suficientes después de esa fecha.', 'No year has enough data after that date.'); return; }
    let msg = '';
    if (p.target && by.days) {
      const spread = by.days.p80 - by.days.p20;
      msg = T(`Sembrando el <b>${p.d} de ${monthName(p.m)}</b>, ${p.crop ? T(p.crop.es, p.crop.en) : T('el cultivo', 'the crop')} junta sus ${fmtNum(p.target, 0)} ${unit} en <b>${Math.round(by.days.median)} días</b> en el año mediano, pero entre ${Math.round(by.days.p20)} y ${Math.round(by.days.p80)} en el 60 % central de los años: ${spread > 25 ? 'una diferencia de ' + Math.round(spread) + ' días que la fecha de cosecha tiene que absorber.' : 'una variación manejable.'} ${by.pReached < 1 ? `En ${fmtPct(1 - by.pReached, 0)} de los años la meta no se alcanzó${p.stopAtFrost ? ' antes de la helada o del fin del registro' : ' en la ventana revisada'}.` : 'Todos los años la alcanzaron.'}`,
        `Sowing on <b>${monthName(p.m)} ${p.d}</b>, ${p.crop ? T(p.crop.es, p.crop.en) : 'the crop'} gathers its ${fmtNum(p.target, 0)} ${unit} in <b>${Math.round(by.days.median)} days</b> in the median year, but between ${Math.round(by.days.p20)} and ${Math.round(by.days.p80)} in the central 60 % of years: ${spread > 25 ? 'a difference of ' + Math.round(spread) + ' days that the harvest date has to absorb.' : 'a manageable variation.'} ${by.pReached < 1 ? `In ${fmtPct(1 - by.pReached, 0)} of the years the target was not reached${p.stopAtFrost ? ' before the frost or the end of the record' : ' within the window checked'}.` : 'Every year reached it.'}`);
    } else if (p.target) msg = T(`Desde el ${p.d} de ${monthName(p.m)} ningún año junta los ${fmtNum(p.target, 0)} ${unit} en ${p.season + 60} días${p.stopAtFrost ? ' antes de la helada' : ''}: el sitio es demasiado frío para ese cultivo en esa fecha, o la meta está mal escrita.`, `From ${monthName(p.m)} ${p.d} no year gathers the ${fmtNum(p.target, 0)} ${unit} in ${p.season + 60} days${p.stopAtFrost ? ' before the frost' : ''}: the site is too cold for that crop on that date, or the target is mistyped.`);
    else msg = T(`Sin meta térmica, la app reporta lo que ofrece la temporada de ${p.season} días desde el ${p.d} de ${monthName(p.m)}: ${fmtNum(by.total.median, 0)} ${unit} en el año mediano.`, `Without a thermal target, the app reports what the ${p.season}-day season from ${monthName(p.m)} ${p.d} offers: ${fmtNum(by.total.median, 0)} ${unit} in the median year.`);
    st.innerHTML = msg;
  }

  function renderYears(p, by) {
    const marks = [30, 60, 90, 120];
    const cols = [{ key: 'y', label: T('Año', 'Year') }].concat(marks.map(m => ({ key: 'at' + m, label: T(`${m} d`, `${m} d`), num: true, get: r => r.at[m] == null ? '—' : fmtNum(r.at[m], 0) })));
    cols.push({ key: 'total', label: T(`Total (${p.season} d)`, `Total (${p.season} d)`), num: true, get: r => (r.seasonComplete ? '' : '≥ ') + fmtNum(r.seasonTotal, 0) });
    if (p.target) {
      cols.push({ key: 'days', label: T('Días a la meta', 'Days to target'), num: true, get: r => r.days == null ? (r.frostAt != null ? T('helada', 'frost') : r.truncated ? T('sin datos', 'no data') : T('no', 'no')) : Math.round(r.days) });
      cols.push({ key: 'date', label: T('Fecha de la meta', 'Target date'), get: r => r.days == null ? '—' : fmtDate(addDays({ y: r.y, m: p.m, d: p.d }, Math.max(0, Math.ceil(r.days - 1e-9) - 1)), true) });
    }
    if (p.stopAtFrost) cols.push({ key: 'frostAt', label: T('Helada a los', 'Frost at'), num: true, get: r => r.frostAt == null ? '—' : plural(r.frostAt, T('día', 'day'), T('días', 'days')) });
    cols.push({ key: 'missing', label: T('Días sin dato', 'Missing days'), num: true });
    buildTable('b4Years', cols, by.years.map(r => Object.assign({}, r, { _class: r.days == null && p.target ? 'row-flag' : '' })), { scroll: true });
  }

  function renderCalendar(months) {
    buildTable('b4CalTable', [
      { key: 'm', label: T('Mes', 'Month'), get: r => monthName(r.m) },
      { key: 'perDay', label: T('°C·d por día', '°C·d per day'), num: true, fmt: v => fmtFixed(v, 2) },
      { key: 'perDayP20', label: 'P20', num: true, fmt: v => fmtFixed(v, 2) }, { key: 'perDayP80', label: 'P80', num: true, fmt: v => fmtFixed(v, 2) },
      { key: 'perMonth', label: T('Total del mes', 'Month total'), num: true, fmt: v => fmtNum(v, 0) },
      { key: 'n', label: T('Años', 'Years'), num: true },
    ], months);
  }

  function renderMap(p, map) {
    const rows = map.rows.filter(r => r.n > 0);
    const cols = [
      { key: 'J', label: T('Siembra', 'Sowing'), get: r => fmtDoy(r.J) },
      { key: 't', label: T(`°C·d en ${p.season} d (mediana)`, `°C·d in ${p.season} d (median)`), num: true, get: r => r.total ? fmtNum(r.total.median, 0) : '—' },
      { key: 't20', label: 'P20', num: true, get: r => r.total ? fmtNum(r.total.p20, 0) : '—' },
      { key: 't80', label: 'P80', num: true, get: r => r.total ? fmtNum(r.total.p80, 0) : '—' },
    ];
    if (p.target) {
      cols.push({ key: 'd', label: T('Días a la meta', 'Days to target'), num: true, get: r => r.days ? Math.round(r.days.median) : '—' });
      cols.push({ key: 'd2080', label: 'P20–P80', get: r => r.days ? `${Math.round(r.days.p20)}–${Math.round(r.days.p80)}` : '—' });
      cols.push({ key: 'pr', label: T('Años que la alcanzan', 'Years reaching it'), html: true, get: r => r.pReached == null ? '—' : `${fmtPct(r.pReached, 0)} ${r.pReached >= 0.8 ? '<span class="help-tag good">✓</span>' : r.pReached >= 0.5 ? '<span class="help-tag warn">~</span>' : '<span class="help-tag bad">✗</span>'}` });
    }
    cols.push({ key: 'n', label: T('Años', 'Years'), num: true });
    buildTable('b4MapTable', cols, rows.filter((_, i) => i % 2 === 0), { scroll: true });
    const note = el('b4MapNote');
    if (map.best) note.innerHTML = two(`La fecha que madura más rápido con al menos 80 % de los años alcanzando la meta es el <b>${fmtDoy(map.best.J)}</b> (${Math.round(map.best.days.median)} días en la mediana, ${fmtPct(map.best.pReached, 0)} de los años). El Bloque 9 cruzará este mapa con las heladas y el agua para dar la ventana de siembra completa.`,
      `The date that matures fastest with at least 80 % of the years reaching the target is <b>${fmtDoy(map.best.J)}</b> (${Math.round(map.best.days.median)} days at the median, ${fmtPct(map.best.pReached, 0)} of years). Block 9 will cross this map with frost and water to give the full sowing window.`);
    else if (p.target) note.innerHTML = two('Ninguna fecha alcanza la meta en al menos 80 % de los años dentro de la temporada elegida. Alarga la temporada, revisa la meta o considera un cultivar más precoz.', 'No date reaches the target in at least 80 % of the years within the chosen season. Lengthen the season, check the target or consider an earlier cultivar.');
    else note.innerHTML = two('Escribe una meta térmica para ver los días a madurez por fecha de siembra.', 'Type a thermal target to see the days to maturity by sowing date.');
  }

  function renderMethods(p, cmp) {
    if (!cmp) { el('b4MethodsTable').innerHTML = ''; return; }
    const cuts = ['none', 'horizontal', 'intermediate', 'vertical'];
    buildTable('b4MethodsTable', [{ key: 'method', label: T('Método', 'Method'), get: r => T(METHOD_NAMES[r.method][0], METHOD_NAMES[r.method][1]) }].concat(cuts.map(c => ({ key: c, label: T(CUT_NAMES[c][0], CUT_NAMES[c][1]), num: true, get: r => r[c] == null ? '—' : fmtNum(r[c], 0) }))), cmp.rows);
    const ref = cmp.rows.find(r => r.method === p.method);
    const refVal = ref ? ref[p.cutoff === 'none' ? 'none' : p.cutoff] : null;
    const all = cmp.rows.flatMap(r => cuts.map(c => r[c])).filter(v => v != null);
    el('b4MethodsNote').innerHTML = two(`Temporada de ${cmp.n} días del año ${state.degreeDays.cmpYear}, base ${fmtTemp(p.base, 1)} y umbral ${fmtTemp(p.upper == null ? 30 : p.upper, 1)}. Entre el método más bajo y el más alto hay ${fmtNum(Math.max(...all) - Math.min(...all), 0)} °C·d (${fmtPct((Math.max(...all) - Math.min(...all)) / Math.min(...all), 0)}): esa es la razón de usar siempre el método con que se publicó el requerimiento. Las unidades calor de Ontario de la misma temporada: ${fmtNum(cmp.chu, 0)} CHU.${refVal != null ? ` Tu elección actual da ${fmtNum(refVal, 0)}.` : ''}`,
      `A ${cmp.n}-day season of ${state.degreeDays.cmpYear}, base ${fmtTemp(p.base, 1)} and threshold ${fmtTemp(p.upper == null ? 30 : p.upper, 1)}. Between the lowest and the highest method there are ${fmtNum(Math.max(...all) - Math.min(...all), 0)} °C·d (${fmtPct((Math.max(...all) - Math.min(...all)) / Math.min(...all), 0)}): that is why the method the requirement was published with must always be used. The Ontario heat units of the same season: ${fmtNum(cmp.chu, 0)} CHU.${refVal != null ? ` Your current choice gives ${fmtNum(refVal, 0)}.` : ''}`);
  }

  function wire() {
    fillCrops();
    const months = el('b4SowM'); months.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); months.value = '4';
    el('b4Crop').addEventListener('change', () => { cropId = null; run(); });
    ['b4Method', 'b4Cutoff', 'b4Base', 'b4Upper', 'b4SowM', 'b4SowD', 'b4Target', 'b4Season', 'b4Frost'].forEach(id => el(id).addEventListener('change', run));
    el('b4Run').addEventListener('click', run);
    el('b4ToData').addEventListener('click', () => goStep(2));
    el('b4Continue').addEventListener('click', () => goStep(5));
    el('b4ExportYears').addEventListener('click', () => {
      const s = state.degreeDays; if (!s) return;
      const head = ['year', 'gdd30', 'gdd60', 'gdd90', 'gdd120', 'total', 'daysToTarget', 'frostAt', 'missing'];
      const lines = [head.join(',')].concat(s.by.years.map(r => [r.y, r.at[30], r.at[60], r.at[90], r.at[120], r.total, r.days == null ? '' : r.days.toFixed(1), r.frostAt == null ? '' : r.frostAt, r.missing].map(v => v == null ? '' : (typeof v === 'number' ? +v.toFixed(1) : v)).join(',')));
      download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_grados_dia.csv', 'text/csv;charset=utf-8');
    });
    el('b4ExportMap').addEventListener('click', () => {
      const s = state.degreeDays; if (!s) return;
      const lines = ['sowingDoy,sowingDate,gddMedian,gddP20,gddP80,daysMedian,daysP20,daysP80,pReached,years'].concat(s.map.rows.map(r => [r.J, fmtDoy(r.J), r.total ? r.total.median.toFixed(0) : '', r.total ? r.total.p20.toFixed(0) : '', r.total ? r.total.p80.toFixed(0) : '', r.days ? r.days.median.toFixed(1) : '', r.days ? r.days.p20.toFixed(1) : '', r.days ? r.days.p80.toFixed(1) : '', r.pReached == null ? '' : r.pReached.toFixed(2), r.n].join(',')));
      download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_mapa_siembra.csv', 'text/csv;charset=utf-8');
    });
    document.addEventListener('weatherchange', () => { state.degreeDays = null; if (document.querySelector('#panel-4.active')) run(); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 4 && !state.degreeDays) run(); });
    document.addEventListener('langchange', () => { fillCrops(); const m = el('b4SowM'); const v = m.value; m.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); m.value = v; if (document.querySelector('#panel-4.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block4 = { run };
})();
