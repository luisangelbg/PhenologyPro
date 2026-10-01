/* PhenologyPro — tests of Block 10: the ZIP writer, the report and the tables. */
(async function () {
  const { check, section, near } = window.__t;

  section('Bloque 10 · escritor ZIP propio');
  const enc = new TextEncoder();
  const longText = 'lluvia,eto,etc\n' + Array.from({ length: 400 }, (_, i) => `${i},${(i * 0.37).toFixed(2)},${(i * 0.51).toFixed(2)}`).join('\n');
  const files = [{ name: 'LEEME.txt', data: 'hola' }, { name: 'cuadros/tabla.csv', data: longText }, { name: 'bin/bytes.bin', data: new Uint8Array([0, 1, 2, 250, 251, 252]) }, { name: 'figuras/ñandú é.svg', data: new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/svg+xml' }) }];
  const blob = await Zip.build(files);
  const buf = await blob.arrayBuffer();
  const v = new DataView(buf);
  check('Zip.build: firma local PK\\3\\4 al inicio y registro final PK\\5\\6 al cierre', v.getUint32(0, true) === 0x04034b50 && v.getUint32(buf.byteLength - 22, true) === 0x06054b50);
  const list = Zip.list(buf);
  check('Zip.list: el directorio central nombra las 4 entradas en orden, con rutas UTF-8', list && list.length === 4 && list.map(e => e.name).join('|') === 'LEEME.txt|cuadros/tabla.csv|bin/bytes.bin|figuras/ñandú é.svg', list && list.map(e => e.name).join('|'));
  check('Zip: los tamaños originales coinciden con los datos y el CRC-32 es el de Fig.crc32', list[0].size === 4 && list[1].size === enc.encode(longText).length && list[2].size === 6 && list[0].crc === Fig.crc32(enc.encode('hola')) && list[2].crc === Fig.crc32(new Uint8Array([0, 1, 2, 250, 251, 252])));
  check('Zip: lo corto se guarda sin comprimir (método 0) y lo largo repetitivo se desinfla (método 8, menor)', list[0].method === 0 && list[2].method === 0 && (typeof CompressionStream === 'undefined' || (list[1].method === 8 && list[1].comp < list[1].size)));
  const back1 = new TextDecoder().decode(await Zip.extract(buf, list[1]));
  const back3 = new TextDecoder().decode(await Zip.extract(buf, list[3]));
  check('Zip.extract: ida y vuelta exacta del texto comprimido y del Blob', back1 === longText && back3 === '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const stored = await Zip.build(files, { compress: false });
  check('Zip.build sin compresión: todas las entradas con método 0 y el archivo pesa más', Zip.list(await stored.arrayBuffer()).every(e => e.method === 0) && stored.size >= blob.size);
  const cd = list.reduce((s, e) => s, 0);
  check('Zip: los desplazamientos del directorio apuntan a cabeceras locales válidas', list.every(e => v.getUint32(e.offset, true) === 0x04034b50));

  section('Bloque 10 · el informe se redacta con lo calculado');
  /* a whole study built with the engines, as the blocks would */
  const ex = WxIO.exampleSeries('temperate', 6, false);
  const q = WxIO.qc(ex.rows, {});
  const rows = q.rows, site = ex.site;
  const present = {}; WxIO.VARS.forEach(vv => { present[vv.id] = rows.some(r => r[vv.id] != null); });
  state.site = site;
  state.weather = { rows, stats: q.stats, years: q.years, meta: { first: toISO(rows[0]), last: toISO(rows[rows.length - 1]), nDays: rows.length, present }, present, cap: WxIO.capabilities(q.stats, present), qc: q.opts, issues: q.issues.length };
  const nm = Clim3.normals(rows, {});
  const rr = Clim3.rainRegime(rows, nm, site.lat, {}), fr = Clim3.frost(rows, nm, { threshold: 0 }), ind = Clim3.indices(nm, site.lat, 100), kp = Clim3.koppen(nm, site.lat);
  state.climate = { nm, cg: Clim3.climograph(nm), rr, fr, ind, kp, garcia: Clim3.garciaHumidity(ind.ptRatio, kp && kp.code), awc: 100, years: null };
  const maize = Crops.byId('maize');
  const p4 = { crop: maize, method: 'capped', base: 10, upper: 30, cutoff: 'horizontal', m: 4, d: 15, target: Crops.gddToMaturity(maize), season: Crops.seasonLength(maize), stopAtFrost: false, frostThr: 0 };
  const dd = Therm4.daily(rows, p4);
  const by = Therm4.byYear(rows, dd, 4, 15, { target: p4.target, horizon: p4.season + 60, season: p4.season });
  state.degreeDays = { params: p4, dd, by, med: Therm4.medianCurve(by.years), map: Therm4.sowingMap(rows, dd, { step: 5, season: p4.season, target: p4.target }), months: Therm4.monthly(rows, dd), annual: Therm4.annual(rows, dd), cmp: null, cmpYear: null };
  const res5 = Eto5.compute(rows, site, {});
  const cal = Eto5.calibrate(res5.pm, res5.hs, rows);
  state.eto = { res: res5, mon: { pm: Eto5.monthly(rows, res5.pm), hs: Eto5.monthly(rows, res5.hs), pt: Eto5.monthly(rows, res5.pt), turc: Eto5.monthly(rows, res5.turc) }, yr: { pm: Eto5.yearly(rows, res5.pm) }, tw: Eto5.thornthwaite(nm, site.lat), cal, calPT: Eto5.calibrate(res5.pm, res5.pt, rows), calTurc: Eto5.calibrate(res5.pm, res5.turc, rows), method: 'pm', daily: res5.pm, opts: res5.opts };
  const p6 = { crop: maize, m: 4, d: 15, L: maize.L, kc: maize.kc, zIni: maize.zIni, zMax: maize.zMax, p: maize.p, ky: maize.ky, taw: 140, cn: 78, dr0: 0.5, kcCorrect: true, irrigation: { mode: 'none' } };
  const all6 = Water6.runAll(rows, res5.pm, p6);
  state.balance = { params: p6, all: all6, bySowing: Water6.bySowing(rows, res5.pm, p6, 10), monthlyNeed: Water6.monthlyNeed(rows, res5.pm), etoMethod: 'pm' };
  const rule = { mode: 'auto', trigger: 1, depth: null, efficiency: 0.75, stopBefore: 10, minInterval: 1, startAfter: 0 };
  const all7 = Irrig7.runAll(rows, res5.pm, p6, rule);
  state.irrigation = { params: p6, rule, all: all7, strategies: Irrig7.strategies(rows, res5.pm, p6, { eff: 0.75 }), monthly: Irrig7.monthlyGross(all7), design: Irrig7.design(all7, p6, 0.75), savings: null, capacity: 0, cust: { interval: 10, depth: 40 } };
  const st8 = maize.stages.map(s => ({ code: s.code, es: s.es, en: s.en, gdd: s.gdd }));
  const p8 = { method: 'capped', base: 10, upper: 30, cutoff: 'horizontal', m: 4, d: 15, horizon: 400 };
  const res8 = Pheno8.stagesByYear(rows, Therm4.daily(rows, p8), 4, 15, st8, p8);
  const seasons = Pheno8.winterSeasons(rows, site.lat, { startM: 11, endM: 2 });
  state.phenology = { params: p8, stages: st8, res: res8, sowJ: doy(2025, 4, 15), photoperiod: Pheno8.photoperiod(site.lat), crop: 'maize', calibration: null, chill: { seasons, summary: Pheno8.chillSummary(seasons, { unit: 'cp', value: 40 }), unit: 'cp', req: 40, bloom: null, startM: 11, endM: 2 } };
  const thr = { frost: 0, heat: 35 };
  const risk = Risk9.stageRisk(rows, p8, st8, thr, '65');
  const sw = Risk9.sowingWindow(rows, res5.pm, p8, st8, { step: 5, thr, sensitive: '65', yieldMin: 0.75, useWater: true, water: p6, frostWhere: 'sensitive', target: 0.8 });
  state.risk = { crop: 'maize', p: p8, stages: st8, source: 'catalog', thr, sensitive: '65', risk, daily: Risk9.dailyRisk(rows, thr), window: sw, water: true, scenarios: [0, 2].map(dT => Risk9.scenario(rows, site, p8, st8, { dT, dP: 0, thr, sensitive: '65', water: p6 })) };

  const html = Report.build({ author: 'Prueba', title: 'Estudio de prueba' });
  const count = re => (html.match(re) || []).length;
  check('Report.build: documento HTML completo, autocontenido y con título', /^<!DOCTYPE html>/.test(html) && html.includes('<title>Estudio de prueba</title>') && html.includes('Prueba') && !/<script/i.test(html) && !/src="http/.test(html));
  check('Report.build: 8 secciones de bloque numeradas 1…8 en orden, más Métodos, Referencias, Cómo citar y Anexo', [1, 2, 3, 4, 5, 6, 7, 8].every(n => html.includes(`<h2>${n}. `)) && !html.includes('<h2>9. ') && count(/<h2>/g) === 12);
  check('Report.build: los cuadros van numerados sin saltos y son más de 15', (() => { const nums = [...html.matchAll(/(?:Cuadro|Table) (\d+)\./g)].map(m => +m[1]); return nums.length >= 15 && nums.every((n, i) => n === i + 1); })(), 'cuadros: ' + count(/<table>/g));
  check('Report: la frase de la ETo dice cuántos días se estimó la humedad y la radiación (la serie de ejemplo no las trae)', /Penman–Monteith FAO-56 (se calculó|was computed) en? ?[\d,]+ (días|days)/.test(html.replace(/&nbsp;/g, ' ')) && (res5.notes.hargreaves === 0 || html.includes('kRs = 0.16')) && (res5.notes.tmin === 0 || html.includes('(ec. 48)') || html.includes('(eq. 48)')));
  check('Report: los métodos nombran lo que se corrió (promedio acotado, número de curva, Doorenbos y Kassam, Linvill, método delta)', html.includes('promedio acotado') && html.includes('número de curva') && html.includes('Doorenbos y Kassam') && html.includes('Linvill') && html.includes('método delta'));
  check('Report: los requerimientos térmicos se llaman orientativos porque no hubo calibración', html.includes('orientativos') && !html.includes('calibrados con fechas observadas'));
  /* the bibliography lives in home.js, which this page does not load: the list is checked in the app; here, its shape */
  check('Report: las referencias citan a Peel 2007 en el texto, y la lista termina con la cita del programa con su versión', html.includes('Peel') && html.includes(`versión ${APP_VERSION}`) && html.indexOf('<h2>Referencias') < html.indexOf('Barrera-Guzmán, L.Á. (2026). PhenologyPro') && (!window.Home || html.includes('Allen, R.G., Pereira')));
  check('Report: el anexo lleva el registro de cálculo en JSON con la versión y los parámetros de cada bloque', html.includes('Registro de cálculo') && html.includes(`"version": "${APP_VERSION}"`) && html.includes('"cutoff": "horizontal"') && html.includes('"efficiency": 0.75'));
  check('Report: sin figuras en esta página de pruebas (no hay SVG dibujados) y sin errores por ello', count(/<figure>/g) === 0);
  const partial = Report.build({ include: { irrigation: false, risk: false }, appendix: false });
  check('Report.build con secciones excluidas: renumera 1…6, omite el riego en los métodos y el anexo', partial.includes('<h2>6. ') && !partial.includes('<h2>7. ') && !partial.includes('calendario de riego aplica') && !partial.includes('Registro de cálculo') && partial.includes('Doorenbos y Kassam'));
  const savedLang = I18N.lang; I18N.lang = 'en';
  const en = Report.build({});
  I18N.lang = savedLang;
  check('Report.build en inglés: lang="en", títulos y métodos traducidos', en.includes('<html lang="en">') && en.includes('Reference evapotranspiration') && en.includes('capped average') && en.includes('Doorenbos and Kassam') && !en.includes('Balance hídrico del cultivo'));

  section('Bloque 10 · cuadros, registro y resumen');
  const csvs = Report.csvs();
  const names = csvs.map(c => c.name);
  check('Report.csvs: 12 cuadros con la serie limpia, normales, grados-día, ETo, balance, riego, fenología, frío y ventana', csvs.length === 12 && ['cuadros/serie_limpia.csv', 'cuadros/normales_mensuales.csv', 'cuadros/eto_diaria.csv', 'cuadros/balance_por_anio.csv', 'cuadros/riego_por_anio.csv', 'cuadros/fenologia_por_anio.csv', 'cuadros/frio_invernal.csv', 'cuadros/ventana_siembra.csv'].every(n => names.includes(n)), names.join(', '));
  const etoCsv = csvs.find(c => c.name === 'cuadros/eto_diaria.csv').text.split('\n');
  check('Report.csvs: la ETo diaria tiene cabecera + un renglón por día, con la fecha ISO y la ETo PM del motor', etoCsv.length === rows.length + 1 && etoCsv[0].startsWith('date,Ra,Rs') && etoCsv[1].startsWith(toISO(rows[0])) && near(+etoCsv[1].split(',')[7], +res5.pm[0].toFixed(4), 1e-3));
  const normCsv = csvs.find(c => c.name === 'cuadros/normales_mensuales.csv').text.split('\n');
  check('Report.csvs: las normales traen 12 meses y la lluvia anual suma la de las normales', normCsv.length === 13 && near(normCsv.slice(1).reduce((s, l) => s + +l.split(',')[6], 0), nm.annual.P, 0.05));
  const pr = Report.params();
  check('Report.params: app, versión, sitio, y un apartado por bloque con lo esencial', pr.app === 'PhenologyPro' && pr.version === APP_VERSION && pr.site.name === site.name && pr.degreeDays.method === 'capped' && pr.degreeDays.crop === 'maize' && pr.eto.method === 'pm' && pr.balance.taw === 140 && pr.irrigation.rule.mode === 'auto' && pr.phenology.calibrated === false && pr.phenology.chill.req === 40 && pr.risk.scenarios.length === 2 && pr.risk.window.target === 0.8);
  check('Report.params: no arrastra las series ni los cuadros (es un registro, no un volcado)', JSON.stringify(pr).length < 6000, String(JSON.stringify(pr).length));
  const sum = Report.summary();
  check('Report.summary: una línea por bloque con resultado (clima, heladas, ETo, madurez, temporal, riego, ventana, frío)', sum.length === 8 && sum.some(s => /Köppen|Clima/.test(s)) && sum.some(s => /ETo anual/.test(s)) && sum.some(s => /riegos/.test(s)));
  /* a study with fewer blocks */
  const keep = { irrigation: state.irrigation, phenology: state.phenology, risk: state.risk };
  state.irrigation = null; state.phenology = null; state.risk = null;
  const fewer = Report.build({});
  check('Report.build con 5 bloques: 5 secciones, sin frío ni riesgo en métodos ni referencias de frío', fewer.includes('<h2>5. ') && !fewer.includes('<h2>6. ') && !fewer.includes('Linvill') && !fewer.includes('Richardson, E.A.') && Report.csvs().length === 7 && Report.summary().length === 5);
  Object.assign(state, keep);
  check('Help: 5 fichas del Bloque 10 con la escala de resolución', Help.BLOCK_KEYS[10].length === 5 && Help.BLOCK_KEYS[10].every(k => Help.HELP[k]) && Help.band('dpi', 300).tone === 'good' && Help.band('dpi', 100).tone === 'ok');
  check('STEPS: los diez bloques listos y la versión es 1.x', STEPS.every(s => s.ready) && /^1\.\d+\.\d+$/.test(APP_VERSION));

  window.__t.finish();
})();
