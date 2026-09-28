/* PhenologyPro — tests of Block 6: the water balance of the crop on the series. */
(function () {
  const { check, section, near } = window.__t;
  const W = Water6;

  section('Bloque 6 · balance hídrico del cultivo');
  const ex = WxIO.exampleSeries('temperate', 5, false);
  const rows = WxIO.qc(ex.rows, {}).rows;
  const eto = Eto5.compute(rows, ex.site, {}).pm;
  const maize = Crops.byId('maize');
  const params = { crop: maize, m: 5, d: 15, L: maize.L, kc: maize.kc, zIni: maize.zIni, zMax: maize.zMax, p: maize.p, ky: maize.ky, taw: 140, cn: 78, dr0: 0.5, kcCorrect: true, irrigation: { mode: 'none' } };
  check('El catálogo trae Ky de FAO-33 para todos los cultivos', Crops.LIST.every(c => c.ky >= 0.5 && c.ky <= 1.5) && maize.ky === 1.25 && Crops.byId('sorghum').ky === 0.9);
  const mm = W.monthlyMeanOf(rows, eto);
  check('monthlyMeanOf: 12 medias positivas', mm.length === 12 && mm.every(v => v > 0));
  const kc = W.kcSeason(rows, Therm4.indexOf(rows, 2023, 5, 15), maize, params);
  check('kcSeason: corrige Kc mid y end con el viento y la humedad de la temporada', kc.corrected && kc.ini === 0.3 && Math.abs(kc.mid - 1.2) < 0.15 && near(kc.mid, Agro.kcAdjust(1.2, kc.u2, kc.rhmin, maize.h), 1e-9));
  check('kcSeason sin corrección deja los valores de la tabla', !W.kcSeason(rows, 0, maize, Object.assign({}, params, { kcCorrect: false })).corrected);
  const y23 = W.runYear(rows, eto, 2023, params);
  check('runYear: 140 filas, 4 etapas, rendimiento relativo en [0, 1]', y23 && y23.bal.rows.length === 140 && y23.stages.length === 4 && y23.relYield >= 0 && y23.relYield <= 1);
  check('runYear: cierre diario del balance', y23.bal.rows.every(x => near(x.dr, x.drStart - x.Pe - x.I + x.etcAdj + x.DP, 1e-9)));
  check('runYear: las etapas suman los totales', near(Stat.sum(y23.stages.map(s => s.etc)), y23.totals.etc, 1e-6) && near(Stat.sum(y23.stages.map(s => s.pe)), y23.totals.Pe, 1e-6) && y23.stages.map(s => s.days).join() === '25,40,45,30');
  check('runYear: rendimiento relativo = 1 − Ky (1 − ETa/ETm)', near(y23.relYield, Math.max(0, Math.min(1, 1 - 1.25 * (1 - y23.ratio))), 1e-9));
  check('runYear: sin lluvia y sin riego hay estrés y rendimiento bajo', (() => { const dry = rows.map(r => Object.assign({}, r, { prec: 0 })); const r = W.runYear(dry, eto, 2023, params); return r.totals.stressDays > 50 && r.relYield < 0.6; })());
  check('runYear: con riego automático no hay estrés y el rendimiento es 1', (() => { const r = W.runYear(rows, eto, 2023, Object.assign({}, params, { irrigation: { mode: 'auto', trigger: 1, depth: null, efficiency: 0.8 } })); return r.totals.stressDays === 0 && near(r.relYield, 1); })());
  check('runYear devuelve null cuando la temporada sale del registro', W.runYear(rows, eto, 2025, Object.assign({}, params, { m: 11 })) === null);
  const all = W.runAll(rows, eto, params);
  check('runAll: 5 años, resumen con medianas y percentiles, año mediano elegido', all.years.length === 5 && all.summary.n === 5 && all.summary.relYield.p20 <= all.summary.relYield.median && all.summary.relYield.median <= all.summary.relYield.p80 && all.years.some(r => r.y === all.medianYear));
  check('runAll: pGood + pFail ≤ 1 y las etapas del resumen son cuatro', all.summary.pGood + all.summary.pFail <= 1 && all.summary.stages.length === 4);
  const bs = W.bySowing(rows, eto, params, 30);
  check('bySowing: una entrada cada 30 días con rendimiento en [0, 1] y una mejor fecha', bs.rows.length === 13 && bs.rows.filter(r => r.relYield).every(r => r.relYield.p20 >= 0 && r.relYield.p80 <= 1 && r.relYield.p20 <= r.relYield.median) && bs.best != null);
  check('bySowing: sembrar al inicio de las lluvias rinde más que en la seca (valle templado)', (() => { const at = J => bs.rows.find(r => r.J === J); const wet = at(151) || at(121), dry = at(1); return wet && dry && wet.relYield.median >= dry.relYield.median; })());
  const mn = W.monthlyNeed(rows, eto);
  check('monthlyNeed: 12 meses; la necesidad media de los años ≥ máx(0, ETo − Pe) de las medias; Pe ≤ P', mn.length === 12 && mn.every(x => x.P != null && x.need >= Math.max(0, x.eto - x.peUSDA) - 1e-9 && x.need <= x.eto + 1e-9 && x.peUSDA <= x.P + 1e-9));
  check('monthlyNeed: la necesidad es mayor en la seca (marzo–abril) que en julio–agosto en el valle templado', Math.max(mn[2].need, mn[3].need) > Math.max(mn[6].need, mn[7].need));
  check('Help: 8 fichas del Bloque 6 y escalas de Ky y CN', Help.BLOCK_KEYS[6].length === 8 && Help.BLOCK_KEYS[6].every(k => Help.HELP[k]) && Help.band('kyield', 0.95).tone === 'good' && Help.band('kyield', 0.3).tone === 'bad' && Help.band('runoff', 90).tone === 'bad');

  window.__t.finish();
})();
