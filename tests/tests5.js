/* PhenologyPro — tests of Block 5: reference evapotranspiration on the series. */
(function () {
  const { check, section, near } = window.__t;
  const E = Eto5;

  section('Bloque 5 · ETo sobre la serie');
  const ex = WxIO.exampleSeries('temperate', 3, false);
  const rows = WxIO.qc(ex.rows, {}).rows;
  const site = ex.site;
  const res = E.compute(rows, site, {});
  check('compute: cinco métodos con un valor por día con temperatura', ['pm', 'hs', 'pt', 'turc'].every(k => res[k].length === rows.length && res[k].every((v, i) => (rows[i].tmax == null) === (v == null))));
  check('compute: Hargreaves coincide con Agro.etoHargreaves día por día', rows.every((r, i) => r.tmax == null || near(res.hs[i], Agro.etoHargreaves(r.tmax, r.tmin, Agro.Ra(site.lat, r.J)), 1e-9)));
  check('compute: Penman–Monteith coincide con Agro.etoPMDaily con las mismas entradas', (() => { const i = 200; const r = rows[i]; const d = Agro.etoPMDaily({ lat: site.lat, z: site.z, J: r.J, tmax: r.tmax, tmin: r.tmin, tmean: r.tmean, rhmean: r.rhmean, u2: r.wind, kRs: 0.16, arid: site.arid ? 2 : 0 }); return near(d.eto, res.pm[i], 1e-9); })());
  check('compute: las notas cuentan los días (humedad de HR media, radiación de Hargreaves, viento medido)', res.notes.days === rows.filter(r => r.tmax != null).length && res.notes.rhmean === res.notes.days && res.notes.hargreaves === res.notes.days && res.notes.windMeasured === res.notes.days && res.notes.wind2 === 0);
  check('compute: sin viento medido se usa el valor por omisión y se anota', (() => { const r2 = rows.map(r => Object.assign({}, r, { wind: null })); const q = E.compute(r2, site, { windDefault: 3 }); return q.notes.wind2 === q.notes.days && q.u2.filter(v => v != null).every(v => v === 3); })());
  check('compute: ETo PM entre 1 y 9 mm/día y media anual del valle templado entre 900 y 1 700 mm', (() => { const v = res.pm.filter(x => x != null); const yr = E.yearly(rows, res.pm); return Math.min(...v) >= 0 && Math.max(...v) < 9 && yr.length === 3 && yr.every(a => a.total > 900 && a.total < 1700); })(), E.yearly(rows, res.pm).map(a => a.total.toFixed(0)).join(', '));
  check('compute: rad + aero = PM', res.pm.every((v, i) => v == null || near(v, res.rad[i] + res.aero[i], 1e-9)));
  check('compute: Rs ≤ Rso ≤ Ra y Rn < Rs', res.pm.every((v, i) => v == null || (res.rs[i] <= res.rso[i] + 1e-9 && res.rso[i] <= res.ra[i] + 1e-9 && res.rn[i] < res.rs[i])));
  check('compute: la HR derivada queda entre 0 y 100', res.rh.every(v => v == null || (v >= 0 && v <= 100)));
  const mon = E.monthly(rows, res.pm);
  check('monthly: 12 meses de 3 años, con P20 ≤ media ≤ P80 y total = media × días', mon.every(x => x.n === 3 && x.p20 <= x.perDay + 1e-9 && x.perDay <= x.p80 + 1e-9) && near(mon[0].perMonth, Stat.mean([31, 31, 31].map((d, k) => d * (mon[0].perMonth / 31))), 1e-6));
  check('monthly: el máximo de ETo cae entre marzo y junio en el valle templado', (() => { const b = mon.reduce((a, x) => (x.perDay > a.perDay ? x : a)); return b.m >= 3 && b.m <= 6; })());
  const dq = E.dailyQuantiles(rows, res.pm);
  check('dailyQuantiles: p50 ≤ p90 ≤ máximo', dq.every(x => x.p50 <= x.p90 && x.p90 <= x.max));
  const cal = E.calibrate(res.pm, res.pm, rows);
  check('calibrate: un método contra sí mismo da k = 1, a = 0, b = 1, R² = 1, RMSE 0', near(cal.k, 1) && near(cal.a, 0, 1e-9) && near(cal.b, 1, 1e-9) && near(cal.r2, 1, 1e-9) && near(cal.rmse, 0, 1e-9));
  const cal2 = E.calibrate(res.pm, res.pm.map(v => (v == null ? null : 0.5 * v)), rows);
  check('calibrate: contra la mitad de sí mismo, k = 2 y b = 2 y la corrección deja RMSE 0', near(cal2.k, 2, 1e-9) && near(cal2.b, 2, 1e-9) && near(cal2.rmseK, 0, 1e-9) && near(cal2.rmseR, 0, 1e-9) && cal2.monthlyRatio.every(v => near(v, 2, 1e-9)));
  const calHS = E.calibrate(res.pm, res.hs, rows);
  check('calibrate HS contra PM: k entre 0.7 y 1.4, R² > 0.5, RMSE tras la regresión ≤ RMSE crudo', calHS.k > 0.7 && calHS.k < 1.4 && calHS.r2 > 0.5 && calHS.rmseR <= calHS.rmse + 1e-9, `k ${calHS.k.toFixed(2)} R² ${calHS.r2.toFixed(2)} RMSE ${calHS.rmse.toFixed(2)}`);
  check('calibrate con menos de 10 pares devuelve null', E.calibrate([1, 2, 3], [1, 2, 3], rows.slice(0, 3)) === null);
  const sh = E.termShares(rows, res);
  check('termShares: 12 meses con partes entre 0 y 1', sh.length === 12 && sh.every(x => x.share >= 0 && x.share <= 1));
  const rad = E.radiation(rows, res);
  check('radiation: Ra de junio > Ra de diciembre a 19.5°N', rad[5].ra > rad[11].ra && rad.every(x => x.rs <= x.rso + 1e-9));
  const nm = Clim3.normals(rows, {});
  const tw = E.thornthwaite(nm, site.lat);
  check('thornthwaite desde las normales: 12 meses positivos que suman entre 600 y 1 100 mm', tw && tw.length === 12 && tw.every(x => x.perMonth > 0) && Stat.sum(tw.map(x => x.perMonth)) > 600 && Stat.sum(tw.map(x => x.perMonth)) < 1100, tw && Stat.sum(tw.map(x => x.perMonth)).toFixed(0));
  check('chosen: pm devuelve PM; hsk multiplica por k; hsr aplica la regresión', (() => { const a = E.chosen(res, 'pm', calHS), b = E.chosen(res, 'hsk', calHS), c = E.chosen(res, 'hsr', calHS); const i = 100; return near(a[i], res.pm[i]) && near(b[i], res.hs[i] * calHS.k) && near(c[i], calHS.a + calHS.b * res.hs[i]); })());
  check('Priestley–Taylor y Turc son menores que PM cuando el aire es seco y ventoso', (() => { const dry = rows.map(r => Object.assign({}, r, { rhmean: 25, wind: 4 })); const q = E.compute(dry, site, {}); const i = 150; return q.pt[i] < q.pm[i] && q.turc[i] < q.pm[i]; })());
  check('Help: 6 fichas del Bloque 5 y escalas de RMSE y del término aerodinámico', Help.BLOCK_KEYS[5].length === 6 && Help.BLOCK_KEYS[5].every(k => Help.HELP[k]) && Help.band('etocalib', 0.3).tone === 'good' && Help.band('etocalib', 2).tone === 'bad' && Help.band('etoterms', 0.7).tone === 'bad');

  window.__t.finish();
})();
