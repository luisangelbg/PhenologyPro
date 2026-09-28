/* PhenologyPro — tests of Block 7: irrigation scheduling. */
(function () {
  const { check, section, near } = window.__t;
  const I = Irrig7;

  section('Bloque 7 · reglas de riego del motor');
  const L = { ini: 20, dev: 30, mid: 40, late: 20 }, kc = { ini: 0.4, mid: 1.15, end: 0.5 };
  const dry = Array.from({ length: 110 }, () => ({ P: 0, eto: 5 }));
  const base = { taw: 140, L, kc, zIni: 0.15, zMax: 1.0, p: 0.5, dr0: 0, cn: 0 };
  const auto = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'auto', trigger: 1, efficiency: 0.8 } }));
  check('auto: riega solo al alcanzar el AFA, sin estrés, bruta = neta / 0.8', auto.totals.events > 3 && auto.totals.stressDays === 0 && near(auto.totals.Igross, auto.totals.I / 0.8));
  const intv = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'interval', interval: 7, efficiency: 1 } }));
  const days = intv.rows.filter(r => r.I > 0).map(r => r.day);
  check('interval: riega cada 7 días exactos desde el primer día con agotamiento', days.length >= 14 && days.every((d, i) => i === 0 || d - days[i - 1] === 7), days.slice(0, 5).join(','));
  const depth = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'depth', depth: 20, efficiency: 1 } }));
  check('depth: cada riego aplica 20 mm cuando el suelo los gastó', depth.rows.filter(r => r.I > 0).every(r => r.I === 20 && r.drStart >= 20) && depth.totals.events > 10);
  const stop = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'auto', trigger: 1, efficiency: 1, stopBefore: 15, startAfter: 5 } }));
  check('startAfter / stopBefore: sin riegos en los primeros 5 ni en los últimos 15 días', stop.rows.filter(r => r.I > 0).every(r => r.day > 5 && r.day <= 110 - 15) && stop.totals.events > 0);
  const minI = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'auto', trigger: 1, efficiency: 1, minInterval: 10 } }));
  const dm = minI.rows.filter(r => r.I > 0).map(r => r.day);
  check('minInterval: nunca dos riegos a menos de 10 días', dm.every((d, i) => i === 0 || d - dm[i - 1] >= 10));
  const deficit = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'auto', trigger: 1.4, efficiency: 1 } }));
  check('déficit controlado: menos transpiración y algo de estrés que al agotar el AFA', deficit.totals.etcAdj < auto.totals.etcAdj && deficit.totals.stressDays > 0 && deficit.totals.ksMean < 1 && deficit.totals.ksMean > 0.7);
  check('con raíz constante el balance de la temporada cierra: riego + agotamiento final = ETc real + percolación', (() => { const b = Agro.balanceDaily(dry, Object.assign({}, base, { zIni: 1.0, irrigation: { mode: 'auto', trigger: 1.4, efficiency: 1 } })); return near(b.totals.I + b.rows[109].dr, b.totals.etcAdj + b.totals.DP, 1e-6); })());
  const fixedNet = Agro.balanceDaily(dry, Object.assign({}, base, { irrigation: { mode: 'auto', trigger: 1, depth: 15, efficiency: 1 } }));
  check('auto con lámina fija: cada riego aplica 15 mm', fixedNet.rows.filter(r => r.I > 0).every(r => r.I === 15));

  section('Bloque 7 · calendario, estrategias, diseño y ahorro');
  const ex = WxIO.exampleSeries('semiarid', 5, false);
  const rows = WxIO.qc(ex.rows, {}).rows;
  const eto = Eto5.compute(rows, ex.site, {}).pm;
  const maize = Crops.byId('maize');
  const params = { crop: maize, m: 4, d: 1, L: maize.L, kc: maize.kc, zIni: maize.zIni, zMax: maize.zMax, p: maize.p, ky: maize.ky, taw: 140, cn: 78, dr0: 0, kcCorrect: true };
  const rule = { mode: 'auto', trigger: 1, depth: null, efficiency: 0.75, stopBefore: 10 };
  const all = I.runAll(rows, eto, params, rule);
  check('runAll: 5 temporadas regadas, con rendimiento relativo ≥ 0.95 y riegos', all.years.length === 5 && all.years.every(r => r.relYield >= 0.95 && r.totals.events > 0));
  const cal = I.calendar(all.years[0], params, 8);
  check('calendar: un renglón por riego, con fecha, etapa, láminas y horas = bruta / 8 × 24', cal.length === all.years[0].totals.events && cal.every(e => e.date && ['ini', 'dev', 'mid', 'late'].includes(e.stage) && near(e.gross, e.net / 0.75, 1e-9) && near(e.hours, e.gross / 8 * 24, 1e-9)));
  check('calendar: los intervalos entre riegos son positivos y las etapas van en orden', cal.slice(1).every((e, i) => e.interval > 0 && ['ini', 'dev', 'mid', 'late'].indexOf(e.stage) >= ['ini', 'dev', 'mid', 'late'].indexOf(cal[i].stage)));
  const st = I.strategies(rows, eto, params, { eff: 0.75, deficit: 1.3, interval: 7, depth: 30, stopBefore: 10 });
  check('strategies: cinco (temporal + cuatro reglas), todas con resumen', st.length === 5 && st.every(s => s.all.summary));
  const byId = id => st.find(s => s.id === id);
  check('strategies: el temporal no riega y rinde menos que al agotar el AFA (sitio semiárido)', byId('none').I.median === 0 && byId('none').relYield.median < byId('raw').relYield.median);
  check('strategies: el déficit controlado usa menos agua que el AFA', byId('deficit').gross.median <= byId('raw').gross.median);
  check('strategies: la lámina fija de 30 mm riega con 30 mm', byId('depth').all.years.every(r => r.bal.rows.filter(x => x.I > 0).every(x => x.I === 30)));
  const mg = I.monthlyGross(all);
  check('monthlyGross: 12 meses; solo riega dentro de la temporada (abril–agosto)', mg.length === 12 && mg.filter(x => x.max > 0).every(x => x.m >= 4 && x.m <= 9) && mg.some(x => x.median > 0));
  const des = I.design(all, params, 0.75);
  check('design: ETc P90 ≤ máximo, capacidad = P90 / 0.75, lámina P80 ≥ mediana, m³/ha = 10 × mm', des.etcP90 <= des.etcMax && near(des.capacity, des.etcP90 / 0.75, 1e-9) && des.grossSeason.p80 >= des.grossSeason.median && near(des.m3haSeason, des.grossSeason.p80 * 10, 1e-9));
  const sav = I.savings(rows, eto, params, { interval: 10, depth: 40, eff: 0.75, stopBefore: 10 }, all);
  check('savings: la costumbre de 40 mm cada 10 días queda comparada con la regla (mm y rendimiento)', sav && sav.custGross.median > 0 && sav.ruleGross.median > 0 && sav.custYield && sav.ruleYield && typeof sav.savedMm === 'number');
  check('Help: 6 fichas del Bloque 7 y escala de eficiencia', Help.BLOCK_KEYS[7].length === 6 && Help.BLOCK_KEYS[7].every(k => Help.HELP[k]) && Help.band('efficiency', 0.9).tone === 'good' && Help.band('efficiency', 0.5).tone === 'bad');

  window.__t.finish();
})();
