/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 9: risks and scenarios.
   Reads the series, the site, the ETo, the phenology and the balance of the
   earlier blocks; writes state.risk: the risk by stage and by date, the
   sowing window and the scenarios. */

(function () {

  const two = (es, en) => L2(es, en);
  let cropId = null;

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300; }
  function fillSelects() {
    const c = el('b9Crop'); const cur = c.value;
    c.innerHTML = Crops.annuals().map(x => `<option value="${x.id}">${T(x.es, x.en)}</option>`).join(''); c.value = cur || 'maize';
    const m = el('b9SowM'); const curM = m.value; m.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); m.value = curM || '5';
  }
  /* the stages and the thermal parameters: from Block 8 when it was run with the same crop, else from the catalogue */
  function stagesFor(crop) {
    const ph = state.phenology;
    if (ph && ph.crop === crop.id && ph.stages && ph.stages.length) return { stages: ph.stages.map(s => Object.assign({}, s)), p: ph.params, source: 'block8' };
    return { stages: (crop.stages || []).map(s => ({ code: s.code, es: s.es, en: s.en, gdd: s.gdd })), p: { method: crop.method || 'average', base: crop.tbase, upper: crop.tupper, cutoff: 'horizontal' }, source: 'catalogue' };
  }
  function applyCrop() {
    const c = Crops.byId(el('b9Crop').value); if (!c || cropId === c.id) return;
    cropId = c.id;
    el('b9Heat').value = Risk9.heatFor(c.id);
    const sf = stagesFor(c);
    const sens = el('b9Sensitive'); sens.innerHTML = sf.stages.map(s => `<option value="${s.code}">${s.code} · ${T(s.es, s.en)}</option>`).join('');
    const fl = sf.stages.find(s => /^6/.test(s.code)) || sf.stages[Math.max(0, sf.stages.length - 2)];
    if (fl) sens.value = fl.code;
    /* the sowing of the balance, if it is for the same crop */
    if (state.balance && state.balance.params && state.balance.params.crop.id === c.id) { el('b9SowM').value = state.balance.params.m; el('b9SowD').value = state.balance.params.d; }
    else if (state.phenology && state.phenology.crop === c.id) { el('b9SowM').value = state.phenology.params.m; el('b9SowD').value = state.phenology.params.d; }
  }
  function waterParams(crop) {
    if (!el('b9UseWater').checked) return null;
    if (state.balance && state.balance.params && state.balance.params.crop.id === crop.id) return Object.assign({}, state.balance.params, { irrigation: { mode: 'none' } });
    const soil = Crops.SOILS[3];
    return { crop, L: crop.L, kc: crop.kc, zIni: crop.zIni, zMax: crop.zMax, p: crop.p, ky: crop.ky, taw: soil.taw, cn: soil.cn, dr0: 0.5, kcCorrect: true, irrigation: { mode: 'none' } };
  }

  function run() {
    if (!ready()) { el('b9Body').style.display = 'none'; el('b9Empty').style.display = ''; return; }
    el('b9Empty').style.display = 'none'; el('b9Body').style.display = '';
    applyCrop();
    const crop = Crops.byId(el('b9Crop').value) || Crops.byId('maize');
    const sf = stagesFor(crop);
    const p = Object.assign({}, sf.p, { m: +el('b9SowM').value, d: Math.max(1, Math.min(31, parseNum(el('b9SowD').value) || 1)), horizon: 400 });
    const thr = { frost: parseNum(el('b9Frost').value) || 0, heat: parseNum(el('b9Heat').value) || 35 };
    const sensitive = el('b9Sensitive').value;
    const rows = state.weather.rows, site = state.site || { lat: 20, z: 0 };
    if (!state.eto && window.Block5) Block5.run();
    const eto = state.eto ? state.eto.daily : Eto5.compute(rows, site, {}).pm;
    const water = waterParams(crop);
    const risk = Risk9.stageRisk(rows, p, sf.stages, thr, sensitive);
    const dr = Risk9.dailyRisk(rows, thr);
    const sw = Risk9.sowingWindow(rows, eto, p, sf.stages, { step: 5, thr, sensitive, yieldMin: (parseNum(el('b9YieldMin').value) || 75) / 100, useWater: !!water, water, frostWhere: el('b9FrostWhere').value, target: (parseNum(el('b9Target').value) || 80) / 100 });
    state.risk = { crop: crop.id, p, stages: sf.stages, source: sf.source, thr, sensitive, risk, daily: dr, window: sw, water: !!water };
    renderContext(crop, sf, p, thr, sensitive);
    renderStageRisk(risk, sensitive, thr);
    renderWindow(sw, p, thr);
    Plots9.byStage('b9ByStage', risk);
    const sowJ = doy(2025, p.m, p.d);
    const stagesJ = (() => { let prev = 0; return risk.summary.filter(s => s.daysMedian != null).map(s => { const from = sowJ + prev, to = sowJ + prev + s.daysMedian; prev += s.daysMedian; return { code: s.code, from: ((from - 1) % 365) + 1, to: Math.min(365, to) }; }); })();
    Plots9.byDate('b9ByDate', dr, stagesJ);
    Plots9.window('b9Window', sw);
    runScenarios(crop, sf, p, thr, sensitive, site, water);
    Fig.decorate(el('panel-9'));
    el('b9Continue').disabled = !STEPS.find(s => s.n === 10).ready;
    document.dispatchEvent(new CustomEvent('riskchange'));
  }

  function renderContext(crop, sf, p, thr, sensitive) {
    const sens = sf.stages.find(s => s.code === sensitive);
    el('b9Context').innerHTML = two(`${T(crop.es, crop.en)}, siembra el ${p.d} de ${monthName(p.m)}; etapas y requerimientos ${sf.source === 'block8' ? 'del Bloque 8 (calibrados o editados ahí)' : 'del catálogo, orientativos'}; base ${fmtTemp(p.base, 1)}, ${p.method}. Helada: Tmin ≤ ${fmtTemp(thr.frost, 0)}; golpe de calor: Tmax ≥ ${fmtTemp(thr.heat, 0)}; etapa sensible: ${sens ? sens.code + ' · ' + T(sens.es, sens.en) : '—'}.`,
      `${T(crop.es, crop.en)}, sown ${monthName(p.m)} ${p.d}; stages and requirements ${sf.source === 'block8' ? 'from Block 8 (calibrated or edited there)' : 'from the catalogue, orientative'}; base ${fmtTemp(p.base, 1)}, ${p.method}. Frost: Tmin ≤ ${fmtTemp(thr.frost, 0)}; heat shock: Tmax ≥ ${fmtTemp(thr.heat, 0)}; sensitive stage: ${sens ? sens.code + ' · ' + T(sens.es, sens.en) : '—'}.`);
  }
  function renderStageRisk(risk, sensitive, thr) {
    const s = risk.summary.find(x => x.code === sensitive) || risk.summary[risk.summary.length - 1];
    const tiles = [
      [T('Años simulados', 'Years simulated'), String(risk.n), T(`madura en ${fmtPct(risk.pMature, 0)} de ellos`, `it matures in ${fmtPct(risk.pMature, 0)} of them`), risk.pMature >= 0.8 ? 'ok' : 'bad'],
      [T('Helada en el ciclo', 'Frost in the cycle'), fmtPct(risk.pFrostCycle, 0), T(`de los años · ${fmtFixed(risk.meanFrostCycle, 1)} días en promedio`, `of the years · ${fmtFixed(risk.meanFrostCycle, 1)} days on average`), risk.pFrostCycle > 0.5 ? 'bad' : risk.pFrostCycle > 0.2 ? 'warn' : 'ok'],
      s ? [T(`Helada en ${s.code}`, `Frost at ${s.code}`), fmtPct(s.pFrost, 0), T(`etapa sensible · mínima absoluta ${fmtTemp(s.tminMin, 1)}`, `sensitive stage · absolute minimum ${fmtTemp(s.tminMin, 1)}`), s.pFrost > 0.2 ? 'bad' : s.pFrost > 0.1 ? 'warn' : 'ok'] : null,
      s ? [T(`Golpe de calor en ${s.code}`, `Heat shock at ${s.code}`), fmtPct(s.pHeat, 0), T(`Tmax ≥ ${fmtTemp(thr.heat, 0)} · ${fmtFixed(s.meanHeat, 1)} días en promedio · máxima absoluta ${fmtTemp(s.tmaxMax, 1)}`, `Tmax ≥ ${fmtTemp(thr.heat, 0)} · ${fmtFixed(s.meanHeat, 1)} days on average · absolute maximum ${fmtTemp(s.tmaxMax, 1)}`), s.pHeat > 0.5 ? 'bad' : s.pHeat > 0.2 ? 'warn' : 'ok'] : null,
      [T('Calor en el ciclo', 'Heat in the cycle'), fmtPct(risk.pHeatCycle, 0), T(`de los años · ${fmtFixed(risk.meanHeatCycle, 1)} días`, `of the years · ${fmtFixed(risk.meanHeatCycle, 1)} days`)],
    ].filter(Boolean);
    statTiles('b9Tiles', tiles);
    buildTable('b9StageTable', [
      { key: 'code', label: 'BBCH' }, { key: 'name', label: T('Etapa', 'Stage'), html: true, get: r => T(r.es, r.en) + (r.sensitive ? ' <span class="help-tag warn">' + T('sensible', 'sensitive') + '</span>' : '') },
      { key: 'daysMedian', label: T('Días (mediana)', 'Days (median)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'n', label: T('Años', 'Years'), num: true },
      { key: 'pFrost', label: T('Años con helada', 'Years with frost'), num: true, fmt: v => fmtPct(v, 0) }, { key: 'meanFrost', label: T('Días de helada', 'Frost days'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'tminMin', label: T('Mín. absoluta', 'Abs. min'), num: true, fmt: v => fmtTemp(v, 1) },
      { key: 'pHeat', label: T('Años con calor', 'Years with heat'), num: true, fmt: v => fmtPct(v, 0) }, { key: 'meanHeat', label: T('Días de calor', 'Heat days'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'tmaxMax', label: T('Máx. absoluta', 'Abs. max'), num: true, fmt: v => fmtTemp(v, 1) },
    ], risk.summary);
    const worstF = risk.summary.filter(x => x.n).reduce((a, b) => (!a || b.pFrost > a.pFrost ? b : a), null), worstH = risk.summary.filter(x => x.n).reduce((a, b) => (!a || b.pHeat > a.pHeat ? b : a), null);
    el('b9StageStatus').innerHTML = two(`${risk.pFrostCycle > 0 ? `La helada entra en el ciclo en ${fmtPct(risk.pFrostCycle, 0)} de los años, sobre todo en la etapa ${worstF.code} (${T(worstF.es, worstF.en).toLowerCase()}, ${fmtPct(worstF.pFrost, 0)}).` : 'Ninguna helada toca el ciclo en el registro.'} ${risk.pHeatCycle > 0 ? `El calor por encima de ${fmtTemp(thr.heat, 0)} aparece en ${fmtPct(risk.pHeatCycle, 0)} de los años, con más frecuencia en ${worstH.code} (${fmtPct(worstH.pHeat, 0)}).` : `Ningún día pasa de ${fmtTemp(thr.heat, 0)} durante el ciclo.`} ${s && (s.pFrost > 0.2 || s.pHeat > 0.2) ? 'La etapa sensible queda expuesta: la ventana de siembra de abajo busca la fecha que la saque del riesgo.' : ''}`,
      `${risk.pFrostCycle > 0 ? `Frost enters the cycle in ${fmtPct(risk.pFrostCycle, 0)} of the years, mostly at stage ${worstF.code} (${T(worstF.es, worstF.en).toLowerCase()}, ${fmtPct(worstF.pFrost, 0)}).` : 'No frost touches the cycle in the record.'} ${risk.pHeatCycle > 0 ? `Heat above ${fmtTemp(thr.heat, 0)} appears in ${fmtPct(risk.pHeatCycle, 0)} of the years, most often at ${worstH.code} (${fmtPct(worstH.pHeat, 0)}).` : `No day exceeds ${fmtTemp(thr.heat, 0)} during the cycle.`} ${s && (s.pFrost > 0.2 || s.pHeat > 0.2) ? 'The sensitive stage is exposed: the sowing window below looks for the date that takes it out of the risk.' : ''}`);
  }
  function renderWindow(sw, p, thr) {
    const rows = sw.rows.filter(r => r.n > 0);
    buildTable('b9WindowTable', [
      { key: 'J', label: T('Siembra', 'Sowing'), get: r => fmtDoy(r.J) },
      { key: 'pMature', label: T('Madura', 'Matures'), num: true, fmt: v => fmtPct(v, 0) }, { key: 'daysMedian', label: T('Días', 'Days'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'pNoFrost', label: T('Sin helada', 'No frost'), num: true, fmt: v => fmtPct(v, 0) }, { key: 'pNoHeat', label: T('Sin calor', 'No heat'), num: true, fmt: v => fmtPct(v, 0) },
      { key: 'pWater', label: T('Agua suficiente', 'Enough water'), num: true, get: r => r.pWater == null ? '—' : fmtPct(r.pWater, 0) }, { key: 'ryP20', label: T('Rend. P20', 'Yield P20'), num: true, get: r => r.ryP20 == null ? '—' : fmtPct(r.ryP20, 0) },
      { key: 'pSuccess', label: T('Éxito', 'Success'), html: true, num: true, get: r => fmtPct(r.pSuccess, 0) + Help.tag('sowingwindow', r.pSuccess) },
    ], rows.filter((_, i) => i % 2 === 0), { scroll: true });
    const note = el('b9WindowNote');
    if (!sw.windows.length) {
      note.innerHTML = two(`Ninguna fecha alcanza el ${fmtPct(sw.opts.target, 0)} de éxito con todas las condiciones a la vez${sw.best ? `; la mejor es el ${fmtDoy(sw.best.J)} con ${fmtPct(sw.best.pSuccess, 0)} (madura ${fmtPct(sw.best.pMature, 0)}, sin helada ${fmtPct(sw.best.pNoFrost, 0)}, sin calor ${fmtPct(sw.best.pNoHeat, 0)}${sw.best.pWater != null ? `, agua ${fmtPct(sw.best.pWater, 0)}` : ''})` : ''}. Mira qué criterio falla en la figura: si es el agua, el riego del Bloque 7 lo resuelve; si es el calor, hace falta un cultivar más precoz.`,
        `No date reaches ${fmtPct(sw.opts.target, 0)} success with every condition at once${sw.best ? `; the best is ${fmtDoy(sw.best.J)} with ${fmtPct(sw.best.pSuccess, 0)} (matures ${fmtPct(sw.best.pMature, 0)}, no frost ${fmtPct(sw.best.pNoFrost, 0)}, no heat ${fmtPct(sw.best.pNoHeat, 0)}${sw.best.pWater != null ? `, water ${fmtPct(sw.best.pWater, 0)}` : ''})` : ''}. See which criterion fails in the figure: if it is water, the irrigation of Block 7 solves it; if it is heat, an earlier cultivar is needed.`);
      return;
    }
    const w = sw.windows.map(x => T(`del ${fmtDoy(x.from)} al ${fmtDoy(x.to)} (mejor el ${fmtDoy(x.best.J)}: ${fmtPct(x.best.pSuccess, 0)}, ${Math.round(x.best.daysMedian || 0)} días)`, `from ${fmtDoy(x.from)} to ${fmtDoy(x.to)} (best on ${fmtDoy(x.best.J)}: ${fmtPct(x.best.pSuccess, 0)}, ${Math.round(x.best.daysMedian || 0)} days)`)).join('; ');
    note.innerHTML = two(`Ventana${sw.windows.length > 1 ? 's' : ''} con al menos ${fmtPct(sw.opts.target, 0)} de éxito en el registro: <b>${w}</b>. Éxito significa que en ese año el cultivo maduró, no hubo helada ${sw.opts.frostWhere === 'cycle' ? 'en todo el ciclo' : 'en la etapa sensible'}, no hubo golpe de calor en la etapa sensible${sw.opts.useWater ? ` y el rendimiento relativo en temporal fue de al menos ${fmtPct(sw.opts.yieldMin, 0)}` : ''}.`,
      `Window${sw.windows.length > 1 ? 's' : ''} with at least ${fmtPct(sw.opts.target, 0)} success in the record: <b>${w}</b>. Success means that in that year the crop matured, there was no frost ${sw.opts.frostWhere === 'cycle' ? 'in the whole cycle' : 'at the sensitive stage'}, no heat shock at the sensitive stage${sw.opts.useWater ? ` and the rain-fed relative yield was at least ${fmtPct(sw.opts.yieldMin, 0)}` : ''}.`);
  }

  /* ---------------- scenarios ---------------- */
  function runScenarios(crop, sf, p, thr, sensitive, site, water) {
    const dTs = [0].concat(String(el('b9Deltas').value).split(',').map(s => parseNum(s)).filter(v => v != null && v !== 0));
    const dP = (parseNum(el('b9DeltaP').value) || 0) / 100;
    const rows = state.weather.rows;
    const chill = crop.chill || el('b9Chill').checked ? { startM: site.lat >= 0 ? 11 : 5, endM: site.lat >= 0 ? 2 : 8, req: { unit: 'cp', value: crop.chill ? Math.round((crop.chill.cp[0] + crop.chill.cp[1]) / 2) : (parseNum(el('b9ChillReq').value) || 40) } } : null;
    const sc = dTs.map(dT => Risk9.scenario(rows, site, p, sf.stages, { dT, dP: dT === 0 ? 0 : dP, thr, sensitive, water, chill }));
    state.risk.scenarios = sc;
    const base = sc[0];
    const f0 = v => (v == null ? '—' : fmtFixed(v, 0));
    buildTable('b9ScenTable', [
      { key: 'dT', label: T('Escenario', 'Scenario'), get: s => (s.dT === 0 ? T('Clima actual', 'Current climate') : `${s.dT > 0 ? '+' : ''}${s.dT} °C${dP ? `, lluvia ${dP > 0 ? '+' : ''}${Math.round(dP * 100)} %` : ''}`) },
      { key: 'days', label: T('Días a madurez', 'Days to maturity'), num: true, get: s => f0(s.daysToMaturity) },
      { key: 'mat', label: T('Fecha de madurez', 'Maturity date'), get: s => (s.maturityJ == null ? '—' : fmtDoy(((Math.round(s.maturityJ) - 1) % 365) + 1)) },
      { key: 'pm', label: T('Madura', 'Matures'), num: true, get: s => fmtPct(s.pMature, 0) },
      { key: 'frost', label: T('Días de helada en el ciclo', 'Frost days in cycle'), num: true, get: s => fmtFixed(s.risk.meanFrostCycle, 1) },
      { key: 'heat', label: T('Días de calor en el ciclo', 'Heat days in cycle'), num: true, get: s => fmtFixed(s.risk.meanHeatCycle, 1) },
      { key: 'eto', label: T('ETo anual (mm)', 'Annual ETo (mm)'), num: true, get: s => f0(s.etoAnnual) },
      { key: 'etc', label: T('ETc temporada', 'Season ETc'), num: true, get: s => (s.water ? f0(s.water.etc) : '—') },
      { key: 'ry', label: T('Rend. temporal', 'Rain-fed yield'), num: true, get: s => (s.water ? fmtPct(s.water.relYield, 0) : '—') },
      { key: 'cp', label: T('Porciones de frío', 'Chill portions'), num: true, get: s => (s.chill ? fmtFixed(s.chill.cp, 1) : '—') },
    ], sc);
    Plots9.scenarios('b9Scenarios', sc);
    Plots9.scenarioCalendar('b9ScenCalendar', sc, doy(2025, p.m, p.d));
    const last = sc[sc.length - 1];
    if (last && last !== base) {
      const dDays = last.daysToMaturity != null && base.daysToMaturity != null ? last.daysToMaturity - base.daysToMaturity : null;
      el('b9ScenStatus').innerHTML = two(`Con ${last.dT > 0 ? '+' : ''}${last.dT} °C${dP ? ` y ${dP > 0 ? '+' : ''}${Math.round(dP * 100)} % de lluvia` : ''}, ${T(crop.es, crop.en)} ${dDays != null ? `madura ${Math.abs(Math.round(dDays))} días ${dDays < 0 ? 'antes' : 'después'} (${fmtFixed(base.daysToMaturity, 0)} → ${fmtFixed(last.daysToMaturity, 0)})` : 'cambia su ciclo'}; la ETo anual pasa de ${f0(base.etoAnnual)} a ${f0(last.etoAnnual)} mm (${fmtPct(last.etoAnnual / base.etoAnnual - 1, 0)})${last.water && base.water ? `; el rendimiento en temporal, de ${fmtPct(base.water.relYield, 0)} a ${fmtPct(last.water.relYield, 0)}` : ''}${last.chill && base.chill ? `; las porciones de frío, de ${fmtFixed(base.chill.cp, 1)} a ${fmtFixed(last.chill.cp, 1)}` : ''}; los días de helada en el ciclo, de ${fmtFixed(base.risk.meanFrostCycle, 1)} a ${fmtFixed(last.risk.meanFrostCycle, 1)}, y los de calor, de ${fmtFixed(base.risk.meanHeatCycle, 1)} a ${fmtFixed(last.risk.meanHeatCycle, 1)}. Un ciclo más corto rinde menos por sí solo (menos días de llenado), aunque el modelo de tiempo térmico no lo cuantifique: úsalo como análisis de sensibilidad, no como pronóstico.`,
        `At ${last.dT > 0 ? '+' : ''}${last.dT} °C${dP ? ` and ${dP > 0 ? '+' : ''}${Math.round(dP * 100)} % rain` : ''}, ${T(crop.es, crop.en)} ${dDays != null ? `matures ${Math.abs(Math.round(dDays))} days ${dDays < 0 ? 'earlier' : 'later'} (${fmtFixed(base.daysToMaturity, 0)} → ${fmtFixed(last.daysToMaturity, 0)})` : 'changes its cycle'}; annual ETo goes from ${f0(base.etoAnnual)} to ${f0(last.etoAnnual)} mm (${fmtPct(last.etoAnnual / base.etoAnnual - 1, 0)})${last.water && base.water ? `; rain-fed yield from ${fmtPct(base.water.relYield, 0)} to ${fmtPct(last.water.relYield, 0)}` : ''}${last.chill && base.chill ? `; chill portions from ${fmtFixed(base.chill.cp, 1)} to ${fmtFixed(last.chill.cp, 1)}` : ''}; frost days in the cycle from ${fmtFixed(base.risk.meanFrostCycle, 1)} to ${fmtFixed(last.risk.meanFrostCycle, 1)}, and heat days from ${fmtFixed(base.risk.meanHeatCycle, 1)} to ${fmtFixed(last.risk.meanHeatCycle, 1)}. A shorter cycle yields less by itself (fewer filling days), even if the thermal-time model does not quantify it: use this as a sensitivity analysis, not a forecast.`);
    } else el('b9ScenStatus').innerHTML = '';
  }

  function exportWindow() {
    const r = state.risk; if (!r) return;
    const lines = ['sowingDoy,sowingDate,years,pMature,daysMedian,pNoFrost,pNoHeat,pWater,yieldP20,pSuccess'].concat(r.window.rows.map(x => [x.J, fmtDoy(x.J), x.n, x.pMature, x.daysMedian, x.pNoFrost, x.pNoHeat, x.pWater, x.ryP20, x.pSuccess].map(v => (v == null ? '' : typeof v === 'number' ? +v.toFixed(3) : v)).join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_ventana_siembra.csv', 'text/csv;charset=utf-8');
  }

  function wire() {
    fillSelects();
    el('b9Crop').addEventListener('change', () => { cropId = null; run(); });
    ['b9SowM', 'b9SowD', 'b9Frost', 'b9Heat', 'b9Sensitive', 'b9YieldMin', 'b9Target', 'b9UseWater', 'b9FrostWhere', 'b9Deltas', 'b9DeltaP', 'b9Chill', 'b9ChillReq'].forEach(id => el(id).addEventListener('change', run));
    /* from the button, a long run shows the common waiting window */
    el('b9Run').addEventListener('click', () => { const w = ppWork('Calculando riesgos y escenarios', 'Computing risks and scenarios'); ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); });
    el('b9ToData').addEventListener('click', () => goStep(2));
    el('b9Continue').addEventListener('click', () => goStep(10));
    el('b9ExportWindow').addEventListener('click', exportWindow);
    document.addEventListener('weatherchange', () => { state.risk = null; });
    document.addEventListener('phenologychange', () => { state.risk = null; cropId = null; });
    document.addEventListener('climatechange', () => { const fr = state.climate && state.climate.fr; if (fr) el('b9Frost').value = fr.threshold; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 9 && !state.risk) { if (state.climate && state.climate.fr) el('b9Frost').value = state.climate.fr.threshold; const w = ready() ? ppWork('Calculando riesgos y escenarios', 'Computing risks and scenarios') : null; ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); } });
    document.addEventListener('langchange', () => { fillSelects(); if (document.querySelector('#panel-9.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block9 = { run };
})();
