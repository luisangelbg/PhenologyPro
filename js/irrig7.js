/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 7: irrigation scheduling.

   The balance of Block 6, run again with an irrigation rule, in every year of
   the record. Pure functions:
     SYSTEMS                          the usual systems and their application efficiency
     runAll(rows, eto, params, rule)  Water6.runAll with the rule attached
     calendar(season, params, q)      the events of one season as a calendar
     strategies(rows, eto, params)    the four rules side by side, plus rain-fed
     monthlyGross(all)                the gross depth by calendar month, across years
     design(all, params, eff)         the peak demand and the seasonal depth to design for
     savings(rows, eto, params, cust) what the customary practice costs against the balance rule */

const Irrig7 = {};

(function () {

  const q = (a, p) => Stat.quantile(a, p);

  const SYSTEMS = [
    { id: 'furrow', es: 'Gravedad (surcos, melgas)', en: 'Surface (furrows, borders)', eff: 0.6 },
    { id: 'sprinkler', es: 'Aspersión', en: 'Sprinkler', eff: 0.75 },
    { id: 'pivot', es: 'Pivote central', en: 'Centre pivot', eff: 0.85 },
    { id: 'micro', es: 'Microaspersión', en: 'Micro-sprinkler', eff: 0.85 },
    { id: 'drip', es: 'Goteo', en: 'Drip', eff: 0.9 },
  ];
  const STAGE_ID = ['ini', 'dev', 'mid', 'late'];

  function runAll(rows, eto, params, rule) {
    return Water6.runAll(rows, eto, Object.assign({}, params, { irrigation: rule }));
  }

  /* the events of one season; q = system capacity in mm/day (optional) for the hours of each application */
  function calendar(season, params, capacity) {
    if (!season) return [];
    const L = params.L, b = [L.ini, L.ini + L.dev, L.ini + L.dev + L.mid, L.ini + L.dev + L.mid + L.late];
    const ev = Agro.irrigationEvents(season.bal);
    return ev.map(e => ({
      day: e.day, date: addDays(season.start, e.day - 1), stage: STAGE_ID[b.findIndex(x => e.day <= x)] || 'late',
      drBefore: e.drBefore, raw: e.raw, taw: e.taw, net: e.net, gross: e.gross, interval: e.interval,
      hours: capacity > 0 ? e.gross / capacity * 24 : null,
    }));
  }

  /* the strategies, each with its rule; `eff` and `depth`, `interval`, `deficit` come from the page */
  function strategyList(o) {
    const eff = o.eff || 0.75;
    return [
      { id: 'none', es: 'Temporal (sin riego)', en: 'Rain-fed (no irrigation)', rule: { mode: 'none' } },
      { id: 'raw', es: 'Al agotar el AFA, rellenando', en: 'At RAW depletion, refilling', rule: { mode: 'auto', trigger: 1, depth: null, efficiency: eff, stopBefore: o.stopBefore || 0, minInterval: o.minInterval || 1 } },
      { id: 'deficit', es: `Déficit controlado (${Math.round((o.deficit || 1.3) * 100)} % del AFA)`, en: `Controlled deficit (${Math.round((o.deficit || 1.3) * 100)} % of RAW)`, rule: { mode: 'auto', trigger: o.deficit || 1.3, depth: null, efficiency: eff, stopBefore: o.stopBefore || 0, minInterval: o.minInterval || 1 } },
      { id: 'interval', es: `Cada ${o.interval || 7} días, rellenando`, en: `Every ${o.interval || 7} days, refilling`, rule: { mode: 'interval', interval: o.interval || 7, depth: null, efficiency: eff, stopBefore: o.stopBefore || 0 } },
      { id: 'depth', es: `Lámina fija de ${o.depth || 30} mm`, en: `Fixed depth of ${o.depth || 30} mm`, rule: { mode: 'depth', depth: o.depth || 30, efficiency: eff, stopBefore: o.stopBefore || 0, minInterval: o.minInterval || 1 } },
    ];
  }
  function strategies(rows, eto, params, o) {
    return strategyList(o).map(s => {
      const all = runAll(rows, eto, params, s.rule);
      const sm = all.summary;
      return Object.assign({}, s, { all, events: sm ? sm.events : null, I: sm ? sm.I : null, gross: sm ? statOf(all.years.map(r => r.totals.Igross)) : null, relYield: sm ? sm.relYield : null, dp: sm ? sm.dp : null, deficit: sm ? sm.deficit : null,
        productivity: sm && sm.I.median > 0 ? sm.relYield.median / (sm.I.median / (params.taw || 1)) : null });
    });
  }
  function statOf(a) { return a.length ? { median: q(a, 0.5), p20: q(a, 0.2), p80: q(a, 0.8), mean: Stat.mean(a), max: Math.max(...a), min: Math.min(...a) } : null; }

  /* gross irrigation by calendar month, median and P80 across the years */
  function monthlyGross(all) {
    const by = Array.from({ length: 12 }, () => []);
    all.years.forEach(r => {
      const m = new Array(12).fill(0);
      r.bal.rows.forEach((x, k) => { if (x.Igross > 0) { const d = addDays(r.start, k); m[d.m - 1] += x.Igross; } });
      m.forEach((v, i) => by[i].push(v));
    });
    return by.map((v, i) => ({ m: i + 1, median: v.length ? q(v, 0.5) : null, p80: v.length ? q(v, 0.8) : null, max: v.length ? Math.max(...v) : null, share: v.length ? v.filter(x => x > 0).length / v.length : null }));
  }

  /* what the system must be able to deliver: the peak daily ETc (P90 of the mid-season days across years)
     divided by the efficiency, and the seasonal gross depth to plan for (P80 across years) */
  function design(all, params, eff) {
    const L = params.L, a = L.ini + L.dev, b = a + L.mid;
    const mid = [], peakByYear = [];
    all.years.forEach(r => { const v = r.bal.rows.slice(a, b).map(x => x.etc); mid.push(...v); if (v.length) peakByYear.push(Math.max(...v)); });
    const etcP90 = mid.length ? q(mid, 0.9) : null, etcMax = mid.length ? Math.max(...mid) : null;
    const grossSeason = all.years.map(r => r.totals.Igross);
    const events = all.years.map(r => r.totals.events);
    const maxNet = all.years.length ? Math.max(...all.years.map(r => Math.max(0, ...r.bal.rows.map(x => x.I)))) : null;
    return {
      etcP90, etcMax, peakMedian: peakByYear.length ? q(peakByYear, 0.5) : null,
      capacity: etcP90 != null && eff > 0 ? etcP90 / eff : null,   /* mm/day the system must apply at the peak */
      grossSeason: statOf(grossSeason), events: statOf(events), maxNet,
      m3haSeason: grossSeason.length ? q(grossSeason, 0.8) * 10 : null,   /* 1 mm = 10 m³/ha */
    };
  }

  /* the customary practice (every `interval` days, `depth` mm gross) against the balance rule */
  function savings(rows, eto, params, cust, ruleAll) {
    const eff = cust.eff || 0.75;
    const custAll = runAll(rows, eto, params, { mode: 'interval', interval: cust.interval || 10, depth: (cust.depth || 40) * eff, efficiency: eff, stopBefore: cust.stopBefore || 0 });
    const a = custAll.summary, b = ruleAll.summary;
    if (!a || !b) return null;
    const ga = statOf(custAll.years.map(r => r.totals.Igross)), gb = statOf(ruleAll.years.map(r => r.totals.Igross));
    return { cust: custAll, custGross: ga, ruleGross: gb, savedMm: ga.median - gb.median, savedPct: ga.median > 0 ? (ga.median - gb.median) / ga.median : null, custYield: a.relYield, ruleYield: b.relYield, custDP: a.dp, ruleDP: b.dp, custEvents: a.events, ruleEvents: b.events };
  }

  Object.assign(Irrig7, { SYSTEMS, STAGE_ID, runAll, calendar, strategyList, strategies, monthlyGross, design, savings, statOf });
  if (typeof window !== 'undefined') window.Irrig7 = Irrig7;
})();
