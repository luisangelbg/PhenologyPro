/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 8: phenology on the series.

   Pure functions over the clean rows of Block 2:
     stagesByYear(rows, dd, m, d, stages)   the date of every stage in every year, and the calendar across years
     calibrate(rows, obs, opts)             the thermal requirement of each stage from observed dates, and Arnold's base
     winterSeasons(rows, lat, o)            the chill of every winter: hours, Utah units, portions, and when a requirement is met
     gdhToBloom(season, target)             the heat after the chill, to the date of bloom
     photoperiod(lat)                       the day length of the site through the year */

const Pheno8 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);

  /* ---------------- 1 · stages by thermal time ---------------- */
  /* stages: [{code, es, en, gdd}] cumulative from sowing; returns the day (fractional) and date of each in every year */
  function stagesByYear(rows, dd, m, d, stages, o) {
    const opt = Object.assign({ horizon: 400 }, o || {});
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    years.forEach(y => {
      const i0 = Therm4.indexOf(rows, y, m, Math.min(d, daysInMonth(y, m)));
      if (i0 == null) return;
      const acc = Agro.accumulate(rows, { method: opt.method, base: opt.base, upper: opt.upper, cutoff: opt.cutoff, start: i0, end: Math.min(rows.length, i0 + opt.horizon) });
      if (acc.cum.length < 30) return;
      /* `when` returns the fractional day inside which the target is crossed: a value in (k, k+1] means the
         stage is reached during day k after sowing, so its calendar date is sowing + ceil(das) − 1 */
      const st = stages.map(s => { const w = acc.when(s.gdd); const das = w == null ? null : w - i0; return { code: s.code, das, date: das == null ? null : addDays({ y, m, d: Math.min(d, daysInMonth(y, m)) }, Math.max(0, Math.ceil(das - 1e-9) - 1)) }; });
      out.push({ y, i0, sowing: { y, m, d: Math.min(d, daysInMonth(y, m)) }, stages: st, missing: rows.slice(i0, i0 + acc.cum.length).filter(r => r.tmax == null || r.tmin == null).length, total: acc.total, n: acc.cum.length });
    });
    const summary = stages.map((s, k) => {
      const das = out.map(r => r.stages[k].das).filter(v => v != null);
      const n = out.filter(r => r.stages[k].das != null || r.n >= opt.horizon || r.n >= 300).length;
      return { code: s.code, es: s.es, en: s.en, gdd: s.gdd, n: das.length, nYears: out.length, pReached: out.length ? das.length / out.length : null,
        median: das.length ? q(das, 0.5) : null, p20: das.length ? q(das, 0.2) : null, p80: das.length ? q(das, 0.8) : null, min: das.length ? Math.min(...das) : null, max: das.length ? Math.max(...das) : null, sd: das.length > 1 ? Stat.sd(das) : null };
    });
    return { years: out, summary };
  }

  /* ---------------- 2 · calibration with observed dates ----------------
     obs: [{y, code, date:{y,m,d}}]; the sowing date of each year is the one of the model (m, d) unless obs carry
     `sowing`. For every stage with ≥ 2 years, the mean °C·d and its CV; for the base search, the CV of the
     stage with most observations is computed for every base from `baseFrom` to `baseTo` (Arnold 1959). */
  function calibrate(rows, obs, o) {
    const opt = Object.assign({ baseFrom: 0, baseTo: 16, baseStep: 0.5 }, o || {});
    const byStage = new Map();
    const gddOf = (ob, base) => {
      const sow = ob.sowing || { y: ob.y, m: opt.m, d: Math.min(opt.d, daysInMonth(ob.y, opt.m)) };
      const i0 = Therm4.indexOf(rows, sow.y, sow.m, sow.d);
      const i1 = Therm4.indexOf(rows, ob.date.y, ob.date.m, ob.date.d);
      if (i0 == null || i1 == null || i1 <= i0) return null;
      const acc = Agro.accumulate(rows, { method: opt.method, base, upper: opt.upper, cutoff: opt.cutoff, start: i0, end: i1 + 1 });
      const missing = rows.slice(i0, i1 + 1).filter(r => r.tmax == null || r.tmin == null).length;
      return { gdd: acc.total, days: i1 - i0, missing };
    };
    obs.forEach(ob => {
      const g = gddOf(ob, opt.base);
      if (!g) return;
      if (!byStage.has(ob.code)) byStage.set(ob.code, []);
      byStage.get(ob.code).push(Object.assign({ y: ob.y, date: ob.date }, g));
    });
    const stages = [...byStage.entries()].map(([code, v]) => {
      const g = v.map(x => x.gdd), dys = v.map(x => x.days);
      return { code, n: v.length, obs: v, mean: Stat.mean(g), sd: g.length > 1 ? Stat.sd(g) : null, cv: g.length > 1 ? Stat.sd(g) / Stat.mean(g) : null, min: Math.min(...g), max: Math.max(...g), daysMean: Stat.mean(dys), daysCv: dys.length > 1 ? Stat.sd(dys) / Stat.mean(dys) : null };
    });
    /* Arnold: the base that minimises the CV of the thermal time to the best-observed stage */
    let baseSearch = null;
    const best = stages.filter(s => s.n >= 3).sort((a, b) => b.n - a.n)[0];
    if (best) {
      const curve = [];
      for (let b = opt.baseFrom; b <= opt.baseTo + 1e-9; b += opt.baseStep) {
        const g = obs.filter(ob => ob.code === best.code).map(ob => gddOf(ob, b)).filter(Boolean).map(x => x.gdd);
        if (g.length < 3 || Stat.mean(g) <= 0) continue;
        curve.push({ base: +b.toFixed(2), cv: Stat.sd(g) / Stat.mean(g), mean: Stat.mean(g) });
      }
      const min = curve.length ? curve.reduce((a, c) => (c.cv < a.cv ? c : a)) : null;
      baseSearch = { code: best.code, n: best.n, curve, best: min };
    }
    return { stages, baseSearch, n: obs.length, used: [...byStage.values()].reduce((s, v) => s + v.length, 0) };
  }

  /* parses "año, etapa, fecha" lines (or "fecha de siembra, etapa, fecha") pasted by the user */
  function parseObservations(text) {
    const out = [], bad = [];
    String(text || '').split(/\r?\n/).forEach((line, k) => {
      const t = line.trim(); if (!t || /^#/.test(t)) return;
      const parts = t.split(/[;,\t]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 3) { bad.push(k + 1); return; }
      let y = null, sowing = null, code, date;
      if (/^\d{4}$/.test(parts[0])) { y = +parts[0]; code = parts[1]; date = WxIO.parseDateCell(parts[2], 'dmy'); }
      else { sowing = WxIO.parseDateCell(parts[0], 'dmy'); code = parts[1]; date = WxIO.parseDateCell(parts[2], 'dmy'); if (sowing) y = sowing.y; }
      if (!date || y == null) { bad.push(k + 1); return; }
      out.push({ y, sowing, code: String(code), date });
    });
    return { obs: out, bad };
  }

  /* ---------------- 3 · winter chill ----------------
     Seasons run from `startM` to `endM` (November to February north of the equator, May to August south of it).
     Hourly temperatures come from Linvill (1990) when the station gives only extremes. */
  function winterSeasons(rows, lat, o) {
    const opt = Object.assign({ startM: lat >= 0 ? 11 : 5, endM: lat >= 0 ? 2 : 8, startD: 1 }, o || {});
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    years.forEach(y => {
      const y1 = opt.endM < opt.startM ? y + 1 : y;
      const i0 = Therm4.indexOf(rows, y, opt.startM, opt.startD);
      const i1 = Therm4.indexOf(rows, y1, opt.endM, daysInMonth(y1, opt.endM));
      if (i0 == null || i1 == null || i1 <= i0) return;
      const days = rows.slice(i0, i1 + 1);
      const missing = days.filter(r => r.tmax == null || r.tmin == null).length;
      if (missing > 0.1 * days.length) return;
      /* fill the few missing extremes with the neighbours so the hourly curve is continuous */
      const filled = days.map((r, k) => {
        if (r.tmax != null && r.tmin != null) return { tmax: r.tmax, tmin: r.tmin, J: r.J };
        let a = k - 1; while (a >= 0 && days[a].tmax == null) a--;
        let b = k + 1; while (b < days.length && days[b].tmax == null) b++;
        const ra = a >= 0 ? days[a] : days[b], rb = b < days.length ? days[b] : days[a];
        return { tmax: (ra.tmax + rb.tmax) / 2, tmin: (ra.tmin + rb.tmin) / 2, J: r.J };
      });
      const hourly = Agro.hourlySeries(filled, lat);
      const cp = Agro.chillPortions(hourly, true);
      /* daily cumulative series of the three units */
      const dCP = [], dUtah = [], dHours = [];
      let utah = 0, hours = 0;
      for (let k = 0; k < filled.length; k++) {
        const h = hourly.slice(k * 24, k * 24 + 24);
        utah += Agro.utahUnits(h); hours += Agro.chillHours(h);
        dCP.push(cp.series[k * 24 + 23]); dUtah.push(utah); dHours.push(hours);
      }
      out.push({ y, label: y1 !== y ? `${y}–${String(y1).slice(2)}` : String(y), start: { y, m: opt.startM, d: opt.startD }, days: filled.length, missing, cp: cp.portions, utah, hours, dCP, dUtah, dHours, tminMean: Stat.mean(filled.map(x => x.tmin)), tmeanMean: Stat.mean(filled.map(x => (x.tmax + x.tmin) / 2)) });
    });
    return out;
  }
  /* the day of the season on which a requirement is met, per unit */
  function metOn(season, unit, req) {
    const s = unit === 'utah' ? season.dUtah : unit === 'hours' ? season.dHours : season.dCP;
    for (let k = 0; k < s.length; k++) if (s[k] >= req) return k;
    return null;
  }
  function chillSummary(seasons, req) {
    if (!seasons.length) return null;
    const stat = a => ({ median: q(a, 0.5), p20: q(a, 0.2), p80: q(a, 0.8), min: Math.min(...a), max: Math.max(...a), mean: Stat.mean(a) });
    const cp = stat(seasons.map(s => s.cp)), utah = stat(seasons.map(s => s.utah)), hours = stat(seasons.map(s => s.hours));
    let met = null;
    if (req && req.value > 0) {
      const days = seasons.map(s => metOn(s, req.unit, req.value));
      const ok = days.filter(v => v != null);
      met = { unit: req.unit, value: req.value, p: ok.length / seasons.length, n: ok.length, dayMedian: ok.length ? q(ok, 0.5) : null, dayP80: ok.length ? q(ok, 0.8) : null, dayMax: ok.length ? Math.max(...ok) : null, days };
    }
    return { n: seasons.length, cp, utah, hours, met };
  }
  /* growing degree hours from the day the chill was met to a target: the day of bloom (Anderson et al. 1986) */
  function gdhToBloom(rows, lat, season, metDay, target) {
    if (metDay == null || !(target > 0)) return null;
    const i0 = Therm4.indexOf(rows, season.start.y, season.start.m, season.start.d);
    if (i0 == null) return null;
    let acc = 0;
    for (let k = metDay; i0 + k < rows.length && k < metDay + 200; k++) {
      const r = rows[i0 + k], nx = rows[i0 + k + 1];
      if (r.tmax == null || r.tmin == null) continue;
      const h = Agro.hourlyLinvill(r.tmin, r.tmax, nx && nx.tmin != null ? nx.tmin : r.tmin, Agro.daylength(lat, r.J));
      acc += Agro.gdh(h);
      if (acc >= target) return { day: k, date: { y: r.y, m: r.m, d: r.d }, gdh: acc };
    }
    return null;
  }

  /* ---------------- 4 · photoperiod ---------------- */
  function photoperiod(lat) {
    const out = [];
    for (let J = 1; J <= 365; J++) out.push({ J, civil: Agro.photoperiod(lat, J, -6), geometric: Agro.daylength(lat, J), sun: Agro.photoperiod(lat, J, -0.833) });
    const civ = out.map(x => x.civil);
    return { days: out, max: Math.max(...civ), min: Math.min(...civ), maxJ: civ.indexOf(Math.max(...civ)) + 1, minJ: civ.indexOf(Math.min(...civ)) + 1, monthly: [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349].map((J, i) => ({ m: i + 1, civil: out[J - 1].civil, geometric: out[J - 1].geometric })) };
  }

  /* a teaching set of "observed" dates: the model's dates with a few days of noise, for the calibration workflow */
  function exampleObservations(stagesRes, codes, seed) {
    const r = rng(seed || 5);
    const out = [];
    stagesRes.years.forEach(yr => {
      codes.forEach(code => {
        const st = yr.stages.find(s => s.code === code);
        if (!st || st.das == null) return;
        const noise = Math.round(randn(r) * 3);
        out.push({ y: yr.y, code, date: addDays(st.date, noise) });
      });
    });
    return out;
  }

  Object.assign(Pheno8, { stagesByYear, calibrate, parseObservations, winterSeasons, metOn, chillSummary, gdhToBloom, photoperiod, exampleObservations });
  if (typeof window !== 'undefined') window.Pheno8 = Pheno8;
})();
