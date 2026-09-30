/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 3: the climate of the site.
   Reads state.weather from Block 2 and writes state.climate: the normals, the
   climograph, the rain regime, the frost statistics, the indices and the
   classification, with every table and figure the first page of an
   agroclimatic study needs. */

(function () {

  const two = (es, en) => L2(es, en);
  const CLS = {
    hyperarid: ['hiperárido', 'hyper-arid'], arid: ['árido', 'arid'], semiarid: ['semiárido', 'semi-arid'], drysubhumid: ['subhúmedo seco', 'dry sub-humid'], humid: ['húmedo', 'humid'],
    mediterranean: ['mediterráneo / semihúmedo', 'Mediterranean / semi-humid'], subhumid: ['subhúmedo', 'sub-humid'], perhumid: ['perhúmedo', 'perhumid'],
    desert: ['desértico', 'desert'], humidsteppe: ['estepa húmeda / sabana', 'humid steppe / savanna'], humidforest: ['bosque húmedo', 'humid forest'], wet: ['muy húmedo', 'wet'],
    uniform: ['uniforme', 'uniform'], moderate: ['moderadamente estacional', 'moderately seasonal'], seasonal: ['estacional', 'seasonal'], strong: ['fuertemente estacional', 'strongly seasonal'],
  };
  const IM = { A: ['perhúmedo', 'perhumid'], B4: ['húmedo (B4)', 'humid (B4)'], B3: ['húmedo (B3)', 'humid (B3)'], B2: ['húmedo (B2)', 'humid (B2)'], B1: ['húmedo (B1)', 'humid (B1)'], C2: ['subhúmedo húmedo', 'moist sub-humid'], C1: ['subhúmedo seco', 'dry sub-humid'], D: ['semiárido', 'semi-arid'], E: ['árido', 'arid'] };
  const cls = k => k && CLS[k] ? T(CLS[k][0], CLS[k][1]) : '—';

  function ready() { return state.weather && state.weather.rows && state.weather.rows.length > 300; }

  function yearsSelected() {
    const mode = el('b3Years').value;
    if (mode === 'all') return null;
    const usable = state.weather.years.filter(y => y.complete).map(y => y.y);
    if (mode === 'complete') return new Set(usable);
    /* the last 30 complete years, the standard period of a normal */
    return new Set(usable.slice(-30));
  }

  function run() {
    const box = el('b3Msg'); clearMessages(box);
    if (!ready()) { el('b3Body').style.display = 'none'; el('b3Empty').style.display = ''; return; }
    el('b3Empty').style.display = 'none'; el('b3Body').style.display = '';
    const rows = state.weather.rows, site = state.site || { lat: 20, z: 0 };
    const years = yearsSelected();
    const nm = Clim3.normals(rows, { years });
    if (!nm.complete) { showMessage(box, 'error', two('No hay suficientes meses completos para las normales: cada mes necesita al menos un año con 80 % de sus días. Revisa el calendario del Bloque 2 o usa «todos los años».', 'Not enough complete months for the normals: each month needs at least one year with 80 % of its days. Check the calendar of Block 2 or use "all years".')); return; }
    const cg = Clim3.climograph(nm);
    const rr = Clim3.rainRegime(rows, nm, site.lat, { onsetMm: parseNum(el('b3OnsetMm').value) || 20, dryRun: parseNum(el('b3DryRun').value) || 10 });
    const fr = Clim3.frost(rows, nm, { threshold: parseNum(el('b3FrostThr').value) || 0 });
    const awc = parseNum(el('b3Awc').value) || 100;
    const ind = Clim3.indices(nm, site.lat, awc);
    const kp = Clim3.koppen(nm, site.lat);
    const garcia = Clim3.garciaHumidity(ind.ptRatio, kp && kp.code);
    state.climate = { nm, cg, rr, fr, ind, kp, garcia, awc, years: years ? [...years] : null };
    if (nm.nYears < 10) showMessage(box, 'warning', two(`Normales calculadas con ${nm.nYears} ${nm.nYears === 1 ? 'año' : 'años'}: una estimación, no una normal climática (la OMM pide 30, se aceptan 10).`, `Normals computed with ${nm.nYears} ${nm.nYears === 1 ? 'year' : 'years'}: an estimate, not a climatic normal (WMO asks for 30, 10 are accepted).`));
    renderSummary(nm, cg, rr, fr, ind, kp, garcia, site);
    renderNormalsTable(nm, fr);
    renderRain(rr, nm);
    renderFrost(fr);
    renderIndices(ind, kp, garcia, nm);
    Plots3.monthly('b3Monthly', nm);
    Plots3.walterLieth('b3Climo', nm, site, cg);
    Plots3.seasons('b3Seasons', fr, rr);
    Plots3.frostCurves('b3FrostCurves', fr);
    Plots3.balance('b3Balance', ind);
    Plots3.storage('b3Storage', ind);
    Fig.decorate(el('panel-3'));
    document.dispatchEvent(new CustomEvent('climatechange'));
  }

  function renderSummary(nm, cg, rr, fr, ind, kp, garcia, site) {
    const a = nm.annual;
    const tiles = [
      [T('Temperatura media anual', 'Mean annual temperature'), fmtTemp(a.T, 1), T(`de ${fmtTemp(Math.min(...nm.months.map(x => x.tmean)), 1)} (${monthName(a.coldest, true)}) a ${fmtTemp(Math.max(...nm.months.map(x => x.tmean)), 1)} (${monthName(a.hottest, true)})`, `from ${fmtTemp(Math.min(...nm.months.map(x => x.tmean)), 1)} (${monthName(a.coldest, true)}) to ${fmtTemp(Math.max(...nm.months.map(x => x.tmean)), 1)} (${monthName(a.hottest, true)})`)],
      [T('Precipitación anual', 'Annual precipitation'), fmtMm(a.P, 0), a.Pcv != null ? T(`CV entre años ${fmtPct(a.Pcv, 0)} · P20 ${fmtMm(a.P20, 0)} · P80 ${fmtMm(a.P80, 0)}`, `CV between years ${fmtPct(a.Pcv, 0)} · P20 ${fmtMm(a.P20, 0)} · P80 ${fmtMm(a.P80, 0)}`) : ''],
      [T('Índice de aridez P/ETP', 'Aridity index P/PET'), ind.ok ? fmtFixed(ind.unep.ai, 2) + Help.tag('aridity', ind.unep.ai) : '—', ind.ok ? T(`ETP Thornthwaite ${fmtMm(ind.PETann, 0)}/año`, `Thornthwaite PET ${fmtMm(ind.PETann, 0)}/yr`) : ''],
      [T('Köppen–Geiger', 'Köppen–Geiger'), kp ? `<span class="txt">${kp.code}</span>` : '—', kp ? T(kp.desc[0], kp.desc[1]) : ''],
      [T('Periodo libre de heladas', 'Frost-free period'), fr.n ? (fr.anyFrost ? plural(Math.round(fr.freeMean), T('día', 'day'), T('días', 'days')) : T('todo el año', 'all year')) : '—', fr.n ? (fr.anyFrost ? T(`mín. ${fr.freeMin} · el 20 % de los años < ${Math.round(fr.freeP20)}`, `min ${fr.freeMin} · 20 % of years < ${Math.round(fr.freeP20)}`) : T(`sin Tmin ≤ ${fmtTemp(fr.threshold, 0)} en ${fr.n} temporadas`, `no Tmin ≤ ${fmtTemp(fr.threshold, 0)} in ${fr.n} seasons`)) : '', fr.anyFrost && fr.freeMean < 150 ? 'warn' : ''],
      [T('Temporada de lluvias', 'Rainy season'), rr.ok && rr.seasons.onset ? `${fmtDoy(rr.seasons.onset.median)} – ${rr.seasons.end ? fmtDoy(rr.seasons.end.median) : '…'}` : '—', rr.ok && rr.seasons.length ? T(`mediana ${Math.round(rr.seasons.length.median)} días · concentración ${cls(rr.pciClass)}`, `median ${Math.round(rr.seasons.length.median)} days · concentration ${cls(rr.pciClass)}`) : ''],
      [T('Meses húmedos / secos', 'Humid / dry months'), `${cg.humidMonths} / ${cg.dryMonths}`, T('P > 2T contra P < 2T (Gaussen)', 'P > 2T against P < 2T (Gaussen)')],
      [T('Periodo de crecimiento (FAO)', 'Growing period (FAO)'), ind.ok ? plural(ind.growingMonths, T('mes', 'month'), T('meses', 'months')) : '—', ind.ok ? T(`meses con P > 0.5 ETP; ${ind.thermalMonths} con T > 10 °C`, `months with P > 0.5 PET; ${ind.thermalMonths} with T > 10 °C`) : ''],
    ];
    statTiles('b3Tiles', tiles);
    /* the written paragraph */
    const seasonTxt = rr.ok && rr.seasons.onset ? T(`Las lluvias empiezan en la mediana el ${fmtDoy(rr.seasons.onset.median)} (entre el ${fmtDoy(rr.seasons.onset.p20)} y el ${fmtDoy(rr.seasons.onset.p80)} en el 60 % central de los años)${rr.seasons.end ? ` y terminan hacia el ${fmtDoy(rr.seasons.end.median)}` : ''}; el ${fmtPct(rr.summerShare, 0)} del año cae en el semestre cálido.`, `The rains start at the median on ${fmtDoy(rr.seasons.onset.median)} (between ${fmtDoy(rr.seasons.onset.p20)} and ${fmtDoy(rr.seasons.onset.p80)} in the central 60 % of years)${rr.seasons.end ? ` and end around ${fmtDoy(rr.seasons.end.median)}` : ''}; ${fmtPct(rr.summerShare, 0)} of the year's rain falls in the warm half.`) : '';
    const frostTxt = fr.n ? (fr.anyFrost ? T(`Hiela en ${fr.frostSeasons} de ${fr.n} temporadas, con ${fmtFixed(fr.frostDaysMean, 1)} días de helada al año en promedio y una mínima absoluta de ${fmtTemp(fr.tnAbs, 1)}; la última helada de primavera cae en promedio el ${fmtDoy(fr.lastMean)} y la primera de otoño el ${fmtDoy(fr.firstMean)}.`, `It freezes in ${fr.frostSeasons} of ${fr.n} seasons, with ${fmtFixed(fr.frostDaysMean, 1)} frost days a year on average and an absolute minimum of ${fmtTemp(fr.tnAbs, 1)}; the last spring frost falls on average on ${fmtDoy(fr.lastMean)} and the first autumn frost on ${fmtDoy(fr.firstMean)}.`) : T(`No se registró ninguna temperatura mínima igual o menor que ${fmtTemp(fr.threshold, 0)} en ${fr.n} temporadas.`, `No minimum temperature at or below ${fmtTemp(fr.threshold, 0)} was recorded in ${fr.n} seasons.`)) : '';
    el('b3Text').innerHTML = `<p>${T(`<b>${esc(site.name || T('El sitio', 'The site'))}</b>, a ${site.z != null ? site.z + ' m' : '—'} de altitud, tiene un clima <b>${kp ? kp.code + ' (' + kp.desc[0] + ')' : '—'}</b> según Köppen–Geiger: temperatura media anual de ${fmtTemp(nm.annual.T, 1)} con oscilación de ${fmtFixed(nm.annual.range, 1)} °C entre el mes más frío (${monthName(nm.annual.coldest)}) y el más cálido (${monthName(nm.annual.hottest)}), y ${fmtMm(nm.annual.P, 0)} de lluvia anual concentrada en ${monthName(nm.annual.wettest)}. Según el índice de aridez del PNUMA (${fmtFixed(ind.unep.ai, 2)}) es un clima <b>${cls(ind.unep.cls)}</b>; el índice de humedad de Thornthwaite (${fmtFixed(ind.Im, 0)}) lo clasifica como ${IM[ind.ImClass] ? IM[ind.ImClass][0] : '—'}.`,
      `<b>${esc(site.name || 'The site')}</b>, at ${site.z != null ? site.z + ' m' : '—'} of elevation, has a <b>${kp ? kp.code + ' (' + kp.desc[1] + ')' : '—'}</b> climate after Köppen–Geiger: mean annual temperature of ${fmtTemp(nm.annual.T, 1)} with a range of ${fmtFixed(nm.annual.range, 1)} °C between the coldest month (${monthName(nm.annual.coldest)}) and the warmest (${monthName(nm.annual.hottest)}), and ${fmtMm(nm.annual.P, 0)} of annual rain concentrated in ${monthName(nm.annual.wettest)}. By the UNEP aridity index (${fmtFixed(ind.unep.ai, 2)}) it is a <b>${cls(ind.unep.cls)}</b> climate; Thornthwaite's moisture index (${fmtFixed(ind.Im, 0)}) classes it as ${IM[ind.ImClass] ? IM[ind.ImClass][1] : '—'}.`)}</p><p>${seasonTxt} ${frostTxt}</p>`;
  }

  function renderNormalsTable(nm, fr) {
    const has = k => nm.months.some(x => x[k] != null);
    const cols = [{ key: 'm', label: T('Mes', 'Month'), get: r => monthName(r.m) },
      { key: 'tmax', label: 'Tmax', num: true, fmt: v => fmtFixed(v, 1) }, { key: 'tmean', label: T('Tmedia', 'Tmean'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'tmin', label: 'Tmin', num: true, fmt: v => fmtFixed(v, 1) },
      { key: 'txAbs', label: T('Máx. abs.', 'Abs. max'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'tnAbs', label: T('Mín. abs.', 'Abs. min'), num: true, fmt: v => fmtFixed(v, 1) },
      { key: 'P', label: T('Lluvia (mm)', 'Rain (mm)'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'P20', label: 'P20', num: true, fmt: v => fmtFixed(v, 0) }, { key: 'P80', label: 'P80', num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'wetDays', label: T('Días con lluvia', 'Rain days'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'frostDays', label: T('Días con helada', 'Frost days'), num: true, fmt: v => fmtFixed(v, 1) }];
    if (has('rh')) cols.push({ key: 'rh', label: 'HR (%)', num: true, fmt: v => fmtFixed(v, 0) });
    if (has('wind')) cols.push({ key: 'wind', label: 'u₂ (m/s)', num: true, fmt: v => fmtFixed(v, 1) });
    if (has('sun')) cols.push({ key: 'sun', label: T('Insolación (h)', 'Sunshine (h)'), num: true, fmt: v => fmtFixed(v, 1) });
    if (has('rs')) cols.push({ key: 'rs', label: 'Rs', num: true, fmt: v => fmtFixed(v, 1) });
    cols.push({ key: 'nT', label: T('Años (T / P)', 'Years (T / P)'), num: true, get: r => `${r.nT} / ${r.nP}` });
    const rows = nm.months.slice();
    const a = nm.annual;
    rows.push({ _class: 'total-row', m: 0, tmax: a.Tmax, tmean: a.T, tmin: a.Tmin, txAbs: isFinite(a.txAbs) ? a.txAbs : null, tnAbs: isFinite(a.tnAbs) ? a.tnAbs : null, P: a.P, wetDays: a.wetDays, frostDays: a.frostDays, nT: nm.nYears, nP: nm.nYears,
      rh: has('rh') ? Stat.mean(nm.months.map(x => x.rh).filter(v => v != null)) : null, wind: has('wind') ? Stat.mean(nm.months.map(x => x.wind).filter(v => v != null)) : null, sun: has('sun') ? Stat.mean(nm.months.map(x => x.sun).filter(v => v != null)) : null, rs: has('rs') ? Stat.mean(nm.months.map(x => x.rs).filter(v => v != null)) : null });
    cols[0].get = r => r.m === 0 ? T('Año', 'Year') : monthName(r.m);
    buildTable('b3Normals', cols, rows);
    el('b3NormalsNote').innerHTML = two(`Medias de ${nm.nYears} años (${nm.years[0]}–${nm.years[nm.years.length - 1]}); un mes de un año cuenta si tiene al menos 80 % de sus días. La fila del año promedia las temperaturas y suma la lluvia y los días. P20 y P80 son los percentiles de la lluvia mensual entre años: uno de cada cinco años llueve menos que P20.`,
      `Means of ${nm.nYears} years (${nm.years[0]}–${nm.years[nm.years.length - 1]}); a month of a year counts if it has at least 80 % of its days. The year row averages the temperatures and sums the rain and the days. P20 and P80 are the percentiles of monthly rain across years: one year in five gets less than P20.`);
  }

  function renderRain(rr, nm) {
    if (!rr.ok) { el('b3RainTiles').innerHTML = ''; return; }
    statTiles('b3RainTiles', [
      [T('Índice de concentración (PCI)', 'Concentration index (PCI)'), fmtFixed(rr.pci, 1), cls(rr.pciClass)],
      [T('Lluvia del semestre cálido', 'Warm-half rain'), fmtPct(rr.summerShare, 0), T('abril–septiembre en el hemisferio norte', 'April–September in the northern hemisphere')],
      [T('Días con lluvia ≥ 1 mm', 'Days with rain ≥ 1 mm'), fmtFixed(rr.wetDays, 0), T(`${fmtMm(rr.perWetDay, 1)} por día lluvioso`, `${fmtMm(rr.perWetDay, 1)} per rainy day`)],
      [T('Inicio de la temporada', 'Onset of the season'), rr.seasons.onset ? fmtDoy(rr.seasons.onset.median) : '—', rr.seasons.onset ? T(`P20 ${fmtDoy(rr.seasons.onset.p20)} · P80 ${fmtDoy(rr.seasons.onset.p80)} · ${rr.seasons.onset.n} años`, `P20 ${fmtDoy(rr.seasons.onset.p20)} · P80 ${fmtDoy(rr.seasons.onset.p80)} · ${rr.seasons.onset.n} years`) : T('no se detectó', 'not detected')],
      [T('Fin de la temporada', 'End of the season'), rr.seasons.end ? fmtDoy(rr.seasons.end.median) : '—', rr.seasons.end ? T(`P20 ${fmtDoy(rr.seasons.end.p20)} · P80 ${fmtDoy(rr.seasons.end.p80)}`, `P20 ${fmtDoy(rr.seasons.end.p20)} · P80 ${fmtDoy(rr.seasons.end.p80)}`) : ''],
      [T('Duración', 'Length'), rr.seasons.length ? plural(Math.round(rr.seasons.length.median), T('día', 'day'), T('días', 'days')) : '—', rr.seasons.length ? T(`entre ${Math.round(rr.seasons.length.p20)} y ${Math.round(rr.seasons.length.p80)} en el 60 % de los años`, `between ${Math.round(rr.seasons.length.p20)} and ${Math.round(rr.seasons.length.p80)} in 60 % of years`) : ''],
    ]);
    buildTable('b3SeasonTable', [
      { key: 'y', label: T('Año', 'Year') },
      { key: 'onset', label: T('Inicio', 'Onset'), get: r => r.onsetDate ? fmtDate(r.onsetDate, true) : '—' },
      { key: 'end', label: T('Fin', 'End'), get: r => r.endDate ? fmtDate(r.endDate, true) : '—' },
      { key: 'length', label: T('Días', 'Days'), num: true },
      { key: 'total', label: T('Lluvia del año agrícola (mm)', 'Rain of the rain year (mm)'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'wet', label: T('Días con lluvia', 'Rain days'), num: true },
      { key: 'missing', label: T('Faltantes', 'Missing'), num: true },
    ], rr.seasons.seasons, { scroll: true });
    el('b3SeasonNote').innerHTML = two(`El año de lluvias empieza en ${monthName(rr.seasons.startMonth)}, el mes más seco. Inicio: primer día con ≥ ${rr.seasons.opts.onsetMm} mm en ${rr.seasons.opts.onsetDays} días sin una racha seca de ${rr.seasons.opts.dryRun} días en los 30 siguientes (Stern, Dennett & Garbutt 1981). Fin: primer día, pasados 60 del inicio, desde el cual los 30 días siguientes suman menos de ${rr.seasons.opts.endMm} mm.`,
      `The rain year starts in ${monthName(rr.seasons.startMonth)}, the driest month. Onset: first day with ≥ ${rr.seasons.opts.onsetMm} mm in ${rr.seasons.opts.onsetDays} days and no ${rr.seasons.opts.dryRun}-day dry spell in the next 30 (Stern, Dennett & Garbutt 1981). End: first day, 60 after the onset, from which the next 30 days bring less than ${rr.seasons.opts.endMm} mm.`);
  }

  function renderFrost(fr) {
    if (!fr.n) { el('b3FrostTiles').innerHTML = ''; return; }
    const thr = fmtTemp(fr.threshold, 0);
    statTiles('b3FrostTiles', [
      [T('Temporadas con helada', 'Seasons with frost'), `${fr.frostSeasons} / ${fr.n}`, T(`Tmin ≤ ${thr}`, `Tmin ≤ ${thr}`), fr.frostSeasons === 0 ? 'ok' : fr.frostSeasons / fr.n > 0.5 ? 'warn' : ''],
      [T('Días de helada por año', 'Frost days per year'), fmtFixed(fr.frostDaysMean, 1), fr.tnAbs != null ? T(`mínima absoluta ${fmtTemp(fr.tnAbs, 1)}`, `absolute minimum ${fmtTemp(fr.tnAbs, 1)}`) + Help.tag('frost', fr.tnAbs) : ''],
      [T('Última helada de primavera', 'Last spring frost'), fr.lastMean != null ? fmtDoy(fr.lastMean) : T('ninguna', 'none'), fr.lastMean != null ? T(`promedio · la más tardía ${fmtDoy(fr.lastLatest)}`, `mean · latest ${fmtDoy(fr.lastLatest)}`) : ''],
      [T('Primera helada de otoño', 'First autumn frost'), fr.firstMean != null ? fmtDoy(fr.firstMean) : T('ninguna', 'none'), fr.firstMean != null ? T(`promedio · la más temprana ${fmtDoy(fr.firstEarliest)}`, `mean · earliest ${fmtDoy(fr.firstEarliest)}`) : ''],
      [T('Periodo libre de heladas', 'Frost-free period'), fr.anyFrost ? plural(Math.round(fr.freeMean), T('día', 'day'), T('días', 'days')) : T('todo el año', 'all year'), fr.anyFrost ? T(`el más corto ${fr.freeMin} · P20 ${Math.round(fr.freeP20)}`, `shortest ${fr.freeMin} · P20 ${Math.round(fr.freeP20)}`) : ''],
    ]);
    buildTable('b3FrostProb', [
      { key: 'p', label: T('Riesgo aceptado', 'Accepted risk'), get: r => fmtPct(r.p, 0) },
      { key: 'last', label: T('Sembrar después del', 'Sow after'), get: r => r.last ? fmtDoy(r.last) : '—' },
      { key: 'first', label: T('Cosechar antes del', 'Harvest before'), get: r => r.first ? fmtDoy(r.first) : '—' },
      { key: 'days', label: T('Días entre ambas', 'Days between'), num: true, get: r => r.last && r.first ? r.first - r.last : '—' },
    ], fr.probs);
    el('b3FrostNote').innerHTML = two(`«Sembrar después del» es la fecha a partir de la cual solo esa fracción de los años tuvo alguna helada más tarde; «cosechar antes del», la fecha hasta la cual solo esa fracción tuvo alguna helada antes. Frecuencias empíricas de ${fr.n} temporadas, partidas en el mes más cálido (${monthName(fr.pivotM)}).`,
      `"Sow after" is the date from which only that share of the years had any later frost; "harvest before", the date until which only that share had any earlier frost. Empirical frequencies of ${fr.n} seasons, split at the warmest month (${monthName(fr.pivotM)}).`);
    buildTable('b3FrostMonths', [{ key: 'm', label: T('Mes', 'Month'), get: r => monthName(r.m, true) }, { key: 'days', label: T('Días de helada', 'Frost days'), num: true, fmt: v => fmtFixed(v, 1) }, { key: 'share', label: T('Años con helada', 'Years with frost'), num: true, fmt: v => fmtPct(v, 0) }],
      fr.monthFrost.map((x, i) => ({ m: i + 1, days: x.days, share: x.share })));
  }

  function renderIndices(ind, kp, garcia, nm) {
    if (!ind.ok) return;
    const rows = [
      [T('Köppen–Geiger (Peel et al. 2007)', 'Köppen–Geiger (Peel et al. 2007)'), kp ? kp.code : '—', kp ? T(kp.desc[0], kp.desc[1]) : '', kp ? T(`T del mes más frío ${fmtTemp(kp.Tcold, 1)}, del más cálido ${fmtTemp(kp.Thot, 1)}; umbral de aridez ${fmtMm(10 * kp.Pth, 0)} contra ${fmtMm(kp.MAP, 0)}; mes más seco ${fmtMm(kp.Pdry, 0)}`, `T of the coldest month ${fmtTemp(kp.Tcold, 1)}, of the warmest ${fmtTemp(kp.Thot, 1)}; aridity threshold ${fmtMm(10 * kp.Pth, 0)} against ${fmtMm(kp.MAP, 0)}; driest month ${fmtMm(kp.Pdry, 0)}`) : ''],
      [T('Cociente P/T (García)', 'P/T quotient (García)'), fmtFixed(ind.ptRatio, 1), garcia ? garcia.sub : '—', garcia ? T(garcia.note[0], garcia.note[1]) : ''],
      [T('Índice de aridez del PNUMA (P/ETP)', 'UNEP aridity index (P/PET)'), fmtFixed(ind.unep.ai, 2) + Help.tag('aridity', ind.unep.ai), cls(ind.unep.cls), T('ETP de Thornthwaite; clases 0.05, 0.20, 0.50, 0.65', 'Thornthwaite PET; classes 0.05, 0.20, 0.50, 0.65')],
      [T('Índice de De Martonne P/(T+10)', 'De Martonne index P/(T+10)'), fmtFixed(ind.martonne.I, 1), cls(ind.martonne.cls), T('clases 5, 10, 20, 30, 60', 'classes 5, 10, 20, 30, 60')],
      [T('Factor de lluvia de Lang P/T', 'Lang rain factor P/T'), fmtFixed(ind.lang.I, 1), cls(ind.lang.cls), T('clases 20, 40, 60, 100, 160', 'classes 20, 40, 60, 100, 160')],
      [T('Índice de humedad de Thornthwaite (1955)', 'Thornthwaite moisture index (1955)'), fmtFixed(ind.Im, 1), IM[ind.ImClass] ? T(IM[ind.ImClass][0], IM[ind.ImClass][1]) : '—', T('100 (P − ETP)/ETP; clases 100, 80, 60, 40, 20, 0, −33.3, −66.7', '100 (P − PET)/PET; classes 100, 80, 60, 40, 20, 0, −33.3, −66.7')],
      [T('Balance de Thornthwaite–Mather', 'Thornthwaite–Mather balance'), T(`déficit ${fmtMm(ind.bal.deficit, 0)} · excedente ${fmtMm(ind.bal.surplus, 0)}`, `deficit ${fmtMm(ind.bal.deficit, 0)} · surplus ${fmtMm(ind.bal.surplus, 0)}`), T(`ETR ${fmtMm(ind.bal.AET, 0)} de ${fmtMm(ind.PETann, 0)} de ETP`, `AET ${fmtMm(ind.bal.AET, 0)} of ${fmtMm(ind.PETann, 0)} PET`), T(`capacidad de almacenamiento ${ind.bal.awc} mm`, `storage capacity ${ind.bal.awc} mm`)],
      [T('Periodo de crecimiento (FAO, zonas agroecológicas)', 'Growing period (FAO agro-ecological zones)'), plural(ind.growingMonths, T('mes', 'month'), T('meses', 'months')), T(`${ind.humidMonths} húmedos (P > ETP)`, `${ind.humidMonths} humid (P > PET)`), T('meses con P > 0.5 ETP; el término lo fija la temperatura si T < 6.5 °C', 'months with P > 0.5 PET; temperature ends it if T < 6.5 °C')],
    ];
    buildTable('b3Indices', [{ key: 0, label: T('Índice', 'Index'), get: r => r[0] }, { key: 1, label: T('Valor', 'Value'), html: true, get: r => r[1] }, { key: 2, label: T('Clase', 'Class'), get: r => r[2] }, { key: 3, label: T('Cómo se obtuvo', 'How it was obtained'), get: r => r[3] }], rows);
    buildTable('b3BalanceTable', [
      { key: 'month', label: T('Mes', 'Month'), get: r => monthName(r.month, true) }, { key: 'P', label: 'P', num: true, fmt: v => fmtFixed(v, 0) }, { key: 'PET', label: T('ETP', 'PET'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'ST', label: T('Almac.', 'Storage'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'AET', label: T('ETR', 'AET'), num: true, fmt: v => fmtFixed(v, 0) },
      { key: 'deficit', label: T('Déficit', 'Deficit'), num: true, fmt: v => fmtFixed(v, 0) }, { key: 'surplus', label: T('Excedente', 'Surplus'), num: true, fmt: v => fmtFixed(v, 0) },
    ], ind.bal.rows);
  }

  function wire() {
    ['b3Years', 'b3FrostThr', 'b3Awc', 'b3OnsetMm', 'b3DryRun'].forEach(id => el(id).addEventListener('change', run));
    /* from the button, a long run shows the common waiting window */
    el('b3Run').addEventListener('click', () => { const w = ppWork('Calculando el clima del sitio', 'Computing the site climate'); ppAfterPaint(() => { run(); if (!ready() && w) w._failed = true; }, w); });
    el('b3Continue').addEventListener('click', () => goStep(4));
    el('b3ToData').addEventListener('click', () => goStep(2));
    el('b3ExportNormals').addEventListener('click', () => {
      if (!state.climate) return;
      const nm = state.climate.nm;
      const head = ['month', 'tmax', 'tmean', 'tmin', 'txAbs', 'tnAbs', 'P', 'P20', 'P80', 'wetDays', 'frostDays', 'rh', 'wind', 'sun', 'rs', 'yearsT', 'yearsP'];
      const lines = [head.join(',')].concat(nm.months.map(x => [x.m, x.tmax, x.tmean, x.tmin, x.txAbs, x.tnAbs, x.P, x.P20, x.P80, x.wetDays, x.frostDays, x.rh, x.wind, x.sun, x.rs, x.nT, x.nP].map(v => v == null ? '' : (typeof v === 'number' ? +v.toFixed(2) : v)).join(',')));
      download(lines.join('\n'), slug((state.site && state.site.name) || 'sitio') + '_normales.csv', 'text/csv;charset=utf-8');
    });
    document.addEventListener('weatherchange', () => { if (document.querySelector('#panel-3.active')) run(); else state.climate = null; });
    document.addEventListener('stepchange', e => { if (e.detail.step === 3 && (!state.climate || !ready() === false && !state.climate)) run(); });
    document.addEventListener('langchange', () => { if (document.querySelector('#panel-3.active') && ready()) run(); });
  }
  document.addEventListener('DOMContentLoaded', wire);
  window.Block3 = { run };
})();
