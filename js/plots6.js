/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 6 figures: one season's demand and depletion, the years
   compared, the yield by year and by sowing date, the balance by stage and the
   climatic need by month. */

const Plots6 = {};

(function () {
  const { frame, line, band, bars, hline, vline, vspan, legend, empty } = Plot;
  const MX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const STAGE = { ini: ['inicial', 'initial'], dev: ['desarrollo', 'development'], mid: ['media', 'mid'], late: ['final', 'late'] };

  /* 1 · the demand of one season: ETo, ETc, actual ETc and the rain */
  function demand(svgId, r, L) {
    const svg = el(svgId); if (!svg) return;
    if (!r) { empty(svg, 460, 240, T('Sin temporada', 'No season')); return; }
    const rows = r.bal.rows, n = rows.length, J0 = doy(r.start.y, r.start.m, r.start.d);
    const xs = rows.map((_, k) => J0 + k);
    const ymax = Math.max(2, ...rows.map(x => Math.max(x.eto, x.etc))) * 1.15, pmax = Math.max(10, ...rows.map(x => x.P)) * 1.1;
    const f = frame(svg, { W: 460, H: 280, m: { l: 44, r: 40, t: 26, b: 34 }, x: [J0, J0 + n - 1], y: [0, ymax], xt: Plot.monthTicks(J0, J0 + n), xlabFmt: Plot.doyLabel, ylab: 'mm/día', y2: [0, pmax], y2lab: T('lluvia (mm)', 'rain (mm)'), ny: 5 });
    const b = [0, L.ini, L.ini + L.dev, L.ini + L.dev + L.mid, n];
    ['ini', 'dev', 'mid', 'late'].forEach((id, s) => vspan(f, J0 + b[s], J0 + b[s + 1], s % 2 ? 'var(--leaf)' : 'var(--sky)', 0.06, T(STAGE[id][0], STAGE[id][1])));
    bars(f, xs, rows.map(x => x.P), 'var(--c4)', { sy: f.sy2, opacity: 0.45 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(rows[i].eto)]), 'var(--c2)', { width: 1.2, opacity: 0.9 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(rows[i].etc)]), 'var(--c3)', { width: 2 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(rows[i].etcAdj)]), 'var(--c5)', { width: 1.4, dash: '4 3' });
    rows.forEach((x, i) => { if (x.I > 0) f.plot.appendChild(svgEl('circle', { cx: f.sx(xs[i]), cy: f.m.t + 4, r: 3, fill: 'var(--c4)' })); });
    legend(f, [['ETo', 'var(--c2)', 'ln'], ['ETc', 'var(--c3)', 'ln'], [T('ETc real (Ks)', 'actual ETc (Ks)'), 'var(--c5)', 'dash'], [T('lluvia', 'rain'), 'var(--c4)', 'sq']], 12, f.m.l + 2);
  }

  /* 2 · the depletion of the root zone of one season */
  function depletion(svgId, r) {
    const svg = el(svgId); if (!svg) return;
    if (!r) { empty(svg, 460, 240, T('Sin temporada', 'No season')); return; }
    const rows = r.bal.rows, n = rows.length, J0 = doy(r.start.y, r.start.m, r.start.d);
    const xs = rows.map((_, k) => J0 + k);
    const taw = rows.map(x => x.taw), raw = rows.map(x => x.raw), dr = rows.map(x => x.dr);
    const f = frame(svg, { W: 460, H: 280, m: { l: 44, r: 14, t: 26, b: 34 }, x: [J0, J0 + n - 1], y: [Math.max(...taw) * 1.1, 0], xt: Plot.monthTicks(J0, J0 + n), xlabFmt: Plot.doyLabel, ylab: T('agotamiento Dr (mm)', 'depletion Dr (mm)'), ny: 5 });
    band(f, xs, raw, taw, 'var(--c5)', 0.12);
    line(f, xs.map((x, i) => [f.sx(x), f.sy(taw[i])]), 'var(--c5)', { width: 1.4, dash: '5 3' });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(raw[i])]), 'var(--c2)', { width: 1.4, dash: '5 3' });
    const pts = xs.map((x, i) => [f.sx(x), f.sy(dr[i])]);
    f.plot.appendChild(svgEl('path', { d: Plot.pathOf([[f.sx(xs[0]), f.sy(0)]].concat(pts, [[f.sx(xs[n - 1]), f.sy(0)]])) + 'Z', fill: 'var(--c8)', opacity: 0.18 }));
    line(f, pts, 'var(--c8)', { width: 2 });
    rows.forEach((x, i) => { if (x.I > 0) { f.plot.appendChild(svgEl('line', { x1: f.sx(xs[i]), x2: f.sx(xs[i]), y1: f.m.t, y2: f.sy(x.drStart), stroke: 'var(--c4)', 'stroke-width': 1.6 })); } });
    f.top.appendChild(svgEl('text', { x: f.W - f.m.r - 4, y: f.sy(raw[Math.floor(n / 2)]) - 4, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c2)', 'font-weight': 600 }, T('AFA', 'RAW')));
    f.top.appendChild(svgEl('text', { x: f.W - f.m.r - 4, y: f.sy(taw[n - 1]) - 4, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c5)', 'font-weight': 600 }, T('ADT', 'TAW')));
    legend(f, [[T('agotamiento', 'depletion'), 'var(--c8)', 'ln'], [T('zona de estrés', 'stress zone'), 'var(--c5)', 'sq'], [T('riego', 'irrigation'), 'var(--c4)', 'sq']], 12, f.m.l + 2);
  }

  /* 3 · the years compared: ETc, effective rain and the deficit */
  function years(svgId, yrs) {
    const svg = el(svgId); if (!svg) return;
    if (!yrs.length) { empty(svg, 700, 160, T('Sin temporadas', 'No seasons')); return; }
    const xs = yrs.map(r => r.y);
    const ymax = Math.max(...yrs.map(r => Math.max(r.totals.etc, r.totals.Pe))) * 1.15;
    const f = frame(svg, { W: 700, H: 260, m: { l: 52, r: 16, t: 26, b: 34 }, x: [xs[0] - 0.6, xs[xs.length - 1] + 0.6], y: [0, ymax], xt: xs.length > 14 ? xs.filter((_, i) => i % Math.ceil(xs.length / 14) === 0) : xs, xlabFmt: v => String(v), ylab: T('mm en la temporada', 'mm in the season'), ny: 5 });
    const w = (f.sx(xs[0] + 1) - f.sx(xs[0])) * 0.28;
    yrs.forEach(r => {
      f.plot.appendChild(svgEl('rect', { x: f.sx(r.y) - w, y: f.sy(r.totals.etc), width: w - 1, height: f.sy(0) - f.sy(r.totals.etc), fill: 'var(--c3)', opacity: 0.85 }));
      f.plot.appendChild(svgEl('rect', { x: f.sx(r.y) - w, y: f.sy(r.totals.etc), width: w - 1, height: f.sy(r.totals.etcAdj) - f.sy(r.totals.etc), fill: 'var(--c5)', opacity: 0.8 }));
      f.plot.appendChild(svgEl('rect', { x: f.sx(r.y), y: f.sy(r.totals.Pe), width: w - 1, height: f.sy(0) - f.sy(r.totals.Pe), fill: 'var(--c4)', opacity: 0.8 }));
      if (r.totals.I > 0) f.plot.appendChild(svgEl('rect', { x: f.sx(r.y), y: f.sy(r.totals.Pe + r.totals.I), width: w - 1, height: f.sy(r.totals.Pe) - f.sy(r.totals.Pe + r.totals.I), fill: 'var(--c1)', opacity: 0.8 }));
    });
    legend(f, [['ETc', 'var(--c3)', 'sq'], [T('déficit (no transpirado)', 'deficit (not transpired)'), 'var(--c5)', 'sq'], [T('lluvia efectiva', 'effective rain'), 'var(--c4)', 'sq'], [T('riego', 'irrigation'), 'var(--c1)', 'sq']], 12, f.m.l + 2);
  }

  /* 4 · the relative yield of every year */
  function yieldYears(svgId, yrs) {
    const svg = el(svgId); if (!svg) return;
    if (!yrs.length) { empty(svg, 700, 160, T('Sin temporadas', 'No seasons')); return; }
    const xs = yrs.map(r => r.y), v = yrs.map(r => r.relYield);
    const f = frame(svg, { W: 700, H: 220, m: { l: 52, r: 16, t: 26, b: 34 }, x: [xs[0] - 0.6, xs[xs.length - 1] + 0.6], y: [0, 1.05], xt: xs.length > 14 ? xs.filter((_, i) => i % Math.ceil(xs.length / 14) === 0) : xs, xlabFmt: x => String(x), ylabFmt: Plot.pctTick, ylab: T('rendimiento relativo', 'relative yield'), ny: 5 });
    bars(f, xs, v, x => (x >= 0.9 ? 'var(--c3)' : x >= 0.75 ? 'var(--c2)' : x >= 0.5 ? 'var(--warning)' : 'var(--c5)'), { opacity: 0.85, width: (f.sx(xs[0] + 1) - f.sx(xs[0])) * 0.7 });
    hline(f, Stat.median(v), 'var(--text)', { dash: '4 3', width: 1, label: T(`mediana ${fmtPct(Stat.median(v), 0)}`, `median ${fmtPct(Stat.median(v), 0)}`) });
    hline(f, 0.9, 'var(--c3)', { dash: '2 2', width: 0.8, opacity: 0.6 });
  }

  /* 5 · the balance by stage, median across years */
  function stages(svgId, sum) {
    const svg = el(svgId); if (!svg || !sum) return;
    const ids = ['ini', 'dev', 'mid', 'late'];
    const ymax = Math.max(...sum.stages.map(s => Math.max(s.etc.median, s.pe.median))) * 1.2;
    const f = frame(svg, { W: 460, H: 240, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 4.5], y: [0, ymax], xt: [1, 2, 3, 4], xlabFmt: i => T(STAGE[ids[i - 1]][0], STAGE[ids[i - 1]][1]), ylab: T('mm por etapa (mediana)', 'mm per stage (median)'), ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.3;
    sum.stages.forEach((s, i) => {
      const x = f.sx(i + 1);
      f.plot.appendChild(svgEl('rect', { x: x - w, y: f.sy(s.etc.median), width: w - 1, height: f.sy(0) - f.sy(s.etc.median), fill: 'var(--c3)', opacity: 0.85 }));
      f.plot.appendChild(svgEl('rect', { x: x - w, y: f.sy(s.etc.median), width: w - 1, height: f.sy(s.etcAdj.median) - f.sy(s.etc.median), fill: 'var(--c5)', opacity: 0.8 }));
      f.plot.appendChild(svgEl('rect', { x, y: f.sy(s.pe.median), width: w - 1, height: f.sy(0) - f.sy(s.pe.median), fill: 'var(--c4)', opacity: 0.8 }));
      f.top.appendChild(svgEl('text', { x: x, y: f.m.t + 12, 'font-size': 9, 'text-anchor': 'middle', class: 'art-txt', fill: s.ks.median >= 0.99 ? 'var(--success)' : s.ks.median >= 0.8 ? 'var(--warning)' : 'var(--danger)', 'font-weight': 700 }, `Ks ${fmtFixed(s.ks.median, 2)}`));
    });
    legend(f, [['ETc', 'var(--c3)', 'sq'], [T('déficit', 'deficit'), 'var(--c5)', 'sq'], [T('lluvia efectiva', 'effective rain'), 'var(--c4)', 'sq']], f.H - 8, f.m.l + 2);
  }

  /* 6 · the relative yield by sowing date */
  function sowing(svgId, bs) {
    const svg = el(svgId); if (!svg) return;
    const rows = bs.rows.filter(r => r.relYield);
    if (!rows.length) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const f = frame(svg, { W: 700, H: 280, m: { l: 52, r: 16, t: 28, b: 36 }, x: [1, 365], y: [0, 1.05], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, xlab: T('fecha de siembra', 'sowing date'), ylabFmt: Plot.pctTick, ylab: T('rendimiento relativo (temporal)', 'relative yield (rain-fed)'), ny: 5 });
    const xs = rows.map(r => r.J);
    band(f, xs, rows.map(r => r.relYield.p20), rows.map(r => r.relYield.p80), 'var(--c3)', 0.18);
    line(f, rows.map(r => [f.sx(r.J), f.sy(r.relYield.median)]), 'var(--c3)', { width: 2.4 });
    line(f, rows.map(r => [f.sx(r.J), f.sy(r.relYield.p20)]), 'var(--c5)', { width: 1.2, dash: '4 3' });
    hline(f, 0.9, 'var(--text-muted)', { dash: '2 2', width: 0.8 });
    if (bs.best) vline(f, bs.best.J, 'var(--c2)', { dash: '3 3', label: T(`mejor: ${fmtDoy(bs.best.J)}`, `best: ${fmtDoy(bs.best.J)}`) });
    legend(f, [[T('mediana', 'median'), 'var(--c3)', 'ln'], [T('P20 (4 de 5 años lo superan)', 'P20 (4 of 5 years exceed it)'), 'var(--c5)', 'dash'], [T('P20–P80', 'P20–P80'), 'var(--c3)', 'sq']], 12, f.m.l + 2);
  }

  /* 7 · the climatic need by month: rain, effective rain, ETo and the need */
  function need(svgId, mn) {
    const svg = el(svgId); if (!svg) return;
    if (mn.every(x => x.P == null)) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const ymax = Math.max(...mn.map(x => Math.max(x.P || 0, x.eto || 0))) * 1.15;
    const f = frame(svg, { W: 700, H: 260, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 12.5], y: [0, ymax], xt: MX, xlabFmt: m => monthName(m, true), ylab: 'mm/mes', ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.3;
    mn.forEach((x, i) => {
      if (x.P == null) return;
      const m = i + 1;
      f.plot.appendChild(svgEl('rect', { x: f.sx(m) - w, y: f.sy(x.P), width: w - 1, height: f.sy(0) - f.sy(x.P), fill: 'var(--c4)', opacity: 0.35 }));
      f.plot.appendChild(svgEl('rect', { x: f.sx(m) - w, y: f.sy(x.peUSDA), width: w - 1, height: f.sy(0) - f.sy(x.peUSDA), fill: 'var(--c4)', opacity: 0.85 }));
      f.plot.appendChild(svgEl('rect', { x: f.sx(m), y: f.sy(x.eto), width: w - 1, height: f.sy(0) - f.sy(x.eto), fill: 'var(--c2)', opacity: 0.8 }));
      if (x.need > 0) f.plot.appendChild(svgEl('rect', { x: f.sx(m), y: f.sy(x.eto), width: w - 1, height: f.sy(x.eto - x.need) - f.sy(x.eto), fill: 'var(--c5)', opacity: 0.8 }));
    });
    legend(f, [[T('lluvia (clara) y efectiva', 'rain (light) and effective'), 'var(--c4)', 'sq'], ['ETo', 'var(--c2)', 'sq'], [T('necesidad climática (ETo − lluvia efectiva)', 'climatic need (ETo − effective rain)'), 'var(--c5)', 'sq']], 12, f.m.l + 2);
  }

  Object.assign(Plots6, { demand, depletion, years, yieldYears, stages, sowing, need });
  if (typeof window !== 'undefined') window.Plots6 = Plots6;
})();
