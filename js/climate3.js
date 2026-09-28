/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 3: the climate of the site, from the daily series.

   Pure functions over the clean rows of Block 2:
     normals(rows, opts)        monthly normals and their year-to-year spread
     climograph(nm, site)       what a Walter–Lieth diagram needs
     rainRegime(rows, nm)       seasonality, concentration, onset and end of the rains
     frost(rows, opts)          frost dates by season, probabilities and the frost-free period
     indices(nm, lat)           Thornthwaite PET and balance, aridity indices, growing period
     koppen(nm, lat)            Köppen–Geiger class by the criteria of Peel et al. (2007)
   Every convention is named where it is used; nothing is hidden in a default. */

const Clim3 = {};

(function () {

  const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const q = (a, p) => Stat.quantile(a, p);

  /* ---------------- 1 · monthly normals ----------------
     opts.years: a Set of the years to use (null = all); a month of a year
     counts when it has at least `minShare` (0.8) of its days with the
     variable, so that a half-observed July does not pull the rain down. */
  function normals(rows, o) {
    const opt = Object.assign({ years: null, minShare: 0.8 }, o || {});
    const by = new Map();   /* year → 12 accumulators */
    rows.forEach(r => {
      if (opt.years && !opt.years.has(r.y)) return;
      if (!by.has(r.y)) by.set(r.y, Array.from({ length: 12 }, () => ({ tx: [], tn: [], tm: [], p: 0, np: 0, wet: 0, frost: 0, txAbs: -Infinity, tnAbs: Infinity, rh: [], u: [], sun: [], rs: [] })));
      const a = by.get(r.y)[r.m - 1];
      if (r.tmax != null) { a.tx.push(r.tmax); a.txAbs = Math.max(a.txAbs, r.tmax); }
      if (r.tmin != null) { a.tn.push(r.tmin); a.tnAbs = Math.min(a.tnAbs, r.tmin); if (r.tmin <= 0) a.frost++; }
      if (r.tmean != null) a.tm.push(r.tmean);
      if (r.prec != null) { a.p += r.prec; a.np++; if (r.prec >= 1) a.wet++; }
      if (r.rhmean != null) a.rh.push(r.rhmean); else if (r.rhmax != null && r.rhmin != null) a.rh.push((r.rhmax + r.rhmin) / 2);
      if (r.wind != null) a.u.push(r.wind);
      if (r.sun != null) a.sun.push(r.sun);
      if (r.rs != null) a.rs.push(r.rs);
    });
    const years = [...by.keys()].sort((a, b) => a - b);
    const months = [];
    for (let m = 0; m < 12; m++) {
      const dim = DIM[m];
      const need = Math.ceil(opt.minShare * dim);
      const tx = [], tn = [], tm = [], P = [], wet = [], frost = [], txAbs = [], tnAbs = [], rh = [], u = [], sun = [], rs = [];
      years.forEach(y => {
        const a = by.get(y)[m];
        if (a.tx.length >= need) { tx.push(Stat.mean(a.tx)); txAbs.push(a.txAbs); }
        if (a.tn.length >= need) { tn.push(Stat.mean(a.tn)); tnAbs.push(a.tnAbs); frost.push(a.frost); }
        if (a.tm.length >= need) tm.push(Stat.mean(a.tm));
        if (a.np >= need) { P.push(a.p * dim / a.np); wet.push(a.wet * dim / a.np); }
        if (a.rh.length >= need) rh.push(Stat.mean(a.rh));
        if (a.u.length >= need) u.push(Stat.mean(a.u));
        if (a.sun.length >= need) sun.push(Stat.mean(a.sun));
        if (a.rs.length >= need) rs.push(Stat.mean(a.rs));
      });
      const mean = a => a.length ? Stat.mean(a) : null;
      months.push({
        m: m + 1, nT: tn.length, nP: P.length,
        tmax: mean(tx), tmin: mean(tn), tmean: tm.length ? mean(tm) : (tx.length && tn.length ? (mean(tx) + mean(tn)) / 2 : null),
        txAbs: txAbs.length ? Math.max(...txAbs) : null, tnAbs: tnAbs.length ? Math.min(...tnAbs) : null,
        tnAbsMean: mean(tnAbs), txAbsMean: mean(txAbs),
        P: mean(P), Psd: P.length > 1 ? Stat.sd(P) : null, P20: P.length ? q(P, 0.2) : null, P50: P.length ? q(P, 0.5) : null, P80: P.length ? q(P, 0.8) : null,
        wetDays: mean(wet), frostDays: mean(frost), frostYears: frost.length ? frost.filter(f => f > 0).length / frost.length : null,
        rh: mean(rh), wind: mean(u), sun: mean(sun), rs: mean(rs),
        Pyears: P, Tyears: tn.map((v, i) => (tx[i] + v) / 2),
      });
    }
    const T = months.map(x => x.tmean), P = months.map(x => x.P);
    const complete = T.every(v => v != null) && P.every(v => v != null);
    const annual = {
      T: T.every(v => v != null) ? Stat.mean(T) : null,
      Tmax: months.every(x => x.tmax != null) ? Stat.mean(months.map(x => x.tmax)) : null,
      Tmin: months.every(x => x.tmin != null) ? Stat.mean(months.map(x => x.tmin)) : null,
      P: P.every(v => v != null) ? Stat.sum(P) : null,
      wetDays: months.every(x => x.wetDays != null) ? Stat.sum(months.map(x => x.wetDays)) : null,
      frostDays: months.every(x => x.frostDays != null) ? Stat.sum(months.map(x => x.frostDays)) : null,
      txAbs: Math.max(...months.map(x => x.txAbs == null ? -Infinity : x.txAbs)), tnAbs: Math.min(...months.map(x => x.tnAbs == null ? Infinity : x.tnAbs)),
      range: T.every(v => v != null) ? Math.max(...T) - Math.min(...T) : null,
      hottest: T.every(v => v != null) ? T.indexOf(Math.max(...T)) + 1 : null, coldest: T.every(v => v != null) ? T.indexOf(Math.min(...T)) + 1 : null,
      wettest: P.every(v => v != null) ? P.indexOf(Math.max(...P)) + 1 : null, driest: P.every(v => v != null) ? P.indexOf(Math.min(...P)) + 1 : null,
    };
    /* the annual rain of each year, for the spread */
    const Pann = years.map(y => { const a = by.get(y); const ok = a.every((x, m) => x.np >= Math.ceil(opt.minShare * DIM[m])); return ok ? Stat.sum(a.map(x => x.p)) : null; }).filter(v => v != null);
    annual.Pyears = Pann; annual.Pcv = Pann.length > 1 ? Stat.sd(Pann) / Stat.mean(Pann) : null; annual.P20 = Pann.length ? q(Pann, 0.2) : null; annual.P80 = Pann.length ? q(Pann, 0.8) : null;
    return { months, annual, years, nYears: years.length, complete };
  }

  /* ---------------- 2 · the Walter–Lieth diagram ----------------
     humid months: P > 2T; perhumid: P > 100 mm; dry: P < 2T. Frost: months
     whose mean daily minimum is ≤ 0 (certain, black) and those whose absolute
     minimum is ≤ 0 (probable, hatched). */
  function climograph(nm) {
    const T = nm.months.map(x => x.tmean), P = nm.months.map(x => x.P);
    const humid = P.map((p, i) => p != null && T[i] != null && p > 2 * T[i]);
    const perhumid = P.map(p => p != null && p > 100);
    const dry = P.map((p, i) => p != null && T[i] != null && p < 2 * T[i]);
    const frostSure = nm.months.map(x => x.tmin != null && x.tmin <= 0);
    const frostLikely = nm.months.map(x => x.tnAbsMean != null && x.tnAbsMean <= 0 && !(x.tmin != null && x.tmin <= 0));
    return { T, P, humid, perhumid, dry, frostSure, frostLikely, dryMonths: dry.filter(Boolean).length, humidMonths: humid.filter(Boolean).length, perhumidMonths: perhumid.filter(Boolean).length,
      txAbs: nm.annual.txAbs, tnAbs: nm.annual.tnAbs, T: T, Tann: nm.annual.T, Pann: nm.annual.P };
  }

  /* ---------------- 3 · the rain regime ---------------- */
  /* Oliver's (1980) precipitation concentration index: 8.3 = uniform, 100 = all in one month */
  function pci(P) { const s = Stat.sum(P); return s > 0 ? 100 * Stat.sum(P.map(p => p * p)) / (s * s) : null; }
  const pciClass = v => v == null ? null : v < 10 ? 'uniform' : v <= 15 ? 'moderate' : v <= 20 ? 'seasonal' : 'strong';
  /* share of the annual rain in the summer half (Apr–Sep north, Oct–Mar south) */
  function summerShare(P, lat) {
    const s = Stat.sum(P); if (!(s > 0)) return null;
    const idx = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
    return Stat.sum(idx.map(i => P[i])) / s;
  }
  /* The rainy season of each year, with an agronomic definition (after Stern,
     Dennett & Garbutt 1981): the onset is the first day, counted from the start
     of the dry season, on which `onsetMm` (20 mm) fall within `onsetDays` (3)
     days and no dry spell of `dryRun` (10) days follows in the next 30 days;
     the end is the first day, at least 60 days after the onset, from which the
     following 30 days bring less than `endMm` (10 mm). */
  function rainSeasons(rows, nm, o) {
    const opt = Object.assign({ onsetMm: 20, onsetDays: 3, dryRun: 10, endMm: 10, endWindow: 30 }, o || {});
    /* The rain year of season y starts at the driest month: in year y when that
       month falls in the first half, in year y − 1 otherwise, so that a season
       is labelled by the calendar year in which most of it falls. A start that
       precedes the record is clamped to its first day. */
    const driest = nm.annual.driest || 1;
    const startM = driest;
    const seasons = [];
    const years = nm.years;
    const idxOf = new Map(); rows.forEach((r, i) => idxOf.set(r.y * 10000 + r.m * 100 + r.d, i));
    const first = dayNumber(rows[0].y, rows[0].m, rows[0].d);
    years.forEach(y => {
      const sy = startM <= 6 ? y : y - 1;
      let i0 = idxOf.get(sy * 10000 + startM * 100 + 1);
      if (i0 == null) { if (dayNumber(sy, startM, 1) < first && dayNumber(y, 12, 31) >= first) i0 = 0; else return; }
      const i1 = Math.min(rows.length, i0 + 365);
      let onset = null, end = null, total = 0, wet = 0, missing = 0;
      for (let i = i0; i < i1; i++) { const p = rows[i].prec; if (p == null) missing++; else { total += p; if (p >= 1) wet++; } }
      if (missing > 36) { seasons.push({ y, onset: null, end: null, length: null, total: null, missing }); return; }
      for (let i = i0; i < i1 - 30; i++) {
        let s = 0; for (let k = 0; k < opt.onsetDays && i + k < i1; k++) s += rows[i + k].prec || 0;
        if (s < opt.onsetMm) continue;
        let dry = 0, bad = false;
        for (let k = opt.onsetDays; k < 30 && i + k < i1; k++) { if ((rows[i + k].prec || 0) < 1) { dry++; if (dry >= opt.dryRun) { bad = true; break; } } else dry = 0; }
        if (!bad) { onset = i; break; }
      }
      if (onset != null) {
        for (let i = onset + 60; i < i1; i++) {
          let s = 0; for (let k = 0; k < opt.endWindow && i + k < i1; k++) s += rows[i + k].prec || 0;
          if (s < opt.endMm) { end = i; break; }
        }
      }
      const doyOf = i => i == null ? null : rows[i].J;   /* day of its own calendar year */
      seasons.push({ y, onset: doyOf(onset), end: doyOf(end), onsetDate: onset == null ? null : { y: rows[onset].y, m: rows[onset].m, d: rows[onset].d }, endDate: end == null ? null : { y: rows[end].y, m: rows[end].m, d: rows[end].d }, length: onset != null && end != null ? end - onset : null, total, wet, missing });
    });
    const on = seasons.map(s => s.onset).filter(v => v != null), en = seasons.map(s => s.end).filter(v => v != null), len = seasons.map(s => s.length).filter(v => v != null);
    return { seasons, startMonth: startM, onset: on.length ? { median: q(on, 0.5), p20: q(on, 0.2), p80: q(on, 0.8), n: on.length } : null, end: en.length ? { median: q(en, 0.5), p20: q(en, 0.2), p80: q(en, 0.8), n: en.length } : null, length: len.length ? { median: q(len, 0.5), p20: q(len, 0.2), p80: q(len, 0.8) } : null, opts: opt };
  }
  function rainRegime(rows, nm, lat, o) {
    const P = nm.months.map(x => x.P);
    if (P.some(v => v == null)) return { ok: false };
    const wetDays = nm.annual.wetDays;
    return {
      ok: true, pci: pci(P), pciClass: pciClass(pci(P)), summerShare: summerShare(P, lat), winterShare: 1 - summerShare(P, lat),
      wettest: nm.annual.wettest, driest: nm.annual.driest, wetDays, perWetDay: wetDays ? nm.annual.P / wetDays : null,
      dryMonths: P.filter((p, i) => nm.months[i].tmean != null && p < 2 * nm.months[i].tmean).length,
      seasons: rainSeasons(rows, nm, o),
    };
  }

  /* ---------------- 4 · frost ----------------
     A frost day has Tmin ≤ threshold (0 °C meteorological; 2 °C for the leaf
     surface on a clear night; −2 for hardy crops). Seasons are split at the
     warmest month, so the "last spring frost" is the last frost before it and
     the "first autumn frost" the first after it, in either hemisphere. */
  function frost(rows, nm, o) {
    const opt = Object.assign({ threshold: 0 }, o || {});
    const pivotM = nm.annual.hottest || 7;
    const pivotDoy = doy(2025, pivotM, 15);
    const byYear = new Map();
    rows.forEach((r, i) => {
      /* the season year: from the coldest half around the pivot; days after the pivot of year y belong to season y, days before it too */
      if (!byYear.has(r.y)) byYear.set(r.y, { y: r.y, last: null, first: null, frostDays: 0, days: 0, tnAbs: Infinity, missing: 0 });
      const a = byYear.get(r.y);
      const j = r.J;
      a.days++;
      if (r.tmin == null) { a.missing++; return; }
      a.tnAbs = Math.min(a.tnAbs, r.tmin);
      if (r.tmin <= opt.threshold) {
        a.frostDays++;
        if (j < pivotDoy) a.last = j; else if (a.first == null) a.first = j;
      }
    });
    const years = [...byYear.values()].filter(a => a.days >= 300 && a.missing < 60).sort((a, b) => a.y - b.y);
    const n = years.length;
    /* frost-free period of each season: from the last spring frost to the first autumn one */
    years.forEach(a => { a.free = a.first != null && a.last != null ? a.first - a.last - 1 : a.first == null && a.last == null ? 365 : a.last == null ? a.first - 1 : 365 - a.last; a.noFrost = a.frostDays === 0; });
    /* P(frost on or after day d in spring) = share of seasons whose last frost ≥ d; P(frost on or before d in autumn) = share whose first frost ≤ d */
    const springCurve = [], autumnCurve = [];
    for (let d = 1; d <= 365; d++) {
      springCurve.push(n ? years.filter(a => a.last != null && a.last >= d).length / n : null);
      autumnCurve.push(n ? years.filter(a => a.first != null && a.first <= d).length / n : null);
    }
    const dateAtRisk = (curve, p, spring) => {
      if (!n) return null;
      if (spring) { for (let d = 1; d <= pivotDoy; d++) if (curve[d - 1] <= p) return d; return pivotDoy; }
      for (let d = 365; d >= pivotDoy; d--) if (curve[d - 1] <= p) return d;
      return pivotDoy;
    };
    const probs = [0.5, 0.2, 0.1].map(p => ({ p, last: dateAtRisk(springCurve, p, true), first: dateAtRisk(autumnCurve, p, false) }));
    const lasts = years.map(a => a.last).filter(v => v != null), firsts = years.map(a => a.first).filter(v => v != null), frees = years.map(a => a.free);
    const monthFrost = Array.from({ length: 12 }, () => ({ days: 0, years: 0 }));
    const seen = new Set();
    rows.forEach(r => { if (r.tmin != null && r.tmin <= opt.threshold && byYear.get(r.y) && years.includes(byYear.get(r.y))) { monthFrost[r.m - 1].days++; const k = r.y + '-' + r.m; if (!seen.has(k)) { seen.add(k); monthFrost[r.m - 1].years++; } } });
    return {
      threshold: opt.threshold, pivotM, pivotDoy, years, n,
      anyFrost: years.some(a => a.frostDays > 0), frostSeasons: years.filter(a => a.frostDays > 0).length,
      lastMean: lasts.length ? Stat.mean(lasts) : null, lastSd: lasts.length > 1 ? Stat.sd(lasts) : null, lastLatest: lasts.length ? Math.max(...lasts) : null,
      firstMean: firsts.length ? Stat.mean(firsts) : null, firstSd: firsts.length > 1 ? Stat.sd(firsts) : null, firstEarliest: firsts.length ? Math.min(...firsts) : null,
      freeMean: frees.length ? Stat.mean(frees) : null, freeMin: frees.length ? Math.min(...frees) : null, freeP20: frees.length ? q(frees, 0.2) : null,
      frostDaysMean: n ? Stat.mean(years.map(a => a.frostDays)) : null, tnAbs: n ? Math.min(...years.map(a => a.tnAbs)) : null,
      springCurve, autumnCurve, probs, monthFrost: monthFrost.map(x => ({ days: n ? x.days / n : null, share: n ? x.years / n : null })),
    };
  }

  /* ---------------- 5 · indices and the monthly balance ---------------- */
  function indices(nm, lat, awc) {
    const T = nm.months.map(x => x.tmean), P = nm.months.map(x => x.P);
    if (T.some(v => v == null) || P.some(v => v == null)) return { ok: false };
    const PET = Agro.etoThornthwaite(T, lat, 2025);
    const PETann = Stat.sum(PET), Pann = Stat.sum(P), Tann = Stat.mean(T);
    const bal = Agro.balanceTM(P, PET, awc || 100);
    const Im = PETann > 0 ? 100 * (Pann - PETann) / PETann : null;   /* Thornthwaite 1955 */
    const ImClass = Im == null ? null : Im >= 100 ? 'A' : Im >= 80 ? 'B4' : Im >= 60 ? 'B3' : Im >= 40 ? 'B2' : Im >= 20 ? 'B1' : Im >= 0 ? 'C2' : Im >= -33.3 ? 'C1' : Im >= -66.7 ? 'D' : 'E';
    /* the growing period of the FAO agro-ecological zones: months with P > 0.5 PET (humid when P > PET) */
    const growing = P.map((p, i) => p > 0.5 * PET[i]), humid = P.map((p, i) => p > PET[i]);
    const thermal = T.map(t => t > 10);
    return {
      ok: true, PET, PETann, Pann, Tann, bal, unep: Agro.aridityUNEP(Pann, PETann), martonne: Agro.deMartonne(Pann, Tann), lang: Agro.lang(Pann, Tann), Im, ImClass,
      growing, growingMonths: growing.filter(Boolean).length, humidMonths: humid.filter(Boolean).length, thermalMonths: thermal.filter(Boolean).length,
      ptRatio: Tann > 0 ? Pann / Tann : null,
    };
  }

  /* ---------------- 6 · Köppen–Geiger (Peel, Finlayson & McMahon 2007) ---------------- */
  function koppen(nm, lat) {
    const T = nm.months.map(x => x.tmean), P = nm.months.map(x => x.P);
    if (T.some(v => v == null) || P.some(v => v == null)) return null;
    const MAT = Stat.mean(T), MAP = Stat.sum(P);
    const Thot = Math.max(...T), Tcold = Math.min(...T);
    const Tmon10 = T.filter(t => t > 10).length;
    const summer = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
    const winter = lat >= 0 ? [9, 10, 11, 0, 1, 2] : [3, 4, 5, 6, 7, 8];
    const Ps = summer.map(i => P[i]), Pw = winter.map(i => P[i]);
    const Psdry = Math.min(...Ps), Pswet = Math.max(...Ps), Pwdry = Math.min(...Pw), Pwwet = Math.max(...Pw), Pdry = Math.min(...P);
    const sumS = Stat.sum(Ps), sumW = Stat.sum(Pw);
    const Pth = sumW >= 0.7 * MAP ? 2 * MAT : sumS >= 0.7 * MAP ? 2 * MAT + 28 : 2 * MAT + 14;
    let code, desc;
    const season = () => (Psdry < 40 && Psdry < Pwwet / 3) ? 's' : (Pwdry < Pswet / 10) ? 'w' : 'f';
    const heat = () => Thot >= 22 ? 'a' : Tmon10 >= 4 ? 'b' : Tmon10 >= 1 ? 'c' : 'd';
    if (Thot < 10) { code = Thot > 0 ? 'ET' : 'EF'; }
    else if (MAP < 10 * Pth) { code = (MAP < 5 * Pth ? 'BW' : 'BS') + (MAT >= 18 ? 'h' : 'k'); }
    else if (Tcold >= 18) { code = Pdry >= 60 ? 'Af' : Pdry >= 100 - MAP / 25 ? 'Am' : 'Aw'; }
    else if (Tcold > 0) { code = 'C' + season() + heat(); }
    else { const h = Tcold < -38 ? 'd' : heat(); code = 'D' + season() + h; }
    const NAMES = {
      Af: ['ecuatorial, lluvioso todo el año', 'tropical rainforest'], Am: ['tropical monzónico', 'tropical monsoon'], Aw: ['tropical con invierno seco (sabana)', 'tropical savanna, dry winter'],
      BWh: ['desértico cálido', 'hot desert'], BWk: ['desértico frío', 'cold desert'], BSh: ['estepario cálido (semiárido)', 'hot semi-arid (steppe)'], BSk: ['estepario frío (semiárido)', 'cold semi-arid (steppe)'],
      Csa: ['mediterráneo de verano cálido', 'hot-summer Mediterranean'], Csb: ['mediterráneo de verano templado', 'warm-summer Mediterranean'], Csc: ['mediterráneo de verano frío', 'cold-summer Mediterranean'],
      Cwa: ['templado con invierno seco y verano cálido', 'dry-winter humid subtropical'], Cwb: ['templado con invierno seco y verano templado', 'dry-winter subtropical highland'], Cwc: ['templado con invierno seco y verano frío', 'dry-winter cold subtropical highland'],
      Cfa: ['templado húmedo de verano cálido', 'humid subtropical'], Cfb: ['templado oceánico', 'temperate oceanic'], Cfc: ['templado subpolar oceánico', 'subpolar oceanic'],
      ET: ['de tundra', 'tundra'], EF: ['de hielo perpetuo', 'ice cap'],
    };
    if (!desc) desc = NAMES[code] || (code[0] === 'D' ? ['continental (' + code + ')', 'continental (' + code + ')'] : [code, code]);
    return { code, desc, MAT, MAP, Thot, Tcold, Tmon10, Pdry, Psdry, Pswet, Pwdry, Pwwet, Pth, summerShare: sumS / MAP };
  }

  /* García's (2004) humidity subtypes for the A and C groups, from the annual P/T quotient:
     the thresholds 43.2 and 55.3 separate w0 (the driest of the subhumid), w1 and w2. */
  function garciaHumidity(ptRatio, koppenCode) {
    if (ptRatio == null || !koppenCode) return null;
    const g = koppenCode[0];
    if (g === 'B') return { sub: ptRatio < 22.9 ? 'BS0 / BW' : 'BS1', note: ['la separación fina entre BW, BS0 y BS1 requiere la clave completa de García', 'the fine split between BW, BS0 and BS1 requires García\'s full key'] };
    if (g === 'A' || g === 'C') return { sub: ptRatio < 43.2 ? 'w0' : ptRatio <= 55.3 ? 'w1' : 'w2', note: ['subtipo de humedad por el cociente P/T; el régimen (w, f, m, x\') y el subtipo térmico requieren la clave completa', 'humidity subtype by the P/T quotient; the regime (w, f, m, x\') and the thermal subtype require the full key'] };
    return null;
  }

  Object.assign(Clim3, { normals, climograph, pci, pciClass, summerShare, rainSeasons, rainRegime, frost, indices, koppen, garciaHumidity });
  if (typeof window !== 'undefined') window.Clim3 = Clim3;
})();
