/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 2: reading, checking and cleaning a daily weather series.

   Pure functions, no DOM, so the test page can feed them text and count what
   comes out. The pipeline is:

     parseTable(text)                 a pasted or loaded text → header + cells
     detectRoles(header, rows)        which column is the date, Tmax, rain…
     buildSeries(table, roles, opts)  → one row per calendar day, gaps included
     qc(rows, opts)                   → flags, fills, statistics by variable and year
     capabilities(stats)              → which methods the data allow

   A station file is never clean: dates come in three orders, the missing
   value is written five different ways, the wind is at 10 m in km/h, and a
   week of identical maxima means a stuck sensor, not a stable week. Every
   decision taken here is written into a flag on the row, so the report can
   say exactly what was changed and why. */

const WxIO = {};

(function () {

  /* the variables a series may carry, with the physical range outside which a
     value is discarded (WMO-style gross-error limits, generous on purpose) */
  const VARS = [
    { id: 'tmax', es: 'Temperatura máxima (°C)', en: 'Maximum temperature (°C)', lo: -40, hi: 55, interp: true },
    { id: 'tmin', es: 'Temperatura mínima (°C)', en: 'Minimum temperature (°C)', lo: -50, hi: 45, interp: true },
    { id: 'tmean', es: 'Temperatura media (°C)', en: 'Mean temperature (°C)', lo: -45, hi: 50, interp: true },
    { id: 'prec', es: 'Precipitación (mm)', en: 'Precipitation (mm)', lo: 0, hi: 600, interp: false },
    { id: 'rhmax', es: 'Humedad relativa máxima (%)', en: 'Maximum relative humidity (%)', lo: 0, hi: 100, interp: true },
    { id: 'rhmin', es: 'Humedad relativa mínima (%)', en: 'Minimum relative humidity (%)', lo: 0, hi: 100, interp: true },
    { id: 'rhmean', es: 'Humedad relativa media (%)', en: 'Mean relative humidity (%)', lo: 0, hi: 100, interp: true },
    { id: 'wind', es: 'Viento (m/s a 2 m)', en: 'Wind (m/s at 2 m)', lo: 0, hi: 40, interp: true },
    { id: 'sun', es: 'Insolación (horas de sol)', en: 'Sunshine (hours)', lo: 0, hi: 24, interp: true },
    { id: 'rs', es: 'Radiación solar (MJ m⁻² d⁻¹)', en: 'Solar radiation (MJ m⁻² d⁻¹)', lo: 0, hi: 45, interp: true },
    { id: 'tdew', es: 'Punto de rocío (°C)', en: 'Dew point (°C)', lo: -50, hi: 40, interp: true },
    { id: 'evap', es: 'Evaporación de tanque (mm)', en: 'Pan evaporation (mm)', lo: 0, hi: 30, interp: true },
  ];
  const VAR_IDS = VARS.map(v => v.id);
  const varOf = id => VARS.find(v => v.id === id) || null;

  /* the roles a column can take: the variables, the date pieces and "ignore" */
  const ROLES = [
    { id: 'date', es: 'Fecha', en: 'Date' }, { id: 'year', es: 'Año', en: 'Year' }, { id: 'month', es: 'Mes', en: 'Month' },
    { id: 'day', es: 'Día', en: 'Day' }, { id: 'doy', es: 'Día del año', en: 'Day of year' },
  ].concat(VARS.map(v => ({ id: v.id, es: v.es, en: v.en }))).concat([{ id: 'ignore', es: 'Ignorar', en: 'Ignore' }]);

  /* ---------------- 1 · missing values and numbers ---------------- */
  const MISSING = new Set(['', '-', '--', '---', 'na', 'n/a', 'nan', 'null', 'nulo', 'nd', 's/d', 'sd', 'm', 'missing', 'faltante', '#n/a', '#¡div/0!', 'n.d.', '.']);
  const SENTINELS = new Set([-99, -99.9, -999, -999.9, -9999, 999, 999.9, 9999, 99999]);
  function num(s) {
    if (s == null) return null;
    if (typeof s === 'number') return isFinite(s) && !SENTINELS.has(s) ? s : null;
    let t = String(s).trim().toLowerCase();
    if (MISSING.has(t)) return null;
    t = t.replace(/[−–]/g, '-').replace(/\s+/g, '');
    /* "1.234,5" (European) against "1,234.5": a comma followed by exactly three digits and a dot elsewhere is a thousands separator */
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d+,\d+$/.test(t)) t = t.replace(',', '.');
    else t = t.replace(/,/g, '');
    /* a trailing unit or a trace mark: "12.3mm", "T" (trace of rain) */
    if (t === 't' || t === 'tr' || t === 'traza' || t === 'trace' || t === 'inap' || t === 'inapreciable') return 0;
    t = t.replace(/(°c|mm|%|m\/s|km\/h|h|mj)$/i, '');
    if (!/^-?\d*\.?\d+(e-?\d+)?$/.test(t)) return null;
    const v = Number(t);
    return isFinite(v) && !SENTINELS.has(v) ? v : null;
  }

  /* ---------------- 2 · the text ---------------- */
  /* Splits a pasted table. The delimiter is the one that gives the most
     columns consistently over the data lines: tab, semicolon, comma or runs of
     spaces. Lines before the header (station names, coordinates written by the
     weather service) are kept as `preamble`. */
  function splitLine(line, delim) {
    if (delim === ' ') return line.trim().split(/\s+/);
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === delim && !q) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }
  function detectDelimiter(lines) {
    const cands = ['\t', ';', ',', ' '];
    let best = ',', bestScore = -1;
    cands.forEach(d => {
      const counts = lines.map(l => splitLine(l, d).length).filter(n => n > 1);
      if (!counts.length) return;
      const mode = counts.sort((a, b) => a - b)[Math.floor(counts.length / 2)];
      const consistent = counts.filter(n => n === mode).length / lines.length;
      const score = mode * consistent + (d === ' ' ? -0.5 : 0);   /* spaces lose ties: they also live inside names */
      if (mode >= 2 && score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }
  /* a data line: every non-empty cell is a number, a missing-value token or a date */
  const looksNumeric = cells => cells.filter(c => c !== '').length > 0 && cells.filter(c => c !== '').every(c => num(c) != null || MISSING.has(String(c).trim().toLowerCase()) || /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(c));
  function parseTable(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/ /g, ' ')).filter(l => l.trim() !== '');
    if (!lines.length) return { header: [], rows: [], delimiter: ',', preamble: [], note: 'empty' };
    const delim = detectDelimiter(lines.slice(0, Math.min(lines.length, 200)));
    const cells = lines.map(l => splitLine(l, delim));
    /* the header is the last non-numeric line before the first run of numeric lines */
    let first = cells.findIndex(c => c.length > 1 && looksNumeric(c));
    if (first < 0) first = 0;
    let headerIdx = -1;
    for (let i = first - 1; i >= 0; i--) {
      if (cells[i].length >= 2 && cells[i].length >= cells[first].length - 1) { headerIdx = i; break; }
    }
    const width = Math.max(...cells.slice(first).map(c => c.length));
    const header = headerIdx >= 0 ? cells[headerIdx].slice(0, width) : Array.from({ length: width }, (_, i) => 'col' + (i + 1));
    while (header.length < width) header.push('col' + (header.length + 1));
    const rows = cells.slice(first).filter(c => c.length > 1 && looksNumeric(c)).map(c => { const r = c.slice(0, width); while (r.length < width) r.push(''); return r; });
    const preamble = cells.slice(0, Math.max(0, headerIdx)).map(c => c.join(' ').trim()).filter(Boolean);
    return { header, rows, delimiter: delim, preamble, note: rows.length ? 'ok' : 'nodata' };
  }

  /* ---------------- 3 · which column is what ---------------- */
  const NAMES = {
    /* a lone "día" column is the day of the month; a column of full dates is caught by its content */
    date: ['fecha', 'date', 'fech', 'time', 'datetime', 'timestamp', 'fecha_hora'],
    year: ['año', 'ano', 'anio', 'year', 'yr', 'aa', 'yyyy'],
    month: ['mes', 'month', 'mo', 'mm'],
    day: ['dia', 'día', 'day', 'dd', 'dom'],
    doy: ['doy', 'juliano', 'julian', 'dia_juliano', 'dj', 'jday', 'yday'],
    tmax: ['tmax', 'tmáx', 'temp_max', 'tempmax', 'temperatura maxima', 'temperatura máxima', 't_max', 'max temp', 'maximum', 'tx', 'temp max', 'maxima', 'máxima'],
    tmin: ['tmin', 'tmín', 'temp_min', 'tempmin', 'temperatura minima', 'temperatura mínima', 't_min', 'min temp', 'minimum', 'tn', 'temp min', 'minima', 'mínima'],
    tmean: ['tmed', 'tmean', 'tmedia', 'temp_med', 'temperatura media', 'tavg', 't_mean', 'tprom', 'tm', 'mean temp', 'temp'],
    prec: ['precip', 'prec', 'pp', 'ppt', 'lluvia', 'rain', 'precipitacion', 'precipitación', 'p', 'pcp', 'rr', 'prcp', 'rainfall'],
    rhmax: ['hrmax', 'rhmax', 'hr_max', 'rh_max', 'humedad maxima', 'humedad máxima', 'hrmáx'],
    rhmin: ['hrmin', 'rhmin', 'hr_min', 'rh_min', 'humedad minima', 'humedad mínima', 'hrmín'],
    rhmean: ['hr', 'rh', 'hrmed', 'rhmean', 'hrmedia', 'humedad', 'humedad relativa', 'rhavg', 'rh_mean', 'hum', 'humidity'],
    wind: ['viento', 'wind', 'u2', 'u10', 'vv', 'vel_viento', 'velocidad', 'ws', 'wind speed', 'vviento', 'vel viento', 'ff'],
    sun: ['insolacion', 'insolación', 'horas sol', 'horas_sol', 'sun', 'sunshine', 'n', 'hs', 'brillo', 'heliofania', 'heliofanía', 'ss'],
    rs: ['rs', 'radiacion', 'radiación', 'radiation', 'rad', 'srad', 'solar', 'rg', 'radiacion solar', 'rad_solar'],
    tdew: ['tdew', 'rocio', 'rocío', 'dew', 'punto de rocio', 'punto de rocío', 'td', 'dewpoint'],
    evap: ['evap', 'evaporacion', 'evaporación', 'evaporation', 'tanque', 'pan', 'ev', 'epan'],
  };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[()\[\]°%]/g, ' ').replace(/\s+/g, ' ').trim();
  function roleFromName(name) {
    const n = norm(name);
    if (!n) return null;
    const compact = n.replace(/[\s_.-]/g, '');
    /* exact matches first, then the longest synonym contained in the name */
    let best = null, bestLen = 0;
    for (const role in NAMES) {
      for (const syn of NAMES[role]) {
        const s = norm(syn), sc = s.replace(/[\s_.-]/g, '');
        if (compact === sc) return role;
        if (s.length >= 3 && (n.includes(s) || compact.includes(sc)) && s.length > bestLen) { best = role; bestLen = s.length; }
      }
    }
    return best;
  }
  /* "rhmean" beats "rhmax" when both match: the role of a plain "hr" column */
  function detectRoles(header, rows) {
    const roles = header.map(h => roleFromName(h) || 'ignore');
    /* a column that looks like a date by its content wins over a name */
    header.forEach((h, j) => {
      const sample = (rows || []).slice(0, 30).map(r => r[j]).filter(c => c !== '' && c != null);
      if (!sample.length) return;
      if (sample.every(c => /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}(\s|T|$)/.test(String(c)))) roles[j] = 'date';
    });
    /* only one column per role: the first keeps it */
    const seen = new Set();
    return roles.map(r => { if (r === 'ignore') return r; if (seen.has(r)) return 'ignore'; seen.add(r); return r; });
  }

  /* ---------------- 4 · dates ---------------- */
  /* fmt: 'auto' | 'ymd' | 'dmy' | 'mdy'. Auto reads ISO as it is, and decides
     between day-first and month-first by the values of the whole column. */
  function parseDateCell(s, fmt) {
    const t = String(s || '').trim();
    let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t);
    if (m) return valid(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(t);
    if (m) {
      let y = +m[3]; if (y < 100) y += y < 50 ? 2000 : 1900;
      const a = +m[1], b = +m[2];
      if (fmt === 'mdy') return valid(y, a, b);
      return valid(y, b, a);   /* dmy, the convention of Mexico and of most of the world */
    }
    m = /^(\d{4})(\d{2})(\d{2})$/.exec(t);
    if (m) return valid(+m[1], +m[2], +m[3]);
    return null;
  }
  function valid(y, mo, d) {
    if (!(y >= 1800 && y <= 2200) || mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
    return { y, m: mo, d };
  }
  /* which of dmy / mdy fits a whole column: the order in which no value exceeds 12 in the month slot */
  function guessDateOrder(cells) {
    let firstOver = 0, secondOver = 0, n = 0;
    cells.forEach(c => {
      const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(String(c || '').trim());
      if (!m) return;
      n++;
      if (+m[1] > 12) firstOver++;
      if (+m[2] > 12) secondOver++;
    });
    if (!n) return 'ymd';
    if (firstOver && !secondOver) return 'dmy';
    if (secondOver && !firstOver) return 'mdy';
    return 'dmy';
  }

  /* ---------------- 5 · the series, one row per day ---------------- */
  const emptyRow = (y, m, d) => {
    const r = { y, m, d, J: doy(y, m, d), flags: {} };
    VAR_IDS.forEach(v => { r[v] = null; });
    return r;
  };
  /* opts: dateFmt, windUnit ('ms'|'kmh'|'kmd'), windHeight (m), rsUnit ('mj'|'wm2'|'cal'|'kj'), tempUnit ('c'|'f') */
  function buildSeries(table, roles, o) {
    const opt = o || {};
    const idx = {};
    roles.forEach((r, j) => { if (r !== 'ignore' && idx[r] == null) idx[r] = j; });
    const issues = [];
    if (idx.date == null && !(idx.year != null && (idx.doy != null || (idx.month != null && idx.day != null)))) {
      return { rows: [], meta: { error: 'nodate' }, issues };
    }
    let fmt = opt.dateFmt || 'auto';
    if (fmt === 'auto' && idx.date != null) fmt = guessDateOrder(table.rows.map(r => r[idx.date]));
    const map = new Map();
    let duplicates = 0, badDates = 0;
    table.rows.forEach((cells, k) => {
      let dt = null;
      if (idx.date != null) dt = parseDateCell(cells[idx.date], fmt);
      else {
        const y = num(cells[idx.year]);
        if (idx.doy != null) { const j = num(cells[idx.doy]); if (y != null && j != null && j >= 1 && j <= daysInYear(y)) dt = fromDoy(y, Math.round(j)); }
        else { const mo = num(cells[idx.month]), d = num(cells[idx.day]); if (y != null && mo != null && d != null) dt = valid(y, mo, d); }
      }
      if (!dt) { badDates++; if (badDates <= 20) issues.push({ line: k + 1, type: 'baddate', value: idx.date != null ? cells[idx.date] : '' }); return; }
      const key = dayNumber(dt.y, dt.m, dt.d);
      if (map.has(key)) { duplicates++; if (duplicates <= 20) issues.push({ line: k + 1, type: 'duplicate', date: toISO(dt) }); return; }
      const row = emptyRow(dt.y, dt.m, dt.d);
      VAR_IDS.forEach(v => { if (idx[v] != null) row[v] = num(cells[idx[v]]); });
      /* units */
      if (opt.tempUnit === 'f') ['tmax', 'tmin', 'tmean', 'tdew'].forEach(v => { if (row[v] != null) row[v] = (row[v] - 32) * 5 / 9; });
      if (row.wind != null) {
        if (opt.windUnit === 'kmh') row.wind = row.wind / 3.6;
        else if (opt.windUnit === 'kmd') row.wind = row.wind * 1000 / 86400;
        else if (opt.windUnit === 'knots') row.wind = row.wind * 0.514444;
        const zw = opt.windHeight == null ? 2 : +opt.windHeight;
        if (zw !== 2 && zw > 0) row.wind = Agro.u2(row.wind, zw);
        row.wind = Math.round(row.wind * 1000) / 1000;
      }
      if (row.rs != null) {
        if (opt.rsUnit === 'wm2') row.rs = row.rs * 0.0864;
        else if (opt.rsUnit === 'cal') row.rs = row.rs * 0.04184;
        else if (opt.rsUnit === 'kj') row.rs = row.rs / 1000;
        row.rs = Math.round(row.rs * 1000) / 1000;
      }
      map.set(key, row);
    });
    if (!map.size) return { rows: [], meta: { error: 'nodata', badDates, duplicates }, issues };
    const keys = [...map.keys()].sort((a, b) => a - b);
    const rows = [];
    let missingDates = 0;
    for (let k = keys[0]; k <= keys[keys.length - 1]; k++) {
      if (map.has(k)) rows.push(map.get(k));
      else { const dt = fromDayNumber(k); const r = emptyRow(dt.y, dt.m, dt.d); r.flags._absent = true; rows.push(r); missingDates++; }
    }
    const present = {};
    VAR_IDS.forEach(v => { present[v] = idx[v] != null; });
    return { rows, meta: { first: toISO(rows[0]), last: toISO(rows[rows.length - 1]), nDays: rows.length, nRead: map.size, missingDates, duplicates, badDates, dateFmt: fmt, present }, issues };
  }

  /* ---------------- 6 · quality control ---------------- */
  /* opts: maxGap (days interpolated, default 3), swap (true: Tmax < Tmin are swapped; false: both discarded),
     rainZero (true: a missing rain on a day the station reported temperatures counts as 0),
     spike (°C, default 15), flat (days, default 7) */
  function qc(rowsIn, o) {
    const opt = Object.assign({ maxGap: 3, swap: true, rainZero: false, spike: 15, flat: 7 }, o || {});
    /* flags already on the rows (a project loaded back, a series checked twice) are kept:
       a value interpolated last session is still an interpolated value */
    const rows = rowsIn.map(r => { const c = Object.assign({}, r); c.flags = Object.assign({}, r.flags || {}); return c; });
    const issues = [];
    const add = (i, v, type, value, action) => issues.push({ i, date: toISO(rows[i]), var: v, type, value, action });
    /* 1 · gross errors: outside the physical range */
    rows.forEach((r, i) => VARS.forEach(v => {
      const x = r[v.id];
      if (x == null) return;
      if (x < v.lo || x > v.hi) { add(i, v.id, 'range', x, 'removed'); r[v.id] = null; r.flags[v.id] = 'range'; }
    }));
    /* 2 · Tmax below Tmin */
    rows.forEach((r, i) => {
      if (r.tmax != null && r.tmin != null && r.tmax < r.tmin) {
        if (opt.swap) { const t = r.tmax; r.tmax = r.tmin; r.tmin = t; add(i, 'tmax', 'inverted', `${t} < ${r.tmax}`, 'swapped'); r.flags.tmax = r.flags.tmin = 'swap'; }
        else { add(i, 'tmax', 'inverted', `${r.tmax} < ${r.tmin}`, 'removed'); r.tmax = r.tmin = null; r.flags.tmax = r.flags.tmin = 'inverted'; }
      }
      if (r.rhmax != null && r.rhmin != null && r.rhmax < r.rhmin) { const t = r.rhmax; r.rhmax = r.rhmin; r.rhmin = t; add(i, 'rhmax', 'inverted', `${t} < ${r.rhmax}`, 'swapped'); r.flags.rhmax = r.flags.rhmin = 'swap'; }
      if (r.tmean != null && r.tmax != null && r.tmin != null && (r.tmean > r.tmax + 0.5 || r.tmean < r.tmin - 0.5)) { add(i, 'tmean', 'outside', r.tmean, 'removed'); r.tmean = null; r.flags.tmean = 'range'; }
    });
    /* 3 · spikes: a day that differs from both neighbours by more than the limit, in the same direction */
    ['tmax', 'tmin'].forEach(v => {
      for (let i = 1; i < rows.length - 1; i++) {
        const a = rows[i - 1][v], b = rows[i][v], c = rows[i + 1][v];
        if (a == null || b == null || c == null) continue;
        if ((b - a > opt.spike && b - c > opt.spike) || (a - b > opt.spike && c - b > opt.spike)) { add(i, v, 'spike', b, 'kept'); if (!rows[i].flags[v]) rows[i].flags[v] = 'spike'; }
      }
    });
    /* 4 · flat runs: the same value for `flat` days or more (rain at zero is normal) */
    ['tmax', 'tmin', 'rhmean', 'wind'].forEach(v => {
      let run = 1;
      for (let i = 1; i <= rows.length; i++) {
        const same = i < rows.length && rows[i][v] != null && rows[i - 1][v] != null && rows[i][v] === rows[i - 1][v];
        if (same) run++;
        else {
          if (run >= opt.flat) { add(i - run, v, 'flat', rows[i - 1][v], 'kept'); for (let k = i - run; k < i; k++) if (!rows[k].flags[v]) rows[k].flags[v] = 'flat'; }
          run = 1;
        }
      }
    });
    /* 5 · gaps: linear interpolation of short gaps in the continuous variables; rain never */
    const stats = {};
    VARS.forEach(v => {
      const st = { n: 0, missing: 0, filled: 0, flagged: 0, longest: 0, gaps: 0, gapsLong: 0 };
      const present = rows.some(r => r[v.id] != null);
      if (present) {
        /* every variable has its gaps measured; only the continuous ones are interpolated */
        let i = 0;
        while (i < rows.length) {
          if (rows[i][v.id] != null) { i++; continue; }
          let j = i; while (j < rows.length && rows[j][v.id] == null) j++;
          const len = j - i;
          st.gaps++; st.longest = Math.max(st.longest, len);
          const a = i > 0 ? rows[i - 1][v.id] : null, b = j < rows.length ? rows[j][v.id] : null;
          if (v.interp && len <= opt.maxGap && a != null && b != null) {
            for (let k = i; k < j; k++) { rows[k][v.id] = Math.round((a + (b - a) * (k - i + 1) / (len + 1)) * 100) / 100; rows[k].flags[v.id] = 'filled'; st.filled++; }
            add(i, v.id, 'gap', len, 'interpolated');
          } else { st.gapsLong++; if (len > opt.maxGap) add(i, v.id, 'gap', len, 'left'); }
          i = j;
        }
      }
      if (v.id === 'prec' && opt.rainZero) {
        rows.forEach((r, i) => { if (r.prec == null && r.tmax != null && r.tmin != null && !r.flags._absent && r.flags.tmax !== 'filled') { r.prec = 0; r.flags.prec = 'filled'; st.filled++; } });
        if (st.filled) add(0, 'prec', 'gap', st.filled, 'zeroed');
      }
      st.filled = 0;
      rows.forEach(r => { if (r[v.id] != null) st.n++; else st.missing++; if (r.flags[v.id] === 'filled') st.filled++; else if (r.flags[v.id]) st.flagged++; });
      st.pct = rows.length ? st.n / rows.length : 0;
      stats[v.id] = st;
    });
    /* tmean from the extremes when the station did not report it */
    let tmeanDerived = 0;
    rows.forEach(r => { if (r.tmean == null && r.tmax != null && r.tmin != null) { r.tmean = Math.round((r.tmax + r.tmin) * 50) / 100; r.flags.tmean = r.flags.tmean || 'derived'; tmeanDerived++; } });
    /* 6 · completeness by year: a year is usable for normals when its core variables are ≥ 90 % complete */
    const years = yearTable(rows);
    return { rows, issues, stats, years, tmeanDerived, opts: opt };
  }
  function yearTable(rows) {
    const by = new Map();
    rows.forEach(r => {
      if (!by.has(r.y)) by.set(r.y, { y: r.y, days: 0, tmax: 0, tmin: 0, prec: 0, filled: 0 });
      const a = by.get(r.y); a.days++;
      if (r.tmax != null) a.tmax++; if (r.tmin != null) a.tmin++; if (r.prec != null) a.prec++;
      if (r.flags.tmax === 'filled' || r.flags.tmin === 'filled') a.filled++;
    });
    return [...by.values()].map(a => {
      const n = daysInYear(a.y);
      const pT = Math.min(a.tmax, a.tmin) / n, pP = a.prec / n;
      return Object.assign(a, { total: n, pctT: pT, pctP: pP, partial: a.days < n, complete: pT >= 0.9 && (pP >= 0.9 || a.prec === 0 && pT >= 0.9) });
    });
  }
  /* percentage of days with both temperatures, by year and month: the availability calendar */
  function availability(rows) {
    const by = new Map();
    rows.forEach(r => {
      const k = r.y;
      if (!by.has(k)) by.set(k, Array.from({ length: 12 }, () => ({ n: 0, ok: 0, p: 0 })));
      const c = by.get(k)[r.m - 1]; c.n++;
      if (r.tmax != null && r.tmin != null) c.ok++;
      if (r.prec != null) c.p++;
    });
    return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([y, ms]) => ({ y, months: ms.map((c, i) => ({ pct: c.ok / daysInMonth(y, i + 1), pctP: c.p / daysInMonth(y, i + 1), n: c.n })) }));
  }

  /* ---------------- 7 · what the data allow ---------------- */
  function capabilities(stats, present) {
    const has = v => (present ? present[v] : true) && stats[v] && stats[v].pct > 0.5;
    const temp = has('tmax') && has('tmin');
    const hum = has('rhmax') && has('rhmin') || has('tdew') || has('rhmean') || has('rhmax');
    const rad = has('rs') || has('sun');
    const wind = has('wind');
    return {
      temp, rain: has('prec'), hum, rad, wind,
      gdd: temp, hargreaves: temp,
      pmFull: temp && hum && rad && wind,
      pmPartial: temp && !(hum && rad && wind),
      chill: temp, balance: temp && has('prec'), thornthwaite: temp,
      priestley: temp && rad, turc: temp && rad,
      missing: [!hum && 'hum', !rad && 'rad', !wind && 'wind'].filter(Boolean),
    };
  }

  /* ---------------- 8 · files ---------------- */
  function toCSV(rows, vars) {
    const cols = vars || VAR_IDS;
    const head = ['date'].concat(cols, ['flags']);
    const lines = [head.join(',')];
    rows.forEach(r => {
      const flags = Object.keys(r.flags || {}).filter(k => k[0] !== '_').map(k => k + ':' + r.flags[k]).join(' ');
      lines.push([toISO(r)].concat(cols.map(v => r[v] == null ? '' : r[v]), [flags]).join(','));
    });
    return lines.join('\n');
  }
  /* the template a user fills in a spreadsheet: one header row and one example row */
  function template() {
    return 'fecha,tmax,tmin,prec,hrmax,hrmin,viento,insolacion\n2025-01-01,22.5,4.1,0,88,35,1.8,8.2\n2025-01-02,23.0,3.6,0,85,30,2.1,9.0\n';
  }
  /* a compact JSON of the project: columns as arrays, flags as a sparse list */
  function pack(site, rows, meta) {
    const cols = { date: rows.map(r => toISO(r)) };
    VAR_IDS.forEach(v => { cols[v] = rows.map(r => r[v]); });
    const flags = [];
    rows.forEach((r, i) => { const f = Object.keys(r.flags || {}).filter(k => k[0] !== '_'); if (f.length) flags.push([i, f.map(k => k + ':' + r.flags[k]).join(' ')]); });
    return { app: 'PhenologyPro', version: APP_VERSION, kind: 'project', saved: new Date().toISOString().slice(0, 10), site, meta, cols, flags };
  }
  function unpack(obj) {
    if (!obj || !obj.cols || !obj.cols.date) return null;
    const rows = obj.cols.date.map((iso, i) => {
      const dt = parseISO(iso);
      const r = emptyRow(dt.y, dt.m, dt.d);
      VAR_IDS.forEach(v => { r[v] = obj.cols[v] ? obj.cols[v][i] : null; if (r[v] === undefined) r[v] = null; });
      return r;
    });
    (obj.flags || []).forEach(([i, s]) => { if (rows[i]) s.split(' ').forEach(p => { const [k, v] = p.split(':'); rows[i].flags[k] = v; }); });
    return { site: obj.site || null, rows, meta: obj.meta || {} };
  }

  /* ---------------- 9 · teaching examples ---------------- */
  /* several years of a synthetic site; `dirty` injects the mistakes a real file
     brings so the quality control has something to find */
  function exampleSeries(siteId, nYears, dirty) {
    const site = Climate.byId(siteId);
    const y0 = 2025 - nYears + 1;
    let rows = [];
    for (let k = 0; k < nYears; k++) {
      const yr = Climate.synthesize(site, { year: y0 + k, seed: k + 1 });
      yr.forEach(d => {
        const r = emptyRow(d.y, d.m, d.d);
        r.tmax = d.tmax; r.tmin = d.tmin; r.prec = d.prec; r.rhmean = d.rhmean; r.wind = d.u2;
        rows.push(r);
      });
    }
    if (dirty) {
      const r = rng(77);
      const n = rows.length;
      /* 2 % of days lost outright, three long gaps, a swapped pair, two impossible values, a stuck sensor */
      for (let i = 0; i < n; i++) if (r() < 0.02) { rows[i].tmax = null; rows[i].tmin = null; }
      [0.2, 0.5, 0.8].forEach(f => { const s = Math.floor(f * n); for (let i = s; i < s + 12; i++) { rows[i].tmax = null; rows[i].tmin = null; rows[i].prec = null; } });
      const sw = Math.floor(0.33 * n); const t = rows[sw].tmax; rows[sw].tmax = rows[sw].tmin; rows[sw].tmin = t;
      rows[Math.floor(0.4 * n)].tmax = 99.9; rows[Math.floor(0.6 * n)].prec = -99;
      rows[Math.floor(0.45 * n)].tmin = rows[Math.floor(0.45 * n)].tmin - 22;
      const fl = Math.floor(0.7 * n); for (let i = fl; i < fl + 9; i++) rows[i].tmax = 24.0;
      /* and a few missing calendar days, as when a page of the log was lost */
      rows = rows.filter((_, i) => !(i >= Math.floor(0.55 * n) && i < Math.floor(0.55 * n) + 5));
    }
    return { site: { name: T(site.es, site.en), lat: site.lat, lon: site.lon, z: site.z, coastal: site.kRs > 0.17, arid: site.arid, windHeight: 2 }, rows };
  }

  Object.assign(WxIO, { VARS, VAR_IDS, ROLES, varOf, num, splitLine, detectDelimiter, parseTable, roleFromName, detectRoles, parseDateCell, guessDateOrder, buildSeries, qc, yearTable, availability, capabilities, toCSV, template, pack, unpack, exampleSeries, emptyRow });
  if (typeof window !== 'undefined') window.WxIO = WxIO;
})();
