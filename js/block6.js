/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 6: the water balance of a crop on the site's series.
   Reads state.weather, state.site and state.eto; writes state.balance, which
   Block 7 turns into an irrigation calendar and Block 9 crosses with frost. */

(function () {

  const two = (es, en) => L2(es, en);
  const STAGE = { ini: ['Inicial', 'Initial'], dev: ['Desarrollo', 'Development'], mid: ['Media estación', 'Mid-season'], late: ['Final', 'Late'] };
  let cropId = null, soilId = null, viewYear = null;

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300 && state.eto && state.eto.daily; }

  function fillSelects() {
    const c = el('b6Crop'); const cur = c.value;
    c.innerHTML = Crops.LIST.map(x => `<option value="${x.id}">${T(x.es, x.en)}</option>`).join(''); c.value = cur || 'maize';
    const s = el('b6Soil'); const curS = s.value;
    s.innerHTML = Crops.SOILS.map(x => `<option value="${x.id}">${T(x.es, x.en)}</option>`).join('') + `<option value="custom">${T('— Propio —', '— Custom —')}</option>`; s.value = curS || 'loam';
    const m = el('b6SowM'); const curM = m.value; m.innerHTML = MONTHS.es.map((_, i) => `<option value="${i + 1}">${monthName(i + 1)}</option>`).join(''); m.value = curM || '5';
  }
  function applyCrop() {
    const c = Crops.byId(el('b6Crop').value); if (!c || cropId === c.id) return;
    cropId = c.id;
    el('b6Lini').value = c.L.ini; el('b6Ldev').value = c.L.dev; el('b6Lmid').value = c.L.mid; el('b6Llate').value = c.L.late;
    el('b6KcIni').value = c.kc.ini; el('b6KcMid').value = c.kc.mid; el('b6KcEnd').value = c.kc.end;
    el('b6Zini').value = c.zIni; el('b6Zmax').value = c.zMax; el('b6P').value = c.p; el('b6Ky').value = c.ky == null ? 1 : c.ky;
  }
  function applySoil() {
    const id = el('b6Soil').value; if (soilId === id) return;
    soilId = id;
    const s = Crops.SOILS.find(x => x.id === id);
    if (s) { el('b6Taw').value = s.taw; el('b6Cn').value = s.cn; }
  }
  function params() {
    const crop = Crops.byId(el('b6Crop').value) || Crops.byId('maize');
    return {
      crop, m: +el('b6SowM').value, d: Math.max(1, Math.min(31, parseNum(el('b6SowD').value) || 1)),
      L: { ini: +el('b6Lini').value || 20, dev: +el('b6Ldev').value || 30, mid: +el('b6Lmid').value || 40, late: +el('b6Llate').value || 20 },
      kc: { ini: parseNum(el('b6KcIni').value) || 0.4, mid: parseNum(el('b6KcMid').value) || 1.1, end: parseNum(el('b6KcEnd').value) || 0.5 },
      zIni: parseNum(el('b6Zini').value) || 0.15, zMax: parseNum(el('b6Zmax').value) || 1, p: parseNum(el('b6P').value) || 0.5, ky: parseNum(el('b6Ky').value) || 1,
      taw: parseNum(el('b6Taw').value) || 140, cn: el('b6Runoff').checked ? (parseNum(el('b6Cn').value) || 0) : 0, dr0: (parseNum(el('b6Dr0').value) || 0) / 100, kcCorrect: el('b6KcCorrect').checked,
      irrigation: { mode: 'none' },
    };
  }

  function run() {
    if (!ready()) { el('b6Body').style.display = 'none'; el('b6Empty').style.display = ''; return; }
    el('b6Empty').style.display = 'none'; el('b6Body').style.display = '';
    applyCrop(); applySoil();
    const p = params();
    const rows = state.weather.rows, eto = state.eto.daily;
    const all = Water6.runAll(rows, eto, p);
    const bs = Water6.bySowing(rows, eto, p, 10);
    const mn = Water6.monthlyNeed(rows, eto);
    state.balance = { params: p, all, bySowing: bs, monthlyNeed: mn, etoMethod: state.eto.method };
    if (viewYear == null || !all.years.some(r => r.y === viewYear)) viewYear = all.medianYear;
    renderSummary(p, all);
    renderYearPicker(all);
    renderYearTable(p, all);
    renderStages(all);
    renderSowing(bs, p);
    renderNeed(mn);
    drawYear(all);
    Plots6.years('b6Years', all.years);
    Plots6.yieldYears('b6Yield', all.years);
    Plots6.stages('b6Stages', all.summary);
    Plots6.sowing('b6Sowing', bs);
    Plots6.need('b6Need', mn);
    Fig.decorate(el('panel-6'));
    el('b6Continue').disabled = !STEPS.find(s => s.n === 7).ready;
    document.dispatchEvent(new CustomEvent('balancechange'));
  }
  function drawYear(all) {
    const r = all.years.find(x => x.y === viewYear) || null;
    Plots6.demand('b6Demand', r, state.balance.params.L);
    Plots6.depletion('b6Depletion', r);
    const line = el('b6YearLine');
    if (!r) { line.innerHTML = ''; return; }
    const t = r.totals;
    line.innerHTML = two(`<b>${r.y}</b>, siembra el ${fmtDate(r.start, true)}: ETc ${fmtMm(t.etc, 0)}, real ${fmtMm(t.etcAdj, 0)}; lluvia ${fmtMm(t.P, 0)} de la que ${fmtMm(t.Pe, 0)} entró al suelo y ${fmtMm(t.DP, 0)} percoló; ${plural(t.stressDays, 'día', 'días')} con estrés (Ks medio ${fmtFixed(t.ksMean, 2)}); rendimiento relativo <b>${fmtPct(r.relYield, 0)}</b>${r.kc.corrected ? ` · Kc mid corregido a ${fmtFixed(r.kc.mid, 2)} (u₂ ${fmtFixed(r.kc.u2, 1)} m/s, HRmin ${fmtFixed(r.kc.rhmin, 0)} %)` : ''}.`,
      `<b>${r.y}</b>, sown on ${fmtDate(r.start, true)}: ETc ${fmtMm(t.etc, 0)}, actual ${fmtMm(t.etcAdj, 0)}; rain ${fmtMm(t.P, 0)} of which ${fmtMm(t.Pe, 0)} entered the soil and ${fmtMm(t.DP, 0)} percolated; ${plural(t.stressDays, 'day', 'days')} with stress (mean Ks ${fmtFixed(t.ksMean, 2)}); relative yield <b>${fmtPct(r.relYield, 0)}</b>${r.kc.corrected ? ` · Kc mid corrected to ${fmtFixed(r.kc.mid, 2)} (u₂ ${fmtFixed(r.kc.u2, 1)} m/s, RHmin ${fmtFixed(r.kc.rhmin, 0)} %)` : ''}.`);
  }
  function renderYearPicker(all) {
    const s = el('b6Year');
    s.innerHTML = all.years.map(r => `<option value="${r.y}">${r.y}${r.y === all.medianYear ? ' · ' + T('mediano', 'median') : ''} · ${fmtPct(r.relYield, 0)}</option>`).join('');
    s.value = String(viewYear);
  }

  function renderSummary(p, all) {
    const s = all.summary;
    if (!s) { el('b6Tiles').innerHTML = ''; el('b6Status').innerHTML = two('Ningún año tiene datos suficientes para la temporada elegida.', 'No year has enough data for the chosen season.'); return; }
    const len = p.L.ini + p.L.dev + p.L.mid + p.L.late;
    const tiles = [
      [T('ETc de la temporada', 'ETc of the season'), fmtMm(s.etc.median, 0), T(`mediana de ${s.n} años · ${len} días desde el ${p.d} de ${monthName(p.m)}`, `median of ${s.n} years · ${len} days from ${monthName(p.m)} ${p.d}`)],
      [T('Lluvia efectiva', 'Effective rain'), fmtMm(s.pe.median, 0), T(`de ${fmtMm(s.P.median, 0)} caídos · P20 ${fmtMm(s.pe.p20, 0)}`, `of ${fmtMm(s.P.median, 0)} fallen · P20 ${fmtMm(s.pe.p20, 0)}`)],
      [T('Déficit (no transpirado)', 'Deficit (not transpired)'), fmtMm(s.deficit.median, 0), T(`P80 ${fmtMm(s.deficit.p80, 0)} · ${Math.round(s.stressDays.median)} días con estrés`, `P80 ${fmtMm(s.deficit.p80, 0)} · ${Math.round(s.stressDays.median)} stress days`), s.deficit.median > 0.2 * s.etc.median ? 'bad' : s.deficit.median > 0 ? 'warn' : 'ok'],
      [T('Rendimiento relativo', 'Relative yield'), fmtPct(s.relYield.median, 0) + Help.tag('kyield', s.relYield.median), T(`P20 ${fmtPct(s.relYield.p20, 0)} · Ky ${fmtFixed(p.ky, 2)} · ${fmtPct(s.pGood, 0)} de los años ≥ 90 %`, `P20 ${fmtPct(s.relYield.p20, 0)} · Ky ${fmtFixed(p.ky, 2)} · ${fmtPct(s.pGood, 0)} of years ≥ 90 %`), s.relYield.median >= 0.9 ? 'ok' : s.relYield.median >= 0.75 ? 'warn' : 'bad'],
      [T('Percolación', 'Percolation'), fmtMm(s.dp.median, 0), T(`P80 ${fmtMm(s.dp.p80, 0)} · escurrimiento ${fmtMm(s.ro.median, 0)}`, `P80 ${fmtMm(s.dp.p80, 0)} · runoff ${fmtMm(s.ro.median, 0)}`)],
    ];
    statTiles('b6Tiles', tiles);
    const worst = s.stages.reduce((a, b) => (b.ks.median < a.ks.median ? b : a));
    el('b6Status').innerHTML = T(`En temporal, ${T(p.crop.es, p.crop.en)} sembrado el ${p.d} de ${monthName(p.m)} en un suelo de ${p.taw} mm/m obtiene en el año mediano el <b>${fmtPct(s.relYield.median, 0)}</b> de su rendimiento potencial (FAO-33, Ky = ${fmtFixed(p.ky, 2)})${s.relYield.p20 >= 0.99 ? ', y prácticamente lo mismo en los años malos' : `; en uno de cada cinco años, menos del ${fmtPct(s.relYield.p20, 0)}, y en ${fmtPct(s.pFail, 0)} de los años cae por debajo del 50 %`}. ${worst.ks.median < 0.995 ? `La etapa que más sufre es la <b>${T(STAGE[worst.id][0], STAGE[worst.id][1]).toLowerCase()}</b> (Ks mediano ${fmtFixed(worst.ks.median, 2)}). ` : ''}${s.deficit.median > 0 ? 'El Bloque 7 calcula cuántos riegos cerrarían ese déficit.' : `La lluvia cubre la demanda casi todos los años; ${fmtMm(s.dp.median, 0)} percolan por debajo de las raíces en el año mediano.`}`,
      `Rain-fed, ${T(p.crop.es, p.crop.en)} sown on ${monthName(p.m)} ${p.d} in a ${p.taw} mm/m soil obtains in the median year <b>${fmtPct(s.relYield.median, 0)}</b> of its potential yield (FAO-33, Ky = ${fmtFixed(p.ky, 2)})${s.relYield.p20 >= 0.99 ? ', and practically the same in the bad years' : `; in one year out of five, less than ${fmtPct(s.relYield.p20, 0)}, and in ${fmtPct(s.pFail, 0)} of the years it falls below 50 %`}. ${worst.ks.median < 0.995 ? `The stage that suffers most is the <b>${T(STAGE[worst.id][0], STAGE[worst.id][1]).toLowerCase()}</b> one (median Ks ${fmtFixed(worst.ks.median, 2)}). ` : ''}${s.deficit.median > 0 ? 'Block 7 computes how many irrigations would close that deficit.' : `Rain covers the demand almost every year; ${fmtMm(s.dp.median, 0)} percolate below the roots in the median year.`}`);
  }

  function renderYearTable(p, all) {
    buildTable('b6YearTable', [
      { key: 'y', label: T('Año', 'Year') }, { key: 'start', label: T('Siembra', 'Sowing'), get: r => fmtDate(r.start, true) },
      { key: 'eto', label: 'ETo', num: true, get: r => fmtNum(r.totals.eto, 0) }, { key: 'etc', label: 'ETc', num: true, get: r => fmtNum(r.totals.etc, 0) }, { key: 'adj', label: T('ETc real', 'Actual ETc'), num: true, get: r => fmtNum(r.totals.etcAdj, 0) },
      { key: 'P', label: T('Lluvia', 'Rain'), num: true, get: r => fmtNum(r.totals.P, 0) }, { key: 'pe', label: T('Efectiva', 'Effective'), num: true, get: r => fmtNum(r.totals.Pe, 0) }, { key: 'dp', label: T('Percol.', 'Percol.'), num: true, get: r => fmtNum(r.totals.DP, 0) },
      { key: 'def', label: T('Déficit', 'Deficit'), num: true, get: r => fmtNum(r.totals.deficit, 0) }, { key: 'stress', label: T('Días estrés', 'Stress days'), num: true, get: r => r.totals.stressDays },
      { key: 'ks', label: T('Ks medio', 'Mean Ks'), num: true, get: r => fmtFixed(r.totals.ksMean, 2) }, { key: 'ry', label: T('Rend. relativo', 'Rel. yield'), html: true, num: true, get: r => fmtPct(r.relYield, 0) + Help.tag('kyield', r.relYield) },
      { key: 'missing', label: T('Rellenos', 'Filled'), num: true },
    ], all.years, { scroll: true });
  }
  function renderStages(all) {
    const s = all.summary; if (!s) return;
    buildTable('b6StageTable', [
      { key: 'id', label: T('Etapa', 'Stage'), get: r => T(STAGE[r.id][0], STAGE[r.id][1]) },
      { key: 'etc', label: 'ETc (mm)', num: true, get: r => fmtNum(r.etc.median, 0) }, { key: 'adj', label: T('ETc real', 'Actual ETc'), num: true, get: r => fmtNum(r.etcAdj.median, 0) },
      { key: 'pe', label: T('Lluvia efectiva', 'Effective rain'), num: true, get: r => fmtNum(r.pe.median, 0) }, { key: 'def', label: T('Déficit', 'Deficit'), num: true, get: r => fmtNum(r.deficit.median, 0) },
      { key: 'ks', label: T('Ks mediano', 'Median Ks'), html: true, num: true, get: r => fmtFixed(r.ks.median, 2) + Help.tag('ks', r.ks.median) }, { key: 'ratio', label: T('ETc real/ETc', 'Actual/ETc'), num: true, get: r => fmtPct(r.ratio.median, 0) },
      { key: 'stress', label: T('Días con estrés', 'Stress days'), num: true, get: r => Math.round(r.stress.median) },
    ], s.stages);
  }
  function renderSowing(bs, p) {
    const note = el('b6SowingNote');
    if (!bs.best) { note.innerHTML = ''; return; }
    note.innerHTML = two(`En temporal, la fecha con mejor rendimiento garantizado (P20 más alto) es el <b>${fmtDoy(bs.best.J)}</b>: ${fmtPct(bs.best.relYield.median, 0)} en el año mediano y ${fmtPct(bs.best.relYield.p20, 0)} en cuatro de cada cinco años. Este mapa solo mira el agua; el Bloque 9 lo cruza con el calor y las heladas.`,
      `Rain-fed, the date with the best guaranteed yield (highest P20) is <b>${fmtDoy(bs.best.J)}</b>: ${fmtPct(bs.best.relYield.median, 0)} in the median year and ${fmtPct(bs.best.relYield.p20, 0)} in four years out of five. This map looks only at water; Block 9 crosses it with heat and frost.`);
    buildTable('b6SowingTable', [
      { key: 'J', label: T('Siembra', 'Sowing'), get: r => fmtDoy(r.J) },
      { key: 'ry', label: T('Rend. relativo (mediana)', 'Rel. yield (median)'), num: true, get: r => r.relYield ? fmtPct(r.relYield.median, 0) : '—' }, { key: 'ry20', label: 'P20', num: true, get: r => r.relYield ? fmtPct(r.relYield.p20, 0) : '—' },
      { key: 'def', label: T('Déficit (mm, mediana)', 'Deficit (mm, median)'), num: true, get: r => r.deficit ? fmtNum(r.deficit.median, 0) : '—' }, { key: 'n', label: T('Años', 'Years'), num: true },
    ], bs.rows.filter(r => r.n > 0), { scroll: true });
  }
  function renderNeed(mn) {
    const tot = k => (mn.every(x => x[k] != null) ? Stat.sum(mn.map(x => x[k])) : null);
    const rows = mn.map(x => Object.assign({}, x)).concat([{ _class: 'total-row', m: 0, P: tot('P'), eto: tot('eto'), peUSDA: tot('peUSDA'), peFAO: tot('peFAO'), need: tot('need'), needP80: null, n: null }]);
    buildTable('b6NeedTable', [
      { key: 'm', label: T('Mes', 'Month'), get: r => (r.m === 0 ? T('Año', 'Year') : monthName(r.m)) },
      { key: 'P', label: T('Lluvia', 'Rain'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'peUSDA', label: T('Efectiva USDA', 'Effective USDA'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'peFAO', label: T('Efectiva FAO', 'Effective FAO'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'eto', label: 'ETo', num: true, fmt: v => fmtFixed(v, 0) }, { key: 'need', label: T('Necesidad (mediana de años)', 'Need (mean of years)'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'needP80', label: T('Necesidad P80', 'Need P80'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'n', label: T('Años', 'Years'), num: true },
    ], rows);
  }

  function exportYears() {
    const b = state.balance; if (!b) return;
    const head = ['year', 'sowing', 'ETo', 'ETc', 'ETc_actual', 'rain', 'effective', 'runoff', 'percolation', 'deficit', 'stressDays', 'ksMean', 'relYield', 'ks_ini', 'ks_dev', 'ks_mid', 'ks_late'];
    const lines = [head.join(',')].concat(b.all.years.map(r => [r.y, toISO(r.start), r.totals.eto, r.totals.etc, r.totals.etcAdj, r.totals.P, r.totals.Pe, r.totals.RO, r.totals.DP, r.totals.deficit, r.totals.stressDays, r.totals.ksMean, r.relYield].concat(r.stages.map(s => s.ks)).map(v => (typeof v === 'number' ? +v.toFixed(3) : v)).join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_balance_anual.csv', 'text/csv;charset=utf-8');
  }
  function exportDaily() {
    const b = state.balance; if (!b) return;
    const r = b.all.years.find(x => x.y === viewYear); if (!r) return;
    const head = ['date', 'P', 'RO', 'Pe', 'ETo', 'Kc', 'ETc', 'ETc_actual', 'Ks', 'Zr', 'TAW', 'RAW', 'Dr_start', 'I', 'DP', 'Dr_end'];
    const lines = [head.join(',')].concat(r.bal.rows.map((x, k) => [toISO(addDays(r.start, k)), x.P, x.RO, x.Pe, x.eto, x.kc, x.etc, x.etcAdj, x.ks, x.zr, x.taw, x.raw, x.drStart, x.I, x.DP, x.dr].map(v => (typeof v === 'number' ? +v.toFixed(3) : v)).join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + `_balance_${r.y}.csv`, 'text/csv;charset=utf-8');
  }

  function wire() {
    fillSelects();
    el('b6Crop').addEventListener('change', () => { cropId = null; run(); });
    el('b6Soil').addEventListener('change', () => { soilId = null; run(); });
    ['b6SowM', 'b6SowD', 'b6Lini', 'b6Ldev', 'b6Lmid', 'b6Llate', 'b6KcIni', 'b6KcMid', 'b6KcEnd', 'b6Zini', 'b6Zmax', 'b6P', 'b6Ky', 'b6Taw', 'b6Cn', 'b6Runoff', 'b6Dr0', 'b6KcCorrect'].forEach(id => el(id).addEventListener('change', () => { if (id === 'b6Taw' || id === 'b6Cn') { el('b6Soil').value = 'custom'; soilId = 'custom'; } run(); }));
    el('b6Year').addEventListener('change', () => { viewYear = +el('b6Year').value; if (state.balance) drawYear(state.balance.all); });
    el('b6Run').addEventListener('click', run);
    el('b6ToData').addEventListener('click', () => goStep(2));
    el('b6ToEto').addEventListener('click', () => goStep(5));
    el('b6Continue').addEventListener('click', () => goStep(7));
    el('b6ExportYears').addEventListener('click', exportYears);
    el('b6ExportDaily').addEventListener('click', exportDaily);
    document.addEventListener('weatherchange', () => { state.balance = null; });
    document.addEventListener('etochange', () => { state.balance = null; if (document.querySelector('#panel-6.active')) run(); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 6 && !state.balance) { if (state.weather && !state.eto && window.Block5) Block5.run(); run(); } });
    document.addEventListener('langchange', () => { fillSelects(); if (document.querySelector('#panel-6.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block6 = { run, get viewYear() { return viewYear; } };
})();
