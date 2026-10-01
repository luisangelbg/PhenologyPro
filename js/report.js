/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 10: the report and the tables of the study.

   The report is one self-contained HTML file: what each block computed, the
   figures inlined as SVG with their colours resolved, the methods written
   from what was actually run (a method that was not used is not described),
   the references of those methods, and an appendix with every parameter, so
   that the study can be repeated. It opens in any browser and prints to PDF.

     Report.build(opts)     → the HTML text
     Report.csvs()          → the tables of the study as .csv files
     Report.params()        → the calculation record, as a plain object
     Report.summary()       → the executive summary lines */

const Report = {};

(function () {

  const two = (es, en) => T(es, en);
  const f0 = v => (v == null || !isFinite(v) ? '—' : fmtNum(v, 0));
  const f1 = v => (v == null || !isFinite(v) ? '—' : fmtFixed(v, 1));
  const f2 = v => (v == null || !isFinite(v) ? '—' : fmtFixed(v, 2));
  const pc = v => (v == null || !isFinite(v) ? '—' : fmtPct(v, 0));
  const fmtDoy = j => (j == null || !isFinite(j) ? '—' : window.fmtDoy(j));
  const viewYear = b => (window.Block6 && Block6.viewYear != null ? Block6.viewYear : b.all.medianYear);

  let figN = 0, tabN = 0;
  let INC = null;   /* the sections the current build includes; null = all */
  const use = k => !!state[k] && (!INC || INC[k] !== false);
  const escPre = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /* ---------- pieces ---------- */
  function table(cols, rows, caption) {
    tabN++;
    return `<table><caption>${two('Cuadro', 'Table')} ${tabN}. ${caption}</caption><thead><tr>${cols.map(c => `<th${c.num ? ' class="num"' : ''}>${c.label}</th>`).join('')}</tr></thead><tbody>` +
      rows.map(r => `<tr>${cols.map(c => { const v = c.get ? c.get(r) : r[c.key]; return `<td${c.num ? ' class="num"' : ''}>${v == null || v === '' ? '—' : v}</td>`; }).join('')}</tr>`).join('') + '</tbody></table>';
  }
  function figure(id, caption) {
    const svg = document.getElementById(id);
    if (!svg || svg.childElementCount <= 1) return '';
    figN++;
    const composed = Fig.compose(svg, { theme: 'light', background: 'white' });
    const xml = Fig.serialize(composed).replace(/^<\?xml[^>]*>\s*/, '').replace(/ width="\d+(\.\d+)?" height="\d+(\.\d+)?"/, '');
    return `<figure><div class="fig">${xml}</div><figcaption>${two('Figura', 'Figure')} ${figN}. ${caption}</figcaption></figure>`;
  }
  const p = s => (s ? `<p>${s}</p>` : '');
  const kv = pairs => `<dl class="kv">${pairs.filter(x => x && x[1] != null && x[1] !== '').map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const sitename = () => (state.site && state.site.name) || two('el sitio', 'the site');
  const cropName = c => (c ? two(c.es, c.en) : '');
  const METHOD = { average: ['promedio', 'average'], capped: ['promedio acotado', 'capped average'], triangle: ['triángulo simple', 'single triangle'], sine: ['seno simple', 'single sine'], doubleTriangle: ['triángulo doble', 'double triangle'], doubleSine: ['seno doble', 'double sine'], chu: ['unidades calor de Ontario', 'Ontario crop heat units'] };
  const CUT = { none: ['sin corte', 'no cut-off'], horizontal: ['horizontal', 'horizontal'], intermediate: ['intermedio', 'intermediate'], vertical: ['vertical', 'vertical'] };
  const mname = m => (m ? two(METHOD[m][0], METHOD[m][1]) : '');
  /* the class names the indices return, in words (the same map Block 3 prints) */
  const CLS = {
    hyperarid: ['hiperárido', 'hyper-arid'], arid: ['árido', 'arid'], semiarid: ['semiárido', 'semi-arid'], drysubhumid: ['subhúmedo seco', 'dry sub-humid'], humid: ['húmedo', 'humid'],
    mediterranean: ['mediterráneo / semihúmedo', 'Mediterranean / semi-humid'], subhumid: ['subhúmedo', 'sub-humid'], perhumid: ['perhúmedo', 'perhumid'],
    desert: ['desértico', 'desert'], humidsteppe: ['estepa húmeda / sabana', 'humid steppe / savanna'], humidforest: ['bosque húmedo', 'humid forest'], wet: ['muy húmedo', 'wet'],
    A: ['perhúmedo', 'perhumid'], B4: ['húmedo (B4)', 'humid (B4)'], B3: ['húmedo (B3)', 'humid (B3)'], B2: ['húmedo (B2)', 'humid (B2)'], B1: ['húmedo (B1)', 'humid (B1)'], C2: ['subhúmedo húmedo', 'moist sub-humid'], C1: ['subhúmedo seco', 'dry sub-humid'], D: ['semiárido', 'semi-arid'], E: ['árido', 'arid'],
  };
  const cls = k => (k && CLS[k] ? two(CLS[k][0], CLS[k][1]) : k || '—');
  /* frost advice only makes sense where it frosts in at least one season in five */
  const frostMatters = fr => fr && fr.n && fr.anyFrost && fr.frostSeasons / fr.n >= 0.2 && fr.probs[1].last != null && fr.probs[1].first != null;

  /* ---------- 1 · data ---------- */
  function secData() {
    const w = state.weather, s = state.site;
    if (!w) return '';
    const st = w.stats, pres = w.meta.present;
    const vars = WxIO.VARS.filter(v => pres[v.id]);
    let h = `<h2>1. ${two('Sitio y datos', 'Site and data')}</h2>`;
    h += kv([[two('Estación / sitio', 'Station / site'), esc(s.name || '—')], [two('Latitud', 'Latitude'), s.lat != null ? f2(s.lat) + '°' : '—'], [two('Longitud', 'Longitude'), s.lon != null ? f2(s.lon) + '°' : '—'], [two('Altitud', 'Elevation'), s.z != null ? s.z + ' m' : '—'],
      [two('Situación', 'Setting'), s.coastal ? two('costera (kRs = 0.19)', 'coastal (kRs = 0.19)') : two('interior (kRs = 0.16)', 'interior (kRs = 0.16)')], [two('Periodo', 'Period'), `${fmtDate(w.meta.first)} – ${fmtDate(w.meta.last)} (${fmtNum(w.rows.length, 0)} ${two('días', 'days')})`],
      [two('Años completos', 'Complete years'), `${w.years.filter(y => y.complete).length} / ${w.years.length}`], [two('Notas', 'Notes'), s.notes ? esc(s.notes) : null]]);
    h += table([{ label: two('Variable', 'Variable'), get: r => two(r.v.es, r.v.en) }, { label: two('Con dato', 'With data'), num: true, get: r => f0(r.s.n) }, { label: two('Completa', 'Complete'), num: true, get: r => pc(r.s.pct) }, { label: two('Interpolados', 'Interpolated'), num: true, get: r => f0(r.s.filled) }, { label: two('Hueco más largo (días)', 'Longest gap (days)'), num: true, get: r => f0(r.s.longest) }, { label: two('Marcados', 'Flagged'), num: true, get: r => f0(r.s.flagged) }],
      vars.map(v => ({ v, s: st[v.id] })), two('Cobertura de cada variable tras el control de calidad', 'Coverage of each variable after quality control'));
    h += p(two(`Control de calidad: valores fuera del rango físico eliminados; días con Tmax &lt; Tmin ${w.qc.swap ? 'intercambiados' : 'eliminados'}; picos aislados (más de ${w.qc.spike} °C respecto a ambos vecinos) y tramos planos de ${w.qc.flat} días o más marcados y conservados; huecos de hasta ${w.qc.maxGap} días interpolados linealmente en las variables continuas; la lluvia nunca se interpoló${w.qc.rainZero ? ' salvo la regla de lluvia faltante = 0 en días con temperaturas' : ''}. ${w.issues} ${two('incidencias registradas.', 'issues recorded.')}`,
      `Quality control: values outside the physical range removed; days with Tmax &lt; Tmin ${w.qc.swap ? 'swapped' : 'removed'}; isolated spikes (more than ${w.qc.spike} °C against both neighbours) and flat runs of ${w.qc.flat} days or more flagged and kept; gaps of up to ${w.qc.maxGap} days linearly interpolated in the continuous variables; rain was never interpolated${w.qc.rainZero ? ' except for the rule missing rain = 0 on days with temperatures' : ''}. ${w.issues} issues recorded.`));
    h += figure('b2Calendar', two('Disponibilidad de la serie por año y mes (porcentaje de días con temperatura).', 'Availability of the series by year and month (share of days with temperature).'));
    return h;
  }

  /* ---------- 2 · climate ---------- */
  function secClimate() {
    const c = state.climate; if (!c) return '';
    const nm = c.nm, a = nm.annual, fr = c.fr, rr = c.rr, ind = c.ind, kp = c.kp;
    let h = `<h2>2. ${two('El clima del sitio', 'The climate of the site')}</h2>`;
    h += p(two(`${esc(sitename())} tiene un clima <b>${kp ? kp.code + ' (' + kp.desc[0] + ')' : '—'}</b> según Köppen–Geiger (criterios de Peel et al. 2007): temperatura media anual de ${fmtTemp(a.T, 1)} con oscilación de ${f1(a.range)} °C entre ${monthName(a.coldest)} y ${monthName(a.hottest)}, y ${fmtMm(a.P, 0)} de lluvia anual (CV entre años ${pc(a.Pcv)}) concentrada en ${monthName(a.wettest)}. Índice de aridez del PNUMA ${f2(ind.unep.ai)} (${cls(ind.unep.cls)}); índice de humedad de Thornthwaite ${f0(ind.Im)} (${cls(ind.ImClass)}); periodo de crecimiento FAO de ${ind.growingMonths} meses. Normales de ${nm.nYears} años (${nm.years[0]}–${nm.years[nm.years.length - 1]}).`,
      `${esc(sitename())} has a <b>${kp ? kp.code + ' (' + kp.desc[1] + ')' : '—'}</b> climate after Köppen–Geiger (criteria of Peel et al. 2007): mean annual temperature ${fmtTemp(a.T, 1)} with a range of ${f1(a.range)} °C between ${monthName(a.coldest)} and ${monthName(a.hottest)}, and ${fmtMm(a.P, 0)} of annual rain (CV between years ${pc(a.Pcv)}) concentrated in ${monthName(a.wettest)}. UNEP aridity index ${f2(ind.unep.ai)} (${cls(ind.unep.cls)}); Thornthwaite moisture index ${f0(ind.Im)} (${cls(ind.ImClass)}); FAO growing period of ${ind.growingMonths} months. Normals of ${nm.nYears} years (${nm.years[0]}–${nm.years[nm.years.length - 1]}).`));
    if (rr.ok && rr.seasons.onset) h += p(two(`Temporada de lluvias: inicio mediano el ${fmtDoy(rr.seasons.onset.median)} (P20 ${fmtDoy(rr.seasons.onset.p20)}, P80 ${fmtDoy(rr.seasons.onset.p80)})${rr.seasons.end ? `, fin hacia el ${fmtDoy(rr.seasons.end.median)}` : ''}; ${pc(rr.summerShare)} de la lluvia cae en el semestre cálido; índice de concentración ${f1(rr.pci)}.`, `Rainy season: median onset on ${fmtDoy(rr.seasons.onset.median)} (P20 ${fmtDoy(rr.seasons.onset.p20)}, P80 ${fmtDoy(rr.seasons.onset.p80)})${rr.seasons.end ? `, end around ${fmtDoy(rr.seasons.end.median)}` : ''}; ${pc(rr.summerShare)} of the rain falls in the warm half; concentration index ${f1(rr.pci)}.`));
    if (fr.n) h += p(fr.anyFrost ? two(`Heladas (Tmin ≤ ${fmtTemp(fr.threshold, 0)}): en ${fr.frostSeasons} de ${fr.n} temporadas, ${f1(fr.frostDaysMean)} días al año en promedio, mínima absoluta ${fmtTemp(fr.tnAbs, 1)}; última helada de primavera en promedio el ${fmtDoy(fr.lastMean)} y primera de otoño el ${fmtDoy(fr.firstMean)}; periodo libre de heladas de ${f0(fr.freeMean)} días (mínimo ${fr.freeMin}).`, `Frost (Tmin ≤ ${fmtTemp(fr.threshold, 0)}): in ${fr.frostSeasons} of ${fr.n} seasons, ${f1(fr.frostDaysMean)} days a year on average, absolute minimum ${fmtTemp(fr.tnAbs, 1)}; last spring frost on average on ${fmtDoy(fr.lastMean)} and first autumn frost on ${fmtDoy(fr.firstMean)}; frost-free period of ${f0(fr.freeMean)} days (minimum ${fr.freeMin}).`) : two(`Sin heladas (Tmin ≤ ${fmtTemp(fr.threshold, 0)}) en ${fr.n} temporadas.`, `No frost (Tmin ≤ ${fmtTemp(fr.threshold, 0)}) in ${fr.n} seasons.`));
    h += figure('b3Climo', two('Climograma de Walter–Lieth del sitio.', 'Walter–Lieth climograph of the site.'));
    h += table([{ label: two('Mes', 'Month'), get: r => monthName(r.m) }, { label: 'Tmax', num: true, get: r => f1(r.tmax) }, { label: two('Tmedia', 'Tmean'), num: true, get: r => f1(r.tmean) }, { label: 'Tmin', num: true, get: r => f1(r.tmin) }, { label: two('Mín. abs.', 'Abs. min'), num: true, get: r => f1(r.tnAbs) }, { label: two('Lluvia (mm)', 'Rain (mm)'), num: true, get: r => f1(r.P) }, { label: 'P20', num: true, get: r => f0(r.P20) }, { label: 'P80', num: true, get: r => f0(r.P80) }, { label: two('Días con lluvia', 'Rain days'), num: true, get: r => f1(r.wetDays) }, { label: two('Días con helada', 'Frost days'), num: true, get: r => f1(r.frostDays) }],
      nm.months, two('Normales mensuales', 'Monthly normals'));
    if (frostMatters(fr)) h += table([{ label: two('Riesgo aceptado', 'Accepted risk'), get: r => pc(r.p) }, { label: two('Sembrar después del', 'Sow after'), get: r => (r.last ? fmtDoy(r.last) : '—') }, { label: two('Cosechar antes del', 'Harvest before'), get: r => (r.first ? fmtDoy(r.first) : '—') }, { label: two('Días entre ambas', 'Days between'), num: true, get: r => (r.last && r.first ? r.first - r.last : '—') }], fr.probs, two('Fechas de helada según el riesgo aceptado (frecuencias empíricas)', 'Frost dates by the accepted risk (empirical frequencies)'));
    h += figure('b3Seasons', two('Calendario de cada año: periodo libre de heladas y temporada de lluvias.', 'Calendar of each year: frost-free period and rainy season.'));
    h += figure('b3FrostCurves', two('Probabilidad de helada a lo largo del año.', 'Frost probability through the year.'));
    h += table([{ label: two('Índice', 'Index'), get: r => r[0] }, { label: two('Valor', 'Value'), num: true, get: r => r[1] }, { label: two('Clase', 'Class'), get: r => r[2] }],
      [[two('Köppen–Geiger', 'Köppen–Geiger'), kp ? kp.code : '—', kp ? two(kp.desc[0], kp.desc[1]) : ''], [two('P/ETP (PNUMA)', 'P/PET (UNEP)'), f2(ind.unep.ai), cls(ind.unep.cls)], [two('De Martonne', 'De Martonne'), f1(ind.martonne.I), cls(ind.martonne.cls)], [two('Lang', 'Lang'), f1(ind.lang.I), cls(ind.lang.cls)], [two('Índice de humedad (Thornthwaite 1955)', 'Moisture index (Thornthwaite 1955)'), f1(ind.Im), cls(ind.ImClass)], [two('ETP anual de Thornthwaite', 'Thornthwaite annual PET'), fmtMm(ind.PETann, 0), ''], [two('Déficit / excedente (Thornthwaite–Mather)', 'Deficit / surplus (Thornthwaite–Mather)'), `${f0(ind.bal.deficit)} / ${f0(ind.bal.surplus)} mm`, `${two('almacenamiento', 'storage')} ${ind.bal.awc} mm`]],
      two('Índices climáticos', 'Climatic indices'));
    return h;
  }

  /* ---------- 3 · degree-days ---------- */
  function secGdd() {
    const g = state.degreeDays; if (!g) return '';
    const pr = g.params, by = g.by;
    let h = `<h2>3. ${two('Grados-día y tiempo térmico', 'Degree-days and thermal time')}</h2>`;
    h += p(two(`Método ${mname(pr.method)}${pr.method !== 'chu' ? `, base ${fmtTemp(pr.base, 1)}, umbral superior ${pr.upper == null ? '—' : fmtTemp(pr.upper, 1)} con corte ${two(CUT[pr.cutoff][0], CUT[pr.cutoff][1])}` : ''}; siembra el ${pr.d} de ${monthName(pr.m)}${pr.crop ? ` (${cropName(pr.crop)})` : ''}${pr.target ? `; meta térmica ${f0(pr.target)} °C·d` : ''}; ${by.years.length} años. ${by.days ? `La meta se alcanza en ${f0(by.days.median)} días en la mediana (P20 ${f0(by.days.p20)}, P80 ${f0(by.days.p80)}) y en ${pc(by.pReached)} de los años.` : ''} ${by.total ? `La temporada de ${pr.season} días ofrece ${f0(by.total.median)} °C·d en la mediana (CV entre años ${pc(by.total.cv)}).` : ''}`,
      `Method ${mname(pr.method)}${pr.method !== 'chu' ? `, base ${fmtTemp(pr.base, 1)}, upper threshold ${pr.upper == null ? '—' : fmtTemp(pr.upper, 1)} with ${two(CUT[pr.cutoff][0], CUT[pr.cutoff][1])} cut-off` : ''}; sown ${monthName(pr.m)} ${pr.d}${pr.crop ? ` (${cropName(pr.crop)})` : ''}${pr.target ? `; thermal target ${f0(pr.target)} °C·d` : ''}; ${by.years.length} years. ${by.days ? `The target is reached in ${f0(by.days.median)} days at the median (P20 ${f0(by.days.p20)}, P80 ${f0(by.days.p80)}) and in ${pc(by.pReached)} of the years.` : ''} ${by.total ? `The ${pr.season}-day season offers ${f0(by.total.median)} °C·d at the median (CV between years ${pc(by.total.cv)}).` : ''}`));
    h += figure('b4Spaghetti', two('Acumulación de grados-día de cada año desde la siembra, con la mediana y la banda P20–P80.', 'Degree-day accumulation of each year from sowing, with the median and the P20–P80 band.'));
    h += table([{ label: two('Año', 'Year'), key: 'y' }, { label: '30 d', num: true, get: r => f0(r.at[30]) }, { label: '60 d', num: true, get: r => f0(r.at[60]) }, { label: '90 d', num: true, get: r => f0(r.at[90]) }, { label: '120 d', num: true, get: r => f0(r.at[120]) }, { label: two(`Temporada (${pr.season} d)`, `Season (${pr.season} d)`), num: true, get: r => f0(r.seasonTotal) }, { label: two('Días a la meta', 'Days to target'), num: true, get: r => (r.days == null ? '—' : f0(r.days)) }, { label: two('Sin dato', 'Missing'), num: true, key: 'missing' }],
      by.years, two('Grados-día acumulados por año', 'Accumulated degree-days by year'));
    h += figure('b4MapTotals', two('Grados-día disponibles según la fecha de siembra (mediana y P20–P80 entre años).', 'Degree-days available by sowing date (median and P20–P80 between years).'));
    if (g.map && g.map.best) h += p(two(`La fecha que madura más rápido con al menos 80 % de los años alcanzando la meta es el ${fmtDoy(g.map.best.J)} (${f0(g.map.best.days.median)} días).`, `The date that matures fastest with at least 80 % of the years reaching the target is ${fmtDoy(g.map.best.J)} (${f0(g.map.best.days.median)} days).`));
    return h;
  }

  /* ---------- 4 · ETo ---------- */
  function etoSentence() {
    const e = state.eto; if (!e) return '';
    const n = e.res.notes, o = e.res.opts;
    const parts = [];
    if (n.tmin) parts.push(two(`la humedad se estimó del punto de rocío ≈ Tmin${o.arid ? ' − ' + o.arid + ' °C' : ''} en ${pc(n.tmin / n.days)} de los días (ec. 48)`, `humidity was estimated from dew point ≈ Tmin${o.arid ? ' − ' + o.arid + ' °C' : ''} on ${pc(n.tmin / n.days)} of the days (eq. 48)`));
    if (n.hargreaves) parts.push(two(`la radiación se estimó de la amplitud térmica con kRs = ${o.kRs} en ${pc(n.hargreaves / n.days)} de los días (ec. 50)`, `radiation was estimated from the temperature range with kRs = ${o.kRs} on ${pc(n.hargreaves / n.days)} of the days (eq. 50)`));
    if (n.sun) parts.push(two(`la radiación se obtuvo de las horas de sol con as = ${o.as}, bs = ${o.bs} en ${pc(n.sun / n.days)} de los días (ec. 35)`, `radiation came from sunshine hours with as = ${o.as}, bs = ${o.bs} on ${pc(n.sun / n.days)} of the days (eq. 35)`));
    if (n.wind2) parts.push(two(`el viento se fijó en ${o.windDefault} m/s en ${pc(n.wind2 / n.days)} de los días`, `wind was set to ${o.windDefault} m/s on ${pc(n.wind2 / n.days)} of the days`));
    return two(`Penman–Monteith FAO-56 se calculó en ${fmtNum(n.days, 0)} días${parts.length ? '; ' + parts.join('; ') : ' con todas las variables medidas'}.`, `FAO-56 Penman–Monteith was computed on ${fmtNum(n.days, 0)} days${parts.length ? '; ' + parts.join('; ') : ' with every variable measured'}.`);
  }
  function secEto() {
    const e = state.eto; if (!e) return '';
    const yr = e.yr.pm, cal = e.cal;
    const NAME = { pm: 'Penman–Monteith FAO-56', hs: 'Hargreaves–Samani', hsk: 'Hargreaves × k', hsr: 'Hargreaves (regresión)', pt: 'Priestley–Taylor', turc: 'Turc' };
    let h = `<h2>4. ${two('Evapotranspiración de referencia', 'Reference evapotranspiration')}</h2>`;
    h += p(etoSentence() + ' ' + two(`ETo anual media: ${yr.length ? fmtMm(Stat.mean(yr.map(a => a.total)), 0) : '—'}; máximo mensual en ${monthName(e.mon.pm.reduce((a, b) => (b.perDay != null && (a.perDay == null || b.perDay > a.perDay) ? b : a)).m)}. Los bloques de agua usan ${NAME[e.method]}${cal && (e.method === 'hsk' || e.method === 'hsr') ? ` (k = ${f2(cal.k)}; a = ${f2(cal.a)}, b = ${f2(cal.b)})` : ''}.`, `Mean annual ETo: ${yr.length ? fmtMm(Stat.mean(yr.map(a => a.total)), 0) : '—'}; monthly peak in ${monthName(e.mon.pm.reduce((a, b) => (b.perDay != null && (a.perDay == null || b.perDay > a.perDay) ? b : a)).m)}. The water blocks use ${NAME[e.method]}${cal && (e.method === 'hsk' || e.method === 'hsr') ? ` (k = ${f2(cal.k)}; a = ${f2(cal.a)}, b = ${f2(cal.b)})` : ''}.`));
    h += table([{ label: two('Mes', 'Month'), get: r => monthName(r.m) }, { label: 'PM (mm/d)', num: true, get: r => f2(r.perDay) }, { label: two('PM (mm/mes)', 'PM (mm/month)'), num: true, get: r => f0(r.perMonth) }, { label: 'P20', num: true, get: r => f2(r.p20) }, { label: 'P80', num: true, get: r => f2(r.p80) }, { label: 'Hargreaves', num: true, get: (r, i) => f2(e.mon.hs[r.m - 1].perDay) }, { label: 'Priestley–Taylor', num: true, get: r => f2(e.mon.pt[r.m - 1].perDay) }, { label: 'Turc', num: true, get: r => f2(e.mon.turc[r.m - 1].perDay) }].concat(e.tw ? [{ label: 'Thornthwaite', num: true, get: r => f2(e.tw[r.m - 1].perDay) }] : []),
      e.mon.pm, two('ETo mensual por método (mm/día)', 'Monthly ETo by method (mm/day)'));
    h += figure('b5Methods', two('ETo mensual por cinco métodos, con la banda P20–P80 de Penman–Monteith.', 'Monthly ETo by five methods, with the P20–P80 band of Penman–Monteith.'));
    h += figure('b5Terms', two('Los dos términos de Penman–Monteith por mes.', 'The two terms of Penman–Monteith by month.'));
    if (cal) h += table([{ label: two('Método', 'Method'), key: 'name' }, { label: 'k', num: true, get: r => f2(r.k) }, { label: two('Sesgo (mm/d)', 'Bias (mm/d)'), num: true, get: r => f2(r.bias) }, { label: 'RMSE', num: true, get: r => f2(r.rmse) }, { label: 'R²', num: true, get: r => f2(r.r2) }, { label: 'a', num: true, get: r => f2(r.a) }, { label: 'b', num: true, get: r => f2(r.b) }],
      [['Hargreaves–Samani', cal], ['Priestley–Taylor', e.calPT], ['Turc', e.calTurc]].filter(x => x[1]).map(x => Object.assign({ name: x[0] }, x[1])), two('Calibración de los métodos simples contra Penman–Monteith (día por día)', 'Calibration of the simple methods against Penman–Monteith (day by day)'));
    h += figure('b5Scatter', two('Hargreaves contra Penman–Monteith, día por día.', 'Hargreaves against Penman–Monteith, day by day.'));
    return h;
  }

  /* ---------- 5 · balance ---------- */
  const STAGE = { ini: ['Inicial', 'Initial'], dev: ['Desarrollo', 'Development'], mid: ['Media estación', 'Mid-season'], late: ['Final', 'Late'] };
  function secBalance() {
    const b = state.balance; if (!b || !b.all.summary) return '';
    const pr = b.params, s = b.all.summary;
    let h = `<h2>5. ${two('Balance hídrico del cultivo', 'Water balance of the crop')}</h2>`;
    h += p(two(`${cropName(pr.crop)} sembrado el ${pr.d} de ${monthName(pr.m)}; etapas de ${pr.L.ini}/${pr.L.dev}/${pr.L.mid}/${pr.L.late} días; Kc ${f2(pr.kc.ini)}/${f2(pr.kc.mid)}/${f2(pr.kc.end)}${pr.kcCorrect ? ' (medio y final corregidos al clima de cada temporada, ec. 62)' : ''}; raíz de ${pr.zIni} a ${pr.zMax} m; p = ${pr.p}; Ky = ${f2(pr.ky)}; suelo con ${pr.taw} mm/m; escurrimiento por número de curva ${pr.cn || '—'}; agotamiento inicial ${pc(pr.dr0)} del ADT. En temporal, en ${s.n} años: ETc ${fmtMm(s.etc.median, 0)} (mediana), lluvia efectiva ${fmtMm(s.pe.median, 0)}, déficit ${fmtMm(s.deficit.median, 0)}, percolación ${fmtMm(s.dp.median, 0)}, ${f0(s.stressDays.median)} días con estrés; rendimiento relativo (FAO-33) ${pc(s.relYield.median)} en la mediana y ${pc(s.relYield.p20)} en el P20; ${pc(s.pGood)} de los años por encima del 90 %.`,
      `${cropName(pr.crop)} sown ${monthName(pr.m)} ${pr.d}; stages of ${pr.L.ini}/${pr.L.dev}/${pr.L.mid}/${pr.L.late} days; Kc ${f2(pr.kc.ini)}/${f2(pr.kc.mid)}/${f2(pr.kc.end)}${pr.kcCorrect ? ' (mid and end corrected to each season\'s climate, eq. 62)' : ''}; roots from ${pr.zIni} to ${pr.zMax} m; p = ${pr.p}; Ky = ${f2(pr.ky)}; soil with ${pr.taw} mm/m; curve-number runoff ${pr.cn || '—'}; initial depletion ${pc(pr.dr0)} of TAW. Rain-fed, over ${s.n} years: ETc ${fmtMm(s.etc.median, 0)} (median), effective rain ${fmtMm(s.pe.median, 0)}, deficit ${fmtMm(s.deficit.median, 0)}, percolation ${fmtMm(s.dp.median, 0)}, ${f0(s.stressDays.median)} stress days; relative yield (FAO-33) ${pc(s.relYield.median)} at the median and ${pc(s.relYield.p20)} at the P20; ${pc(s.pGood)} of the years above 90 %.`));
    h += figure('b6Demand', two(`Demanda de agua de la temporada del año ${viewYear(b)}: ETo, ETc, ETc real y lluvia.`, `Water demand of the ${viewYear(b)} season: ETo, ETc, actual ETc and rain.`));
    h += figure('b6Depletion', two(`Agua en la zona radical del año ${viewYear(b)}.`, `Root-zone water of ${viewYear(b)}.`));
    h += table([{ label: two('Etapa', 'Stage'), get: r => two(STAGE[r.id][0], STAGE[r.id][1]) }, { label: 'ETc', num: true, get: r => f0(r.etc.median) }, { label: two('ETc real', 'Actual ETc'), num: true, get: r => f0(r.etcAdj.median) }, { label: two('Lluvia efectiva', 'Effective rain'), num: true, get: r => f0(r.pe.median) }, { label: two('Déficit', 'Deficit'), num: true, get: r => f0(r.deficit.median) }, { label: two('Ks mediano', 'Median Ks'), num: true, get: r => f2(r.ks.median) }, { label: two('Días con estrés', 'Stress days'), num: true, get: r => f0(r.stress.median) }],
      s.stages, two('Balance por etapa, medianas entre años (mm)', 'Balance by stage, medians across years (mm)'));
    h += table([{ label: two('Año', 'Year'), key: 'y' }, { label: 'ETc', num: true, get: r => f0(r.totals.etc) }, { label: two('ETc real', 'Actual'), num: true, get: r => f0(r.totals.etcAdj) }, { label: two('Lluvia', 'Rain'), num: true, get: r => f0(r.totals.P) }, { label: two('Efectiva', 'Effective'), num: true, get: r => f0(r.totals.Pe) }, { label: two('Percolación', 'Percolation'), num: true, get: r => f0(r.totals.DP) }, { label: two('Déficit', 'Deficit'), num: true, get: r => f0(r.totals.deficit) }, { label: two('Días estrés', 'Stress days'), num: true, get: r => r.totals.stressDays }, { label: two('Rend. relativo', 'Rel. yield'), num: true, get: r => pc(r.relYield) }],
      b.all.years, two('Balance de la temporada por año (mm)', 'Season balance by year (mm)'));
    h += figure('b6Yield', two('Rendimiento relativo en temporal de cada año (FAO-33).', 'Rain-fed relative yield of each year (FAO-33).'));
    h += figure('b6Sowing', two('Rendimiento relativo en temporal según la fecha de siembra.', 'Rain-fed relative yield by sowing date.'));
    return h;
  }

  /* ---------- 6 · irrigation ---------- */
  function secIrrigation() {
    const ir = state.irrigation; if (!ir || !ir.all.summary) return '';
    const r = ir.rule, s = ir.all.summary, des = ir.design;
    const gross = Irrig7.statOf(ir.all.years.map(x => x.totals.Igross));
    const MODE = { auto: r.trigger > 1 ? two(`al llegar el agotamiento al ${Math.round(r.trigger * 100)} % del AFA`, `when depletion reaches ${Math.round(r.trigger * 100)} % of RAW`) : two('al agotar el agua fácilmente aprovechable', 'at depletion of the readily available water'), interval: two(`cada ${r.interval} días`, `every ${r.interval} days`), depth: two(`al gastarse ${r.depth} mm netos`, `when ${r.depth} mm net are spent`) };
    let h = `<h2>6. ${two('Calendario de riego', 'Irrigation calendar')}</h2>`;
    h += p(two(`Regla: riego ${MODE[r.mode]}${r.depth != null && r.mode !== 'depth' ? `, con láminas netas de ${r.depth} mm` : ', rellenando a capacidad de campo'}; eficiencia de aplicación ${pc(r.efficiency)}; ${r.stopBefore} días sin riego antes de la cosecha${r.startAfter ? `, ${r.startAfter} tras la siembra` : ''}${r.minInterval > 1 ? `; intervalo mínimo ${r.minInterval} días` : ''}. En la mediana de ${s.n} años: ${f0(s.events.median)} riegos, ${fmtMm(s.I.median, 0)} netos y ${fmtMm(gross.median, 0)} brutos (${fmtMm(gross.p80, 0)} en el año seco, P80), rendimiento relativo ${pc(s.relYield.median)}, percolación ${fmtMm(s.dp.median, 0)}. Capacidad de diseño: ${f1(des.capacity)} mm/día brutos (ETc máxima P90 de la media estación ${f2(des.etcP90)} mm/día); lámina bruta de planeación ${fmtMm(des.grossSeason.p80, 0)} = ${f0(des.m3haSeason)} m³/ha.`,
      `Rule: irrigation ${MODE[r.mode]}${r.depth != null && r.mode !== 'depth' ? `, with ${r.depth} mm net applications` : ', refilling to field capacity'}; application efficiency ${pc(r.efficiency)}; ${r.stopBefore} days without irrigation before harvest${r.startAfter ? `, ${r.startAfter} after sowing` : ''}${r.minInterval > 1 ? `; minimum interval ${r.minInterval} days` : ''}. At the median of ${s.n} years: ${f0(s.events.median)} irrigations, ${fmtMm(s.I.median, 0)} net and ${fmtMm(gross.median, 0)} gross (${fmtMm(gross.p80, 0)} in the dry year, P80), relative yield ${pc(s.relYield.median)}, percolation ${fmtMm(s.dp.median, 0)}. Design capacity: ${f1(des.capacity)} mm/day gross (peak mid-season ETc P90 ${f2(des.etcP90)} mm/day); planning gross depth ${fmtMm(des.grossSeason.p80, 0)} = ${f0(des.m3haSeason)} m³/ha.`));
    h += figure('b7Calendar', two('Calendario de riego del año mostrado: riegos brutos, lluvia y agotamiento.', 'Irrigation calendar of the year shown: gross irrigations, rain and depletion.'));
    const yv = ir.all.years.find(x => x.y === ir.all.medianYear) || ir.all.years[0];
    if (yv) {
      const cal = Irrig7.calendar(yv, ir.params, ir.capacity);
      h += table([{ label: '#', num: true, get: (x) => cal.indexOf(x) + 1 }, { label: two('Fecha', 'Date'), get: x => fmtDate(x.date) }, { label: two('Día', 'Day'), num: true, key: 'day' }, { label: two('Etapa', 'Stage'), key: 'stage' }, { label: two('Agotamiento', 'Depletion'), num: true, get: x => f0(x.drBefore) }, { label: two('Neta (mm)', 'Net (mm)'), num: true, get: x => f1(x.net) }, { label: two('Bruta (mm)', 'Gross (mm)'), num: true, get: x => f1(x.gross) }, { label: 'm³/ha', num: true, get: x => f0(x.gross * 10) }], cal, two(`Riegos del año mediano (${yv.y})`, `Irrigations of the median year (${yv.y})`));
    }
    h += table([{ label: two('Estrategia', 'Strategy'), get: x => two(x.es, x.en) }, { label: two('Riegos', 'Irrigations'), num: true, get: x => (x.events ? f0(x.events.median) : '—') }, { label: two('Bruta (mm)', 'Gross (mm)'), num: true, get: x => (x.gross ? f0(x.gross.median) : '—') }, { label: two('Año seco', 'Dry year'), num: true, get: x => (x.gross ? f0(x.gross.p80) : '—') }, { label: two('Rend. relativo', 'Rel. yield'), num: true, get: x => (x.relYield ? pc(x.relYield.median) : '—') }, { label: two('Percolación', 'Percolation'), num: true, get: x => (x.dp ? f0(x.dp.median) : '—') }],
      ir.strategies, two('Estrategias de riego comparadas (medianas entre años)', 'Irrigation strategies compared (medians across years)'));
    h += figure('b7Strategies', two('Agua aplicada contra rendimiento, por estrategia.', 'Water applied against yield, by strategy.'));
    return h;
  }

  /* ---------- 7 · phenology ---------- */
  function secPhenology() {
    const ph = state.phenology; if (!ph || !ph.res) return '';
    const pr = ph.params, res = ph.res, sowJ = ph.sowJ, crop = Crops.byId(ph.crop);
    let h = `<h2>7. ${two('Fenología', 'Phenology')}</h2>`;
    h += p(two(`${cropName(crop)} sembrado el ${pr.d} de ${monthName(pr.m)}; tiempo térmico por ${mname(pr.method)}, base ${fmtTemp(pr.base, 1)}, umbral ${fmtTemp(pr.upper, 1)}; requerimientos ${ph.calibration && ph.calibration.stages.length ? 'calibrados con fechas observadas' : 'del catálogo (orientativos)'}; ${res.years.length} años.`, `${cropName(crop)} sown ${monthName(pr.m)} ${pr.d}; thermal time by ${mname(pr.method)}, base ${fmtTemp(pr.base, 1)}, threshold ${fmtTemp(pr.upper, 1)}; requirements ${ph.calibration && ph.calibration.stages.length ? 'calibrated with observed dates' : 'from the catalogue (orientative)'}; ${res.years.length} years.`));
    h += table([{ label: 'BBCH', key: 'code' }, { label: two('Etapa', 'Stage'), get: s => two(s.es, s.en) }, { label: '°C·d', num: true, get: s => f0(s.gdd) }, { label: two('Fecha mediana', 'Median date'), get: s => (s.median == null ? '—' : fmtDoy(sowJ + s.median)) }, { label: two('Días', 'Days'), num: true, get: s => f0(s.median) }, { label: 'P20', get: s => (s.p20 == null ? '—' : fmtDoy(sowJ + s.p20)) }, { label: 'P80', get: s => (s.p80 == null ? '—' : fmtDoy(sowJ + s.p80)) }, { label: two('Años que la alcanzan', 'Years reaching it'), num: true, get: s => pc(s.pReached) }],
      res.summary, two('Calendario fenológico por tiempo térmico', 'Phenological calendar by thermal time'));
    h += figure('b8Calendar', two('Calendario fenológico: fecha mediana de cada etapa y su dispersión entre años.', 'Phenological calendar: median date of each stage and its spread between years.'));
    if (ph.calibration && ph.calibration.stages.length) {
      const c = ph.calibration;
      h += table([{ label: 'BBCH', key: 'code' }, { label: two('Años', 'Years'), num: true, key: 'n' }, { label: two('°C·d medios', 'Mean °C·d'), num: true, get: s => f0(s.mean) }, { label: two('Mín.', 'Min'), num: true, get: s => f0(s.min) }, { label: two('Máx.', 'Max'), num: true, get: s => f0(s.max) }, { label: 'CV', num: true, get: s => pc(s.cv) }, { label: two('CV en días', 'CV in days'), num: true, get: s => pc(s.daysCv) }], c.stages, two('Requerimientos térmicos observados', 'Observed thermal requirements'));
      if (c.baseSearch && c.baseSearch.best) h += p(two(`Búsqueda de la base (Arnold 1959) con la etapa ${c.baseSearch.code}: mínimo del CV en ${fmtTemp(c.baseSearch.best.base, 1)} (CV ${pc(c.baseSearch.best.cv)}).`, `Base search (Arnold 1959) with stage ${c.baseSearch.code}: CV minimum at ${fmtTemp(c.baseSearch.best.base, 1)} (CV ${pc(c.baseSearch.best.cv)}).`));
    }
    if (ph.chill && ph.chill.summary) {
      const cs = ph.chill.summary, U = { cp: ['porciones', 'portions'], utah: ['unidades Utah', 'Utah units'], hours: ['horas frío', 'chill hours'] };
      h += p(two(`Frío invernal (${monthName(ph.chill.startM)}–${monthName(ph.chill.endM)}, horas reconstruidas con Linvill 1990): ${f1(cs.cp.median)} porciones de frío en la mediana de ${cs.n} inviernos (P20 ${f1(cs.cp.p20)}), ${f0(cs.utah.median)} unidades Utah, ${f0(cs.hours.median)} horas frío.${cs.met ? ` Un requerimiento de ${f0(cs.met.value)} ${two(U[cs.met.unit][0], U[cs.met.unit][1])} se cubre en ${pc(cs.met.p)} de los inviernos.` : ''}`, `Winter chill (${monthName(ph.chill.startM)}–${monthName(ph.chill.endM)}, hours rebuilt with Linvill 1990): ${f1(cs.cp.median)} chill portions at the median of ${cs.n} winters (P20 ${f1(cs.cp.p20)}), ${f0(cs.utah.median)} Utah units, ${f0(cs.hours.median)} chill hours.${cs.met ? ` A requirement of ${f0(cs.met.value)} ${two(U[cs.met.unit][0], U[cs.met.unit][1])} is met in ${pc(cs.met.p)} of the winters.` : ''}`));
      h += figure('b8ChillYears', two('Frío total de cada invierno.', 'Total chill of every winter.'));
    }
    if (ph.photoperiod) h += p(two(`Fotoperiodo civil del sitio: de ${f1(ph.photoperiod.min)} h (${fmtDoy(ph.photoperiod.minJ)}) a ${f1(ph.photoperiod.max)} h (${fmtDoy(ph.photoperiod.maxJ)}).`, `Civil photoperiod of the site: from ${f1(ph.photoperiod.min)} h (${fmtDoy(ph.photoperiod.minJ)}) to ${f1(ph.photoperiod.max)} h (${fmtDoy(ph.photoperiod.maxJ)}).`));
    return h;
  }

  /* ---------- 8 · risk ---------- */
  function secRisk() {
    const rk = state.risk; if (!rk) return '';
    const r = rk.risk, sw = rk.window;
    let h = `<h2>8. ${two('Riesgos y escenarios', 'Risks and scenarios')}</h2>`;
    h += p(two(`Helada: Tmin ≤ ${fmtTemp(rk.thr.frost, 0)}; golpe de calor: Tmax ≥ ${fmtTemp(rk.thr.heat, 0)}; etapa sensible ${rk.sensitive}. Con siembra el ${rk.p.d} de ${monthName(rk.p.m)}: helada en el ciclo en ${pc(r.pFrostCycle)} de los años (${f1(r.meanFrostCycle)} días), calor en ${pc(r.pHeatCycle)} (${f1(r.meanHeatCycle)} días); el cultivo madura en ${pc(r.pMature)} de los años.`, `Frost: Tmin ≤ ${fmtTemp(rk.thr.frost, 0)}; heat shock: Tmax ≥ ${fmtTemp(rk.thr.heat, 0)}; sensitive stage ${rk.sensitive}. Sown ${monthName(rk.p.m)} ${rk.p.d}: frost in the cycle in ${pc(r.pFrostCycle)} of the years (${f1(r.meanFrostCycle)} days), heat in ${pc(r.pHeatCycle)} (${f1(r.meanHeatCycle)} days); the crop matures in ${pc(r.pMature)} of the years.`));
    h += table([{ label: 'BBCH', key: 'code' }, { label: two('Etapa', 'Stage'), get: s => two(s.es, s.en) + (s.sensitive ? ' *' : '') }, { label: two('Días', 'Days'), num: true, get: s => f0(s.daysMedian) }, { label: two('Años con helada', 'Years with frost'), num: true, get: s => pc(s.pFrost) }, { label: two('Días de helada', 'Frost days'), num: true, get: s => f1(s.meanFrost) }, { label: two('Años con calor', 'Years with heat'), num: true, get: s => pc(s.pHeat) }, { label: two('Días de calor', 'Heat days'), num: true, get: s => f1(s.meanHeat) }],
      r.summary, two('Helada y golpe de calor por etapa (* etapa sensible)', 'Frost and heat shock by stage (* sensitive stage)'));
    h += figure('b9ByStage', two('Años con helada y con calor en cada etapa.', 'Years with frost and heat at each stage.'));
    if (sw) {
      h += p(sw.windows.length ? two(`Ventana de siembra con al menos ${pc(sw.opts.target)} de éxito (madurez, sin helada ${sw.opts.frostWhere === 'cycle' ? 'en el ciclo' : 'en la etapa sensible'}, sin golpe de calor${sw.opts.useWater ? `, rendimiento en temporal ≥ ${pc(sw.opts.yieldMin)}` : ''}, todo en el mismo año): ${sw.windows.map(w => `del ${fmtDoy(w.from)} al ${fmtDoy(w.to)} (mejor el ${fmtDoy(w.best.J)}, ${pc(w.best.pSuccess)})`).join('; ')}.`, `Sowing window with at least ${pc(sw.opts.target)} success (maturity, no frost ${sw.opts.frostWhere === 'cycle' ? 'in the cycle' : 'at the sensitive stage'}, no heat shock${sw.opts.useWater ? `, rain-fed yield ≥ ${pc(sw.opts.yieldMin)}` : ''}, all in the same year): ${sw.windows.map(w => `from ${fmtDoy(w.from)} to ${fmtDoy(w.to)} (best on ${fmtDoy(w.best.J)}, ${pc(w.best.pSuccess)})`).join('; ')}.`) : two(`Ninguna fecha de siembra alcanza el ${pc(sw.opts.target)} de éxito con todas las condiciones a la vez${sw.best ? `; la mejor es el ${fmtDoy(sw.best.J)} con ${pc(sw.best.pSuccess)}` : ''}.`, `No sowing date reaches ${pc(sw.opts.target)} success with every condition at once${sw.best ? `; the best is ${fmtDoy(sw.best.J)} with ${pc(sw.best.pSuccess)}` : ''}.`));
      h += figure('b9Window', two('Ventana de siembra: cada criterio y su conjunción.', 'Sowing window: each criterion and their conjunction.'));
      h += table([{ label: two('Siembra', 'Sowing'), get: x => fmtDoy(x.J) }, { label: two('Madura', 'Matures'), num: true, get: x => pc(x.pMature) }, { label: two('Días', 'Days'), num: true, get: x => f0(x.daysMedian) }, { label: two('Sin helada', 'No frost'), num: true, get: x => pc(x.pNoFrost) }, { label: two('Sin calor', 'No heat'), num: true, get: x => pc(x.pNoHeat) }, { label: two('Agua', 'Water'), num: true, get: x => pc(x.pWater) }, { label: two('Éxito', 'Success'), num: true, get: x => pc(x.pSuccess) }],
        sw.rows.filter((x, i) => x.n > 0 && i % 2 === 0), two('Ventana de siembra, cada diez días', 'Sowing window, every ten days'));
    }
    if (rk.scenarios && rk.scenarios.length > 1) {
      h += table([{ label: two('Escenario', 'Scenario'), get: s => (s.dT === 0 ? two('Clima actual', 'Current climate') : `${s.dT > 0 ? '+' : ''}${s.dT} °C${s.dP ? `, ${two('lluvia', 'rain')} ${s.dP > 0 ? '+' : ''}${Math.round(s.dP * 100)} %` : ''}`) }, { label: two('Días a madurez', 'Days to maturity'), num: true, get: s => f0(s.daysToMaturity) }, { label: two('Madura', 'Matures'), num: true, get: s => pc(s.pMature) }, { label: two('Helada (días)', 'Frost (days)'), num: true, get: s => f1(s.risk.meanFrostCycle) }, { label: two('Calor (días)', 'Heat (days)'), num: true, get: s => f1(s.risk.meanHeatCycle) }, { label: two('ETo anual', 'Annual ETo'), num: true, get: s => f0(s.etoAnnual) }, { label: two('Rend. temporal', 'Rain-fed yield'), num: true, get: s => (s.water ? pc(s.water.relYield) : '—') }, { label: two('Porciones de frío', 'Chill portions'), num: true, get: s => (s.chill ? f1(s.chill.cp) : '—') }],
        rk.scenarios, two('Escenarios de calentamiento (análisis de sensibilidad)', 'Warming scenarios (sensitivity analysis)'));
      h += figure('b9Scenarios', two('Cada indicador respecto al clima actual.', 'Each indicator relative to the current climate.'));
    }
    return h;
  }

  /* ---------- methods, written from what was run ---------- */
  function secMethods() {
    const items = [];
    /* S is the included part of the study: a method that belongs to an excluded section is not described */
    const S = {};
    ['weather', 'climate', 'degreeDays', 'eto', 'balance', 'irrigation', 'phenology', 'risk'].forEach(k => { S[k] = use(k) ? state[k] : null; });
    if (S.weather) items.push(two('Los datos diarios se leyeron y revisaron con límites físicos por variable, la corrección de los días con Tmax &lt; Tmin, la detección de picos y tramos planos, la interpolación lineal de huecos cortos en las variables continuas (nunca en la lluvia) y la derivación de la temperatura media como promedio de los extremos cuando no se midió. El viento se llevó a 2 m con el perfil logarítmico de FAO-56 (ec. 47).', 'The daily data were read and checked with physical limits per variable, the correction of days with Tmax &lt; Tmin, the detection of spikes and flat runs, the linear interpolation of short gaps in the continuous variables (never in rain) and the derivation of the mean temperature as the average of the extremes when it was not measured. Wind was brought to 2 m with the FAO-56 logarithmic profile (eq. 47).'));
    if (S.climate) items.push(two('Las normales mensuales se calcularon sobre los meses con al menos 80 % de sus días; el climograma sigue las convenciones de Walter y Lieth (10 °C = 20 mm, compresión 1:10 sobre 100 mm); el inicio y el fin de la temporada de lluvias siguen la definición agronómica de Stern, Dennett y Garbutt (1981); las fechas de helada son frecuencias empíricas de las temporadas partidas en el mes más cálido; la ETP de Thornthwaite (1948) y el balance de Thornthwaite y Mather (1955) alimentan el índice de humedad y el periodo de crecimiento de la FAO; la clasificación de Köppen–Geiger aplica los criterios de Peel, Finlayson y McMahon (2007) y los índices de aridez son los del PNUMA (1992), De Martonne (1926) y Lang (1920).', 'Monthly normals were computed over the months with at least 80 % of their days; the climograph follows the conventions of Walter and Lieth (10 °C = 20 mm, 1:10 compression above 100 mm); the onset and end of the rainy season follow the agronomic definition of Stern, Dennett and Garbutt (1981); frost dates are empirical frequencies of the seasons split at the warmest month; Thornthwaite\'s (1948) PET and the Thornthwaite and Mather (1955) balance feed the moisture index and the FAO growing period; the Köppen–Geiger classification applies the criteria of Peel, Finlayson and McMahon (2007) and the aridity indices are those of UNEP (1992), De Martonne (1926) and Lang (1920).'));
    if (S.degreeDays || S.phenology) { const m = (S.degreeDays || S.phenology).params.method; items.push(two(`El tiempo térmico se acumuló por el método ${mname(m)} (McMaster y Wilhelm 1997${m === 'sine' || m === 'doubleSine' ? '; Baskerville y Emin 1969; Allen 1976' : m === 'triangle' || m === 'doubleTriangle' ? '; Lindsey y Newman 1956' : m === 'chu' ? '; Brown 1975' : ''}) con los umbrales declarados en cada sección${S.phenology ? ', y las etapas se fecharon en el día en que la acumulación cruza el requerimiento de cada una (escala BBCH, Meier 2018)' : ''}${S.phenology && S.phenology.calibration && S.phenology.calibration.stages.length ? '; los requerimientos se calibraron con fechas observadas y la base se examinó por el criterio de mínimo coeficiente de variación de Arnold (1959)' : ''}.`, `Thermal time was accumulated by the ${mname(m)} method (McMaster and Wilhelm 1997${m === 'sine' || m === 'doubleSine' ? '; Baskerville and Emin 1969; Allen 1976' : m === 'triangle' || m === 'doubleTriangle' ? '; Lindsey and Newman 1956' : m === 'chu' ? '; Brown 1975' : ''}) with the thresholds stated in each section${S.phenology ? ', and the stages were dated on the day the accumulation crosses each requirement (BBCH scale, Meier 2018)' : ''}${S.phenology && S.phenology.calibration && S.phenology.calibration.stages.length ? '; the requirements were calibrated with observed dates and the base examined by Arnold\'s (1959) minimum coefficient of variation' : ''}.`)); }
    if (S.eto) items.push(etoSentence() + ' ' + two('Hargreaves–Samani (1985), Priestley–Taylor (1972), Turc (1961) y Thornthwaite (1948) se calcularon para comparación, y el método simple se calibró contra Penman–Monteith por el cociente de medias y por regresión lineal.', 'Hargreaves–Samani (1985), Priestley–Taylor (1972), Turc (1961) and Thornthwaite (1948) were computed for comparison, and the simple method was calibrated against Penman–Monteith by the ratio of means and by linear regression.'));
    if (S.balance) items.push(two('El balance hídrico es el balance diario de la zona radical de FAO-56 (capítulo 8): curva de Kc en cuatro tramos con los valores de las tablas 11 y 12 corregidos al viento y la humedad mínima de cada temporada (ec. 62), raíz creciente hasta el fin del desarrollo, fracción de agotamiento p ajustada a la ETc del día, coeficiente de estrés Ks lineal entre el AFA y el ADT (ec. 84), escurrimiento por número de curva del NRCS y percolación por encima de capacidad de campo; el rendimiento relativo se estimó con la función estacional de respuesta al agua de Doorenbos y Kassam (1979): 1 − Ya/Ym = Ky (1 − ETa/ETm).', 'The water balance is the FAO-56 daily root-zone balance (chapter 8): four-segment Kc curve with the values of tables 11 and 12 corrected to each season\'s wind and minimum humidity (eq. 62), roots growing to the end of development, depletion fraction p adjusted to the day\'s ETc, stress coefficient Ks linear between RAW and TAW (eq. 84), NRCS curve-number runoff and percolation above field capacity; the relative yield was estimated with the seasonal water-response function of Doorenbos and Kassam (1979): 1 − Ya/Ym = Ky (1 − ETa/ETm).'));
    if (S.irrigation) items.push(two('El calendario de riego aplica la regla declarada sobre ese balance en cada año del registro, con la lámina bruta igual a la neta entre la eficiencia de aplicación; la capacidad de diseño es la ETc máxima de la media estación (percentil 90 de los días entre años) entre la eficiencia, y la lámina de planeación es el percentil 80 de la lámina bruta de la temporada entre años.', 'The irrigation calendar applies the stated rule on that balance in every year of the record, with the gross depth equal to the net depth divided by the application efficiency; the design capacity is the peak mid-season ETc (90th percentile of the days across years) divided by the efficiency, and the planning depth is the 80th percentile of the season\'s gross depth across years.'));
    if (S.phenology && S.phenology.chill) items.push(two('El frío invernal se contó sobre temperaturas horarias reconstruidas de los extremos diarios con el método de Linvill (1990): horas frío entre 0 y 7.2 °C (Weinberger 1950), unidades Utah (Richardson, Seeley y Walker 1974) y porciones de frío del modelo dinámico (Fishman, Erez y Couvillon 1987; Erez et al. 1990); los grados-hora de crecimiento siguen a Anderson, Richardson y Kesner (1986); el fotoperiodo se calculó con el sol a −6° (crepúsculo civil).', 'Winter chill was counted on hourly temperatures rebuilt from the daily extremes with Linvill\'s (1990) method: chill hours between 0 and 7.2 °C (Weinberger 1950), Utah units (Richardson, Seeley and Walker 1974) and chill portions of the Dynamic model (Fishman, Erez and Couvillon 1987; Erez et al. 1990); growing degree hours follow Anderson, Richardson and Kesner (1986); the photoperiod was computed with the sun at −6° (civil twilight).'));
    if (S.risk) items.push(two('El riesgo por etapa cuenta los días con Tmin y Tmax más allá de los umbrales dentro de la ventana de cada etapa en cada año; la ventana de siembra evalúa cada fecha en cada año por cuatro condiciones simultáneas (madurez, helada, golpe de calor y agua de temporal) y reporta la fracción de años en que todas se cumplen; los escenarios desplazan las temperaturas de la serie (método delta) y repiten los cálculos como análisis de sensibilidad, no como pronóstico.', 'The risk by stage counts the days with Tmin and Tmax beyond the thresholds inside each stage\'s window in each year; the sowing window judges each date in each year by four simultaneous conditions (maturity, frost, heat shock and rain-fed water) and reports the share of years in which all hold; the scenarios shift the temperatures of the series (delta method) and repeat the computations as a sensitivity analysis, not a forecast.'));
    items.push(two(`Todos los cálculos se hicieron con PhenologyPro ${APP_VERSION} (Barrera-Guzmán 2026), cuyo motor está verificado contra los ejemplos resueltos de FAO-56 y las fórmulas cerradas de cada método.`, `All computations were made with PhenologyPro ${APP_VERSION} (Barrera-Guzmán 2026), whose engine is checked against the worked examples of FAO-56 and the closed forms of each method.`));
    return `<h2>${two('Métodos', 'Methods')}</h2>${items.map(p).join('')}`;
  }
  function secRefs() {
    const fam = new Set(['gdd']);
    if (use('eto') || use('balance')) fam.add('eto');
    if (use('balance') || use('irrigation')) fam.add('water');
    if (use('climate') || use('risk')) fam.add('clima');
    if (use('phenology')) fam.add('chill');
    const refs = (window.Home ? Home.REFS : []).filter(r => fam.has(r[0])).map(r => r[1] + ' ' + r[2]).sort();
    refs.push(two(`Barrera-Guzmán, L.Á. (2026). PhenologyPro: plataforma en el navegador para la agroclimatología y la fenología de cultivos (versión ${APP_VERSION}) [software]. https://doi.org/10.5281/zenodo.23004710`, `Barrera-Guzmán, L.Á. (2026). PhenologyPro: a browser-based platform for agroclimatology and crop phenology (Version ${APP_VERSION}) [Computer software]. https://doi.org/10.5281/zenodo.23004710`));
    return `<h2>${two('Referencias', 'References')}</h2><ol class="refs">${refs.map(r => `<li>${r}</li>`).join('')}</ol>`;
  }

  /* ---------- the calculation record ---------- */
  function params() {
    const strip = (o, keys) => { if (!o) return null; const out = {}; Object.keys(o).forEach(k => { if (keys.includes(k)) out[k] = o[k]; }); return out; };
    return {
      app: 'PhenologyPro', version: APP_VERSION, generated: new Date().toISOString(), language: I18N.lang,
      site: state.site || null,
      data: state.weather ? { period: [state.weather.meta.first, state.weather.meta.last], days: state.weather.rows.length, qc: state.weather.qc, present: state.weather.meta.present } : null,
      climate: state.climate ? { years: state.climate.years, frostThreshold: state.climate.fr.threshold, awc: state.climate.awc, rainOnset: state.climate.rr.ok ? state.climate.rr.seasons.opts : null } : null,
      degreeDays: state.degreeDays ? Object.assign(strip(state.degreeDays.params, ['method', 'base', 'upper', 'cutoff', 'm', 'd', 'target', 'season', 'stopAtFrost', 'frostThr']), { crop: state.degreeDays.params.crop ? state.degreeDays.params.crop.id : null }) : null,
      eto: state.eto ? { method: state.eto.method, options: strip(state.eto.opts, ['kRs', 'arid', 'windDefault', 'as', 'bs', 'albedo', 'ptAlpha', 'hsCoef', 'hsExp']), notes: state.eto.res.notes, calibration: state.eto.cal ? strip(state.eto.cal, ['k', 'a', 'b', 'r2', 'rmse', 'bias']) : null } : null,
      balance: state.balance ? Object.assign(strip(state.balance.params, ['m', 'd', 'L', 'kc', 'zIni', 'zMax', 'p', 'ky', 'taw', 'cn', 'dr0', 'kcCorrect']), { crop: state.balance.params.crop.id }) : null,
      irrigation: state.irrigation ? { rule: state.irrigation.rule, capacity: state.irrigation.capacity, customary: state.irrigation.cust } : null,
      phenology: state.phenology ? { crop: state.phenology.crop, params: state.phenology.params, stages: state.phenology.stages, calibrated: !!(state.phenology.calibration && state.phenology.calibration.stages.length), chill: state.phenology.chill ? { startM: state.phenology.chill.startM, endM: state.phenology.chill.endM, unit: state.phenology.chill.unit, req: state.phenology.chill.req } : null } : null,
      risk: state.risk ? { crop: state.risk.crop, thresholds: state.risk.thr, sensitive: state.risk.sensitive, window: state.risk.window ? strip(state.risk.window.opts, ['step', 'yieldMin', 'useWater', 'frostWhere', 'target']) : null, scenarios: state.risk.scenarios ? state.risk.scenarios.map(s => ({ dT: s.dT, dP: s.dP })) : null } : null,
      figureStyle: window.FigStyle ? FigStyle.get() : null,
      figureEdits: window.FigEdit ? FigEdit.summary() : null,
    };
  }

  /* ---------- the executive summary ---------- */
  function summary() {
    const out = [];
    const c = state.climate;
    if (c) { const a = c.nm.annual; out.push(two(`Clima ${c.kp ? c.kp.code : ''}: ${fmtTemp(a.T, 1)} de media anual y ${fmtMm(a.P, 0)} de lluvia; P/ETP ${f2(c.ind.unep.ai)} (${cls(c.ind.unep.cls)}).`, `Climate ${c.kp ? c.kp.code : ''}: ${fmtTemp(a.T, 1)} annual mean and ${fmtMm(a.P, 0)} of rain; P/PET ${f2(c.ind.unep.ai)} (${cls(c.ind.unep.cls)}).`)); if (c.fr.n) out.push(frostMatters(c.fr) ? two(`Periodo libre de heladas de ${f0(c.fr.freeMean)} días; al 20 % de riesgo, sembrar después del ${fmtDoy(c.fr.probs[1].last)} y cosechar antes del ${fmtDoy(c.fr.probs[1].first)}.`, `Frost-free period of ${f0(c.fr.freeMean)} days; at 20 % risk, sow after ${fmtDoy(c.fr.probs[1].last)} and harvest before ${fmtDoy(c.fr.probs[1].first)}.`) : c.fr.anyFrost ? two(`Heladas ocasionales: en ${c.fr.frostSeasons} de ${c.fr.n} temporadas, mínima absoluta ${fmtTemp(c.fr.tnAbs, 1)}.`, `Occasional frost: in ${c.fr.frostSeasons} of ${c.fr.n} seasons, absolute minimum ${fmtTemp(c.fr.tnAbs, 1)}.`) : two('Sin heladas en el registro.', 'No frost in the record.')); }
    if (state.eto) { const yr = state.eto.yr.pm; if (yr.length) out.push(two(`ETo anual de ${fmtMm(Stat.mean(yr.map(a => a.total)), 0)} (Penman–Monteith FAO-56).`, `Annual ETo of ${fmtMm(Stat.mean(yr.map(a => a.total)), 0)} (FAO-56 Penman–Monteith).`)); }
    if (state.degreeDays && state.degreeDays.by.days) out.push(two(`${cropName(state.degreeDays.params.crop)}: madurez en ${f0(state.degreeDays.by.days.median)} días desde el ${state.degreeDays.params.d} de ${monthName(state.degreeDays.params.m)} (P80 ${f0(state.degreeDays.by.days.p80)}).`, `${cropName(state.degreeDays.params.crop)}: maturity in ${f0(state.degreeDays.by.days.median)} days from ${monthName(state.degreeDays.params.m)} ${state.degreeDays.params.d} (P80 ${f0(state.degreeDays.by.days.p80)}).`));
    if (state.balance && state.balance.all.summary) { const s = state.balance.all.summary; out.push(two(`En temporal, rendimiento relativo de ${pc(s.relYield.median)} (P20 ${pc(s.relYield.p20)}); déficit de ${fmtMm(s.deficit.median, 0)} en la mediana.`, `Rain-fed, relative yield of ${pc(s.relYield.median)} (P20 ${pc(s.relYield.p20)}); deficit of ${fmtMm(s.deficit.median, 0)} at the median.`)); }
    if (state.irrigation && state.irrigation.all.summary) { const s = state.irrigation.all.summary, g = Irrig7.statOf(state.irrigation.all.years.map(x => x.totals.Igross)); out.push(two(`Con riego: ${f0(s.events.median)} riegos y ${fmtMm(g.median, 0)} brutos en el año mediano (${fmtMm(g.p80, 0)} en el seco); capacidad de diseño ${f1(state.irrigation.design.capacity)} mm/día.`, `Irrigated: ${f0(s.events.median)} irrigations and ${fmtMm(g.median, 0)} gross in the median year (${fmtMm(g.p80, 0)} in the dry one); design capacity ${f1(state.irrigation.design.capacity)} mm/day.`)); }
    if (state.risk && state.risk.window) { const sw = state.risk.window; out.push(sw.windows.length ? two(`Ventana de siembra recomendada: ${sw.windows.map(w => `${fmtDoy(w.from)}–${fmtDoy(w.to)}`).join(', ')} (éxito ≥ ${pc(sw.opts.target)}).`, `Recommended sowing window: ${sw.windows.map(w => `${fmtDoy(w.from)}–${fmtDoy(w.to)}`).join(', ')} (success ≥ ${pc(sw.opts.target)}).`) : two(`Ninguna fecha de siembra alcanza el ${pc(sw.opts.target)} de éxito.`, `No sowing date reaches ${pc(sw.opts.target)} success.`)); }
    if (state.phenology && state.phenology.chill && state.phenology.chill.summary) { const cs = state.phenology.chill.summary; out.push(two(`Frío invernal: ${f1(cs.cp.median)} porciones en la mediana${cs.met ? `; el requerimiento de ${f0(cs.met.value)} se cubre en ${pc(cs.met.p)} de los inviernos` : ''}.`, `Winter chill: ${f1(cs.cp.median)} portions at the median${cs.met ? `; the requirement of ${f0(cs.met.value)} is met in ${pc(cs.met.p)} of the winters` : ''}.`)); }
    return out;
  }

  /* ---------- the document ---------- */
  const CSS = `body{font-family:Georgia,"Times New Roman",serif;color:#152230;max-width:900px;margin:24px auto;padding:0 24px;line-height:1.5;font-size:11pt}
h1{font-size:22pt;margin:0 0 4px;letter-spacing:-.3px}h2{font-size:15pt;margin:28px 0 8px;border-bottom:1px solid #bfcdd9;padding-bottom:4px;page-break-after:avoid}h3{font-size:12pt;margin:18px 0 6px}
.meta{color:#5a6b7a;font-size:10pt;margin-bottom:18px}.sum{background:#eef4f9;border-left:3px solid #1f6f9f;padding:10px 14px;border-radius:0 6px 6px 0}.sum li{margin:3px 0}
table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:10px 0 16px;page-break-inside:avoid}caption{text-align:left;font-weight:700;font-size:9.5pt;padding:4px 0}th,td{border:1px solid #c3d1c7;padding:3px 6px;vertical-align:top}th{background:#e8eef4;text-align:left}td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
figure{margin:14px 0 18px;page-break-inside:avoid}.fig svg{width:100%;height:auto;display:block;border:1px solid #dbe4ec;border-radius:6px}figcaption{font-size:9.5pt;color:#5a6b7a;margin-top:4px}
dl.kv{display:grid;grid-template-columns:max-content 1fr;gap:2px 14px;font-size:10pt}dl.kv dt{font-weight:700;color:#5a6b7a}dl.kv dd{margin:0}
.refs{font-size:9.5pt;padding-left:20px}.refs li{margin:3px 0}pre{font-size:8.5pt;background:#f4f7fa;border:1px solid #dbe4ec;border-radius:6px;padding:10px;white-space:pre-wrap;word-break:break-word}
.cite{background:#f4f7fa;border:1px solid #dbe4ec;border-radius:6px;padding:8px 12px;font-size:9.5pt;font-family:ui-monospace,monospace}
@media print{body{margin:0;max-width:none;font-size:10pt}h2{page-break-before:auto}.noprint{display:none}}`;

  function build(o) {
    const opt = Object.assign({ author: '', title: '', include: null, appendix: true }, o || {});
    figN = 0; tabN = 0;
    const KEY = { data: 'weather', climate: 'climate', gdd: 'degreeDays', eto: 'eto', balance: 'balance', irrigation: 'irrigation', phenology: 'phenology', risk: 'risk' };
    INC = {}; Object.keys(KEY).forEach(k => { INC[KEY[k]] = !opt.include || opt.include[k] !== false; });
    const inc = k => !opt.include || opt.include[k] !== false;
    const title = opt.title || two(`Estudio agroclimático de ${sitename()}`, `Agroclimatic study of ${sitename()}`);
    const now = new Date(), today = fmtDate({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
    const sums = summary();
    let body = `<h1>${esc(title)}</h1><div class="meta">${opt.author ? esc(opt.author) + ' · ' : ''}${today} · PhenologyPro ${APP_VERSION}</div>`;
    if (sums.length) body += `<div class="sum"><b>${two('Resumen', 'Summary')}</b><ul>${sums.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
    const secs = [['data', secData], ['climate', secClimate], ['gdd', secGdd], ['eto', secEto], ['balance', secBalance], ['irrigation', secIrrigation], ['phenology', secPhenology], ['risk', secRisk]];
    /* the sections number themselves in the order in which they survive */
    let n = 0;
    secs.forEach(([k, fn]) => { if (!inc(k)) return; let h = fn(); if (!h) return; n++; h = h.replace(/<h2>\d+\. /, `<h2>${n}. `); body += h; });
    body += secMethods();
    body += secRefs();
    body += `<h2>${two('Cómo citar', 'How to cite')}</h2><div class="cite">${two(`Barrera-Guzmán, L.Á. (2026). PhenologyPro: plataforma en el navegador para la agroclimatología y la fenología de cultivos (versión ${APP_VERSION}) [software]. https://doi.org/10.5281/zenodo.23004710`, `Barrera-Guzmán, L.Á. (2026). PhenologyPro: a browser-based platform for agroclimatology and crop phenology (Version ${APP_VERSION}) [Computer software]. https://doi.org/10.5281/zenodo.23004710`)}</div>`;
    if (opt.appendix) body += `<h2>${two('Anexo. Registro de cálculo', 'Appendix. Calculation record')}</h2><p>${two('Todos los parámetros con que se obtuvo este informe. Con el archivo de proyecto (.json) que acompaña al paquete, la app reproduce cada cuadro y cada figura.', 'Every parameter with which this report was obtained. With the project file (.json) that accompanies the package, the app reproduces every table and figure.')}</p><pre>${escPre(JSON.stringify(params(), null, 1))}</pre>`;
    INC = null;
    return `<!DOCTYPE html><html lang="${I18N.lang}"><head><meta charset="UTF-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`;
  }

  /* ---------- the tables of the study as files ---------- */
  function csvs() {
    const out = [];
    const line = a => a.map(v => csvEscape(v == null ? '' : typeof v === 'number' ? +v.toFixed(4) : v)).join(',');
    if (state.weather) out.push({ name: 'cuadros/serie_limpia.csv', text: WxIO.toCSV(state.weather.rows, WxIO.VARS.filter(v => state.weather.meta.present[v.id] || v.id === 'tmean').map(v => v.id)) });
    if (state.climate) { const nm = state.climate.nm; out.push({ name: 'cuadros/normales_mensuales.csv', text: ['month,tmax,tmean,tmin,txAbs,tnAbs,P,P20,P80,wetDays,frostDays,rh,wind,sun,rs,yearsT,yearsP'].concat(nm.months.map(x => line([x.m, x.tmax, x.tmean, x.tmin, x.txAbs, x.tnAbs, x.P, x.P20, x.P80, x.wetDays, x.frostDays, x.rh, x.wind, x.sun, x.rs, x.nT, x.nP]))).join('\n') }); }
    if (state.degreeDays) { const s = state.degreeDays; out.push({ name: 'cuadros/grados_dia_por_anio.csv', text: ['year,gdd30,gdd60,gdd90,gdd120,seasonTotal,daysToTarget,frostAt,missing'].concat(s.by.years.map(r => line([r.y, r.at[30], r.at[60], r.at[90], r.at[120], r.seasonTotal, r.days, r.frostAt, r.missing]))).join('\n') }); out.push({ name: 'cuadros/mapa_siembra_grados_dia.csv', text: ['sowingDoy,gddMedian,gddP20,gddP80,daysMedian,daysP20,daysP80,pReached,years'].concat(s.map.rows.map(r => line([r.J, r.total && r.total.median, r.total && r.total.p20, r.total && r.total.p80, r.days && r.days.median, r.days && r.days.p20, r.days && r.days.p80, r.pReached, r.n]))).join('\n') }); }
    if (state.eto) { const e = state.eto, rows = state.weather.rows; out.push({ name: 'cuadros/eto_mensual.csv', text: ['month,PM_mmday,PM_mmmonth,P20,P80,HS,PT,Turc,Thornthwaite'].concat(e.mon.pm.map((x, i) => line([x.m, x.perDay, x.perMonth, x.p20, x.p80, e.mon.hs[i].perDay, e.mon.pt[i].perDay, e.mon.turc[i].perDay, e.tw ? e.tw[i].perDay : null]))).join('\n') }); out.push({ name: 'cuadros/eto_diaria.csv', text: ['date,Ra,Rs,Rn,es,ea,u2,ETo_PM,ETo_HS,ETo_PT,ETo_Turc,ETo_chosen'].concat(rows.map((r, i) => line([toISO(r), e.res.ra[i], e.res.rs[i], e.res.rn[i], e.res.es[i], e.res.ea[i], e.res.u2[i], e.res.pm[i], e.res.hs[i], e.res.pt[i], e.res.turc[i], e.daily[i]]))).join('\n') }); }
    if (state.balance) out.push({ name: 'cuadros/balance_por_anio.csv', text: ['year,sowing,ETo,ETc,ETc_actual,rain,effective,runoff,percolation,deficit,stressDays,ksMean,relYield'].concat(state.balance.all.years.map(r => line([r.y, toISO(r.start), r.totals.eto, r.totals.etc, r.totals.etcAdj, r.totals.P, r.totals.Pe, r.totals.RO, r.totals.DP, r.totals.deficit, r.totals.stressDays, r.totals.ksMean, r.relYield]))).join('\n') });
    if (state.irrigation) { const ir = state.irrigation; out.push({ name: 'cuadros/riego_por_anio.csv', text: ['year,events,net_mm,gross_mm,rain_mm,percolation_mm,stressDays,relYield'].concat(ir.all.years.map(r => line([r.y, r.totals.events, r.totals.I, r.totals.Igross, r.totals.P, r.totals.DP, r.totals.stressDays, r.relYield]))).join('\n') }); const yv = ir.all.years.find(x => x.y === ir.all.medianYear); if (yv) out.push({ name: `cuadros/calendario_riego_${yv.y}.csv`, text: ['n,date,day,stage,depletion_mm,net_mm,gross_mm,m3_ha'].concat(Irrig7.calendar(yv, ir.params, ir.capacity).map((x, i) => line([i + 1, toISO(x.date), x.day, x.stage, x.drBefore, x.net, x.gross, x.gross * 10]))).join('\n') }); }
    if (state.phenology && state.phenology.res) { const p = state.phenology; out.push({ name: 'cuadros/fenologia_por_anio.csv', text: [['year', 'sowing'].concat(p.res.summary.map(s => 'BBCH' + s.code)).join(',')].concat(p.res.years.map(r => line([r.y, toISO(r.sowing)].concat(r.stages.map(s => (s.date ? toISO(s.date) : '')))))).join('\n') }); if (p.chill) out.push({ name: 'cuadros/frio_invernal.csv', text: ['winter,days,chillPortions,utahUnits,chillHours,meanTmin'].concat(p.chill.seasons.map(s => line([s.label, s.days, s.cp, s.utah, s.hours, s.tminMean]))).join('\n') }); }
    if (state.risk && state.risk.window) out.push({ name: 'cuadros/ventana_siembra.csv', text: ['sowingDoy,years,pMature,daysMedian,pNoFrost,pNoHeat,pWater,yieldP20,pSuccess'].concat(state.risk.window.rows.map(x => line([x.J, x.n, x.pMature, x.daysMedian, x.pNoFrost, x.pNoHeat, x.pWater, x.ryP20, x.pSuccess]))).join('\n') });
    return out;
  }

  Object.assign(Report, { build, csvs, params, summary, etoSentence });
  if (typeof window !== 'undefined') window.Report = Report;
})();
