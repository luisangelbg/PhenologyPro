/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 4: thermal time on the real series.

   Pure functions over the clean rows of Block 2. The engine of Block 1 gives
   the degree-days of one day; this module runs it over the years:
     daily(rows, opts)                 °C·d of every day (null where a temperature is missing)
     fromDate(rows, dd, i0, opts)      the accumulation from one start day
     byYear(rows, dd, m, d, opts)      the same start date in every year
     sowingMap(rows, dd, opts)         what every sowing date of the year offers
     monthly(rows, dd)                 the thermal calendar: °C·d per day by month
     compareMethods(rows, i0, n, ...)  the six methods and three cut-offs on one season */

const Therm4 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);

  /* opts: method, base, upper, cutoff */
  function daily(rows, o) {
    const opt = Object.assign({ method: 'average', base: 10, upper: 30, cutoff: 'horizontal' }, o || {});
    const out = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.tmax == null || r.tmin == null) { out[i] = null; continue; }
      const next = rows[i + 1];
      out[i] = opt.method === 'chu' ? Agro.chu(r.tmax, r.tmin)
        : Agro.degreeDay(opt.method, r.tmax, r.tmin, opt.base, opt.upper, opt.cutoff, next && next.tmin != null ? next.tmin : null);
    }
    return out;
  }

  /* The accumulation from row i0. It stops at the target (if any), at the
     horizon in days, at the first frost below `frostThr` if `stopAtFrost`, or
     at the end of the record. Missing days add nothing and are counted. */
  function fromDate(rows, dd, i0, o) {
    const opt = Object.assign({ target: null, horizon: 365, stopAtFrost: false, frostThr: 0, marks: [30, 60, 90, 120], stopAtTarget: true }, o || {});
    const cum = [];
    let total = 0, missing = 0, reached = null, frostAt = null, end = null;
    const at = {};
    for (let k = 0; i0 + k < rows.length && k < opt.horizon; k++) {
      const r = rows[i0 + k];
      const v = dd[i0 + k];
      if (v == null) missing++; else total += v;
      cum.push(total);
      opt.marks.forEach(m => { if (k + 1 === m) at[m] = total; });
      if (reached == null && opt.target != null && total >= opt.target) reached = k;
      if (opt.stopAtFrost && k > 0 && r.tmin != null && r.tmin <= opt.frostThr) { frostAt = k; end = k; break; }
      if (reached != null && opt.stopAtTarget && !opt.stopAtFrost) { end = k; break; }
    }
    if (end == null) end = cum.length - 1;
    /* fractional day of the target, interpolated inside the day it was crossed */
    let days = null;
    if (reached != null) { const prev = reached ? cum[reached - 1] : 0; const frac = cum[reached] > prev ? (opt.target - prev) / (cum[reached] - prev) : 0; days = reached + frac; }
    return { i0, cum, total: cum[end] == null ? total : cum[end], reached, days, at, missing, frostAt, end, truncated: i0 + end >= rows.length - 1 && reached == null && frostAt == null };
  }

  /* the index of a calendar date in the rows, or null */
  function indexOf(rows, y, m, d) {
    const n0 = dayNumber(rows[0].y, rows[0].m, rows[0].d);
    const i = dayNumber(y, m, d) - n0;
    return i >= 0 && i < rows.length ? i : null;
  }

  /* the same start date (month m, day d) in every year of the record */
  function byYear(rows, dd, m, d, o) {
    const opt = o || {};
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    years.forEach(y => {
      const dim = daysInMonth(y, m);
      const i0 = indexOf(rows, y, m, Math.min(d, dim));
      if (i0 == null) return;
      const r = fromDate(rows, dd, i0, Object.assign({ stopAtTarget: false }, opt));
      /* a start with fewer than 60 days of record after it, and no target reached, says nothing */
      if (r.days == null && r.frostAt == null && r.cum.length < Math.min(60, opt.horizon || 60)) return;
      const season = opt.season || opt.horizon || r.cum.length;
      r.seasonTotal = r.cum[Math.min(season, r.cum.length) - 1];
      r.seasonComplete = r.cum.length >= season || r.frostAt != null;
      out.push(Object.assign({ y }, r));
    });
    const reached = out.filter(r => r.days != null).map(r => r.days);
    const totals = out.filter(r => r.seasonComplete).map(r => r.seasonTotal);
    return {
      years: out, n: out.length,
      days: reached.length ? { n: reached.length, median: q(reached, 0.5), p20: q(reached, 0.2), p80: q(reached, 0.8), min: Math.min(...reached), max: Math.max(...reached), mean: Stat.mean(reached), sd: reached.length > 1 ? Stat.sd(reached) : null } : null,
      total: totals.length ? { median: q(totals, 0.5), p20: q(totals, 0.2), p80: q(totals, 0.8), mean: Stat.mean(totals), sd: totals.length > 1 ? Stat.sd(totals) : null, cv: totals.length > 1 ? Stat.sd(totals) / Stat.mean(totals) : null } : null,
      pReached: out.length ? reached.length / out.filter(r => !r.truncated || r.days != null).length : null,
      frostEnded: out.filter(r => r.frostAt != null && r.days == null).length,
    };
  }

  /* the median accumulation curve across years, day by day from the start */
  function medianCurve(years) {
    const n = Math.max(0, ...years.map(r => r.cum.length));
    const med = [], p20 = [], p80 = [];
    for (let k = 0; k < n; k++) {
      const v = years.map(r => r.cum[k]).filter(x => x != null);
      if (v.length < Math.max(2, years.length / 2)) break;
      med.push(q(v, 0.5)); p20.push(q(v, 0.2)); p80.push(q(v, 0.8));
    }
    return { median: med, p20, p80 };
  }

  /* What every sowing date offers: for each day of the year (every `step`
     days) and each year, the °C·d gathered in `season` days (or until the
     first frost) and the days needed to reach the target. */
  function sowingMap(rows, dd, o) {
    const opt = Object.assign({ step: 5, season: 150, target: null, stopAtFrost: false, frostThr: 0 }, o || {});
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    for (let J = 1; J <= 365; J += opt.step) {
      const dt = fromDoy(2025, J);
      const totals = [], days = [], ok = [];
      years.forEach(y => {
        const i0 = indexOf(rows, y, dt.m, Math.min(dt.d, daysInMonth(y, dt.m)));
        if (i0 == null || i0 + opt.season > rows.length) return;
        const r = fromDate(rows, dd, i0, { target: opt.target, horizon: opt.season, stopAtFrost: opt.stopAtFrost, frostThr: opt.frostThr, marks: [], stopAtTarget: false });
        if (r.missing > opt.season * 0.1) return;
        totals.push(r.total);
        if (opt.target != null) { ok.push(r.days != null ? 1 : 0); if (r.days != null) days.push(r.days); }
      });
      out.push({
        J, n: totals.length,
        total: totals.length ? { median: q(totals, 0.5), p20: q(totals, 0.2), p80: q(totals, 0.8) } : null,
        days: days.length ? { median: q(days, 0.5), p20: q(days, 0.2), p80: q(days, 0.8) } : null,
        pReached: ok.length ? Stat.mean(ok) : null,
      });
    }
    /* the best sowing dates: those where the target is reached in ≥ 80 % of years with the fewest days */
    let best = null;
    if (opt.target != null) {
      const cand = out.filter(x => x.pReached != null && x.pReached >= 0.8 && x.days);
      if (cand.length) best = cand.reduce((a, b) => (b.days.median < a.days.median ? b : a));
    }
    return { rows: out, best, opts: opt };
  }

  /* the thermal calendar: mean °C·d per day of each month, and its spread between years */
  function monthly(rows, dd) {
    const by = new Map();
    rows.forEach((r, i) => {
      if (dd[i] == null) return;
      const k = r.y * 100 + r.m;
      if (!by.has(k)) by.set(k, { y: r.y, m: r.m, s: 0, n: 0 });
      const a = by.get(k); a.s += dd[i]; a.n++;
    });
    const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, perDay: [], perMonth: [] }));
    [...by.values()].forEach(a => { if (a.n >= 24) { months[a.m - 1].perDay.push(a.s / a.n); months[a.m - 1].perMonth.push(a.s / a.n * daysInMonth(a.y, a.m)); } });
    return months.map(x => ({
      m: x.m, n: x.perDay.length,
      perDay: x.perDay.length ? Stat.mean(x.perDay) : null, perDayP20: x.perDay.length ? q(x.perDay, 0.2) : null, perDayP80: x.perDay.length ? q(x.perDay, 0.8) : null,
      perMonth: x.perMonth.length ? Stat.mean(x.perMonth) : null,
    }));
  }

  /* the °C·d of each year (calendar) for the between-year figure */
  function annual(rows, dd) {
    const by = new Map();
    rows.forEach((r, i) => { if (!by.has(r.y)) by.set(r.y, { y: r.y, s: 0, n: 0, days: 0 }); const a = by.get(r.y); a.days++; if (dd[i] != null) { a.s += dd[i]; a.n++; } });
    return [...by.values()].filter(a => a.n >= 0.9 * daysInYear(a.y)).map(a => ({ y: a.y, total: a.s * daysInYear(a.y) / a.n, n: a.n }));
  }

  /* the same season under every method and cut-off */
  function compareMethods(rows, i0, n, base, upper) {
    const methods = ['average', 'capped', 'triangle', 'sine', 'doubleTriangle', 'doubleSine'];
    const cutoffs = ['none', 'horizontal', 'intermediate', 'vertical'];
    const out = [];
    methods.forEach(method => {
      const row = { method };
      cutoffs.forEach(c => {
        let s = 0, miss = 0;
        for (let k = 0; k < n && i0 + k < rows.length; k++) {
          const r = rows[i0 + k];
          if (r.tmax == null || r.tmin == null) { miss++; continue; }
          const nx = rows[i0 + k + 1];
          s += method === 'capped' && c !== 'horizontal' ? NaN : Agro.degreeDay(method, r.tmax, r.tmin, base, upper, c, nx && nx.tmin != null ? nx.tmin : null);
        }
        row[c] = isFinite(s) ? s : null;
        row.missing = miss;
      });
      out.push(row);
    });
    let chu = 0;
    for (let k = 0; k < n && i0 + k < rows.length; k++) { const r = rows[i0 + k]; if (r.tmax != null && r.tmin != null) chu += Agro.chu(r.tmax, r.tmin); }
    return { rows: out, chu, n };
  }

  Object.assign(Therm4, { daily, fromDate, indexOf, byYear, medianCurve, sowingMap, monthly, annual, compareMethods });
  if (typeof window !== 'undefined') window.Therm4 = Therm4;
})();
