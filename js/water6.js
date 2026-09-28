/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 6: the soil water balance of a crop on the series.

   Pure functions over the clean rows of Block 2 and the daily ETo of Block 5:
     kcSeason(rows, i0, crop, params)   the Kc curve corrected to the season's climate (FAO-56 eq. 62, 65)
     runYear(rows, eto, y, params)      the FAO-56 daily root-zone balance of one season
     runAll(rows, eto, params)          every year, with the summary across years
     bySowing(rows, eto, params)        the relative yield of every sowing date
     monthlyNeed(rows, eto)             the climatic irrigation need by month (ETo − effective rain)
   The engine of the balance itself is Agro.balanceDaily (Block 1); here it
   is fed with real seasons and its output is summarised by stage and by year
   and turned into a yield with the response function of FAO-33. */

const Water6 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);
  const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  /* the monthly mean of a daily array, to fill the few days that lack an ETo */
  function monthlyMeanOf(rows, arr) {
    const s = new Array(12).fill(0), n = new Array(12).fill(0);
    rows.forEach((r, i) => { if (arr[i] != null) { s[r.m - 1] += arr[i]; n[r.m - 1]++; } });
    return s.map((v, i) => (n[i] ? v / n[i] : null));
  }

  /* Kc mid and end corrected for the wind and the minimum humidity of the season */
  function kcSeason(rows, i0, crop, params) {
    const L = params.L, len = L.ini + L.dev + L.mid + L.late;
    const slice = rows.slice(i0, i0 + len);
    let u2 = 2, rhmin = 45, corrected = false;
    if (params.kcCorrect) {
      const u = slice.map(r => r.wind).filter(v => v != null);
      const rh = slice.map(r => (r.rhmin != null ? r.rhmin : r.rhmean != null ? Math.max(10, r.rhmean - 15) : null)).filter(v => v != null);
      if (u.length > len / 2) u2 = Stat.mean(u);
      if (rh.length > len / 2) rhmin = Stat.mean(rh);
      corrected = u.length > len / 2 || rh.length > len / 2;
    }
    return { ini: params.kc.ini, mid: corrected ? Agro.kcAdjust(params.kc.mid, u2, rhmin, crop.h) : params.kc.mid, end: corrected ? Agro.kcAdjust(params.kc.end, u2, rhmin, crop.h) : params.kc.end, u2, rhmin, corrected };
  }

  /* one season from row i0; returns null when more than 10 % of the days lack rain or ETo */
  function runFrom(rows, eto, i0, params, monthly) {
    const L = params.L, len = L.ini + L.dev + L.mid + L.late;
    if (i0 == null || i0 + len > rows.length) return null;
    const kc = kcSeason(rows, i0, params.crop, params);
    const days = [];
    let missing = 0;
    for (let k = 0; k < len; k++) {
      const r = rows[i0 + k];
      let e = eto[i0 + k], p = r.prec;
      if (e == null) { e = monthly[r.m - 1]; missing++; }
      if (p == null) { p = 0; missing++; }
      if (e == null) return null;
      days.push({ P: p, eto: e });
    }
    if (missing > 0.1 * len * 2) return null;
    const bal = Agro.balanceDaily(days, {
      taw: params.taw, L, kc, zIni: params.zIni, zMax: params.zMax, p: params.p, dr0: params.dr0 * params.taw * params.zIni, cn: params.cn,
      irrigation: params.irrigation || { mode: 'none' },
    });
    /* by stage */
    const b = [0, L.ini, L.ini + L.dev, L.ini + L.dev + L.mid, len];
    const stages = ['ini', 'dev', 'mid', 'late'].map((id, s) => {
      const rr = bal.rows.slice(b[s], b[s + 1]);
      const etc = Stat.sum(rr.map(x => x.etc)), adj = Stat.sum(rr.map(x => x.etcAdj)), pe = Stat.sum(rr.map(x => x.Pe)), I = Stat.sum(rr.map(x => x.I));
      return { id, days: rr.length, etc, etcAdj: adj, pe, I, deficit: etc - adj, ks: rr.length ? Stat.mean(rr.map(x => x.ks)) : 1, ksMin: rr.length ? Math.min(...rr.map(x => x.ks)) : 1, stress: rr.filter(x => x.ks < 1).length, ratio: etc > 0 ? adj / etc : 1 };
    });
    const t = bal.totals;
    const ratio = t.etc > 0 ? t.etcAdj / t.etc : 1;
    const ky = params.ky == null ? 1 : params.ky;
    const relYield = Math.max(0, Math.min(1, 1 - ky * (1 - ratio)));
    return { i0, start: { y: rows[i0].y, m: rows[i0].m, d: rows[i0].d }, bal, kc, stages, missing, len, ratio, relYield, totals: t };
  }

  function runYear(rows, eto, y, params, monthly) {
    const dim = daysInMonth(y, params.m);
    const i0 = Therm4.indexOf(rows, y, params.m, Math.min(params.d, dim));
    const r = runFrom(rows, eto, i0, params, monthly || monthlyMeanOf(rows, eto));
    return r ? Object.assign({ y }, r) : null;
  }

  function runAll(rows, eto, params) {
    const monthly = monthlyMeanOf(rows, eto);
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    years.forEach(y => { const r = runYear(rows, eto, y, params, monthly); if (r) out.push(r); });
    const pick = f => out.map(f);
    const stat = a => (a.length ? { median: q(a, 0.5), p20: q(a, 0.2), p80: q(a, 0.8), mean: Stat.mean(a), min: Math.min(...a), max: Math.max(...a) } : null);
    const summary = out.length ? {
      n: out.length, etc: stat(pick(r => r.totals.etc)), etcAdj: stat(pick(r => r.totals.etcAdj)), eto: stat(pick(r => r.totals.eto)), P: stat(pick(r => r.totals.P)), pe: stat(pick(r => r.totals.Pe)),
      deficit: stat(pick(r => r.totals.deficit)), dp: stat(pick(r => r.totals.DP)), ro: stat(pick(r => r.totals.RO)), stressDays: stat(pick(r => r.totals.stressDays)), ksMean: stat(pick(r => r.totals.ksMean)),
      relYield: stat(pick(r => r.relYield)), I: stat(pick(r => r.totals.I)), events: stat(pick(r => r.totals.events)),
      stages: ['ini', 'dev', 'mid', 'late'].map((id, s) => ({ id, etc: stat(pick(r => r.stages[s].etc)), etcAdj: stat(pick(r => r.stages[s].etcAdj)), pe: stat(pick(r => r.stages[s].pe)), deficit: stat(pick(r => r.stages[s].deficit)), ks: stat(pick(r => r.stages[s].ks)), ratio: stat(pick(r => r.stages[s].ratio)), stress: stat(pick(r => r.stages[s].stress)) })),
      pGood: out.filter(r => r.relYield >= 0.9).length / out.length, pFail: out.filter(r => r.relYield < 0.5).length / out.length,
    } : null;
    /* the median year by relative yield, for the figure of "a typical year" */
    let medianYear = null;
    if (out.length) { const sorted = out.slice().sort((a, b) => a.relYield - b.relYield); medianYear = sorted[Math.floor(sorted.length / 2)].y; }
    return { years: out, summary, medianYear, monthly };
  }

  /* the relative yield and the deficit of every sowing date (every `step` days), across the years */
  function bySowing(rows, eto, params, step) {
    const monthly = monthlyMeanOf(rows, eto);
    const years = [...new Set(rows.map(r => r.y))];
    const out = [];
    for (let J = 1; J <= 365; J += step || 10) {
      const dt = fromDoy(2025, J);
      const ry = [], def = [], irr = [];
      years.forEach(y => {
        const i0 = Therm4.indexOf(rows, y, dt.m, Math.min(dt.d, daysInMonth(y, dt.m)));
        const r = runFrom(rows, eto, i0, params, monthly);
        if (!r) return;
        ry.push(r.relYield); def.push(r.totals.deficit); irr.push(r.totals.I);
      });
      out.push({ J, n: ry.length, relYield: ry.length ? { median: q(ry, 0.5), p20: q(ry, 0.2), p80: q(ry, 0.8) } : null, deficit: def.length ? { median: q(def, 0.5), p20: q(def, 0.2), p80: q(def, 0.8) } : null, I: irr.length ? { median: q(irr, 0.5) } : null });
    }
    const cand = out.filter(x => x.relYield);
    const best = cand.length ? cand.reduce((a, b) => (b.relYield.p20 > a.relYield.p20 || (b.relYield.p20 === a.relYield.p20 && b.relYield.median > a.relYield.median) ? b : a)) : null;
    return { rows: out, best };
  }

  /* the climatic irrigation need by month: ETo of the reference minus the effective rain */
  function monthlyNeed(rows, eto) {
    const by = new Map();
    rows.forEach((r, i) => { const k = r.y * 100 + r.m; if (!by.has(k)) by.set(k, { y: r.y, m: r.m, P: 0, nP: 0, E: 0, nE: 0 }); const a = by.get(k); if (r.prec != null) { a.P += r.prec; a.nP++; } if (eto[i] != null) { a.E += eto[i]; a.nE++; } });
    const months = Array.from({ length: 12 }, (_, i) => ({ m: i + 1, P: [], E: [], peU: [], peF: [], need: [] }));
    [...by.values()].forEach(a => {
      const dim = daysInMonth(a.y, a.m);
      if (a.nP < 0.8 * dim || a.nE < 0.8 * dim) return;
      const P = a.P * dim / a.nP, E = a.E * dim / a.nE;
      const x = months[a.m - 1];
      x.P.push(P); x.E.push(E); x.peU.push(Agro.effectiveRainUSDA(P)); x.peF.push(Agro.effectiveRainFAO(P)); x.need.push(Math.max(0, E - Agro.effectiveRainUSDA(P)));
    });
    return months.map(x => ({ m: x.m, n: x.P.length, P: x.P.length ? Stat.mean(x.P) : null, eto: x.E.length ? Stat.mean(x.E) : null, peUSDA: x.peU.length ? Stat.mean(x.peU) : null, peFAO: x.peF.length ? Stat.mean(x.peF) : null, need: x.need.length ? Stat.mean(x.need) : null, needP80: x.need.length ? q(x.need, 0.8) : null }));
  }

  Object.assign(Water6, { monthlyMeanOf, kcSeason, runFrom, runYear, runAll, bySowing, monthlyNeed });
  if (typeof window !== 'undefined') window.Water6 = Water6;
})();
