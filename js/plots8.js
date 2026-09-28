/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 8 figures: the phenological calendar, the stage dates
   of every year, the calibration, the chill of every winter and the photoperiod. */

const Plots8 = {};

(function () {
  const { frame, line, band, bars, hline, vline, legend, empty, dots } = Plot;

  /* 1 · the phenological calendar: one bar per stage from the median date of the previous one to its own,
     with the P20–P80 whisker of its date */
  function calendar(svgId, res, sowJ) {
    const svg = el(svgId); if (!svg) return;
    const st = res.summary.filter(s => s.median != null);
    if (!st.length) { empty(svg, 700, 160, T('Ninguna etapa se alcanza', 'No stage is reached')); return; }
    const rowH = 26, m = { l: 150, r: 20, t: 30, b: 34 }, W = 700, H = m.t + m.b + rowH * st.length;
    const xmax = sowJ + Math.max(...st.map(s => s.p80 == null ? s.median : s.p80)) + 15;
    const f = frame(svg, { W, H, m, x: [sowJ - 5, xmax], y: [0, 1], xt: Plot.monthTicks(sowJ - 5, xmax), xlabFmt: Plot.monthTickLabel, yt: [], grid: false });
    vline(f, sowJ, 'var(--leaf)', { label: T('siembra', 'sowing'), dash: '2 2' });
    let prev = 0;
    st.forEach((s, i) => {
      const y = m.t + i * rowH;
      f.g.appendChild(svgEl('text', { x: m.l - 8, y: y + rowH / 2 + 3, 'font-size': 9.5, 'text-anchor': 'end', class: 'art-txt' }, `${s.code} · ${T(s.es, s.en)}`));
      f.plot.appendChild(svgEl('rect', { x: f.sx(sowJ + prev), y: y + 5, width: Math.max(1, f.sx(sowJ + s.median) - f.sx(sowJ + prev)), height: rowH - 10, rx: 3, fill: `var(--c${(i % 5) + 1})`, opacity: 0.55 }));
      f.plot.appendChild(svgEl('line', { x1: f.sx(sowJ + s.p20), x2: f.sx(sowJ + s.p80), y1: y + rowH / 2, y2: y + rowH / 2, stroke: 'var(--text)', 'stroke-width': 1.6 }));
      f.plot.appendChild(svgEl('circle', { cx: f.sx(sowJ + s.median), cy: y + rowH / 2, r: 3.4, fill: 'var(--text)' }));
      f.top.appendChild(svgEl('text', { x: f.sx(sowJ + s.p80) + 6, y: y + rowH / 2 + 3, 'font-size': 8.5, class: 'art-mut' }, `${fmtDoy(sowJ + s.median)} · ${Math.round(s.median)} d${s.pReached < 1 ? ` · ${fmtPct(s.pReached, 0)}` : ''}`));
      prev = s.median;
    });
    legend(f, [[T('de la etapa anterior a la mediana de esta', 'from the previous stage to this one\'s median'), 'var(--c1)', 'sq'], [T('P20–P80 de la fecha entre años', 'P20–P80 of the date between years'), 'var(--text)', 'ln']], 12, f.m.l + 2);
  }

  /* 2 · the dates of every stage in every year, as dots along the year */
  function years(svgId, res, sowJ) {
    const svg = el(svgId); if (!svg) return;
    const yrs = res.years;
    if (!yrs.length) { empty(svg, 700, 120, T('Sin años', 'No years')); return; }
    const rowH = yrs.length > 25 ? 9 : yrs.length > 12 ? 12 : 16, m = { l: 48, r: 16, t: 28, b: 30 }, W = 700, H = m.t + m.b + rowH * yrs.length;
    const xmax = sowJ + Math.max(...yrs.map(r => Math.max(0, ...r.stages.map(s => s.das || 0)))) + 15;
    const f = frame(svg, { W, H, m, x: [sowJ - 5, xmax], y: [0, 1], xt: Plot.monthTicks(sowJ - 5, xmax), xlabFmt: Plot.monthTickLabel, yt: [], grid: false });
    yrs.forEach((r, i) => {
      const y = m.t + i * rowH + rowH / 2;
      f.g.appendChild(svgEl('text', { x: m.l - 6, y: y + 3, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt' }, String(r.y)));
      const reached = r.stages.filter(s => s.das != null);
      if (reached.length) f.plot.appendChild(svgEl('line', { x1: f.sx(sowJ), x2: f.sx(sowJ + reached[reached.length - 1].das), y1: y, y2: y, stroke: 'var(--border-strong)', 'stroke-width': 1 }));
      r.stages.forEach((s, k) => { if (s.das != null) f.plot.appendChild(svgEl('circle', { cx: f.sx(sowJ + s.das), cy: y, r: Math.min(4, rowH / 3), fill: `var(--c${(k % 5) + 1})` })); });
    });
    legend(f, res.summary.map((s, k) => [s.code, `var(--c${(k % 5) + 1})`, 'sq']), 12, f.m.l + 2);
  }

  /* 3 · the calibration: °C·d to each observed stage, year by year, with the mean */
  function calibration(svgId, cal) {
    const svg = el(svgId); if (!svg) return;
    if (!cal || !cal.stages.length) { empty(svg, 460, 200, T('Sin observaciones', 'No observations')); return; }
    const all = cal.stages.flatMap(s => s.obs.map(o => o.gdd));
    const f = frame(svg, { W: 460, H: 260, m: { l: 52, r: 16, t: 28, b: 36 }, x: [0.5, cal.stages.length + 0.5], y: [0, Math.max(...all) * 1.15], xt: cal.stages.map((_, i) => i + 1), xlabFmt: i => cal.stages[i - 1].code, xlab: T('etapa observada', 'observed stage'), ylab: T('°C·d desde la siembra', '°C·d from sowing'), ny: 5 });
    cal.stages.forEach((s, i) => {
      const x = f.sx(i + 1);
      f.plot.appendChild(svgEl('line', { x1: x - 14, x2: x + 14, y1: f.sy(s.mean), y2: f.sy(s.mean), stroke: 'var(--c5)', 'stroke-width': 2.2 }));
      s.obs.forEach(o => f.plot.appendChild(svgEl('circle', { cx: x + (Math.random() - 0.5) * 12, cy: f.sy(o.gdd), r: 3, fill: 'var(--c1)', opacity: 0.75 })));
      f.top.appendChild(svgEl('text', { x, y: f.sy(s.mean) - 8, 'font-size': 8.5, 'text-anchor': 'middle', class: 'art-txt' }, `${fmtNum(s.mean, 0)}${s.cv != null ? ' · CV ' + fmtPct(s.cv, 0) : ''}`));
    });
    legend(f, [[T('cada año', 'each year'), 'var(--c1)', 'sq'], [T('media', 'mean'), 'var(--c5)', 'ln']], 12, f.m.l + 2);
  }
  /* 3b · Arnold's search: the CV against the base */
  function baseSearch(svgId, bs) {
    const svg = el(svgId); if (!svg) return;
    if (!bs || !bs.curve.length) { empty(svg, 460, 200, T('Hacen falta 3 años de una misma etapa', 'Three years of the same stage are needed')); return; }
    const f = frame(svg, { W: 460, H: 260, m: { l: 52, r: 16, t: 28, b: 36 }, x: [bs.curve[0].base, bs.curve[bs.curve.length - 1].base], y: [0, Math.max(...bs.curve.map(c => c.cv)) * 1.15], xlab: T('temperatura base probada (°C)', 'base temperature tried (°C)'), ylabFmt: Plot.pctTick, ylab: T('CV del tiempo térmico entre años', 'CV of thermal time between years'), ny: 5 });
    line(f, bs.curve.map(c => [f.sx(c.base), f.sy(c.cv)]), 'var(--c1)', { width: 2.2 });
    if (bs.best) vline(f, bs.best.base, 'var(--c5)', { label: T(`mínimo en ${fmtTemp(bs.best.base, 1)}`, `minimum at ${fmtTemp(bs.best.base, 1)}`) });
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r, y: 12, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, T(`etapa ${bs.code} · ${bs.n} años`, `stage ${bs.code} · ${bs.n} years`)));
  }

  /* 4 · the chill of every winter: the accumulation curves with the requirement */
  function chillCurves(svgId, seasons, unit, req) {
    const svg = el(svgId); if (!svg) return;
    if (!seasons.length) { empty(svg, 700, 200, T('Sin inviernos completos', 'No complete winters')); return; }
    const key = unit === 'utah' ? 'dUtah' : unit === 'hours' ? 'dHours' : 'dCP';
    const n = Math.max(...seasons.map(s => s[key].length));
    const all = seasons.flatMap(s => s[key]);
    const lo = Math.min(0, ...all), hi = Math.max(req || 0, ...all) * 1.08;
    const start = seasons[0].start;
    const J0 = doy(2025, start.m, start.d);
    const f = frame(svg, { W: 700, H: 300, m: { l: 56, r: 16, t: 28, b: 36 }, x: [J0, J0 + n], y: [lo, hi], xt: Plot.monthTicks(J0, J0 + n), xlabFmt: Plot.monthTickLabel, ylab: unit === 'utah' ? T('unidades Utah acumuladas', 'accumulated Utah units') : unit === 'hours' ? T('horas frío acumuladas', 'accumulated chill hours') : T('porciones de frío acumuladas', 'accumulated chill portions'), ny: 6 });
    /* the median curve day by day */
    const med = [];
    for (let k = 0; k < n; k++) { const v = seasons.map(s => s[key][k]).filter(x => x != null); if (v.length >= seasons.length / 2) med.push(Stat.median(v)); }
    seasons.forEach(s => line(f, s[key].map((v, k) => [f.sx(J0 + k), f.sy(v)]), 'var(--c1)', { width: 1, opacity: 0.45 }));
    if (med.length) line(f, med.map((v, k) => [f.sx(J0 + k), f.sy(v)]), 'var(--c1)', { width: 2.6 });
    if (req > 0) hline(f, req, 'var(--c5)', { dash: '5 3', label: T(`requerimiento ${fmtNum(req, 0)}`, `requirement ${fmtNum(req, 0)}`) });
    if (lo < 0) hline(f, 0, 'var(--text-muted)', { dash: '2 2', width: 0.8 });
    legend(f, [[T('cada invierno', 'each winter'), 'var(--c1)', 'ln'], [T('mediana', 'median'), 'var(--c1)', 'sq']], 12, f.m.l + 2);
  }
  /* 4b · the total of every winter, by the three units side by side (each on its own scale) */
  function chillYears(svgId, seasons, unit, req) {
    const svg = el(svgId); if (!svg) return;
    if (!seasons.length) { empty(svg, 700, 160, T('Sin inviernos', 'No winters')); return; }
    const key = unit === 'utah' ? 'utah' : unit === 'hours' ? 'hours' : 'cp';
    const xs = seasons.map((_, i) => i), v = seasons.map(s => s[key]);
    const f = frame(svg, { W: 700, H: 240, m: { l: 56, r: 16, t: 26, b: 40 }, x: [-0.6, xs.length - 0.4], y: [Math.min(0, ...v) * 1.1, Math.max(req || 0, ...v) * 1.12], xt: xs.filter((_, i) => xs.length <= 14 || i % Math.ceil(xs.length / 14) === 0), xlabFmt: i => seasons[i] ? seasons[i].label : '', ylab: unit === 'utah' ? 'CU' : unit === 'hours' ? 'h' : 'CP', ny: 5 });
    bars(f, xs, v, x => (req > 0 ? (x >= req ? 'var(--c3)' : 'var(--c5)') : 'var(--c1)'), { opacity: 0.85, width: (f.sx(1) - f.sx(0)) * 0.68 });
    if (req > 0) hline(f, req, 'var(--c5)', { dash: '5 3', label: T('requerimiento', 'requirement') });
    hline(f, Stat.median(v), 'var(--text)', { dash: '2 2', width: 1, label: T(`mediana ${fmtNum(Stat.median(v), 0)}`, `median ${fmtNum(Stat.median(v), 0)}`), right: true });
  }

  /* 5 · the day length of the site */
  function photoperiod(svgId, ph, marks) {
    const svg = el(svgId); if (!svg) return;
    const xs = ph.days.map(x => x.J);
    const f = frame(svg, { W: 700, H: 240, m: { l: 48, r: 16, t: 26, b: 34 }, x: [1, 365], y: [Math.floor(ph.min) - 1, Math.ceil(ph.max) + 1], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, ylab: T('horas de luz', 'hours of light'), ny: 6 });
    band(f, xs, ph.days.map(x => x.geometric), ph.days.map(x => x.civil), 'var(--sun)', 0.18);
    line(f, ph.days.map(x => [f.sx(x.J), f.sy(x.geometric)]), 'var(--c2)', { width: 1.6 });
    line(f, ph.days.map(x => [f.sx(x.J), f.sy(x.civil)]), 'var(--c5)', { width: 2.2 });
    hline(f, 12, 'var(--text-muted)', { dash: '2 2', width: 0.8 });
    (marks || []).forEach((mk, i) => vline(f, mk.J, 'var(--c3)', { label: mk.label, row: i % 2, dash: '3 3' }));
    legend(f, [[T('sol sobre el horizonte', 'sun above the horizon'), 'var(--c2)', 'ln'], [T('con crepúsculo civil (−6°): el fotoperiodo de las plantas', 'with civil twilight (−6°): the plants\' photoperiod'), 'var(--c5)', 'ln']], 12, f.m.l + 2);
  }

  Object.assign(Plots8, { calendar, years, calibration, baseSearch, chillCurves, chillYears, photoperiod });
  if (typeof window !== 'undefined') window.Plots8 = Plots8;
})();
