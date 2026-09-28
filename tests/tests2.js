/* PhenologyPro — tests of Block 2: reading, checking and cleaning a series.
   Loaded by tests/index.html after the Block 1 tests. */
(function () {
  const { check, section, near } = window.__t;
  const W = WxIO;

  section('Bloque 2 · lectura de tablas');
  check('num: "12,5" → 12.5; "1,234.5" → 1234.5; "1.234,5" → 1234.5', W.num('12,5') === 12.5 && W.num('1,234.5') === 1234.5 && W.num('1.234,5') === 1234.5);
  check('num: faltantes: "", NA, Nulo, -99, -999, 9999 → null; "T" (traza) → 0', W.num('') === null && W.num('NA') === null && W.num('Nulo') === null && W.num('-99') === null && W.num(-999) === null && W.num('9999') === null && W.num('T') === 0);
  check('num: signo menos tipográfico y unidad pegada', W.num('−3.5') === -3.5 && W.num('12.3mm') === 12.3);
  const csv = 'fecha,tmax,tmin,prec\n2020-01-01,22.5,4.1,0\n2020-01-02,23.0,3.6,1.2\n2020-01-04,21.0,2.0,0';
  const t1 = W.parseTable(csv);
  check('parseTable: coma, 4 columnas, 3 filas, encabezado', t1.delimiter === ',' && t1.header.join('|') === 'fecha|tmax|tmin|prec' && t1.rows.length === 3);
  const t2 = W.parseTable('fecha;tmax;tmin\n01/02/2020;22,5;4,1\n02/02/2020;23;3,6');
  check('parseTable: punto y coma con decimales de coma', t2.delimiter === ';' && W.num(t2.rows[0][1]) === 22.5);
  const smn = 'ESTACION : 15170 CHAPINGO\nLATITUD : 19.4925\n\nFECHA      PRECIP   EVAP   TMAX   TMIN\n01/01/1991   0.0    2.3   22.5    4.1\n02/01/1991   Nulo   2.1   23.0    3.6\n03/01/1991   1.5    Nulo  21.0    2.0';
  const t3 = W.parseTable(smn);
  check('parseTable: formato de texto del SMN (espacios, encabezado, preámbulo, Nulo)', t3.delimiter === ' ' && t3.header.join('|') === 'FECHA|PRECIP|EVAP|TMAX|TMIN' && t3.rows.length === 3 && t3.preamble.length === 2, t3.header.join('|') + ' · ' + t3.rows.length);
  const r3 = W.detectRoles(t3.header, t3.rows);
  check('detectRoles: FECHA→date, PRECIP→prec, EVAP→evap, TMAX→tmax, TMIN→tmin', r3.join(',') === 'date,prec,evap,tmax,tmin', r3.join(','));
  check('detectRoles: sinónimos en español e inglés', W.roleFromName('Temperatura Máxima (°C)') === 'tmax' && W.roleFromName('Humedad relativa') === 'rhmean' && W.roleFromName('HRmax') === 'rhmax' && W.roleFromName('Wind speed') === 'wind' && W.roleFromName('Año') === 'year' && W.roleFromName('Día juliano') === 'doy' && W.roleFromName('Insolación') === 'sun' && W.roleFromName('foo') === null,
    [W.roleFromName('Temperatura Máxima (°C)'), W.roleFromName('Humedad relativa'), W.roleFromName('HRmax'), W.roleFromName('Wind speed'), W.roleFromName('Año'), W.roleFromName('Día juliano'), W.roleFromName('Insolación')].join(','));
  check('detectRoles: un solo papel por variable', W.detectRoles(['fecha', 'tmax', 'tmax2'], []).join(',') === 'date,tmax,ignore');
  check('parseDateCell: ISO, dmy, mdy, yyyymmdd, inválida', toISO(W.parseDateCell('2020-03-04')) === '2020-03-04' && toISO(W.parseDateCell('04/03/2020', 'dmy')) === '2020-03-04' && toISO(W.parseDateCell('03/04/2020', 'mdy')) === '2020-03-04' && toISO(W.parseDateCell('20200304')) === '2020-03-04' && W.parseDateCell('31/02/2020', 'dmy') === null);
  check('guessDateOrder: 25/12 es dmy, 12/25 es mdy', W.guessDateOrder(['25/12/2020', '01/01/2021']) === 'dmy' && W.guessDateOrder(['12/25/2020']) === 'mdy');
  const b1 = W.buildSeries(t1, W.detectRoles(t1.header, t1.rows), {});
  check('buildSeries: inserta la fecha ausente (3 de enero) como hueco', b1.rows.length === 4 && b1.meta.missingDates === 1 && b1.rows[2].tmax === null && b1.rows[2].flags._absent === true);
  check('buildSeries: viento en km/h a 10 m → m/s a 2 m', (() => { const t = W.parseTable('fecha,tmax,tmin,viento\n2020-01-01,20,5,36'); const b = W.buildSeries(t, W.detectRoles(t.header, t.rows), { windUnit: 'kmh', windHeight: 10 }); return near(b.rows[0].wind, Agro.u2(10, 10), 0.001); })());
  check('buildSeries: radiación en W/m² → MJ; temperatura en °F → °C', (() => { const t = W.parseTable('fecha,tmax,tmin,rs\n2020-01-01,68,41,200'); const b = W.buildSeries(t, W.detectRoles(t.header, t.rows), { rsUnit: 'wm2', tempUnit: 'f' }); return near(b.rows[0].rs, 17.28, 0.001) && near(b.rows[0].tmax, 20, 1e-9) && near(b.rows[0].tmin, 5, 1e-9); })());
  check('buildSeries: año + mes + día, y año + día juliano', (() => { const t = W.parseTable('anio,mes,dia,tmax,tmin\n2020,2,29,20,5'); const b = W.buildSeries(t, W.detectRoles(t.header, t.rows), {}); const tt = W.parseTable('year,doy,tmax,tmin\n2021,60,20,5'); const bb = W.buildSeries(tt, W.detectRoles(tt.header, tt.rows), {}); return b.meta.first === '2020-02-29' && bb.meta.first === '2021-03-01'; })());
  check('buildSeries: fechas repetidas se descartan y se cuentan', (() => { const t = W.parseTable('fecha,tmax,tmin\n2020-01-01,20,5\n2020-01-01,21,6'); const b = W.buildSeries(t, W.detectRoles(t.header, t.rows), {}); return b.rows.length === 1 && b.meta.duplicates === 1; })());
  check('buildSeries sin fecha devuelve error', W.buildSeries(t1, ['ignore', 'tmax', 'tmin', 'prec'], {}).meta.error === 'nodate');

  section('Bloque 2 · control de calidad');
  const mk30 = () => Array.from({ length: 30 }, (_, i) => { const r = W.emptyRow(2020, 1, i + 1); r.tmax = 20 + (i % 5); r.tmin = 5 + (i % 3); r.prec = i % 4 ? 0 : 8; return r; });
  const dirty = mk30();
  dirty[3].tmax = 99.9; dirty[5].tmax = 2; dirty[5].tmin = 18; dirty[10].tmax = null; dirty[11].tmax = null; dirty[20].prec = -99;
  for (let i = 22; i < 30; i++) dirty[i].tmin = 6.0;
  dirty[8].tmax = 45;
  const q = W.qc(dirty, { maxGap: 3, swap: true });
  check('qc: 99.9 fuera de rango se elimina y luego se interpola (hueco de 1)', q.rows[3].flags.tmax === 'filled' && q.issues.some(i => i.type === 'range' && i.var === 'tmax' && i.value === 99.9));
  check('qc: Tmax < Tmin se intercambian', q.rows[5].tmax === 18 && q.rows[5].tmin === 2 && q.rows[5].flags.tmax === 'swap');
  check('qc: sin intercambio se eliminan ambos', (() => { const q2 = W.qc(mk30().map((r, i) => { if (i === 5) { r.tmax = 2; r.tmin = 18; } return r; }), { swap: false, maxGap: 0 }); return q2.rows[5].tmax === null && q2.rows[5].tmin === null; })());
  check('qc: hueco de 2 días se interpola linealmente', q.rows[10].flags.tmax === 'filled' && q.rows[11].flags.tmax === 'filled' && near(q.rows[10].tmax, dirty[9].tmax + (dirty[12].tmax - dirty[9].tmax) / 3, 0.01));
  check('qc: hueco de 5 días no se interpola con maxGap 3', (() => { const d = mk30(); for (let i = 10; i < 15; i++) d[i].tmax = null; const q2 = W.qc(d, { maxGap: 3 }); return q2.rows[12].tmax === null && q2.stats.tmax.gapsLong === 1 && q2.stats.tmax.longest === 5; })());
  check('qc: una lluvia de −99 que llegó como número sale del rango físico y no se interpola', q.rows[20].prec === null && q.rows[20].flags.prec === 'range' && !q.issues.some(i => i.var === 'prec' && i.action === 'interpolated'));
  check('qc: 8 días de Tmin igual se marcan como planos', q.rows[25].flags.tmin === 'flat' && q.issues.some(i => i.type === 'flat' && i.var === 'tmin'));
  check('qc: un pico de 45 °C entre vecinos de ~20 se marca y se conserva', q.rows[8].tmax === 45 && q.rows[8].flags.tmax === 'spike');
  check('qc: tmean se deriva de los extremos', q.tmeanDerived === 30 && near(q.rows[0].tmean, (q.rows[0].tmax + q.rows[0].tmin) / 2, 0.01) && q.rows[0].flags.tmean === 'derived');
  check('qc: rainZero pone 0 solo donde hay temperaturas medidas', (() => { const d = mk30(); d[4].prec = null; d[6].prec = null; d[6].tmax = null; d[6].tmin = null; d[7].tmax = null; d[7].tmin = null; const q2 = W.qc(d, { rainZero: true, maxGap: 0 }); return q2.rows[4].prec === 0 && q2.rows[4].flags.prec === 'filled' && q2.rows[6].prec === null; })());
  check('qc: estadísticas por variable suman', q.stats.tmax.n + q.stats.tmax.missing === 30 && q.stats.prec.missing === 1);
  const yrs = W.yearTable(W.exampleSeries('temperate', 3, false).rows);
  check('yearTable: 3 años completos del ejemplo limpio', yrs.length === 3 && yrs.every(y => y.complete && y.days === y.total));
  const ex = W.exampleSeries('temperate', 5, true);
  const qx = W.qc(ex.rows, { maxGap: 3, swap: true });
  check('ejemplo con errores: se detectan el rango, la inversión, el pico y el tramo plano', ['range', 'inverted', 'spike', 'flat'].every(t => qx.issues.some(i => i.type === t)), [...new Set(qx.issues.map(i => i.type))].join(','));
  check('ejemplo con errores: quedan huecos largos sin rellenar y años con relleno', qx.stats.tmax.gapsLong >= 3 && qx.years.some(y => !y.complete || y.filled > 0));
  const av = W.availability(qx.rows);
  check('availability: 5 años × 12 meses con porcentajes en [0, 1]', av.length === 5 && av.every(y => y.months.length === 12 && y.months.every(m => m.pct >= 0 && m.pct <= 1)));
  const capT = W.capabilities(qx.stats, { tmax: true, tmin: true, prec: true, rhmean: true, wind: true });
  check('capabilities: con T, P, HR y viento pero sin radiación → PM con estimaciones (rad)', capT.gdd && capT.balance && !capT.pmFull && capT.pmPartial && capT.missing.join() === 'rad');
  check('capabilities: sin lluvia no hay balance', !W.capabilities(qx.stats, { tmax: true, tmin: true, prec: false }).balance);
  const packed = W.pack({ name: 'x', lat: 19.5, z: 2250 }, qx.rows, {});
  const un = W.unpack(JSON.parse(JSON.stringify(packed)));
  check('pack/unpack: ida y vuelta conserva valores, fechas y marcas', un.rows.length === qx.rows.length && un.rows.every((r, i) => r.tmax === qx.rows[i].tmax && toISO(r) === toISO(qx.rows[i]) && (r.flags.tmax || null) === (qx.rows[i].flags.tmax || null)) && un.site.lat === 19.5);
  check('toCSV: encabezado, una línea por día y marcas', (() => { const c = W.toCSV(qx.rows.slice(0, 3), ['tmax', 'tmin']); return c.split('\n').length === 4 && c.startsWith('date,tmax,tmin,flags'); })());
  check('template: se lee de vuelta con los papeles correctos', (() => { const t = W.parseTable(W.template()); return W.detectRoles(t.header, t.rows).join(',') === 'date,tmax,tmin,prec,rhmax,rhmin,wind,sun'; })(), (() => { const t = W.parseTable(W.template()); return W.detectRoles(t.header, t.rows).join(','); })());
  check('Help: 7 fichas del Bloque 2 y escala de años completos', Help.BLOCK_KEYS[2].length === 7 && Help.BLOCK_KEYS[2].every(k => Help.HELP[k]) && Help.band('yearcomplete', 2).tone === 'bad' && Help.band('yearcomplete', 30).tone === 'good');

  window.__t.finish();
})();
