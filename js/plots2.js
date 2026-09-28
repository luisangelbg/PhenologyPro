/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 2 figures: the whole series at a glance and the
   availability calendar. */

const Plots2 = {};

(function () {
  const { frame, line, band, bars, legend, empty } = Plot;

  /* The full record. Up to three years it is drawn day by day; beyond that,
     by month (mean of the extremes, sum of the rain), or the figure would be a
     wall of ink. Filled and flagged days are marked under the axis. */
  function overview(svgId, rows) {
    const svg = el(svgId); if (!svg || !rows || !rows.length) return;
    const daily = rows.length <= 1100;
    let xs = [], tmax = [], tmin = [], prec = [], marks = [];
    const x0 = dayNumber(rows[0].y, rows[0].m, rows[0].d);
    if (daily) {
      rows.forEach((r, i) => { xs.push(i); tmax.push(r.tmax); tmin.push(r.tmin); prec.push(r.prec); if (r.flags.tmax || r.flags.tmin) marks.push([i, r.flags.tmax || r.flags.tmin]); });
    } else {
      const by = new Map();
      rows.forEach((r, i) => {
        const k = r.y * 12 + r.m - 1;
        if (!by.has(k)) by.set(k, { i, tx: [], tn: [], p: 0, np: 0, fl: 0 });
        const a = by.get(k);
        if (r.tmax != null) a.tx.push(r.tmax); if (r.tmin != null) a.tn.push(r.tmin); if (r.prec != null) { a.p += r.prec; a.np++; }
        if (r.flags.tmax || r.flags.tmin) a.fl++;
      });
      [...by.values()].forEach(a => { xs.push(a.i); tmax.push(a.tx.length ? Stat.mean(a.tx) : null); tmin.push(a.tn.length ? Stat.mean(a.tn) : null); prec.push(a.np ? a.p : null); if (a.fl) marks.push([a.i, 'filled']); });
    }
    const tAll = tmax.concat(tmin).filter(v => v != null);
    const lo = Math.min(-2, ...tAll) - 2, hi = Math.max(...tAll, 30) + 3;
    const pmax = Math.max(5, ...prec.filter(v => v != null)) * 1.15;
    const years = [...new Set(rows.map(r => r.y))];
    const ticks = [], labels = {};
    rows.forEach((r, i) => { if (r.m === 1 && r.d === 1 || (i === 0)) { ticks.push(i); labels[i] = String(r.y); } });
    if (years.length > 12) { const keep = ticks.filter((_, k) => k % Math.ceil(years.length / 12) === 0); ticks.length = 0; keep.forEach(t => ticks.push(t)); }
    const f = frame(svg, {
      W: 900, H: 300, m: { l: 44, r: 44, t: 26, b: 40 },
      x: [0, rows.length - 1], y: [lo, hi], xt: ticks, xlabFmt: v => labels[v] || '', ylab: '°C',
      y2: [0, pmax], y2lab: daily ? T('lluvia diaria (mm)', 'daily rain (mm)') : T('lluvia mensual (mm)', 'monthly rain (mm)'), ny: 6,
    });
    /* rain first, behind the temperatures */
    const w = daily ? Math.max(0.6, (f.W - f.m.l - f.m.r) / rows.length) : Math.max(2, (f.W - f.m.l - f.m.r) / xs.length * 0.7);
    bars(f, xs, prec, 'var(--c4)', { sy: f.sy2, opacity: 0.45, width: w });
    /* temperatures, broken at gaps */
    const segs = (arr) => { const out = []; let cur = []; xs.forEach((x, i) => { if (arr[i] == null) { if (cur.length) out.push(cur); cur = []; } else cur.push([f.sx(x), f.sy(arr[i])]); }); if (cur.length) out.push(cur); return out; };
    if (daily) {
      const bxs = [], blo = [], bhi = [];
      xs.forEach((x, i) => { if (tmax[i] != null && tmin[i] != null) { bxs.push(x); blo.push(tmin[i]); bhi.push(tmax[i]); } });
      segs(tmax).forEach(s => line(f, s, 'var(--c5)', { width: 1 }));
      segs(tmin).forEach(s => line(f, s, 'var(--c1)', { width: 1 }));
    } else {
      segs(tmax).forEach(s => line(f, s, 'var(--c5)', { width: 1.8 }));
      segs(tmin).forEach(s => line(f, s, 'var(--c1)', { width: 1.8 }));
    }
    /* the gaps: red ticks under the axis where a day has no temperature */
    const g = svgEl('g');
    rows.forEach((r, i) => { if (r.tmax == null || r.tmin == null) g.appendChild(svgEl('line', { x1: f.sx(i), x2: f.sx(i), y1: f.H - f.m.b + 1, y2: f.H - f.m.b + 6, stroke: 'var(--danger)', 'stroke-width': Math.max(0.5, w), opacity: 0.8 })); });
    marks.forEach(([i]) => g.appendChild(svgEl('line', { x1: f.sx(i), x2: f.sx(i), y1: f.H - f.m.b + 1, y2: f.H - f.m.b + 6, stroke: 'var(--warning)', 'stroke-width': Math.max(0.5, w), opacity: 0.9 })));
    f.g.appendChild(g);
    f.top.appendChild(svgEl('line', { x1: f.m.l, x2: f.W - f.m.r, y1: f.sy(0), y2: f.sy(0), stroke: 'var(--frost)', 'stroke-width': 0.8, 'stroke-dasharray': '2 2' }));
    legend(f, [['Tmax', 'var(--c5)', 'ln'], ['Tmin', 'var(--c1)', 'ln'], [T('lluvia', 'rain'), 'var(--c4)', 'sq'], [T('hueco', 'gap'), 'var(--danger)', 'sq'], [T('rellenado o marcado', 'filled or flagged'), 'var(--warning)', 'sq']], 12, f.m.l + 2);
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r, y: 12, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, daily ? T('valores diarios', 'daily values') : T('promedios y sumas mensuales', 'monthly means and sums')));
  }

  /* a colour between two hex colours */
  function mix(a, b, t) {
    const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const A = p(a), B = p(b);
    return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* The availability calendar: years down, months across, each cell the share
     of days with both temperatures. Text inside when there is room. */
  function calendar(svgId, avail) {
    const svg = el(svgId); if (!svg) return;
    if (!avail || !avail.length) { empty(svg, 700, 120, T('Sin datos', 'No data')); return; }
    const W = 700, rowH = avail.length > 25 ? 12 : avail.length > 12 ? 16 : 22, m = { l: 48, r: 16, t: 26, b: 10 };
    const H = m.t + m.b + rowH * avail.length;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    Plot.clear(svg);
    const cw = (W - m.l - m.r) / 12;
    const lo = cssVar('--heat-lo', '#eef4f9'), hi = cssVar('--heat-hi', '#16557a'), danger = cssVar('--danger', '#c43a2f');
    for (let j = 0; j < 12; j++) svg.appendChild(svgEl('text', { x: m.l + (j + 0.5) * cw, y: m.t - 8, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut' }, monthName(j + 1, true)));
    avail.forEach((yr, i) => {
      const y = m.t + i * rowH;
      svg.appendChild(svgEl('text', { x: m.l - 6, y: y + rowH / 2 + 3, 'font-size': 9, 'text-anchor': 'end', class: 'art-txt' }, String(yr.y)));
      yr.months.forEach((c, j) => {
        const fill = c.n === 0 ? 'transparent' : c.pct === 0 ? danger : mix(lo, hi, Math.pow(c.pct, 1.5));
        const r = svgEl('rect', { x: m.l + j * cw + 1, y: y + 1, width: cw - 2, height: rowH - 2, rx: 2, fill, stroke: c.n === 0 ? 'var(--border)' : 'none', 'stroke-dasharray': c.n === 0 ? '2 2' : null });
        r.appendChild(svgEl('title', null, `${yr.y}-${String(j + 1).padStart(2, '0')}: ${Math.round(c.pct * 100)} % T, ${Math.round(c.pctP * 100)} % P`));
        svg.appendChild(r);
        if (rowH >= 16 && c.n > 0) svg.appendChild(svgEl('text', { x: m.l + (j + 0.5) * cw, y: y + rowH / 2 + 3, 'font-size': 8, 'text-anchor': 'middle', fill: c.pct > 0.55 ? '#ffffff' : 'var(--text)' }, c.pct >= 0.995 ? '100' : String(Math.round(c.pct * 100))));
      });
    });
    svg.appendChild(svgEl('text', { x: m.l, y: 10, 'font-size': 9, class: 'art-mut' }, T('% de días del mes con Tmax y Tmin; rojo = sin dato; punteado = fuera del periodo', '% of the month\'s days with Tmax and Tmin; red = no data; dotted = outside the record')));
  }

  Object.assign(Plots2, { overview, calendar, mix });
  if (typeof window !== 'undefined') window.Plots2 = Plots2;
})();
