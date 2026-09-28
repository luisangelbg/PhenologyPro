/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 9: risks and scenarios.

   Pure functions that combine the earlier modules over the years of the record:
     stageWindows(rows, i0, stages, p)     the days on which each stage begins and ends in one season
     stageRisk(rows, p, stages, thr)       frost and heat days inside each stage, every year, and their probabilities
     dailyRisk(rows, thr)                  the probability of frost and of heat on each day of the year
     sowingWindow(rows, eto, p, stages, o) every sowing date judged by heat, frost, heat shock and water, together
     scenario(rows, site, p, stages, o)    the same site with the temperatures shifted by ΔT and the rain scaled */

const Risk9 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);
  /* the temperature above which the sensitive stage of each crop is hurt (a working convention, editable) */
  const HEAT = { maize: 35, sorghum: 38, wheat: 32, barley: 32, bean: 32, soybean: 35, sunflower: 35, cotton: 38, potato: 30, tomato: 32, pepper: 33, onion: 35, apple: 35, peach: 38, avocado: 38, coffee: 32, citrus: 38, alfalfa: 38, sugarcane: 40 };
  const heatFor = id => HEAT[id] || 35;

  /* the day (from sowing) on which each stage begins (the previous stage's day) and ends (its own) */
  function stageWindows(rows, i0, stages, p) {
    const acc = Agro.accumulate(rows, { method: p.method, base: p.base, upper: p.upper, cutoff: p.cutoff, start: i0, end: Math.min(rows.length, i0 + (p.horizon || 400)) });
    let prev = 0;
    const out = stages.map(s => {
      const w = acc.when(s.gdd);
      const end = w == null ? null : Math.max(0, Math.ceil(w - i0 - 1e-9) - 1);
      const win = { code: s.code, from: prev, to: end, reached: end != null };
      if (end != null) prev = end + 1;
      return win;
    });
    return { windows: out, cum: acc.cum, n: acc.cum.length };
  }
  const countIn = (rows, i0, from, to, test) => { let n = 0; for (let k = from; k <= to && i0 + k < rows.length; k++) if (test(rows[i0 + k])) n++; return n; };

  /* thr: {frost, heat}; p: {method, base, upper, cutoff, m, d}; the sensitive stage is `sensitive` (a code) */
  function stageRisk(rows, p, stages, thr, sensitive) {
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    years.forEach(y => {
      const i0 = Therm4.indexOf(rows, y, p.m, Math.min(p.d, daysInMonth(y, p.m)));
      if (i0 == null) return;
      const sw = stageWindows(rows, i0, stages, p);
      if (sw.n < 60) return;
      const last = sw.windows[sw.windows.length - 1];
      const cycleEnd = last.reached ? last.to : sw.n - 1;
      const st = sw.windows.map(w => w.to == null ? { code: w.code, reached: false, frost: null, heat: null, days: null } : { code: w.code, reached: true, days: w.to - w.from + 1, frost: countIn(rows, i0, w.from, w.to, r => r.tmin != null && r.tmin <= thr.frost), heat: countIn(rows, i0, w.from, w.to, r => r.tmax != null && r.tmax >= thr.heat), tminMin: Math.min(...rows.slice(i0 + w.from, i0 + w.to + 1).map(r => (r.tmin == null ? Infinity : r.tmin))), tmaxMax: Math.max(...rows.slice(i0 + w.from, i0 + w.to + 1).map(r => (r.tmax == null ? -Infinity : r.tmax))) });
      out.push({ y, i0, stages: st, matured: last.reached, cycleDays: cycleEnd + 1, frostCycle: countIn(rows, i0, 0, cycleEnd, r => r.tmin != null && r.tmin <= thr.frost), heatCycle: countIn(rows, i0, 0, cycleEnd, r => r.tmax != null && r.tmax >= thr.heat) });
    });
    const summary = stages.map((s, k) => {
      const v = out.map(r => r.stages[k]).filter(x => x.reached);
      const n = v.length;
      return { code: s.code, es: s.es, en: s.en, n, sensitive: s.code === sensitive, pFrost: n ? v.filter(x => x.frost > 0).length / n : null, meanFrost: n ? Stat.mean(v.map(x => x.frost)) : null, pHeat: n ? v.filter(x => x.heat > 0).length / n : null, meanHeat: n ? Stat.mean(v.map(x => x.heat)) : null, daysMedian: n ? q(v.map(x => x.days), 0.5) : null, tminMin: n ? Math.min(...v.map(x => x.tminMin)) : null, tmaxMax: n ? Math.max(...v.map(x => x.tmaxMax)) : null };
    });
    const nY = out.length;
    return { years: out, summary, n: nY, pMature: nY ? out.filter(r => r.matured).length / nY : null, pFrostCycle: nY ? out.filter(r => r.frostCycle > 0).length / nY : null, pHeatCycle: nY ? out.filter(r => r.heatCycle > 0).length / nY : null, meanFrostCycle: nY ? Stat.mean(out.map(r => r.frostCycle)) : null, meanHeatCycle: nY ? Stat.mean(out.map(r => r.heatCycle)) : null };
  }

  /* the share of years in which a calendar day (± 3 days) had frost or heat */
  function dailyRisk(rows, thr) {
    const years = [...new Set(rows.map(r => r.y))].length || 1;
    const frost = new Array(366).fill(0), heat = new Array(366).fill(0), n = new Array(366).fill(0);
    rows.forEach(r => { const j = Math.min(365, r.J) - 1; if (r.tmin != null) { n[j]++; if (r.tmin <= thr.frost) frost[j]++; } if (r.tmax != null && r.tmax >= thr.heat) heat[j]++; });
    const smooth = a => a.map((_, j) => { let s = 0, c = 0; for (let k = -3; k <= 3; k++) { const i = ((j + k) % 365 + 365) % 365; s += a[i]; c += n[i]; } return c ? s / c : null; });
    return { frost: smooth(frost).slice(0, 365), heat: smooth(heat).slice(0, 365), years };
  }

  /* Every sowing date, every year: does the crop mature, does frost hit the cycle (or the sensitive stage), does
     heat hit the sensitive stage, does the rain-fed yield clear the threshold? `pSuccess` is the share of years in
     which ALL the conditions chosen hold at once, which is what a grower needs. */
  function sowingWindow(rows, eto, p, stages, o) {
    const opt = Object.assign({ step: 5, thr: { frost: 0, heat: 35 }, sensitive: null, yieldMin: 0.75, useWater: true, frostWhere: 'sensitive', target: 0.8 }, o || {});
    const years = [...new Set(rows.map(r => r.y))];
    const monthly = opt.water ? Water6.monthlyMeanOf(rows, eto) : null;
    const sensIdx = Math.max(0, stages.findIndex(s => s.code === opt.sensitive));
    const out = [];
    for (let J = 1; J <= 365; J += opt.step) {
      const dt = fromDoy(2025, J);
      const rec = { J, n: 0, mature: 0, noFrost: 0, noHeat: 0, water: 0, ok: 0, days: [], ry: [] };
      years.forEach(y => {
        const i0 = Therm4.indexOf(rows, y, dt.m, Math.min(dt.d, daysInMonth(y, dt.m)));
        if (i0 == null || i0 + 60 > rows.length) return;
        const sw = stageWindows(rows, i0, stages, p);
        const last = sw.windows[sw.windows.length - 1];
        const fullRecord = last.reached || sw.n >= (p.horizon || 400);
        if (!fullRecord) return;
        rec.n++;
        const mature = last.reached;
        if (mature) { rec.mature++; rec.days.push(last.to + 1); }
        const cycleEnd = mature ? last.to : sw.n - 1;
        const sens = sw.windows[sensIdx];
        const frostWin = opt.frostWhere === 'cycle' ? { from: 0, to: cycleEnd } : (sens && sens.reached ? sens : { from: 0, to: cycleEnd });
        const frost = countIn(rows, i0, frostWin.from, frostWin.to, r => r.tmin != null && r.tmin <= opt.thr.frost);
        const heat = sens && sens.reached ? countIn(rows, i0, sens.from, sens.to, r => r.tmax != null && r.tmax >= opt.thr.heat) : 0;
        const noFrost = frost === 0, noHeat = heat === 0;
        if (noFrost) rec.noFrost++;
        if (noHeat) rec.noHeat++;
        let waterOk = true;
        if (opt.useWater && opt.water) {
          const wp = Object.assign({}, opt.water, { L: opt.water.L });
          const r = Water6.runFrom(rows, eto, i0, wp, monthly);
          if (r) { rec.ry.push(r.relYield); waterOk = r.relYield >= opt.yieldMin; } else waterOk = false;
        }
        if (waterOk) rec.water++;
        if (mature && noFrost && noHeat && waterOk) rec.ok++;
      });
      const n = rec.n || 1;
      out.push({ J, n: rec.n, pMature: rec.n ? rec.mature / n : null, pNoFrost: rec.n ? rec.noFrost / n : null, pNoHeat: rec.n ? rec.noHeat / n : null, pWater: rec.n && opt.useWater ? rec.water / n : null, pSuccess: rec.n ? rec.ok / n : null, daysMedian: rec.days.length ? q(rec.days, 0.5) : null, ryP20: rec.ry.length ? q(rec.ry, 0.2) : null, ryMedian: rec.ry.length ? q(rec.ry, 0.5) : null });
    }
    /* the recommended windows: runs of dates whose success is at or above the target */
    const windows = [];
    let cur = null;
    out.forEach(r => {
      if (r.pSuccess != null && r.pSuccess >= opt.target) { if (!cur) cur = { from: r.J, to: r.J, best: r }; else { cur.to = r.J; if (r.pSuccess > cur.best.pSuccess || (r.pSuccess === cur.best.pSuccess && r.daysMedian != null && cur.best.daysMedian != null && r.daysMedian < cur.best.daysMedian)) cur.best = r; } }
      else if (cur) { windows.push(cur); cur = null; }
    });
    if (cur) windows.push(cur);
    const best = out.filter(r => r.pSuccess != null).reduce((a, b) => (!a || b.pSuccess > a.pSuccess || (b.pSuccess === a.pSuccess && (b.daysMedian || 999) < (a.daysMedian || 999)) ? b : a), null);
    return { rows: out, windows, best, opts: opt };
  }

  /* ---------------- scenarios ----------------
     The temperatures shifted by dT (°C) and the rain scaled by (1 + dP); the humidity is kept, so the vapour
     pressure deficit grows with the temperature as it does in a warmer world with unchanged relative humidity. */
  function shiftRows(rows, dT, dP) {
    return rows.map(r => Object.assign({}, r, { tmax: r.tmax == null ? null : r.tmax + dT, tmin: r.tmin == null ? null : r.tmin + dT, tmean: r.tmean == null ? null : r.tmean + dT, prec: r.prec == null ? null : r.prec * (1 + (dP || 0)) }));
  }
  function scenario(rows, site, p, stages, o) {
    const opt = Object.assign({ dT: 0, dP: 0, thr: { frost: 0, heat: 35 }, sensitive: null, water: null, chill: null }, o || {});
    const rr = opt.dT === 0 && !opt.dP ? rows : shiftRows(rows, opt.dT, opt.dP);
    const risk = stageRisk(rr, p, stages, opt.thr, opt.sensitive);
    const dd = Therm4.daily(rr, p);
    const st = Pheno8.stagesByYear(rr, dd, p.m, p.d, stages, p);
    const last = st.summary[st.summary.length - 1];
    const sens = st.summary.find(s => s.code === opt.sensitive) || st.summary[Math.max(0, st.summary.length - 2)];
    const res = { dT: opt.dT, dP: opt.dP, risk, stages: st, daysToMaturity: last ? last.median : null, maturityJ: last && last.median != null ? doy(2025, p.m, p.d) + last.median : null, pMature: last ? last.pReached : null, sensitiveJ: sens && sens.median != null ? doy(2025, p.m, p.d) + sens.median : null };
    /* ETo and the water balance, with the same method as Block 5 (Penman–Monteith on the shifted series) */
    const etoRes = Eto5.compute(rr, site, {});
    const yr = Eto5.yearly(rr, etoRes.pm);
    res.etoAnnual = yr.length ? Stat.mean(yr.map(a => a.total)) : null;
    res.eto = etoRes.pm;
    if (opt.water) {
      const all = Water6.runAll(rr, etoRes.pm, Object.assign({}, opt.water, { m: p.m, d: p.d, irrigation: { mode: 'none' } }));
      res.water = all.summary ? { etc: all.summary.etc.median, relYield: all.summary.relYield.median, relYieldP20: all.summary.relYield.p20, deficit: all.summary.deficit.median, stressDays: all.summary.stressDays.median, pe: all.summary.pe.median } : null;
    }
    if (opt.chill) {
      const seasons = Pheno8.winterSeasons(rr, site.lat, opt.chill);
      const sum = Pheno8.chillSummary(seasons, opt.chill.req);
      res.chill = sum ? { cp: sum.cp.median, cpP20: sum.cp.p20, utah: sum.utah.median, hours: sum.hours.median, pMet: sum.met ? sum.met.p : null } : null;
    }
    return res;
  }

  Object.assign(Risk9, { HEAT, heatFor, stageWindows, stageRisk, dailyRisk, sowingWindow, shiftRows, scenario });
  if (typeof window !== 'undefined') window.Risk9 = Risk9;
})();
