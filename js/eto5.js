/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 5: reference evapotranspiration on the series.

   Pure functions over the clean rows of Block 2 and the site of Block 2:
     compute(rows, site, opts)      ETo by five methods for every day, with what was estimated
     monthly(rows, arr)             monthly means (mm/day) and totals (mm/month)
     yearly(rows, arr)              annual totals of the complete years
     calibrate(ref, alt)            how an alternative method relates to the reference
     termShares(rows, res)          radiation against aerodynamic term, by month
     thornthwaite(nm, lat)          the monthly method from the normals of Block 3 */

const Eto5 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);

  /* opts: kRs (0.16 | 0.19), arid (°C subtracted from Tmin for ea), windDefault (m/s), as, bs, albedo,
     ptAlpha (1.26), hsCoef (0.0023), hsExp (0.5), turc (true) */
  function compute(rows, site, o) {
    const opt = Object.assign({ kRs: site && site.coastal ? 0.19 : 0.16, arid: site && site.arid ? 2 : 0, windDefault: 2, as: 0.25, bs: 0.5, albedo: 0.23, ptAlpha: 1.26, hsCoef: 0.0023, hsExp: 0.5 }, o || {});
    const lat = site && site.lat != null ? site.lat : 20, z = site && site.z != null ? site.z : 0;
    const n = rows.length;
    const pm = new Array(n), hs = new Array(n), pt = new Array(n), turc = new Array(n), rad = new Array(n), aero = new Array(n);
    const ra = new Array(n), rs = new Array(n), rso = new Array(n), rn = new Array(n), ea = new Array(n), es = new Array(n), u2 = new Array(n), rh = new Array(n);
    const notes = { tmin: 0, tdew: 0, rh: 0, rhmax: 0, rhmean: 0, sun: 0, rs: 0, hargreaves: 0, wind2: 0, windMeasured: 0, days: 0, missing: 0 };
    const P = Agro.pressure(z), gam = Agro.gamma(P);
    for (let i = 0; i < n; i++) {
      const r = rows[i];
      if (r.tmax == null || r.tmin == null) { pm[i] = hs[i] = pt[i] = turc[i] = null; notes.missing++; continue; }
      const inp = { lat, z, J: r.J, tmax: r.tmax, tmin: r.tmin, tmean: r.tmean != null ? r.tmean : null, kRs: opt.kRs, arid: opt.arid, as: opt.as, bs: opt.bs, albedo: opt.albedo, P };
      if (r.tdew != null) inp.tdew = r.tdew;
      else if (r.rhmax != null && r.rhmin != null) { inp.rhmax = r.rhmax; inp.rhmin = r.rhmin; }
      else if (r.rhmax != null) inp.rhmax = r.rhmax;
      else if (r.rhmean != null) inp.rhmean = r.rhmean;
      if (r.rs != null) inp.rs = r.rs; else if (r.sun != null) inp.n = r.sun;
      if (r.wind != null) { inp.u2 = r.wind; notes.windMeasured++; } else inp.u2 = opt.windDefault;
      const res = Agro.etoPMDaily(inp);
      if (r.wind == null) notes.wind2++;
      res.notes.forEach(k => { if (k !== 'wind2' && notes[k] != null) notes[k]++; });
      if (r.rs != null) notes.rs++;
      notes.days++;
      pm[i] = res.eto; rad[i] = res.radTerm; aero[i] = res.aeroTerm;
      ra[i] = res.ra; rs[i] = res.rs; rso[i] = res.rso; rn[i] = res.rn; ea[i] = res.ea; es[i] = res.es; u2[i] = res.u2;
      rh[i] = r.rhmean != null ? r.rhmean : Math.min(100, 100 * res.ea / res.es);
      const tm = res.tmean;
      hs[i] = Math.max(0, opt.hsCoef * (tm + 17.8) * Math.pow(Math.max(0, r.tmax - r.tmin), opt.hsExp) * 0.408 * res.ra);
      pt[i] = Agro.etoPriestleyTaylor(tm, res.rn, 0, gam, opt.ptAlpha);
      turc[i] = Agro.etoTurc(tm, res.rs, rh[i]);
    }
    return { pm, hs, pt, turc, rad, aero, ra, rs, rso, rn, ea, es, u2, rh, notes, opts: opt, lat, z, P, gamma: gam };
  }

  /* monthly means of a daily array (mm/day) and the mean monthly total (mm), across the years */
  function monthly(rows, arr) {
    const by = new Map();
    rows.forEach((r, i) => {
      if (arr[i] == null) return;
      const k = r.y * 100 + r.m;
      if (!by.has(k)) by.set(k, { y: r.y, m: r.m, s: 0, n: 0 });
      const a = by.get(k); a.s += arr[i]; a.n++;
    });
    const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, perDay: [], perMonth: [], max: [] }));
    [...by.values()].forEach(a => { if (a.n >= 0.8 * daysInMonth(a.y, a.m)) { months[a.m - 1].perDay.push(a.s / a.n); months[a.m - 1].perMonth.push(a.s / a.n * daysInMonth(a.y, a.m)); } });
    return months.map(x => ({ m: x.m, n: x.perDay.length, perDay: x.perDay.length ? Stat.mean(x.perDay) : null, p20: x.perDay.length ? q(x.perDay, 0.2) : null, p80: x.perDay.length ? q(x.perDay, 0.8) : null, perMonth: x.perMonth.length ? Stat.mean(x.perMonth) : null }));
  }
  /* the daily percentiles of a month across all its days (for the design value of an irrigation system) */
  function dailyQuantiles(rows, arr) {
    const by = Array.from({ length: 12 }, () => []);
    rows.forEach((r, i) => { if (arr[i] != null) by[r.m - 1].push(arr[i]); });
    return by.map((v, i) => ({ m: i + 1, n: v.length, p50: v.length ? q(v, 0.5) : null, p90: v.length ? q(v, 0.9) : null, max: v.length ? Math.max(...v) : null }));
  }
  function yearly(rows, arr) {
    const by = new Map();
    rows.forEach((r, i) => { if (!by.has(r.y)) by.set(r.y, { y: r.y, s: 0, n: 0 }); const a = by.get(r.y); if (arr[i] != null) { a.s += arr[i]; a.n++; } });
    return [...by.values()].filter(a => a.n >= 0.9 * daysInYear(a.y)).map(a => ({ y: a.y, total: a.s * daysInYear(a.y) / a.n, n: a.n }));
  }

  /* How an alternative relates to the reference, day by day: the ratio of means
     (the single factor that fixes Hargreaves locally), the regression
     alt → ref, the bias, the RMSE and the monthly ratios. */
  function calibrate(ref, alt, rows) {
    const x = [], y = [], m = [];
    for (let i = 0; i < ref.length; i++) if (ref[i] != null && alt[i] != null) { x.push(alt[i]); y.push(ref[i]); m.push(rows ? rows[i].m : 1); }
    const n = x.length;
    if (n < 10) return null;
    const mx = Stat.mean(x), my = Stat.mean(y);
    let sxx = 0, sxy = 0, syy = 0, se = 0, sbias = 0;
    for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); syy += (y[i] - my) ** 2; se += (x[i] - y[i]) ** 2; sbias += x[i] - y[i]; }
    const b = sxx > 0 ? sxy / sxx : 0, a = my - b * mx;
    const r2 = sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : 0;
    const rmse = Math.sqrt(se / n), bias = sbias / n;
    const k = mx > 0 ? my / mx : 1;
    /* RMSE after the single-factor correction and after the regression */
    let seK = 0, seR = 0;
    for (let i = 0; i < n; i++) { seK += (k * x[i] - y[i]) ** 2; seR += (a + b * x[i] - y[i]) ** 2; }
    const monthlyRatio = Array.from({ length: 12 }, () => ({ sx: 0, sy: 0, n: 0 }));
    for (let i = 0; i < n; i++) { const t = monthlyRatio[m[i] - 1]; t.sx += x[i]; t.sy += y[i]; t.n++; }
    return { n, k, a, b, r2, rmse, bias, relBias: my > 0 ? bias / my : null, rmseK: Math.sqrt(seK / n), rmseR: Math.sqrt(seR / n), meanRef: my, meanAlt: mx, monthlyRatio: monthlyRatio.map(t => (t.n && t.sx > 0 ? t.sy / t.sx : null)) };
  }

  /* the radiation and the aerodynamic halves of Penman–Monteith, by month */
  function termShares(rows, res) {
    const by = Array.from({ length: 12 }, () => ({ rad: 0, aero: 0, n: 0 }));
    rows.forEach((r, i) => { if (res.pm[i] == null) return; const t = by[r.m - 1]; t.rad += res.rad[i]; t.aero += res.aero[i]; t.n++; });
    return by.map((t, i) => ({ m: i + 1, rad: t.n ? t.rad / t.n : null, aero: t.n ? t.aero / t.n : null, share: t.n && t.rad + t.aero > 0 ? t.aero / (t.rad + t.aero) : null }));
  }
  /* mean Ra, Rso and Rs by month, the radiation budget of the site */
  function radiation(rows, res) {
    const by = Array.from({ length: 12 }, () => ({ ra: 0, rso: 0, rs: 0, rn: 0, n: 0 }));
    rows.forEach((r, i) => { if (res.pm[i] == null) return; const t = by[r.m - 1]; t.ra += res.ra[i]; t.rso += res.rso[i]; t.rs += res.rs[i]; t.rn += res.rn[i]; t.n++; });
    return by.map((t, i) => ({ m: i + 1, ra: t.n ? t.ra / t.n : null, rso: t.n ? t.rso / t.n : null, rs: t.n ? t.rs / t.n : null, rn: t.n ? t.rn / t.n : null }));
  }
  /* Thornthwaite from the normals of Block 3 (monthly mm) */
  function thornthwaite(nm, lat) {
    if (!nm || !nm.complete) return null;
    const T = nm.months.map(x => x.tmean);
    const pet = Agro.etoThornthwaite(T, lat, 2025);
    return pet.map((v, i) => ({ m: i + 1, perMonth: v, perDay: v / [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i] }));
  }

  /* the ETo the later blocks will use: a method and, for Hargreaves, an optional local correction */
  function chosen(res, method, cal) {
    const src = method === 'hs' || method === 'hsk' || method === 'hsr' ? res.hs : method === 'pt' ? res.pt : method === 'turc' ? res.turc : res.pm;
    if (method === 'hsk' && cal) return src.map(v => (v == null ? null : v * cal.k));
    if (method === 'hsr' && cal) return src.map(v => (v == null ? null : Math.max(0, cal.a + cal.b * v)));
    return src.slice();
  }

  Object.assign(Eto5, { compute, monthly, dailyQuantiles, yearly, calibrate, termShares, radiation, thornthwaite, chosen });
  if (typeof window !== 'undefined') window.Eto5 = Eto5;
})();
