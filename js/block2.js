/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 2: the site and its daily weather series.

   Four steps on one screen: describe the site, bring the series in (pasted,
   from a file, from a template or from a teaching example), tell the app which
   column is what, and let it check and clean the record. What comes out is
   `state.site` and `state.weather`, which every later block reads, and a
   project file that reproduces it. */

(function () {

  const two = (es, en) => L2(es, en);
  let table = null;      /* the parsed text: header + rows */
  let roles = null;      /* one role per column */
  let built = null;      /* the series before QC */
  let result = null;     /* the series after QC */

  /* ---------------- the site ---------------- */
  function readSite() {
    return {
      name: el('b2Name').value.trim(), lat: parseNum(el('b2Lat').value), lon: parseNum(el('b2Lon').value), z: parseNum(el('b2Alt').value),
      coastal: el('b2Coastal').value === 'coastal', arid: el('b2Arid').value === 'arid' ? 2 : 0, windHeight: parseNum(el('b2WindH').value) || 2,
      notes: el('b2Notes').value.trim(),
    };
  }
  function writeSite(s) {
    if (!s) return;
    el('b2Name').value = s.name || ''; el('b2Lat').value = s.lat == null ? '' : s.lat; el('b2Lon').value = s.lon == null ? '' : s.lon; el('b2Alt').value = s.z == null ? '' : s.z;
    el('b2Coastal').value = s.coastal ? 'coastal' : 'interior'; el('b2Arid').value = s.arid ? 'arid' : 'humid'; el('b2WindH').value = s.windHeight || 2; el('b2Notes').value = s.notes || '';
    siteCheck();
  }
  function siteCheck() {
    const s = readSite();
    const box = el('b2SiteMsg'); clearMessages(box);
    if (s.lat == null || s.z == null) { showMessage(box, 'warning', two('La latitud y la altitud son obligatorias: la radiación extraterrestre, la duración del día y la presión atmosférica salen de ellas.', 'Latitude and elevation are required: extraterrestrial radiation, day length and atmospheric pressure come from them.')); return false; }
    if (Math.abs(s.lat) > 66) showMessage(box, 'warning', two('Latitud polar: el día tiene 24 h o 0 h parte del año; los métodos de radiación de FAO-56 se definieron para latitudes menores.', 'Polar latitude: the day lasts 24 h or 0 h for part of the year; the FAO-56 radiation methods were defined for lower latitudes.'));
    if (s.z > 4500) showMessage(box, 'warning', two('Altitud muy alta: revisa que esté en metros.', 'Very high elevation: check that it is in metres.'));
    if (s.lon != null && s.lon > 0 && s.lat > 14 && s.lat < 33 && s.lon > 86 && s.lon < 118) showMessage(box, 'info', two('Una longitud positiva entre 86 y 118 con esa latitud parece México escrito sin el signo negativo (oeste). No afecta los cálculos, pero el informe la citará así.', 'A positive longitude between 86 and 118 at that latitude looks like Mexico written without the negative (west) sign. It does not affect the calculations, but the report will quote it like that.'));
    const J = 172, Ra = Agro.Ra(s.lat, J), N = Agro.daylength(s.lat, J), P = Agro.pressure(s.z);
    el('b2SiteDerived').innerHTML = `<span class="chip p">Ra (21 jun) ${fmtFixed(Ra, 1)} MJ m⁻² d⁻¹</span> <span class="chip p">N (21 jun) ${fmtFixed(N, 1)} h</span> <span class="chip p">P ${fmtFixed(P, 1)} kPa</span> <span class="chip p">γ ${fmtFixed(Agro.gamma(P), 4)} kPa/°C</span> <span class="chip p">kRs ${s.coastal ? '0.19' : '0.16'}</span>`;
    return true;
  }

  /* ---------------- bringing the text in ---------------- */
  function ingest(text, sourceName) {
    table = WxIO.parseTable(text);
    const box = el('b2SrcMsg'); clearMessages(box);
    if (table.note !== 'ok') { showMessage(box, 'error', two('No se encontraron filas con números. Revisa que la tabla tenga una columna de fecha y al menos una variable.', 'No numeric rows were found. Check that the table has a date column and at least one variable.')); return; }
    roles = WxIO.detectRoles(table.header, table.rows);
    const delimName = { '\t': T('tabulador', 'tab'), ';': T('punto y coma', 'semicolon'), ',': T('coma', 'comma'), ' ': T('espacios', 'spaces') }[table.delimiter];
    showMessage(box, 'success', two(`Leídas <b>${fmtNum(table.rows.length, 0)}</b> filas y ${table.header.length} columnas de <b>${esc(sourceName)}</b> (separador: ${delimName}). Revisa abajo qué columna es cada cosa.`, `Read <b>${fmtNum(table.rows.length, 0)}</b> rows and ${table.header.length} columns from <b>${esc(sourceName)}</b> (delimiter: ${delimName}). Check below which column is what.`));
    if (table.preamble.length) showMessage(box, 'info', two('Encabezado del archivo: ', 'File header: ') + esc(table.preamble.slice(0, 3).join(' · ')));
    renderRoles();
    el('b2RolesCard').style.display = '';
    el('b2RolesCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderRoles() {
    const box = el('b2Roles');
    const sample = table.rows.slice(0, 5);
    let html = '<div class="table-scroll"><table class="roles"><thead><tr>';
    table.header.forEach((h, j) => {
      html += `<th class="rg-${roles[j] === 'ignore' ? 'ignore' : roles[j] === 'date' || roles[j] === 'year' || roles[j] === 'month' || roles[j] === 'day' || roles[j] === 'doy' ? 'date' : 'var'}"><select data-col="${j}">${WxIO.ROLES.map(r => `<option value="${r.id}"${r.id === roles[j] ? ' selected' : ''}>${T(r.es, r.en)}</option>`).join('')}</select><div class="col-name">${esc(h)}</div></th>`;
    });
    html += '</tr></thead><tbody>' + sample.map(r => '<tr>' + r.map((c, j) => `<td class="${roles[j] === 'ignore' ? 'rg-ignore' : ''}">${esc(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
    box.innerHTML = html;
    box.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { roles[+s.dataset.col] = s.value; renderRoles(); }));
    /* the date-order control only matters when a date column exists */
    const dateCol = roles.indexOf('date');
    el('b2DateFmtWrap').style.display = dateCol >= 0 ? '' : 'none';
    if (dateCol >= 0) {
      const guess = WxIO.guessDateOrder(table.rows.map(r => r[dateCol]));
      const sel = el('b2DateFmt');
      if (sel.value === 'auto') el('b2DateGuess').textContent = T(`detectado: ${guess === 'ymd' ? 'año-mes-día' : guess === 'dmy' ? 'día/mes/año' : 'mes/día/año'}`, `detected: ${guess === 'ymd' ? 'year-month-day' : guess === 'dmy' ? 'day/month/year' : 'month/day/year'}`);
    }
    el('b2WindWrap').style.display = roles.includes('wind') ? '' : 'none';
    el('b2RsWrap').style.display = roles.includes('rs') ? '' : 'none';
    const ok = roles.includes('date') || (roles.includes('year') && (roles.includes('doy') || (roles.includes('month') && roles.includes('day'))));
    const vars = roles.filter(r => WxIO.VAR_IDS.includes(r));
    const msg = el('b2RolesMsg'); clearMessages(msg);
    if (!ok) showMessage(msg, 'warning', two('Falta la fecha: marca una columna como Fecha, o Año + Mes + Día, o Año + Día del año.', 'The date is missing: mark a column as Date, or Year + Month + Day, or Year + Day of year.'));
    else if (!vars.includes('tmax') || !vars.includes('tmin')) showMessage(msg, 'warning', two('Sin Tmax y Tmin casi nada se puede calcular: grados-día, ETo y balance dependen de ellas.', 'Without Tmax and Tmin almost nothing can be computed: degree-days, ETo and the balance depend on them.'));
    else showMessage(msg, 'success', two(`Variables reconocidas: ${vars.map(v => `<b>${v}</b>`).join(', ')}.`, `Recognised variables: ${vars.map(v => `<b>${v}</b>`).join(', ')}.`));
    el('b2Build').disabled = !ok;
  }

  /* ---------------- building and checking ---------------- */
  function build() {
    if (!table || !roles) return;
    const site = readSite();
    built = WxIO.buildSeries(table, roles, { dateFmt: el('b2DateFmt').value, windUnit: el('b2WindUnit').value, windHeight: parseNum(el('b2WindH').value) || 2, rsUnit: el('b2RsUnit').value, tempUnit: el('b2TempUnit').value });
    const box = el('b2RolesMsg'); clearMessages(box);
    if (built.meta.error) { showMessage(box, 'error', built.meta.error === 'nodate' ? two('No se pudo armar la fecha con las columnas marcadas.', 'The date could not be built from the marked columns.') : two('Ninguna fila tuvo una fecha válida.', 'No row had a valid date.')); return; }
    const m = built.meta;
    showMessage(box, 'success', two(`Serie de <b>${fmtDate(m.first)}</b> a <b>${fmtDate(m.last)}</b>: ${fmtNum(m.nDays, 0)} días de calendario, ${fmtNum(m.nRead, 0)} con registro${m.missingDates ? `, <b>${fmtNum(m.missingDates, 0)} fechas ausentes</b> insertadas como huecos` : ''}${m.duplicates ? `, ${m.duplicates} fechas repetidas descartadas` : ''}${m.badDates ? `, ${m.badDates} fechas ilegibles` : ''}. Fechas leídas como ${m.dateFmt === 'ymd' ? 'año-mes-día' : m.dateFmt === 'dmy' ? 'día/mes/año' : 'mes/día/año'}.`,
      `Series from <b>${fmtDate(m.first)}</b> to <b>${fmtDate(m.last)}</b>: ${fmtNum(m.nDays, 0)} calendar days, ${fmtNum(m.nRead, 0)} with a record${m.missingDates ? `, <b>${fmtNum(m.missingDates, 0)} absent dates</b> inserted as gaps` : ''}${m.duplicates ? `, ${m.duplicates} repeated dates dropped` : ''}${m.badDates ? `, ${m.badDates} unreadable dates` : ''}. Dates read as ${m.dateFmt === 'ymd' ? 'year-month-day' : m.dateFmt === 'dmy' ? 'day/month/year' : 'month/day/year'}.`));
    if (built.issues.length) showMessage(box, 'info', built.issues.slice(0, 5).map(i => i.type === 'duplicate' ? T(`línea ${i.line}: fecha repetida ${i.date}`, `line ${i.line}: repeated date ${i.date}`) : T(`línea ${i.line}: fecha ilegible «${esc(i.value)}»`, `line ${i.line}: unreadable date "${esc(i.value)}"`)).join(' · ') + (built.issues.length > 5 ? ' …' : ''));
    el('b2QcCard').style.display = '';
    runQC(site);
  }
  function runQC(siteIn) {
    if (!built || !built.rows.length) return;
    const site = siteIn || readSite();
    result = WxIO.qc(built.rows, { maxGap: parseNum(el('b2MaxGap').value) || 0, swap: el('b2Swap').checked, rainZero: el('b2RainZero').checked, spike: parseNum(el('b2Spike').value) || 15, flat: parseNum(el('b2Flat').value) || 7 });
    result.meta = built.meta;
    renderQC(site);
  }
  function renderQC(site) {
    const st = result.stats, rows = result.rows;
    const present = result.meta.present;
    /* tiles */
    const years = result.years, complete = years.filter(y => y.complete).length;
    const tiles = [
      [T('Periodo', 'Period'), `${result.meta.first.slice(0, 4)}–${result.meta.last.slice(0, 4)}`, plural(rows.length, T('día', 'day'), T('días', 'days'))],
      [T('Años completos', 'Complete years'), `${complete} / ${years.length}`, T('≥ 90 % de Tmax, Tmin y lluvia', '≥ 90 % of Tmax, Tmin and rain'), complete >= 10 ? 'ok' : complete >= 3 ? 'warn' : 'bad'],
      [T('Tmax y Tmin', 'Tmax and Tmin'), fmtPct(Math.min(st.tmax.pct, st.tmin.pct), 1), T(`${st.tmax.filled + st.tmin.filled} valores interpolados`, `${st.tmax.filled + st.tmin.filled} interpolated values`), Math.min(st.tmax.pct, st.tmin.pct) >= 0.95 ? 'ok' : 'warn'],
      [T('Lluvia', 'Rain'), present.prec ? fmtPct(st.prec.pct, 1) : '—', present.prec ? T(`hueco más largo: ${longestGap('prec')} días`, `longest gap: ${longestGap('prec')} days`) : T('no viene en la serie', 'not in the series'), !present.prec ? 'bad' : st.prec.pct >= 0.95 ? 'ok' : 'warn'],
      [T('Incidencias', 'Issues'), String(result.issues.filter(i => !(i.type === 'gap' && i.action === 'interpolated')).length), T(`${result.issues.filter(i => i.type !== 'gap').length} valores y ${result.issues.filter(i => i.type === 'gap' && i.action === 'left').length} huecos largos`, `${result.issues.filter(i => i.type !== 'gap').length} values and ${result.issues.filter(i => i.type === 'gap' && i.action === 'left').length} long gaps`)],
    ];
    statTiles('b2Tiles', tiles);
    /* per-variable table */
    const varRows = WxIO.VARS.filter(v => present[v.id] || (v.id === 'tmean' && result.tmeanDerived)).map(v => ({ v, s: st[v.id] }));
    buildTable('b2VarTable', [
      { key: 'name', label: T('Variable', 'Variable'), get: r => T(r.v.es, r.v.en) },
      { key: 'n', label: T('Con dato', 'With data'), num: true, get: r => fmtNum(r.s.n, 0) },
      { key: 'pct', label: T('Completa', 'Complete'), num: true, get: r => fmtPct(r.s.pct, 1) },
      { key: 'missing', label: T('Faltantes', 'Missing'), num: true, get: r => fmtNum(r.s.missing, 0) },
      { key: 'filled', label: T('Rellenados', 'Filled'), num: true, get: r => r.v.id === 'tmean' && result.tmeanDerived ? T(`${result.tmeanDerived} derivados`, `${result.tmeanDerived} derived`) : fmtNum(r.s.filled, 0) },
      { key: 'gaps', label: T('Huecos (largos)', 'Gaps (long)'), num: true, get: r => `${r.s.gaps} (${r.s.gapsLong})` },
      { key: 'longest', label: T('Hueco más largo', 'Longest gap'), num: true, get: r => r.s.longest ? plural(r.s.longest, T('día', 'day'), T('días', 'days')) : '—' },
      { key: 'flagged', label: T('Marcados', 'Flagged'), num: true, get: r => fmtNum(r.s.flagged, 0) },
    ], varRows);
    /* issues */
    const issues = result.issues.filter(i => i.type !== 'gap' || i.action !== 'interpolated');
    const TYPES = { range: ['fuera de rango físico', 'outside physical range'], inverted: ['Tmax < Tmin', 'Tmax < Tmin'], outside: ['media fuera de los extremos', 'mean outside the extremes'], spike: ['pico aislado', 'isolated spike'], flat: ['valor repetido (sensor pegado)', 'repeated value (stuck sensor)'], gap: ['hueco', 'gap'] };
    const ACTS = { removed: ['eliminado', 'removed'], swapped: ['intercambiados', 'swapped'], kept: ['conservado, marcado', 'kept, flagged'], interpolated: ['interpolado', 'interpolated'], left: ['sin rellenar', 'left empty'], zeroed: ['lluvia = 0', 'rain = 0'] };
    buildTable('b2Issues', [
      { key: 'date', label: T('Fecha', 'Date'), get: r => r.type === 'gap' && r.action === 'zeroed' ? '—' : fmtDate(r.date) },
      { key: 'var', label: T('Variable', 'Variable') },
      { key: 'type', label: T('Qué se encontró', 'What was found'), get: r => T(TYPES[r.type][0], TYPES[r.type][1]) + (r.type === 'gap' ? ` (${r.value} ${T('días', 'days')})` : r.type === 'flat' ? ` (${r.value})` : '') },
      { key: 'value', label: T('Valor', 'Value'), get: r => r.type === 'gap' ? '' : String(r.value) },
      { key: 'action', label: T('Qué se hizo', 'What was done'), get: r => T(ACTS[r.action][0], ACTS[r.action][1]) },
    ], issues, { limit: 60, scroll: true });
    el('b2IssuesNote').innerHTML = issues.length ? two(`${issues.length} incidencias además de ${result.issues.filter(i => i.action === 'interpolated').length} huecos cortos interpolados.`, `${issues.length} issues besides ${result.issues.filter(i => i.action === 'interpolated').length} short gaps interpolated.`) : two('Ninguna incidencia: la serie no tuvo valores imposibles, inversiones, picos ni tramos planos.', 'No issues: the series had no impossible values, inversions, spikes or flat runs.');
    /* year table */
    buildTable('b2Years', [
      { key: 'y', label: T('Año', 'Year') },
      { key: 'days', label: T('Días', 'Days'), num: true, get: r => `${r.days}/${r.total}` },
      { key: 'pctT', label: T('Temperatura', 'Temperature'), num: true, get: r => fmtPct(r.pctT, 0) },
      { key: 'pctP', label: T('Lluvia', 'Rain'), num: true, get: r => present.prec ? fmtPct(r.pctP, 0) : '—' },
      { key: 'filled', label: T('Rellenados', 'Filled'), num: true },
      { key: 'complete', label: T('Útil para normales', 'Usable for normals'), html: true, get: r => r.complete ? '<span class="help-tag good">✓</span>' : `<span class="help-tag bad">${T('incompleto', 'incomplete')}</span>` },
    ], years, { scroll: true });
    /* figures */
    Plots2.overview('b2Overview', rows);
    Plots2.calendar('b2Calendar', WxIO.availability(rows));
    /* what the data allow */
    const cap = WxIO.capabilities(st, present);
    const chip = (ok, es, en, warn) => `<span class="chip ${ok ? 'p' : warn ? 'a' : 'bad'}">${ok ? '✓' : warn ? '~' : '✗'} ${T(es, en)}</span>`;
    el('b2Caps').innerHTML =
      chip(cap.gdd, 'Grados-día y fenología', 'Degree-days and phenology') +
      chip(cap.hargreaves, 'ETo Hargreaves', 'Hargreaves ETo') +
      (cap.pmFull ? chip(true, 'ETo Penman–Monteith completa', 'Full Penman–Monteith ETo') : chip(false, `ETo Penman–Monteith con estimaciones (${cap.missing.map(m => ({ hum: T('humedad', 'humidity'), rad: T('radiación', 'radiation'), wind: T('viento', 'wind') })[m]).join(', ')})`, `Penman–Monteith ETo with estimates (${cap.missing.map(m => ({ hum: 'humidity', rad: 'radiation', wind: 'wind' })[m]).join(', ')})`, cap.temp)) +
      chip(cap.balance, 'Balance hídrico y riego', 'Water balance and irrigation') +
      chip(cap.chill, 'Frío invernal (horas estimadas de Tmax/Tmin)', 'Winter chill (hours estimated from Tmax/Tmin)') +
      chip(cap.priestley, 'Priestley–Taylor y Turc', 'Priestley–Taylor and Turc', false);
    const capMsg = el('b2CapMsg'); clearMessages(capMsg);
    if (!cap.pmFull && cap.temp) showMessage(capMsg, 'info', two('Penman–Monteith se calculará igual: FAO-56 indica cómo estimar la humedad a partir de la mínima, la radiación a partir de la amplitud térmica y el viento con 2 m/s, y el informe dirá qué se estimó. Hargreaves queda como comparación.', 'Penman–Monteith will be computed anyway: FAO-56 says how to estimate humidity from the minimum, radiation from the temperature range and wind as 2 m/s, and the report will state what was estimated. Hargreaves stays as a comparison.'));
    if (complete < 10 && years.length >= 1) showMessage(capMsg, 'warning', two(`Con ${complete} ${complete === 1 ? 'año completo' : 'años completos'} las normales y las probabilidades de helada serán una estimación gruesa: la OMM pide 30 años y en la práctica se aceptan 10.`, `With ${complete} complete ${complete === 1 ? 'year' : 'years'} the normals and the frost probabilities will be a rough estimate: WMO asks for 30 years and 10 are accepted in practice.`));
    /* preview table */
    renderPreview();
    /* commit to the state */
    state.site = site;
    state.weather = { rows, stats: st, years, meta: result.meta, present, cap, qc: result.opts, issues: result.issues.length };
    persist();
    el('b2SaveCard').style.display = '';
    el('b2Continue').disabled = !STEPS.find(s => s.n === 3).ready;
    document.dispatchEvent(new CustomEvent('weatherchange'));
  }
  function longestGap(v) { return result.stats[v].longest; }
  let previewAll = false;
  function renderPreview() {
    const rows = result.rows;
    const vars = WxIO.VARS.filter(v => result.meta.present[v.id] || (v.id === 'tmean' && result.tmeanDerived));
    const shown = previewAll ? rows : rows.slice(0, 40);
    const cols = [{ key: 'date', label: T('Fecha', 'Date'), get: r => toISO(r) }].concat(vars.map(v => ({
      key: v.id, label: v.id, num: true, html: true, get: r => {
        const f = r.flags[v.id];
        const val = r[v.id] == null ? '—' : fmtNum(r[v.id], 2);
        return f ? `<span class="flag-${f}" title="${f}">${val}</span>` : val;
      },
    })));
    buildTable('b2Preview', cols, shown, { scroll: true });
    el('b2PreviewNote').innerHTML = two(`${previewAll ? 'Todas las filas' : 'Primeras 40 filas'} de ${fmtNum(rows.length, 0)}. Color: <span class="flag-filled">interpolado</span>, <span class="flag-swap">intercambiado</span>, <span class="flag-spike">pico</span>, <span class="flag-flat">plano</span>, <span class="flag-derived">derivado</span>.`, `${previewAll ? 'All rows' : 'First 40 rows'} of ${fmtNum(rows.length, 0)}. Colour: <span class="flag-filled">interpolated</span>, <span class="flag-swap">swapped</span>, <span class="flag-spike">spike</span>, <span class="flag-flat">flat</span>, <span class="flag-derived">derived</span>.`);
  }

  /* ---------------- persistence ---------------- */
  function persist() {
    try { localStorage.setItem('phenologypro:project', JSON.stringify(WxIO.pack(state.site, state.weather.rows, state.weather.meta))); } catch (e) { /* too big for the browser: the file is the fallback */ }
  }
  function restore() {
    let obj = null;
    try { obj = JSON.parse(localStorage.getItem('phenologypro:project') || 'null'); } catch (e) { obj = null; }
    if (!obj) return false;
    return loadProject(obj, true);
  }
  function loadProject(obj, silent) {
    const p = WxIO.unpack(obj);
    if (!p || !p.rows.length) { if (!silent) notice('b2SrcMsg', 'error', two('El archivo no es un proyecto de PhenologyPro.', 'The file is not a PhenologyPro project.')); return false; }
    writeSite(p.site);
    built = { rows: p.rows, meta: Object.assign({ first: toISO(p.rows[0]), last: toISO(p.rows[p.rows.length - 1]), nDays: p.rows.length, nRead: p.rows.length, missingDates: 0, duplicates: 0, badDates: 0, dateFmt: 'ymd', present: presentOf(p.rows) }, p.meta || {}) };
    table = null; roles = null;
    el('b2RolesCard').style.display = 'none';
    el('b2QcCard').style.display = '';
    runQC(p.site || readSite());
    if (!silent) notice('b2SrcMsg', 'success', two(`Proyecto cargado: ${fmtNum(p.rows.length, 0)} días.`, `Project loaded: ${fmtNum(p.rows.length, 0)} days.`));
    else notice('b2SrcMsg', 'info', two('Se recuperó la serie de la sesión anterior desde el navegador. Carga otra si no es la que quieres.', 'The series of the previous session was recovered from the browser. Load another one if it is not the one you want.'));
    return true;
  }
  function presentOf(rows) { const p = {}; WxIO.VAR_IDS.forEach(v => { p[v] = rows.some(r => r[v] != null); }); return p; }

  /* ---------------- examples ---------------- */
  function renderExamples() {
    const g = el('b2Examples'); if (!g) return;
    g.innerHTML = Climate.SITES.map(s => `<button class="design-tile" data-site="${s.id}"><b>${T(s.es, s.en)}</b><small>${T(s.tag[0], s.tag[1])} · ${s.lat.toFixed(1)}°, ${s.z} m</small></button>`).join('');
    g.querySelectorAll('.design-tile').forEach(b => b.addEventListener('click', () => {
      g.querySelectorAll('.design-tile').forEach(x => x.classList.toggle('on', x === b));
      const ex = WxIO.exampleSeries(b.dataset.site, +el('b2ExYears').value, el('b2ExDirty').checked);
      writeSite(ex.site);
      /* the example goes through the same text path as a real file, so the user sees the roles step */
      const text = 'fecha,tmax,tmin,prec,hr,viento\n' + ex.rows.map(r => [toISO(r), r.tmax == null ? '' : r.tmax, r.tmin == null ? '' : r.tmin, r.prec == null ? '' : r.prec, r.rhmean == null ? '' : r.rhmean, r.wind == null ? '' : r.wind].join(',')).join('\n');
      el('b2Paste').value = '';
      ingest(text, T(`ejemplo «${T(Climate.byId(b.dataset.site).es, Climate.byId(b.dataset.site).en)}»`, `example "${T(Climate.byId(b.dataset.site).es, Climate.byId(b.dataset.site).en)}"`) + (el('b2ExDirty').checked ? T(' con errores sembrados', ' with seeded errors') : ''));
      notice('b2SrcMsg', 'info', two('Los datos del ejemplo son sintéticos y ficticios: sirven para practicar, no para citarse.', 'The example data are synthetic and fictional: they are for practice, not for citation.'));
    }));
  }

  /* ---------------- wiring ---------------- */
  function wire() {
    ['b2Lat', 'b2Lon', 'b2Alt', 'b2Coastal', 'b2Arid', 'b2WindH'].forEach(id => el(id).addEventListener('change', siteCheck));
    el('b2Name').addEventListener('change', () => { if (state.site) { state.site.name = el('b2Name').value.trim(); persist(); } });
    el('b2ParsePaste').addEventListener('click', () => { const t = el('b2Paste').value; if (t.trim()) ingest(t, T('texto pegado', 'pasted text')); });
    const file = el('b2File');
    file.addEventListener('change', () => { const f = file.files[0]; if (f) readFile(f); file.value = ''; });
    const drop = el('b2Drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) readFile(f); });
    drop.addEventListener('click', () => file.click());
    el('b2Template').addEventListener('click', () => download(WxIO.template(), 'plantilla_phenologypro.csv', 'text/csv;charset=utf-8'));
    el('b2Build').addEventListener('click', build);
    el('b2DateFmt').addEventListener('change', () => { if (table) renderRoles(); });
    el('b2Recheck').addEventListener('click', () => runQC());
    ['b2MaxGap', 'b2Swap', 'b2RainZero', 'b2Spike', 'b2Flat'].forEach(id => el(id).addEventListener('change', () => runQC()));
    el('b2PreviewAll').addEventListener('click', () => { previewAll = !previewAll; renderPreview(); });
    el('b2ExportCsv').addEventListener('click', () => { if (result) download(WxIO.toCSV(result.rows, WxIO.VARS.filter(v => result.meta.present[v.id] || v.id === 'tmean').map(v => v.id)), slug((state.site && state.site.name) || 'serie') + '_limpia.csv', 'text/csv;charset=utf-8'); });
    el('b2SaveJson').addEventListener('click', () => { if (state.weather) download(JSON.stringify(WxIO.pack(readSite(), state.weather.rows, state.weather.meta)), slug((state.site && state.site.name) || 'proyecto') + '.phenologypro.json', 'application/json'); });
    const pj = el('b2LoadJson');
    pj.addEventListener('change', () => { const f = pj.files[0]; if (f) f.text().then(t => { try { loadProject(JSON.parse(t)); } catch (e) { notice('b2SrcMsg', 'error', two('No se pudo leer el archivo de proyecto.', 'The project file could not be read.')); } }); pj.value = ''; });
    el('b2Continue').addEventListener('click', () => goStep(3));
    el('b2Forget').addEventListener('click', () => { try { localStorage.removeItem('phenologypro:project'); } catch (e) { /* ignore */ } state.weather = null; result = null; built = null; el('b2QcCard').style.display = 'none'; el('b2SaveCard').style.display = 'none'; notice('b2SrcMsg', 'info', two('Serie olvidada. Carga otra.', 'Series forgotten. Load another.')); });
    renderExamples();
    document.addEventListener('langchange', () => { renderExamples(); if (table) renderRoles(); if (result) renderQC(readSite()); siteCheck(); });
    siteCheck();
    restore();
  }
  function readFile(f) {
    if (/\.(xlsx|xls)$/i.test(f.name)) { notice('b2SrcMsg', 'warning', two('Los libros de Excel no se leen directamente: guarda la hoja como CSV (texto delimitado por comas) o copia las celdas y pégalas en el cuadro de texto.', 'Excel workbooks are not read directly: save the sheet as CSV or copy the cells and paste them in the text box.')); return; }
    f.text().then(t => {
      if (/\.json$/i.test(f.name)) { try { loadProject(JSON.parse(t)); return; } catch (e) { /* fall through to text */ } }
      ingest(t, f.name);
    });
  }

  document.addEventListener('DOMContentLoaded', wire);
  window.Block2 = { ingest, build, runQC, loadProject, readSite, get result() { return result; } };
})();
