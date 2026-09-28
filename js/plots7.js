/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 7 figures: the calendar of one season, the years, the
   strategies compared and the gross depth by month. */

const Plots7 = {};

(function () {
  const { frame, bars, line, hline, vspan, legend, empty } = Plot;
  const MX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const STAGE = { ini: ['inicial', 'initial'], dev: ['desarrollo', 'development'], mid: ['media', 'mid'], late: ['final', 'late'] };

  /* 1 · the calendar of one season: gross irrigations and rain, day by day, with the depletion behind */
  function calendar(svgId, r, L) {
    const svg = el(svgId); if (!svg) return;
    if (!r) { empty(svg, 700, 200, T('Sin temporada', 'No season')); return; }
    const rows = r.bal.rows, n = rows.length, J0 = doy(r.start.y, r.start.m, r.start.d);
    const xs = rows.map((_, k) => J0 + k);
    const ymax = Math.max(10, ...rows.map(x => Math.max(x.P, x.Igross))) * 1.15;
    const f = frame(svg, { W: 700, H: 280, m: { l: 44, r: 44, t: 26, b: 36 }, x: [J0 - 0.5, J0 + n - 0.5], y: [0, ymax], xt: Plot.monthTicks(J0, J0 + n), xlabFmt: Plot.doyLabel, ylab: 'mm', y2: [Math.max(...rows.map(x => x.taw)) * 1.1, 0], y2lab: T('agotamiento (mm)', 'depletion (mm)'), ny: 5 });
    const b = [0, L.ini, L.ini + L.dev, L.ini + L.dev + L.mid, n];
    ['ini', 'dev', 'mid', 'late'].forEach((id, s) => vspan(f, J0 + b[s] - 0.5, J0 + b[s + 1] - 0.5, s % 2 ? 'var(--leaf)' : 'var(--sky)', 0.06, T(STAGE[id][0], STAGE[id][1])));
    line(f, xs.map((x, i) => [f.sx(x), f.sy2(rows[i].dr)]), 'var(--c8)', { width: 1.6, opacity: 0.8 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy2(rows[i].raw)]), 'var(--c2)', { width: 1, dash: '4 3', opacity: 0.8 });
    const w = Math.max(1.2, (f.sx(J0 + 1) - f.sx(J0)) * 0.8);
    bars(f, xs, rows.map(x => x.P), 'var(--c4)', { opacity: 0.55, width: w });
    bars(f, xs, rows.map(x => x.Igross), 'var(--c1)', { opacity: 0.95, width: w });
    rows.forEach((x, i) => { if (x.Igross > 0) f.top.appendChild(svgEl('text', { x: f.sx(xs[i]), y: f.sy(x.Igross) - 3, 'font-size': 7.5, 'text-anchor': 'middle', class: 'art-txt', fill: 'var(--c1)', 'font-weight': 600 }, fmtNum(x.Igross, 0))); });
    legend(f, [[T('riego bruto', 'gross irrigation'), 'var(--c1)', 'sq'], [T('lluvia', 'rain'), 'var(--c4)', 'sq'], [T('agotamiento (eje derecho)', 'depletion (right axis)'), 'var(--c8)', 'ln'], [T('AFA', 'RAW'), 'var(--c2)', 'dash']], 12, f.m.l + 2);
  }

  /* 2 · the years: gross depth and relative yield */
  function years(svgId, yrs) {
    const svg = el(svgId); if (!svg) return;
    if (!yrs.length) { empty(svg, 700, 160, T('Sin temporadas', 'No seasons')); return; }
    const xs = yrs.map(r => r.y), g = yrs.map(r => r.totals.Igross);
    const f = frame(svg, { W: 700, H: 240, m: { l: 52, r: 44, t: 26, b: 34 }, x: [xs[0] - 0.6, xs[xs.length - 1] + 0.6], y: [0, Math.max(10, ...g) * 1.15], xt: xs.length > 14 ? xs.filter((_, i) => i % Math.ceil(xs.length / 14) === 0) : xs, xlabFmt: v => String(v), ylab: T('riego bruto (mm)', 'gross irrigation (mm)'), y2: [0, 1.05], y2labFmt: Plot.pctTick, y2lab: T('rendimiento relativo', 'relative yield'), ny: 5 });
    bars(f, xs, g, 'var(--c1)', { opacity: 0.8, width: (f.sx(xs[0] + 1) - f.sx(xs[0])) * 0.62 });
    yrs.forEach(r => f.top.appendChild(svgEl('text', { x: f.sx(r.y), y: f.sy(r.totals.Igross) - 4, 'font-size': 8, 'text-anchor': 'middle', class: 'art-mut' }, String(r.totals.events))));
    line(f, xs.map((x, i) => [f.sx(x), f.sy2(yrs[i].relYield)]), 'var(--c3)', { width: 2 });
    Plot.dots(f, xs.map((x, i) => [x, yrs[i].relYield]), 'var(--c3)', 2.6);
    legend(f, [[T('riego bruto (el número es la cuenta de riegos)', 'gross irrigation (the number is the count)'), 'var(--c1)', 'sq'], [T('rendimiento relativo', 'relative yield'), 'var(--c3)', 'ln']], 12, f.m.l + 2);
    /* the dots of the yield use the right axis */
    f.plot.querySelectorAll('circle').forEach((c, i) => c.setAttribute('cy', f.sy2(yrs[i].relYield)));
  }

  /* 3 · the strategies: gross depth against relative yield */
  function strategies(svgId, st) {
    const svg = el(svgId); if (!svg) return;
    const ok = st.filter(s => s.all.summary);
    if (!ok.length) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const gmax = Math.max(10, ...ok.map(s => s.gross.p80));
    const f = frame(svg, { W: 700, H: 260, m: { l: 52, r: 44, t: 26, b: 48 }, x: [0.5, ok.length + 0.5], y: [0, gmax * 1.15], xt: ok.map((_, i) => i + 1), xlabFmt: i => T(ok[i - 1].es, ok[i - 1].en).replace(/ \(.*\)$/, '').slice(0, 26), ylab: T('riego bruto (mm, mediana y P20–P80)', 'gross irrigation (mm, median and P20–P80)'), y2: [0, 1.05], y2labFmt: Plot.pctTick, y2lab: T('rendimiento relativo', 'relative yield'), ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.4;
    ok.forEach((s, i) => {
      const x = f.sx(i + 1);
      f.plot.appendChild(svgEl('rect', { x: x - w / 2, y: f.sy(s.gross.median), width: w, height: f.sy(0) - f.sy(s.gross.median), fill: 'var(--c1)', opacity: 0.8 }));
      f.plot.appendChild(svgEl('line', { x1: x, x2: x, y1: f.sy(s.gross.p20), y2: f.sy(s.gross.p80), stroke: 'var(--text)', 'stroke-width': 1.2 }));
      f.plot.appendChild(svgEl('circle', { cx: x + w * 0.7, cy: f.sy2(s.relYield.median), r: 5, fill: 'var(--c3)', stroke: 'var(--card-bg)', 'stroke-width': 1.2 }));
      f.plot.appendChild(svgEl('line', { x1: x + w * 0.7, x2: x + w * 0.7, y1: f.sy2(s.relYield.p20), y2: f.sy2(s.relYield.p80), stroke: 'var(--c3)', 'stroke-width': 1.4 }));
    });
    legend(f, [[T('riego bruto', 'gross irrigation'), 'var(--c1)', 'sq'], [T('rendimiento relativo (mediana y P20–P80)', 'relative yield (median and P20–P80)'), 'var(--c3)', 'sq']], 12, f.m.l + 2);
  }

  /* 4 · gross depth by month */
  function monthly(svgId, mg) {
    const svg = el(svgId); if (!svg) return;
    if (mg.every(x => !x.median && !x.p80)) { empty(svg, 700, 140, T('Sin riegos', 'No irrigation')); return; }
    const f = frame(svg, { W: 700, H: 220, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 12.5], y: [0, Math.max(10, ...mg.map(x => x.p80 || 0)) * 1.15], xt: MX, xlabFmt: m => monthName(m, true), ylab: T('riego bruto (mm/mes)', 'gross irrigation (mm/month)'), ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.3;
    mg.forEach((x, i) => {
      const m = i + 1;
      if (x.median != null) f.plot.appendChild(svgEl('rect', { x: f.sx(m) - w, y: f.sy(x.median), width: w - 1, height: f.sy(0) - f.sy(x.median), fill: 'var(--c1)', opacity: 0.85 }));
      if (x.p80 != null) f.plot.appendChild(svgEl('rect', { x: f.sx(m), y: f.sy(x.p80), width: w - 1, height: f.sy(0) - f.sy(x.p80), fill: 'var(--c5)', opacity: 0.6 }));
    });
    legend(f, [[T('año mediano', 'median year'), 'var(--c1)', 'sq'], [T('año seco (P80)', 'dry year (P80)'), 'var(--c5)', 'sq']], 12, f.m.l + 2);
  }

  Object.assign(Plots7, { calendar, years, strategies, monthly });
  if (typeof window !== 'undefined') window.Plots7 = Plots7;
})();
