/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 5: reference evapotranspiration on the site's series.
   Reads state.weather, state.site and state.climate; writes state.eto, with
   the daily ETo the water blocks will use and how it was obtained. */

(function () {

  const two = (es, en) => L2(es, en);
  const NAME = { pm: 'Penman–Monteith FAO-56', hs: 'Hargreaves–Samani', hsk: 'Hargreaves × k', hsr: 'Hargreaves (regresión)', pt: 'Priestley–Taylor', turc: 'Turc' };

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300; }
  function opts() {
    const site = state.site || {};
    return {
      kRs: el('b5Krs').value === 'coastal' ? 0.19 : 0.16, arid: parseNum(el('b5Arid').value) || 0, windDefault: parseNum(el('b5Wind').value) || 2,
      as: parseNum(el('b5As').value) || 0.25, bs: parseNum(el('b5Bs').value) || 0.5, albedo: parseNum(el('b5Albedo').value) || 0.23, ptAlpha: parseNum(el('b5Alpha').value) || 1.26,
      hsCoef: parseNum(el('b5HsCoef').value) || 0.0023, hsExp: parseNum(el('b5HsExp').value) || 0.5, site,
    };
  }
  function syncSite() {
    const s = state.site; if (!s) return;
    el('b5Krs').value = s.coastal ? 'coastal' : 'interior';
    el('b5Arid').value = s.arid ? 2 : 0;
    el('b5SiteLine').innerHTML = two(`Latitud ${fmtFixed(s.lat, 3)}°, altitud ${s.z} m → P = ${fmtFixed(Agro.pressure(s.z || 0), 1)} kPa, γ = ${fmtFixed(Agro.gamma(Agro.pressure(s.z || 0)), 4)} kPa/°C.`, `Latitude ${fmtFixed(s.lat, 3)}°, elevation ${s.z} m → P = ${fmtFixed(Agro.pressure(s.z || 0), 1)} kPa, γ = ${fmtFixed(Agro.gamma(Agro.pressure(s.z || 0)), 4)} kPa/°C.`);
  }

  function run() {
    if (!ready()) { el('b5Body').style.display = 'none'; el('b5Empty').style.display = ''; return; }
    el('b5Empty').style.display = 'none'; el('b5Body').style.display = '';
    const o = opts();
    const rows = state.weather.rows, site = state.site || { lat: 20, z: 0 };
    const res = Eto5.compute(rows, site, o);
    const mon = { pm: Eto5.monthly(rows, res.pm), hs: Eto5.monthly(rows, res.hs), pt: Eto5.monthly(rows, res.pt), turc: Eto5.monthly(rows, res.turc) };
    const yr = { pm: Eto5.yearly(rows, res.pm), hs: Eto5.yearly(rows, res.hs), pt: Eto5.yearly(rows, res.pt), turc: Eto5.yearly(rows, res.turc) };
    const tw = state.climate && state.climate.nm ? Eto5.thornthwaite(state.climate.nm, site.lat) : null;
    const cal = Eto5.calibrate(res.pm, res.hs, rows);
    const calPT = Eto5.calibrate(res.pm, res.pt, rows), calTurc = Eto5.calibrate(res.pm, res.turc, rows);
    const shares = Eto5.termShares(rows, res), rad = Eto5.radiation(rows, res), dq = Eto5.dailyQuantiles(rows, res.pm);
    const method = el('b5Use').value;
    const daily = Eto5.chosen(res, method, cal);
    state.eto = { res, mon, yr, tw, cal, calPT, calTurc, shares, rad, dq, method, daily, opts: o };
    renderSummary(res, mon, yr, cal, shares);
    renderMonthly(mon, tw, dq);
    renderCalibration(cal, calPT, calTurc, res);
    renderChoice(method, cal, daily, rows);
    Plots5.methods('b5Methods', mon, tw);
    Plots5.record('b5Record', rows, res.pm, res.hs);
    Plots5.terms('b5Terms', shares);
    Plots5.radiation('b5Radiation', rad);
    Plots5.scatter('b5Scatter', res.pm, res.hs, cal, 'Hargreaves');
    Plots5.yearlyTotals('b5Yearly', yr);
    Fig.decorate(el('panel-5'));
    document.dispatchEvent(new CustomEvent('etochange'));
  }

  function renderSummary(res, mon, yr, cal, shares) {
    const n = res.notes;
    const annual = yr.pm.length ? Stat.mean(yr.pm.map(a => a.total)) : null;
    const meanDay = Stat.mean(res.pm.filter(v => v != null));
    const peak = mon.pm.reduce((a, b) => (b.perDay != null && (a.perDay == null || b.perDay > a.perDay) ? b : a), mon.pm[0]);
    const aeroShare = Stat.mean(shares.map(s => s.share).filter(v => v != null));
    const estHum = n.tmin / n.days, estRad = n.hargreaves / n.days, estWind = n.wind2 / n.days;
    const tiles = [
      [T('ETo anual (Penman–Monteith)', 'Annual ETo (Penman–Monteith)'), annual != null ? fmtMm(annual, 0) : '—', yr.pm.length ? T(`media de ${yr.pm.length} años completos`, `mean of ${yr.pm.length} complete years`) : ''],
      [T('ETo media diaria', 'Mean daily ETo'), fmtFixed(meanDay, 2) + ' mm' + Help.tag('eto', meanDay), peak.perDay != null ? T(`máximo en ${monthName(peak.m)}: ${fmtFixed(peak.perDay, 2)} mm/día`, `peak in ${monthName(peak.m)}: ${fmtFixed(peak.perDay, 2)} mm/day`) : ''],
      [T('Término aerodinámico', 'Aerodynamic term'), fmtPct(aeroShare, 0), T('de la ETo; el resto es radiación', 'of ETo; the rest is radiation'), aeroShare > 0.5 ? 'warn' : ''],
      [T('Datos estimados', 'Estimated data'), `${fmtPct(estHum, 0)} · ${fmtPct(estRad, 0)} · ${fmtPct(estWind, 0)}`, T('humedad · radiación · viento (días)', 'humidity · radiation · wind (days)'), estHum + estRad + estWind === 0 ? 'ok' : estHum + estRad + estWind >= 2.5 ? 'warn' : ''],
      [T('Hargreaves contra PM', 'Hargreaves against PM'), cal ? fmtFixed(cal.k, 3) + Help.tag('etomethods', Math.abs(1 - cal.k)) : '—', cal ? T(`factor k · RMSE ${fmtFixed(cal.rmse, 2)} mm/día · R² ${fmtFixed(cal.r2, 2)}`, `factor k · RMSE ${fmtFixed(cal.rmse, 2)} mm/day · R² ${fmtFixed(cal.r2, 2)}`) : ''],
    ];
    statTiles('b5Tiles', tiles);
    const parts = [];
    if (estHum > 0) parts.push(T(`la humedad se estimó del punto de rocío ≈ Tmin${res.opts.arid ? ' − ' + res.opts.arid + ' °C' : ''} en ${fmtPct(estHum, 0)} de los días (FAO-56, ec. 48)`, `humidity was estimated from dew point ≈ Tmin${res.opts.arid ? ' − ' + res.opts.arid + ' °C' : ''} on ${fmtPct(estHum, 0)} of the days (FAO-56, eq. 48)`));
    if (estRad > 0) parts.push(T(`la radiación se estimó de la amplitud térmica con kRs = ${res.opts.kRs} en ${fmtPct(estRad, 0)} de los días (ec. 50)`, `radiation was estimated from the temperature range with kRs = ${res.opts.kRs} on ${fmtPct(estRad, 0)} of the days (eq. 50)`));
    if (n.sun > 0) parts.push(T(`la radiación salió de las horas de sol con as = ${res.opts.as}, bs = ${res.opts.bs} en ${fmtPct(n.sun / n.days, 0)} de los días (ec. 35)`, `radiation came from sunshine hours with as = ${res.opts.as}, bs = ${res.opts.bs} on ${fmtPct(n.sun / n.days, 0)} of the days (eq. 35)`));
    if (estWind > 0) parts.push(T(`el viento se fijó en ${res.opts.windDefault} m/s en ${fmtPct(estWind, 0)} de los días`, `wind was set to ${res.opts.windDefault} m/s on ${fmtPct(estWind, 0)} of the days`));
    el('b5Status').innerHTML = T(`Penman–Monteith se calculó en ${fmtNum(n.days, 0)} días (${n.missing} sin temperatura)${parts.length ? '; ' + parts.join('; ') : ' con todas las variables medidas'}. El informe repetirá esta frase tal cual.`,
      `Penman–Monteith was computed on ${fmtNum(n.days, 0)} days (${n.missing} without temperature)${parts.length ? '; ' + parts.join('; ') : ' with every variable measured'}. The report will repeat this sentence as it stands.`)
      + (cal ? ' ' + T(`Hargreaves ${cal.k > 1.1 ? 'subestima' : cal.k < 0.9 ? 'sobreestima' : 'sigue de cerca'} a Penman–Monteith aquí (k = ${fmtFixed(cal.k, 2)})${cal.k > 1.1 || cal.k < 0.9 ? ': si en otro sitio solo tienes temperatura, aplica este factor.' : '.'}`, `Hargreaves ${cal.k > 1.1 ? 'underestimates' : cal.k < 0.9 ? 'overestimates' : 'tracks'} Penman–Monteith here (k = ${fmtFixed(cal.k, 2)})${cal.k > 1.1 || cal.k < 0.9 ? ': if at another site you only have temperature, apply this factor.' : '.'}`) : '');
  }

  function renderMonthly(mon, tw, dq) {
    const rows = mon.pm.map((x, i) => ({ m: x.m, pm: x.perDay, pmM: x.perMonth, p20: x.p20, p80: x.p80, hs: mon.hs[i].perDay, pt: mon.pt[i].perDay, turc: mon.turc[i].perDay, tw: tw ? tw[i].perDay : null, p90: dq[i].p90, max: dq[i].max, n: x.n }));
    const tot = k => { const v = rows.map(r => r[k]); return v.every(x => x != null) ? Stat.sum(v.map((x, i) => x * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i])) : null; };
    rows.push({ _class: 'total-row', m: 0, pm: tot('pm') != null ? tot('pm') / 365 : null, pmM: tot('pm'), hs: tot('hs') != null ? tot('hs') / 365 : null, pt: tot('pt') != null ? tot('pt') / 365 : null, turc: tot('turc') != null ? tot('turc') / 365 : null, tw: tw ? tot('tw') / 365 : null });
    const f2 = v => fmtFixed(v, 2);
    const cols = [{ key: 'm', label: T('Mes', 'Month'), get: r => r.m === 0 ? T('Año', 'Year') : monthName(r.m) },
      { key: 'pm', label: 'PM (mm/d)', num: true, fmt: f2 }, { key: 'pmM', label: T('PM (mm/mes)', 'PM (mm/month)'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'p20', label: 'P20', num: true, fmt: f2 }, { key: 'p80', label: 'P80', num: true, fmt: f2 },
      { key: 'p90', label: T('P90 diario', 'Daily P90'), num: true, fmt: f2 }, { key: 'max', label: T('Máx. diario', 'Daily max'), num: true, fmt: f2 },
      { key: 'hs', label: 'Hargreaves', num: true, fmt: f2 }, { key: 'pt', label: 'Priestley–Taylor', num: true, fmt: f2 }, { key: 'turc', label: 'Turc', num: true, fmt: f2 }];
    if (tw) cols.push({ key: 'tw', label: 'Thornthwaite', num: true, fmt: f2 });
    cols.push({ key: 'n', label: T('Años', 'Years'), num: true });
    buildTable('b5Monthly', cols, rows);
  }

  function renderCalibration(cal, calPT, calTurc, res) {
    const rowsC = [['Hargreaves–Samani', cal], ['Priestley–Taylor', calPT], ['Turc', calTurc]].filter(x => x[1]).map(([name, c]) => ({ name, k: c.k, a: c.a, b: c.b, r2: c.r2, rmse: c.rmse, rmseK: c.rmseK, rmseR: c.rmseR, bias: c.bias, rel: c.relBias }));
    buildTable('b5CalTable', [
      { key: 'name', label: T('Método', 'Method') },
      { key: 'k', label: T('Factor k = PM/método', 'Factor k = PM/method'), num: true, fmt: v => fmtFixed(v, 3) },
      { key: 'bias', label: T('Sesgo (mm/d)', 'Bias (mm/d)'), num: true, fmt: v => fmtFixed(v, 2) },
      { key: 'rel', label: T('Sesgo (%)', 'Bias (%)'), num: true, fmt: v => fmtPct(v, 1) },
      { key: 'rmse', label: T('RMSE (mm/d)', 'RMSE (mm/d)'), html: true, num: true, get: r => fmtFixed(r.rmse, 2) + Help.tag('etocalib', r.rmse) },
      { key: 'r2', label: 'R²', num: true, fmt: v => fmtFixed(v, 3) },
      { key: 'a', label: T('Ordenada a', 'Intercept a'), num: true, fmt: v => fmtFixed(v, 3) }, { key: 'b', label: T('Pendiente b', 'Slope b'), num: true, fmt: v => fmtFixed(v, 3) },
      { key: 'rmseK', label: T('RMSE con k', 'RMSE with k'), num: true, fmt: v => fmtFixed(v, 2) }, { key: 'rmseR', label: T('RMSE con regresión', 'RMSE with regression'), num: true, fmt: v => fmtFixed(v, 2) },
    ], rowsC);
    if (cal) buildTable('b5CalMonths', [{ key: 'm', label: T('Mes', 'Month'), get: r => monthName(r.m, true) }, { key: 'k', label: T('k mensual (PM/HS)', 'Monthly k (PM/HS)'), html: true, num: true, get: r => r.k == null ? '—' : fmtFixed(r.k, 2) + Help.tag('etomethods', Math.abs(1 - r.k)) }], cal.monthlyRatio.map((k, i) => ({ m: i + 1, k })));
    const note = el('b5CalNote');
    if (!cal) { note.innerHTML = ''; return; }
    const pmFull = state.weather.cap && state.weather.cap.pmFull;
    note.innerHTML = two(`${pmFull ? 'Penman–Monteith se calculó con todas las variables medidas, así que esta calibración es la real del sitio.' : 'Atención: Penman–Monteith lleva variables estimadas (' + [res.notes.tmin ? 'humedad' : '', res.notes.hargreaves ? 'radiación' : '', res.notes.wind2 ? 'viento' : ''].filter(Boolean).join(', ') + '), así que la calibración compara dos estimaciones; vale como orden de magnitud y para ver la estacionalidad del sesgo, no como calibración definitiva.'} El factor k corrige el promedio con un solo número; la regresión corrige también la pendiente y suele bajar más el RMSE. Ambos se aplican eligiéndolos abajo.`,
      `${pmFull ? 'Penman–Monteith was computed with every variable measured, so this calibration is the real one of the site.' : 'Note: Penman–Monteith carries estimated variables (' + [res.notes.tmin ? 'humidity' : '', res.notes.hargreaves ? 'radiation' : '', res.notes.wind2 ? 'wind' : ''].filter(Boolean).join(', ') + '), so the calibration compares two estimates; it serves as an order of magnitude and to see the seasonality of the bias, not as a final calibration.'} The factor k corrects the mean with a single number; the regression also corrects the slope and usually lowers the RMSE further. Both are applied by choosing them below.`);
  }

  function renderChoice(method, cal, daily, rows) {
    const v = daily.filter(x => x != null);
    const yr = Eto5.yearly(rows, daily);
    el('b5ChoiceLine').innerHTML = two(`Los Bloques 6 y 7 usarán <b>${NAME[method]}</b>: ${fmtFixed(Stat.mean(v), 2)} mm/día en promedio, ${yr.length ? fmtMm(Stat.mean(yr.map(a => a.total)), 0) + ' al año' : ''}${method === 'hsk' && cal ? ` (k = ${fmtFixed(cal.k, 3)})` : method === 'hsr' && cal ? ` (a = ${fmtFixed(cal.a, 3)}, b = ${fmtFixed(cal.b, 3)})` : ''}.`,
      `Blocks 6 and 7 will use <b>${NAME[method]}</b>: ${fmtFixed(Stat.mean(v), 2)} mm/day on average, ${yr.length ? fmtMm(Stat.mean(yr.map(a => a.total)), 0) + ' a year' : ''}${method === 'hsk' && cal ? ` (k = ${fmtFixed(cal.k, 3)})` : method === 'hsr' && cal ? ` (a = ${fmtFixed(cal.a, 3)}, b = ${fmtFixed(cal.b, 3)})` : ''}.`);
    el('b5Continue').disabled = !STEPS.find(s => s.n === 6).ready;
  }

  function exportDaily() {
    const s = state.eto; if (!s) return;
    const rows = state.weather.rows;
    const head = ['date', 'Ra', 'Rs', 'Rso', 'Rn', 'es', 'ea', 'u2', 'ETo_PM', 'PM_rad', 'PM_aero', 'ETo_HS', 'ETo_PT', 'ETo_Turc', 'ETo_chosen'];
    const f = v => (v == null ? '' : +v.toFixed(3));
    const lines = [head.join(',')].concat(rows.map((r, i) => [toISO(r), f(s.res.ra[i]), f(s.res.rs[i]), f(s.res.rso[i]), f(s.res.rn[i]), f(s.res.es[i]), f(s.res.ea[i]), f(s.res.u2[i]), f(s.res.pm[i]), f(s.res.rad[i]), f(s.res.aero[i]), f(s.res.hs[i]), f(s.res.pt[i]), f(s.res.turc[i]), f(s.daily[i])].join(',')));
    download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_eto_diaria.csv', 'text/csv;charset=utf-8');
  }

  function wire() {
    ['b5Krs', 'b5Arid', 'b5Wind', 'b5As', 'b5Bs', 'b5Albedo', 'b5Alpha', 'b5HsCoef', 'b5HsExp', 'b5Use'].forEach(id => el(id).addEventListener('change', run));
    /* from the button, a long run shows the common waiting window */
    el('b5Run').addEventListener('click', () => { const w = ppWork('Calculando la evapotranspiración', 'Computing evapotranspiration'); ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); });
    el('b5Reset').addEventListener('click', () => { el('b5Wind').value = 2; el('b5As').value = 0.25; el('b5Bs').value = 0.5; el('b5Albedo').value = 0.23; el('b5Alpha').value = 1.26; el('b5HsCoef').value = 0.0023; el('b5HsExp').value = 0.5; syncSite(); run(); });
    el('b5ToData').addEventListener('click', () => goStep(2));
    el('b5Continue').addEventListener('click', () => goStep(6));
    el('b5ExportDaily').addEventListener('click', exportDaily);
    el('b5ExportMonthly').addEventListener('click', () => {
      const s = state.eto; if (!s) return;
      const lines = ['month,PM_mmday,PM_mmmonth,P20,P80,HS,PT,Turc,Thornthwaite'].concat(s.mon.pm.map((x, i) => [x.m, x.perDay, x.perMonth, x.p20, x.p80, s.mon.hs[i].perDay, s.mon.pt[i].perDay, s.mon.turc[i].perDay, s.tw ? s.tw[i].perDay : ''].map(v => v == null || v === '' ? '' : +(+v).toFixed(3)).join(',')));
      download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_eto_mensual.csv', 'text/csv;charset=utf-8');
    });
    document.addEventListener('weatherchange', () => { state.eto = null; syncSite(); if (document.querySelector('#panel-5.active')) run(); });
    document.addEventListener('climatechange', () => { if (document.querySelector('#panel-5.active')) run(); });
    document.addEventListener('stepchange', e => { if (e.detail.step === 5 && !state.eto) { syncSite(); run(); } });
    document.addEventListener('langchange', () => { if (document.querySelector('#panel-5.active') && ready()) run(); });
    syncSite();
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block5 = { run };
})();
