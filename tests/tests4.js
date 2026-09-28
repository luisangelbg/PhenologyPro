/* PhenologyPro — tests of Block 4: thermal time on the series. */
(function () {
  const { check, section, near } = window.__t;
  const H = Therm4;

  section('Bloque 4 · tiempo térmico sobre la serie');
  /* a constant year: 30/20 every day → 15 °C·d/day at base 10 */
  const flat = [];
  for (let y = 2020; y <= 2022; y++) for (let J = 1; J <= daysInYear(y); J++) { const d = fromDoy(y, J); const r = WxIO.emptyRow(y, d.m, d.d); r.tmax = 30; r.tmin = 20; r.prec = 0; flat.push(r); }
  const dd = H.daily(flat, { method: 'average', base: 10, upper: 30 });
  check('daily: 15 °C·d en cada día constante; null donde falta una temperatura', dd.every(v => near(v, 15)) && H.daily([Object.assign({}, flat[0], { tmax: null })], {})[0] === null);
  check('daily coincide con Agro.degreeDay para cada método', ['average', 'capped', 'triangle', 'sine', 'doubleSine', 'doubleTriangle'].every(m => near(H.daily(flat.slice(0, 2), { method: m, base: 12, upper: 28 })[0], Agro.degreeDay(m, 30, 20, 12, 28, 'horizontal', 20))));
  check('daily con CHU = Agro.chu', near(H.daily(flat.slice(0, 1), { method: 'chu' })[0], Agro.chu(30, 20)));
  const i0 = H.indexOf(flat, 2021, 4, 15);
  check('indexOf da la fila del 15 de abril de 2021', i0 != null && flat[i0].y === 2021 && flat[i0].m === 4 && flat[i0].d === 15 && H.indexOf(flat, 2019, 1, 1) === null);
  const one = H.fromDate(flat, dd, i0, { target: 1450, horizon: 200 });
  check('fromDate: 1450 / 15 = 96.67 días, interpolado', near(one.days, 96.6667, 1e-3) && one.reached === 96 && one.missing === 0);
  check('fromDate: marcas a 30, 60, 90 días = 450, 900, 1350', one.at[30] === 450 && one.at[60] === 900 && one.at[90] === 1350);
  check('fromDate: se detiene al alcanzar la meta (y sigue si stopAtTarget es falso)', one.cum.length === 97 && near(one.total, 1455) && H.fromDate(flat, dd, i0, { target: 1450, horizon: 200, stopAtTarget: false }).cum.length === 200);
  const noTarget = H.fromDate(flat, dd, i0, { target: null, horizon: 100 });
  check('fromDate sin meta corre el horizonte completo', noTarget.cum.length === 100 && near(noTarget.total, 1500) && noTarget.days === null);
  const gap = flat.map(r => Object.assign({}, r)); for (let k = 0; k < 10; k++) gap[i0 + 5 + k].tmax = null;
  const ddg = H.daily(gap, { base: 10 });
  const withGap = H.fromDate(gap, ddg, i0, { target: null, horizon: 30 });
  check('fromDate: los días sin dato no suman y se cuentan', withGap.missing === 10 && near(withGap.total, 20 * 15));
  const frosty = flat.map(r => Object.assign({}, r)); frosty[i0 + 40].tmin = -1;
  const ddf = H.daily(frosty, { base: 10 });
  const fr = H.fromDate(frosty, ddf, i0, { target: 1450, horizon: 200, stopAtFrost: true, frostThr: 0 });
  check('fromDate: con stopAtFrost la acumulación se corta en la helada del día 40', fr.frostAt === 40 && fr.days === null && fr.cum.length === 41);
  const by = H.byYear(flat, dd, 4, 15, { target: 1450, horizon: 200 });
  check('byYear: los tres años alcanzan la meta en 96.7 días', by.n === 3 && by.pReached === 1 && near(by.days.median, 96.6667, 1e-3) && by.days.sd === 0);
  check('byYear ignora los años sin fecha (31 de febrero → 28/29)', H.byYear(flat, dd, 2, 31, { target: 100, horizon: 60 }).n === 3);
  const med = H.medianCurve(by.years);
  check('medianCurve: la mediana de tres años iguales es la misma curva', med.median.length === 200 && near(med.median[9], 150) && near(med.p20[9], 150));
  const map = H.sowingMap(flat, dd, { step: 30, season: 120, target: 1000 });
  check('sowingMap: cada fecha da 1800 °C·d en 120 días y 66.7 días a la meta', map.rows.filter(r => r.n > 0).every(r => near(r.total.median, 1800) && near(r.days.median, 66.667, 1e-3) && r.pReached === 1));
  check('sowingMap: la mejor fecha existe con ese éxito', map.best != null && map.best.pReached === 1);
  const months = H.monthly(flat, dd);
  check('monthly: 15 °C·d por día en cada mes y el total del mes = 15 × días', months.every(x => near(x.perDay, 15) && x.n === 3) && near(months[0].perMonth, 15 * 31) && near(months[3].perMonth, 15 * 30));
  const ann = H.annual(flat, dd);
  check('annual: 3 años completos de 15 × días', ann.length === 3 && near(ann[0].total, 15 * 366) && near(ann[1].total, 15 * 365));
  const cmp = H.compareMethods(flat, i0, 100, 10, 30);
  check('compareMethods: 6 métodos × 4 cortes; con Tmin ≥ base y Tmax ≤ umbral todos dan 1500', cmp.rows.length === 6 && cmp.rows.every(r => ['none', 'horizontal', 'intermediate', 'vertical'].every(c => r[c] == null || near(r[c], 1500))) && near(cmp.chu, 100 * Agro.chu(30, 20)));
  /* a cool series where the methods do differ */
  const cool = flat.map(r => Object.assign({}, r, { tmax: 22, tmin: 4 }));
  const cmpC = H.compareMethods(cool, i0, 100, 10, 30);
  const avg = cmpC.rows.find(r => r.method === 'average').horizontal, sin = cmpC.rows.find(r => r.method === 'sine').horizontal, tri = cmpC.rows.find(r => r.method === 'triangle').horizontal;
  check('compareMethods: en días frescos seno > triángulo > promedio', sin > tri && tri > avg, `${sin.toFixed(0)} > ${tri.toFixed(0)} > ${avg.toFixed(0)}`);
  /* the real example: the temperate valley with maize */
  const ex = WxIO.qc(WxIO.exampleSeries('temperate', 10, false).rows, {}).rows;
  const ddx = H.daily(ex, { method: 'capped', base: 10, upper: 30 });
  const byx = H.byYear(ex, ddx, 4, 15, { target: 1450, horizon: 260 });
  check('valle templado, maíz del 15 de abril: madura en 150–230 días en la mediana y en ≥ 80 % de los años', byx.days && byx.days.median > 150 && byx.days.median < 230 && byx.pReached >= 0.8, byx.days && `${byx.days.median.toFixed(0)} d · ${(byx.pReached * 100).toFixed(0)} %`);
  const mapx = H.sowingMap(ex, ddx, { step: 10, season: 200, target: 1450 });
  check('mapa de siembra del valle templado: el máximo de °C·d en 200 días arranca entre enero y abril (ventana centrada en la primavera cálida)', (() => { const best = mapx.rows.filter(r => r.total).reduce((a, b) => (b.total.median > a.total.median ? b : a)); return best.J >= 1 && best.J <= 120; })(), (() => { const best = mapx.rows.filter(r => r.total).reduce((a, b) => (b.total.median > a.total.median ? b : a)); return fmtDoy(best.J); })());
  check('mapa: P20 ≤ mediana ≤ P80 en todas las fechas', mapx.rows.filter(r => r.total).every(r => r.total.p20 <= r.total.median && r.total.median <= r.total.p80));
  check('Help: 6 fichas del Bloque 4 y escala del CV', Help.BLOCK_KEYS[4].length === 6 && Help.BLOCK_KEYS[4].every(k => Help.HELP[k]) && Help.band('gddvar', 0.03).tone === 'good' && Help.band('gddvar', 0.25).tone === 'bad');

  window.__t.finish();
})();
