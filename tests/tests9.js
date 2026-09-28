/* PhenologyPro — tests of Block 9: risks and scenarios. */
(function () {
  const { check, section, near } = window.__t;
  const R = Risk9;

  section('Bloque 9 · riesgo por etapa y por fecha');
  /* three identical warm years with a frost planted on day 60 after 15 April and a heat day on day 30 */
  const rows = [];
  for (let y = 2020; y <= 2022; y++) for (let J = 1; J <= daysInYear(y); J++) { const d = fromDoy(y, J); const r = WxIO.emptyRow(y, d.m, d.d); r.tmax = 30; r.tmin = 20; r.prec = 3; rows.push(r); }
  const p = { method: 'average', base: 10, upper: 30, cutoff: 'horizontal', m: 4, d: 15, horizon: 400 };
  const stages = [{ code: '09', es: 'E', en: 'E', gdd: 75 }, { code: '65', es: 'F', en: 'F', gdd: 750 }, { code: '89', es: 'M', en: 'M', gdd: 1500 }];
  const sw = R.stageWindows(rows, Therm4.indexOf(rows, 2020, 4, 15), stages, p);
  check('stageWindows: emergencia 0–4, floración 5–49, madurez 50–99 (15 °C·d/día)', sw.windows[0].from === 0 && sw.windows[0].to === 4 && sw.windows[1].from === 5 && sw.windows[1].to === 49 && sw.windows[2].from === 50 && sw.windows[2].to === 99 && sw.windows.every(w => w.reached));
  /* now a frost on day 60 (inside the maturity stage) every year and a heat day on day 30 (inside flowering) in two years;
     the perturbed days also change the thermal time a little (−10.5 and +3 °C·d), so the cycle ends on day 99 or 100 */
  [2020, 2021, 2022].forEach(y => { const i = Therm4.indexOf(rows, y, 4, 15); rows[i + 60].tmin = -1; if (y !== 2022) rows[i + 30].tmax = 36; });
  const risk = R.stageRisk(rows, p, stages, { frost: 0, heat: 35 }, '65');
  check('stageRisk: la helada del día 60 cae en la madurez (3 de 3 años) y el calor del día 30 en la floración (2 de 3)', risk.n === 3 && risk.summary[2].pFrost === 1 && risk.summary[2].meanFrost === 1 && near(risk.summary[1].pHeat, 2 / 3) && risk.summary[0].pFrost === 0 && risk.summary[1].sensitive);
  check('stageRisk: el ciclo entero ve helada todos los años y calor en 2 de 3; todos maduran en 100–101 días', risk.pFrostCycle === 1 && near(risk.pHeatCycle, 2 / 3) && risk.pMature === 1 && risk.years.every(r => r.cycleDays >= 100 && r.cycleDays <= 101), risk.years.map(r => r.cycleDays).join(','));
  const dr = R.dailyRisk(rows, { frost: 0, heat: 35 });
  check('dailyRisk: 365 valores; la helada del 14 de junio (día 165 desde el 15 de abril + 60) aparece suavizada ±3 días', dr.frost.length === 365 && dr.frost[164] > 0 && dr.frost[161] > 0 && dr.frost[168] > 0 && dr.frost[150] === 0);

  section('Bloque 9 · ventana de siembra y escenarios');
  const ex = WxIO.exampleSeries('temperate', 6, false);
  const rr = WxIO.qc(ex.rows, {}).rows;
  const eto = Eto5.compute(rr, ex.site, {}).pm;
  const maize = Crops.byId('maize');
  const st = maize.stages.map(s => ({ code: s.code, es: s.es, en: s.en, gdd: s.gdd }));
  const pm = { method: 'capped', base: 10, upper: 30, cutoff: 'horizontal', m: 4, d: 15, horizon: 400 };
  const water = { crop: maize, L: maize.L, kc: maize.kc, zIni: maize.zIni, zMax: maize.zMax, p: maize.p, ky: maize.ky, taw: 140, cn: 78, dr0: 0.5, kcCorrect: true, irrigation: { mode: 'none' } };
  const win = R.sowingWindow(rr, eto, pm, st, { step: 15, thr: { frost: 0, heat: 35 }, sensitive: '65', yieldMin: 0.75, useWater: true, water, target: 0.8 });
  check('sowingWindow: 25 fechas; probabilidades en [0, 1]; el éxito nunca supera a ningún criterio', win.rows.length === 25 && win.rows.filter(r => r.n).every(r => [r.pMature, r.pNoFrost, r.pNoHeat, r.pWater, r.pSuccess].every(v => v >= 0 && v <= 1) && r.pSuccess <= Math.min(r.pMature, r.pNoFrost, r.pNoHeat, r.pWater) + 1e-9));
  check('sowingWindow: hay una mejor fecha y las ventanas son tramos con éxito ≥ objetivo', win.best != null && win.windows.every(w => w.from <= w.to && w.best.pSuccess >= 0.8));
  check('sowingWindow: en el valle templado sembrar en primavera (mar–jun) madura más que en otoño', (() => { const at = J => win.rows.find(r => r.J === J); const spring = at(106) || at(121), autumn = at(271) || at(286); return spring && autumn && spring.pMature >= autumn.pMature; })());
  check('sowingWindow sin agua: pWater es null y el éxito solo depende de calor, helada y golpe de calor', (() => { const w2 = R.sowingWindow(rr, eto, pm, st, { step: 30, thr: { frost: 0, heat: 35 }, sensitive: '65', useWater: false, target: 0.8 }); return w2.rows.every(r => r.pWater == null) && w2.rows.filter(r => r.n).every(r => r.pSuccess <= Math.min(r.pMature, r.pNoFrost, r.pNoHeat) + 1e-9); })());
  const shifted = R.shiftRows(rr, 2, -0.1);
  check('shiftRows: +2 °C en Tmax, Tmin y Tmedia, lluvia × 0.9, humedad intacta', shifted.every((r, i) => (rr[i].tmax == null || near(r.tmax, rr[i].tmax + 2)) && (rr[i].tmin == null || near(r.tmin, rr[i].tmin + 2)) && (rr[i].prec == null || near(r.prec, rr[i].prec * 0.9)) && r.rhmean === rr[i].rhmean));
  const s0 = R.scenario(rr, ex.site, pm, st, { dT: 0, thr: { frost: 0, heat: 35 }, sensitive: '65', water, chill: { startM: 11, endM: 2, req: { unit: 'cp', value: 40 } } });
  const s2 = R.scenario(rr, ex.site, pm, st, { dT: 2, thr: { frost: 0, heat: 35 }, sensitive: '65', water, chill: { startM: 11, endM: 2, req: { unit: 'cp', value: 40 } } });
  check('scenario +2 °C: madura antes, más ETo, menos porciones de frío, menos heladas y más días de calor', s2.daysToMaturity < s0.daysToMaturity && s2.etoAnnual > s0.etoAnnual && s2.chill.cp < s0.chill.cp && s2.risk.meanFrostCycle <= s0.risk.meanFrostCycle && s2.risk.meanHeatCycle >= s0.risk.meanHeatCycle, `${s0.daysToMaturity.toFixed(0)}→${s2.daysToMaturity.toFixed(0)} d · ETo ${s0.etoAnnual.toFixed(0)}→${s2.etoAnnual.toFixed(0)} · CP ${s0.chill.cp.toFixed(1)}→${s2.chill.cp.toFixed(1)}`);
  check('scenario: el clima actual coincide con stageRisk y stagesByYear directos', near(s0.risk.pMature, R.stageRisk(rr, pm, st, { frost: 0, heat: 35 }, '65').pMature) && s0.water && s0.water.relYield >= 0 && s0.water.relYield <= 1);
  check('scenario: la ETc de la temporada crece con +2 °C', s2.water.etc > s0.water.etc);
  check('Help: 7 fichas del Bloque 9 y escalas de éxito y de calor', Help.BLOCK_KEYS[9].length === 7 && Help.BLOCK_KEYS[9].every(k => Help.HELP[k]) && Help.band('sowingwindow', 0.9).tone === 'good' && Help.band('sowingwindow', 0.4).tone === 'bad' && Help.band('heatstress', 0.6).tone === 'bad');

})();
