/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 8: phenology on the site's series.
   Reads state.weather, state.site and (if present) the thermal parameters of
   Block 4; writes state.phenology: the stage calendar, the calibration, the
   winter chill and the photoperiod. */

(function () {

  const two = (es, en) => L2(es, en);
  const METHOD_NAMES = { average: ['Promedio', 'Average'], capped: ['Promedio acotado', 'Capped average'], triangle: ['Triángulo', 'Triangle'], sine: ['Seno', 'Sine'], doubleTriangle: ['Triángulo doble', 'Double triangle'], doubleSine: ['Seno doble', 'Double sine'] };
  let cropId = null, stages = [], calRes = null, chillCache = null;

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300; }

  function fillSelects() {
    const c = el('b8Crop'); const cur = c.value;
    c.innerHTML = Crops.LIST.map(x => `<option value="${x.id}">${T(x.es, x.en)}</option>`).join(''); c.value = cur || 'maize';
    const m = el('b8SowM'); const curM = m.value; m.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); m.value = curM || '5';
    ['b8ChillStart', 'b8ChillEnd'].forEach(id => { const s = el(id); const v = s.value; s.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); if (v) s.value = v; });
  }
  function applyCrop() {
    const c = Crops.byId(el('b8Crop').value); if (!c || cropId === c.id) return;
    cropId = c.id;
    el('b8Base').value = c.tbase; el('b8Upper').value = c.tupper; el('b8Method').value = c.method || 'average';
    stages = (c.stages || []).map(s => ({ code: s.code, es: s.es, en: s.en, gdd: s.gdd }));
    if (!stages.length) stages = [{ code: '61', es: 'Floración', en: 'Flowering', gdd: 600 }, { code: '89', es: 'Madurez', en: 'Maturity', gdd: 1200 }];
    renderStageEditor();
    /* the chill requirement of the deciduous crops */
    if (c.chill) { el('b8ChillUnit').value = 'cp'; el('b8ChillReq').value = Math.round((c.chill.cp[0] + c.chill.cp[1]) / 2); el('b8ChillNote').innerHTML = two(`${T(c.es, c.en)}: ${c.chill.cp[0]}–${c.chill.cp[1]} porciones (${c.chill.utah[0]}–${c.chill.utah[1]} unidades Utah, ${c.chill.hours[0]}–${c.chill.hours[1]} horas frío) según el cultivar; se toma el centro del rango.`, `${T(c.es, c.en)}: ${c.chill.cp[0]}–${c.chill.cp[1]} portions (${c.chill.utah[0]}–${c.chill.utah[1]} Utah units, ${c.chill.hours[0]}–${c.chill.hours[1]} chill hours) depending on the cultivar; the middle of the range is taken.`); }
    else el('b8ChillNote').innerHTML = two('Este cultivo no necesita frío invernal; el cálculo sirve igual para saber qué frutales caducifolios podrían prosperar en el sitio.', 'This crop needs no winter chill; the computation still says which deciduous fruit trees could thrive at the site.');
  }
  function renderStageEditor() {
    const box = el('b8Stages');
    box.innerHTML = `<div class="table-scroll"><table class="grid-table"><thead><tr><th>BBCH</th><th class="grid-wide">${T('Etapa', 'Stage')}</th><th>°C·d</th><th></th></tr></thead><tbody>` +
      stages.map((s, i) => `<tr><td><input data-k="code" data-i="${i}" aria-label="${esc(T('Código BBCH de la etapa ', 'BBCH code of stage ') + (i + 1))}" value="${esc(s.code)}" style="width:70px"></td><td><input data-k="name" data-i="${i}" aria-label="${esc(T('Nombre de la etapa ', 'Name of stage ') + (i + 1))}" value="${esc(T(s.es, s.en))}"></td><td><input data-k="gdd" data-i="${i}" aria-label="${esc(T('Grados-día de la etapa ', 'Degree-days of stage ') + (i + 1))}" type="number" step="10" value="${s.gdd}" style="width:90px"></td><td><button class="btn btn-ghost btn-sm" data-del="${i}">✕</button></td></tr>`).join('') +
      `</tbody></table></div><div class="btn-row"><button class="btn btn-secondary btn-sm" id="b8AddStage">${T('+ Etapa', '+ Stage')}</button><button class="btn btn-ghost btn-sm" id="b8ResetStages">${T('↻ Las del catálogo', '↻ Catalogue values')}</button></div>`;
    box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => { const i = +inp.dataset.i, k = inp.dataset.k; if (k === 'gdd') stages[i].gdd = parseNum(inp.value) || 0; else if (k === 'code') stages[i].code = inp.value.trim(); else { stages[i].es = inp.value.trim(); stages[i].en = inp.value.trim(); } stages.sort((a, b) => a.gdd - b.gdd); renderStageEditor(); run(); }));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => { stages.splice(+b.dataset.del, 1); renderStageEditor(); run(); }));
    el('b8AddStage').addEventListener('click', () => { stages.push({ code: '', es: T('Nueva etapa', 'New stage'), en: 'New stage', gdd: (stages.length ? stages[stages.length - 1].gdd : 0) + 100 }); renderStageEditor(); run(); });
    el('b8ResetStages').addEventListener('click', () => { cropId = null; applyCrop(); run(); });
  }
  function params() {
    return { method: el('b8Method').value, base: parseNum(el('b8Base').value) || 0, upper: parseNum(el('b8Upper').value), cutoff: el('b8Cutoff').value, m: +el('b8SowM').value, d: Math.max(1, Math.min(31, parseNum(el('b8SowD').value) || 1)) };
  }

  function run() {
    if (!ready()) { el('b8Body').style.display = 'none'; el('b8Empty').style.display = ''; return; }
    el('b8Empty').style.display = 'none'; el('b8Body').style.display = '';
    applyCrop();
    const p = params();
    const rows = state.weather.rows, site = state.site || { lat: 20 };
    const dd = Therm4.daily(rows, p);
    const res = Pheno8.stagesByYear(rows, dd, p.m, p.d, stages, p);
    const sowJ = doy(2025, p.m, p.d);
    const ph = Pheno8.photoperiod(site.lat);
    state.phenology = Object.assign(state.phenology || {}, { params: p, stages: stages.map(s => Object.assign({}, s)), res, sowJ, photoperiod: ph, crop: el('b8Crop').value });
    renderStagesSummary(p, res, sowJ);
    Plots8.calendar('b8Calendar', res, sowJ);
    Plots8.years('b8Years', res, sowJ);
    renderCalibration(rows, p);
    runChill();
    renderPhotoperiod(ph, res, sowJ, site);
    Fig.decorate(el('panel-8'));
    el('b8Continue').disabled = !STEPS.find(s => s.n === 9).ready;
    document.dispatchEvent(new CustomEvent('phenologychange'));
  }

  function renderStagesSummary(p, res, sowJ) {
    const last = res.summary[res.summary.length - 1];
    const flowering = res.summary.find(s => /^6/.test(s.code)) || res.summary[Math.floor(res.summary.length / 2)];
    const tiles = [
      [T('Años simulados', 'Years simulated'), String(res.years.length), T(`siembra el ${p.d} de ${monthName(p.m)} · base ${fmtTemp(p.base, 1)} · ${T(METHOD_NAMES[p.method][0], METHOD_NAMES[p.method][1])}`, `sown ${monthName(p.m)} ${p.d} · base ${fmtTemp(p.base, 1)} · ${T(METHOD_NAMES[p.method][0], METHOD_NAMES[p.method][1])}`)],
      flowering ? [T(`${flowering.code} · ${T(flowering.es, flowering.en)}`, `${flowering.code} · ${T(flowering.es, flowering.en)}`), flowering.median != null ? fmtDoy(sowJ + flowering.median) : '—', flowering.median != null ? T(`${Math.round(flowering.median)} días · del ${fmtDoy(sowJ + flowering.p20)} al ${fmtDoy(sowJ + flowering.p80)}`, `${Math.round(flowering.median)} days · from ${fmtDoy(sowJ + flowering.p20)} to ${fmtDoy(sowJ + flowering.p80)}`) : T('no se alcanza', 'not reached')] : null,
      last ? [T(`${last.code} · ${T(last.es, last.en)}`, `${last.code} · ${T(last.es, last.en)}`), last.median != null ? fmtDoy(sowJ + last.median) : '—', last.median != null ? T(`${Math.round(last.median)} días · P20 ${Math.round(last.p20)} · P80 ${Math.round(last.p80)} · ${fmtPct(last.pReached, 0)} de los años`, `${Math.round(last.median)} days · P20 ${Math.round(last.p20)} · P80 ${Math.round(last.p80)} · ${fmtPct(last.pReached, 0)} of years`) : T('no se alcanza', 'not reached'), last.pReached >= 0.8 ? 'ok' : 'bad'] : null,
      [T('Dispersión de la madurez', 'Spread of maturity'), last && last.sd != null ? `± ${fmtFixed(last.sd, 0)} d` : '—', T('desviación estándar entre años', 'standard deviation between years')],
    ].filter(Boolean);
    statTiles('b8Tiles', tiles);
    buildTable('b8StageTable', [
      { key: 'code', label: 'BBCH' }, { key: 'name', label: T('Etapa', 'Stage'), get: s => T(s.es, s.en) }, { key: 'gdd', label: '°C·d', num: true, fmt: v => fmtNum(v, 0) },
      { key: 'median', label: T('Fecha mediana', 'Median date'), get: s => s.median == null ? '—' : fmtDoy(sowJ + s.median) },
      { key: 'das', label: T('Días desde la siembra', 'Days from sowing'), num: true, get: s => s.median == null ? '—' : Math.round(s.median) },
      { key: 'p20', label: T('Más temprana (P20)', 'Earliest (P20)'), get: s => s.p20 == null ? '—' : fmtDoy(sowJ + s.p20) }, { key: 'p80', label: T('Más tardía (P80)', 'Latest (P80)'), get: s => s.p80 == null ? '—' : fmtDoy(sowJ + s.p80) },
      { key: 'sd', label: T('± días', '± days'), num: true, get: s => s.sd == null ? '—' : fmtFixed(s.sd, 0) },
      { key: 'pReached', label: T('Años que la alcanzan', 'Years reaching it'), html: true, num: true, get: s => s.pReached == null ? '—' : fmtPct(s.pReached, 0) + (s.pReached >= 0.8 ? ' <span class="help-tag good">✓</span>' : ' <span class="help-tag bad">✗</span>') },
    ], res.summary);
    buildTable('b8YearTable', [{ key: 'y', label: T('Año', 'Year') }].concat(res.summary.map((s, k) => ({ key: 'st' + k, label: s.code, get: r => r.stages[k].das == null ? '—' : fmtDate(r.stages[k].date, true) }))).concat([{ key: 'missing', label: T('Días sin dato', 'Missing days'), num: true }]), res.years, { scroll: true });
    const crop = Crops.byId(el('b8Crop').value);
    el('b8Status').innerHTML = two(`Los requerimientos del catálogo son <b>orientativos</b>${crop && crop.photoperiod ? ' y este cultivo además responde al fotoperiodo, así que la floración se mueve con la fecha de siembra aunque el calor sea el mismo' : ''}. Con dos o tres años de fechas observadas, la sección 3 los recalcula para tu cultivar y tu sitio.`,
      `The catalogue requirements are <b>orientative</b>${crop && crop.photoperiod ? ' and this crop also responds to photoperiod, so flowering shifts with the sowing date even when heat is the same' : ''}. With two or three years of observed dates, section 3 recomputes them for your cultivar and site.`);
  }

  /* ---------------- calibration ---------------- */
  function renderCalibration(rows, p) {
    const text = el('b8Obs').value;
    const parsed = Pheno8.parseObservations(text);
    const msg = el('b8CalMsg'); clearMessages(msg);
    if (!parsed.obs.length) { calRes = null; el('b8CalTable').innerHTML = ''; el('b8CalApply').disabled = true; Plots8.calibration('b8CalChart', null); Plots8.baseSearch('b8BaseChart', null); if (text.trim()) showMessage(msg, 'warning', two('No se pudo leer ninguna línea. Formato: año; etapa; fecha (por ejemplo 2019; 65; 25/07/2019).', 'No line could be read. Format: year; stage; date (for instance 2019; 65; 25/07/2019).')); return; }
    if (parsed.bad.length) showMessage(msg, 'warning', two(`Líneas ilegibles: ${parsed.bad.join(', ')}.`, `Unreadable lines: ${parsed.bad.join(', ')}.`));
    calRes = Pheno8.calibrate(rows, parsed.obs, p);
    state.phenology.calibration = calRes;
    const codeName = code => { const s = stages.find(x => x.code === code); return s ? T(s.es, s.en) : ''; };
    buildTable('b8CalTable', [
      { key: 'code', label: 'BBCH' }, { key: 'name', label: T('Etapa', 'Stage'), get: r => codeName(r.code) }, { key: 'n', label: T('Años', 'Years'), num: true },
      { key: 'cat', label: T('Catálogo (°C·d)', 'Catalogue (°C·d)'), num: true, get: r => { const s = stages.find(x => x.code === r.code); return s ? fmtNum(s.gdd, 0) : '—'; } },
      { key: 'mean', label: T('Observado (media)', 'Observed (mean)'), num: true, fmt: v => fmtNum(v, 0) }, { key: 'min', label: T('Mín.', 'Min'), num: true, fmt: v => fmtNum(v, 0) }, { key: 'max', label: T('Máx.', 'Max'), num: true, fmt: v => fmtNum(v, 0) },
      { key: 'cv', label: T('CV', 'CV'), html: true, num: true, get: r => r.cv == null ? '—' : fmtPct(r.cv, 1) + Help.tag('calibration', r.cv) },
      { key: 'daysMean', label: T('Días (media)', 'Days (mean)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'daysCv', label: T('CV en días', 'CV in days'), num: true, get: r => r.daysCv == null ? '—' : fmtPct(r.daysCv, 1) },
    ], calRes.stages);
    Plots8.calibration('b8CalChart', calRes);
    Plots8.baseSearch('b8BaseChart', calRes.baseSearch);
    el('b8CalApply').disabled = !calRes.stages.length;
    const bs = calRes.baseSearch;
    showMessage(msg, 'info', two(`${calRes.used} observaciones de ${calRes.n} leídas. ${bs && bs.best ? `Con la etapa ${bs.code} (${bs.n} años), el tiempo térmico varía menos entre años con base <b>${fmtTemp(bs.best.base, 1)}</b> (CV ${fmtPct(bs.best.cv, 1)}) frente a ${fmtPct(bs.curve.find(c => near(c.base, p.base)) ? bs.curve.find(c => near(c.base, p.base)).cv : NaN, 1)} con la base actual de ${fmtTemp(p.base, 1)}; ${Math.abs(bs.best.base - p.base) >= 1 ? 'considera cambiarla' : 'la actual es adecuada'}.` : 'Con tres o más años de una misma etapa la app busca además la temperatura base que minimiza la variación entre años (Arnold 1959).'} El CV en °C·d comparado con el CV en días dice si el tiempo térmico explica la fenología mejor que el calendario.`,
      `${calRes.used} observations of ${calRes.n} read. ${bs && bs.best ? `With stage ${bs.code} (${bs.n} years), thermal time varies least between years at base <b>${fmtTemp(bs.best.base, 1)}</b> (CV ${fmtPct(bs.best.cv, 1)}) against ${fmtPct(bs.curve.find(c => near(c.base, p.base)) ? bs.curve.find(c => near(c.base, p.base)).cv : NaN, 1)} at the current base of ${fmtTemp(p.base, 1)}; ${Math.abs(bs.best.base - p.base) >= 1 ? 'consider changing it' : 'the current one is adequate'}.` : 'With three or more years of the same stage the app also searches the base temperature that minimises the variation between years (Arnold 1959).'} The CV in °C·d compared with the CV in days says whether thermal time explains phenology better than the calendar.`));
  }
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  function applyCalibration(withBase) {
    if (!calRes) return;
    if (withBase && calRes.baseSearch && calRes.baseSearch.best) { el('b8Base').value = calRes.baseSearch.best.base; const p = params(); calRes = Pheno8.calibrate(state.weather.rows, Pheno8.parseObservations(el('b8Obs').value).obs, p); }
    calRes.stages.forEach(s => { const st = stages.find(x => x.code === s.code); if (st) st.gdd = Math.round(s.mean); else stages.push({ code: s.code, es: T('Observada', 'Observed'), en: 'Observed', gdd: Math.round(s.mean) }); });
    stages.sort((a, b) => a.gdd - b.gdd);
    renderStageEditor();
    run();
    notice('b8CalMsg', 'success', two('Requerimientos actualizados con las observaciones; el calendario de arriba ya los usa. El informe dirá que fueron calibrados localmente.', 'Requirements updated with the observations; the calendar above already uses them. The report will say they were calibrated locally.'));
  }
  function loadExampleObs() {
    if (!state.phenology || !state.phenology.res) return;
    const codes = stages.filter(s => s.gdd > 0).map(s => s.code).filter((_, i, a) => i === Math.floor(a.length / 2) || i === a.length - 1);
    /* every other year, both stages: enough for the workflow, not so many that it looks like a real record */
    const obs = Pheno8.exampleObservations(state.phenology.res, codes, 5).filter((_, i) => Math.floor(i / codes.length) % 2 === 0);
    el('b8Obs').value = '# año; etapa BBCH; fecha observada\n' + obs.map(o => `${o.y}; ${o.code}; ${o.date.d}/${o.date.m}/${o.date.y}`).join('\n');
    run();
    notice('b8CalMsg', 'warning', two('Estas fechas son de ejemplo: salen del propio modelo con unos días de ruido, solo para enseñar el flujo de calibración. Sustitúyelas por tus observaciones de campo.', 'These dates are an example: they come from the model itself with a few days of noise, only to show the calibration workflow. Replace them with your field observations.'));
  }

  /* ---------------- chill ---------------- */
  function runChill() {
    const rows = state.weather.rows, site = state.site || { lat: 20 };
    const startM = +el('b8ChillStart').value, endM = +el('b8ChillEnd').value;
    const key = `${rows.length}:${startM}:${endM}:${site.lat}`;
    if (!chillCache || chillCache.key !== key) chillCache = { key, seasons: Pheno8.winterSeasons(rows, site.lat, { startM, endM }) };
    const seasons = chillCache.seasons;
    const unit = el('b8ChillUnit').value, req = parseNum(el('b8ChillReq').value) || 0;
    const sum = Pheno8.chillSummary(seasons, { unit, value: req });
    const gdhTarget = parseNum(el('b8Gdh').value) || 0;
    let bloom = null;
    if (sum && sum.met && gdhTarget > 0) {
      const dates = seasons.map((s, i) => { const b = Pheno8.gdhToBloom(rows, site.lat, s, sum.met.days[i], gdhTarget); return b ? { label: s.label, day: b.day, date: b.date, J: b.date.m > 6 ? doy(2025, b.date.m, b.date.d) - 365 : doy(2025, b.date.m, b.date.d) } : { label: s.label, day: null }; });
      const ok = dates.filter(d => d.day != null);
      bloom = { dates, n: ok.length, median: ok.length ? Stat.median(ok.map(d => d.J)) : null, p20: ok.length ? Stat.quantile(ok.map(d => d.J), 0.2) : null, p80: ok.length ? Stat.quantile(ok.map(d => d.J), 0.8) : null };
    }
    state.phenology.chill = { seasons, summary: sum, unit, req, bloom, startM, endM };
    if (!sum) { el('b8ChillTiles').innerHTML = ''; el('b8ChillStatus').innerHTML = two('Ningún invierno completo en la ventana elegida.', 'No complete winter in the chosen window.'); Plots8.chillCurves('b8ChillCurves', [], unit, req); Plots8.chillYears('b8ChillYears', [], unit, req); el('b8ChillTable').innerHTML = ''; return; }
    const U = { cp: ['porciones', 'portions'], utah: ['unidades Utah', 'Utah units'], hours: ['horas frío', 'chill hours'] };
    const tiles = [
      [T('Porciones de frío', 'Chill portions'), fmtFixed(sum.cp.median, 1) + Help.tag('chill', sum.cp.median), T(`mediana de ${sum.n} inviernos · P20 ${fmtFixed(sum.cp.p20, 1)} (invierno cálido)`, `median of ${sum.n} winters · P20 ${fmtFixed(sum.cp.p20, 1)} (warm winter)`)],
      [T('Unidades Utah', 'Utah units'), fmtNum(sum.utah.median, 0), T(`P20 ${fmtNum(sum.utah.p20, 0)} · mín. ${fmtNum(sum.utah.min, 0)}`, `P20 ${fmtNum(sum.utah.p20, 0)} · min ${fmtNum(sum.utah.min, 0)}`), sum.utah.min < 0 ? 'warn' : ''],
      [T('Horas frío (0–7.2 °C)', 'Chill hours (0–7.2 °C)'), fmtNum(sum.hours.median, 0), T(`P20 ${fmtNum(sum.hours.p20, 0)}`, `P20 ${fmtNum(sum.hours.p20, 0)}`)],
      sum.met ? [T('Cubre el requerimiento', 'Meets the requirement'), fmtPct(sum.met.p, 0), T(`${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} · en la mediana el ${sum.met.dayMedian != null ? fmtDate(addDays(seasons[0].start, Math.round(sum.met.dayMedian)), true) : '—'}`, `${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} · at the median by ${sum.met.dayMedian != null ? fmtDate(addDays(seasons[0].start, Math.round(sum.met.dayMedian)), true) : '—'}`), sum.met.p >= 0.8 ? 'ok' : sum.met.p >= 0.5 ? 'warn' : 'bad'] : null,
      bloom && bloom.n ? [T('Floración prevista (GDH)', 'Predicted bloom (GDH)'), fmtDoy(((bloom.median % 365) + 365) % 365 || 365), T(`${bloom.n} de ${sum.n} inviernos · del ${fmtDoy(((bloom.p20 % 365) + 365) % 365 || 365)} al ${fmtDoy(((bloom.p80 % 365) + 365) % 365 || 365)}`, `${bloom.n} of ${sum.n} winters · from ${fmtDoy(((bloom.p20 % 365) + 365) % 365 || 365)} to ${fmtDoy(((bloom.p80 % 365) + 365) % 365 || 365)}`)] : null,
    ].filter(Boolean);
    statTiles('b8ChillTiles', tiles);
    el('b8ChillStatus').innerHTML = two(`Entre ${monthName(startM)} y ${monthName(endM)} el sitio acumula ${fmtFixed(sum.cp.median, 1)} porciones de frío en el invierno mediano y ${fmtFixed(sum.cp.p20, 1)} en uno de cada cinco inviernos cálidos (${fmtNum(sum.utah.median, 0)} unidades Utah, ${fmtNum(sum.hours.median, 0)} horas frío). ${sum.met ? (sum.met.p >= 0.8 ? `Un cultivar de ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} cubre su frío en ${fmtPct(sum.met.p, 0)} de los inviernos: viable.` : sum.met.p >= 0.5 ? `Un cultivar de ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} solo cubre su frío en ${fmtPct(sum.met.p, 0)} de los inviernos: brotación irregular uno de cada dos o tres años; busca cultivares de menor requerimiento.` : `Un cultivar de ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} no cubre su frío casi ningún invierno (${fmtPct(sum.met.p, 0)}): el sitio no es para él.`) : ''} ${sum.utah.min < 0 ? 'Las unidades Utah salen negativas en algún invierno: el modelo Utah no sirve en climas tan cálidos; fíate de las porciones.' : ''} Las horas se reconstruyeron de las temperaturas extremas con el método de Linvill (1990).`,
      `Between ${monthName(startM)} and ${monthName(endM)} the site accumulates ${fmtFixed(sum.cp.median, 1)} chill portions in the median winter and ${fmtFixed(sum.cp.p20, 1)} in one warm winter out of five (${fmtNum(sum.utah.median, 0)} Utah units, ${fmtNum(sum.hours.median, 0)} chill hours). ${sum.met ? (sum.met.p >= 0.8 ? `A cultivar of ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} meets its chill in ${fmtPct(sum.met.p, 0)} of the winters: viable.` : sum.met.p >= 0.5 ? `A cultivar of ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} only meets its chill in ${fmtPct(sum.met.p, 0)} of the winters: uneven budbreak one year in two or three; look for lower-chill cultivars.` : `A cultivar of ${fmtNum(req, 0)} ${T(U[unit][0], U[unit][1])} hardly ever meets its chill (${fmtPct(sum.met.p, 0)}): the site is not for it.`) : ''} ${sum.utah.min < 0 ? 'Utah units go negative in some winter: the Utah model fails in climates this warm; trust the portions.' : ''} Hours were rebuilt from the daily extremes with Linvill\'s (1990) method.`);
    Plots8.chillCurves('b8ChillCurves', seasons, unit, req);
    Plots8.chillYears('b8ChillYears', seasons, unit, req);
    buildTable('b8ChillTable', [
      { key: 'label', label: T('Invierno', 'Winter') }, { key: 'days', label: T('Días', 'Days'), num: true },
      { key: 'cp', label: T('Porciones', 'Portions'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'utah', label: 'Utah', num: true, fmt: v => fmtNum(v, 0) }, { key: 'hours', label: T('Horas frío', 'Chill hours'), num: true, fmt: v => fmtNum(v, 0) },
      { key: 'tminMean', label: T('Tmin media', 'Mean Tmin'), num: true, fmt: v => fmtTemp(v, 1) },
      { key: 'met', label: T('Requerimiento cubierto el', 'Requirement met on'), get: (s, i) => { const k = seasons.indexOf(s); const d = sum.met ? sum.met.days[k] : null; return d == null ? (sum.met ? T('no', 'no') : '—') : fmtDate(addDays(s.start, d), true); } },
      { key: 'bloom', label: T('Floración (GDH)', 'Bloom (GDH)'), get: s => { if (!bloom) return '—'; const b = bloom.dates.find(d => d.label === s.label); return b && b.day != null ? fmtDate(b.date, true) : '—'; } },
      { key: 'missing', label: T('Días rellenados', 'Filled days'), num: true },
    ], seasons, { scroll: true });
  }

  /* ---------------- photoperiod ---------------- */
  function renderPhotoperiod(ph, res, sowJ, site) {
    const marks = [{ J: sowJ, label: T('siembra', 'sowing') }];
    const fl = res.summary.find(s => /^6/.test(s.code) && s.median != null);
    if (fl) marks.push({ J: ((sowJ + Math.round(fl.median) - 1) % 365) + 1, label: `${fl.code} · ${T(fl.es, fl.en)}` });
    Plots8.photoperiod('b8Photo', ph, marks);
    const atFl = fl ? ph.days[(((sowJ + Math.round(fl.median) - 1) % 365) + 365) % 365].civil : null;
    const crop = Crops.byId(el('b8Crop').value);
    el('b8PhotoText').innerHTML = two(`A ${fmtFixed(site.lat, 2)}° de latitud el fotoperiodo civil va de ${fmtFixed(ph.min, 1)} h (${fmtDoy(ph.minJ)}) a ${fmtFixed(ph.max, 1)} h (${fmtDoy(ph.maxJ)}): ${fmtFixed(ph.max - ph.min, 1)} h de diferencia. ${atFl != null ? `En la floración prevista el día dura ${fmtFixed(atFl, 1)} h${ph.days[sowJ - 1] ? ` (${fmtFixed(ph.days[sowJ - 1].civil, 1)} h al sembrar, ${ph.days[sowJ - 1].civil < atFl ? 'días alargándose' : 'días acortándose'})` : ''}.` : ''} ${crop && crop.photoperiod ? `<b>${T(crop.es, crop.en)} es sensible al fotoperiodo</b>: su floración depende de la duración del día tanto como del calor, y el requerimiento térmico del catálogo solo vale para siembras en la misma época.` : 'Este cultivo se considera poco sensible al fotoperiodo; el tiempo térmico basta para fecharlo.'}`,
      `At ${fmtFixed(site.lat, 2)}° latitude the civil photoperiod runs from ${fmtFixed(ph.min, 1)} h (${fmtDoy(ph.minJ)}) to ${fmtFixed(ph.max, 1)} h (${fmtDoy(ph.maxJ)}): a ${fmtFixed(ph.max - ph.min, 1)} h difference. ${atFl != null ? `At the predicted flowering the day lasts ${fmtFixed(atFl, 1)} h${ph.days[sowJ - 1] ? ` (${fmtFixed(ph.days[sowJ - 1].civil, 1)} h at sowing, ${ph.days[sowJ - 1].civil < atFl ? 'days lengthening' : 'days shortening'})` : ''}.` : ''} ${crop && crop.photoperiod ? `<b>${T(crop.es, crop.en)} is photoperiod-sensitive</b>: its flowering depends on day length as much as on heat, and the catalogue thermal requirement holds only for sowings in the same season.` : 'This crop is considered little sensitive to photoperiod; thermal time suffices to date it.'}`);
    buildTable('b8PhotoTable', [{ key: 'm', label: T('Mes (día 15)', 'Month (day 15)'), get: r => monthName(r.m) }, { key: 'geometric', label: T('Sol sobre el horizonte (h)', 'Sun above the horizon (h)'), num: true, fmt: v => fmtFixed(v, 2) }, { key: 'civil', label: T('Con crepúsculo civil (h)', 'With civil twilight (h)'), num: true, fmt: v => fmtFixed(v, 2) }], ph.monthly);
  }

  function exportStages() {
    const p = state.phenology; if (!p || !p.res) return;
    const head = ['year', 'sowing'].concat(p.res.summary.map(s => 'BBCH' + s.code + '_date'), p.res.summary.map(s => 'BBCH' + s.code + '_das'), ['missing']);
    const lines = [head.join(',')].concat(p.res.years.map(r => [r.y, toISO(r.sowing)].concat(r.stages.map(s => (s.date ? toISO(s.date) : '')), r.stages.map(s => (s.das == null ? '' : s.das.toFixed(1))), [r.missing]).join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_fenologia.csv', 'text/csv;charset=utf-8');
  }
  function exportChill() {
    const c = state.phenology && state.phenology.chill; if (!c) return;
    const lines = ['winter,days,chillPortions,utahUnits,chillHours,meanTmin,filledDays'].concat(c.seasons.map(s => [s.label, s.days, s.cp.toFixed(2), s.utah.toFixed(0), s.hours.toFixed(0), s.tminMean.toFixed(2), s.missing].join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_frio_invernal.csv', 'text/csv;charset=utf-8');
  }

  function wire() {
    fillSelects();
    const site = state.site;
    el('b8ChillStart').value = site && site.lat < 0 ? '5' : '11'; el('b8ChillEnd').value = site && site.lat < 0 ? '8' : '2';
    el('b8Crop').addEventListener('change', () => { cropId = null; run(); });
    ['b8Method', 'b8Cutoff', 'b8Base', 'b8Upper', 'b8SowM', 'b8SowD'].forEach(id => el(id).addEventListener('change', run));
    ['b8ChillStart', 'b8ChillEnd', 'b8ChillUnit', 'b8ChillReq', 'b8Gdh'].forEach(id => el(id).addEventListener('change', () => { if (ready()) { runChill(); Fig.decorate(el('panel-8')); } }));
    /* from the button, a long run shows the common waiting window */
    el('b8Run').addEventListener('click', () => { const w = ppWork('Calculando la fenología', 'Computing phenology'); ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); });
    el('b8ObsRun').addEventListener('click', () => { if (!ready()) return; const w = ppWork('Calibrando con las observaciones', 'Calibrating with the observations'); ppAfterPaint(() => { renderCalibration(state.weather.rows, params()); if (!calRes && w) w._failed = true; }, w); });
    el('b8ObsExample').addEventListener('click', loadExampleObs);
    el('b8CalApply').addEventListener('click', () => applyCalibration(false));
    el('b8CalApplyBase').addEventListener('click', () => applyCalibration(true));
    el('b8FromGdd').addEventListener('click', () => { const g = state.degreeDays && state.degreeDays.params; if (!g) return; if (g.crop) { el('b8Crop').value = g.crop.id; cropId = null; applyCrop(); } el('b8Base').value = g.base; el('b8Upper').value = g.upper; el('b8Method').value = g.method === 'chu' ? 'average' : g.method; el('b8Cutoff').value = g.cutoff; el('b8SowM').value = g.m; el('b8SowD').value = g.d; run(); });
    el('b8ToData').addEventListener('click', () => goStep(2));
    el('b8Continue').addEventListener('click', () => goStep(9));
    el('b8ExportStages').addEventListener('click', exportStages);
    el('b8ExportChill').addEventListener('click', exportChill);
    document.addEventListener('weatherchange', () => { state.phenology = null; chillCache = null; const s = state.site; if (s) { el('b8ChillStart').value = s.lat < 0 ? '5' : '11'; el('b8ChillEnd').value = s.lat < 0 ? '8' : '2'; } if (document.querySelector('#panel-8.active')) run(); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 8 && !state.phenology) run(); });
    document.addEventListener('langchange', () => { fillSelects(); if (stages.length) renderStageEditor(); if (document.querySelector('#panel-8.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block8 = { run, get stages() { return stages; } };
})();
