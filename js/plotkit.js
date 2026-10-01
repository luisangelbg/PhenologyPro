/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — the small plotting kit shared by every block.

   It draws real SVG nodes (not a string), so a figure can be redrawn when the
   language or the theme changes, restyled at once by the figure studio,
   exported at high resolution and inspected element by element in the
   browser. Colours always come from the CSS variables, never hard-coded, so
   the light and dark themes and the palettes of the studio follow by
   themselves. */

(function () {

  /* Ticks a human would choose: 1, 2 or 5 times a power of ten. */
  function niceTicks(lo, hi, n) {
    if (!(hi > lo)) hi = lo + 1;
    const raw = (hi - lo) / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    const step = mag * (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 1.5 ? 2 : 1);
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
    return out;
  }
  function tickLabel(v) {
    const a = Math.abs(v);
    let s;
    if (a >= 1e6) s = (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    else if (a >= 1e4) s = (v / 1e3).toFixed(0) + 'k';
    else s = a >= 100 ? v.toFixed(0) : a >= 10 ? (+v.toFixed(1)).toString() : (+v.toFixed(2)).toString();
    return s.startsWith('-') ? '−' + s.slice(1) : s;
  }
  const pctTick = v => (v * 100).toFixed(Math.abs(v) < 0.1 ? 1 : 0) + '%';
  function clear(svg) { while (svg.firstChild) svg.removeChild(svg.firstChild); }

  /* the first day of every month as a day-of-year tick, for a year-long x axis */
  const MONTH_START = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  function monthTicks(fromDoy, toDoy) {
    const out = [];
    for (let k = 0; k < 36; k++) {
      const v = MONTH_START[k % 12] + 365 * Math.floor(k / 12);
      if (v >= fromDoy && v <= toDoy) out.push(v);
    }
    return out;
  }
  const monthTickLabel = v => monthName(((Math.round(v) - 1) % 365 === 0 ? 1 : MONTH_START.indexOf(((v - 1) % 365) + 1) + 1) || 1, true);
  /* a day-of-year (possibly beyond 365) as "12 mar" */
  const doyLabel = v => fmtDoy(((Math.round(v) - 1) % 365) + 1);

  /* Axes, grid, labels and a clipped group to draw inside.
     o = {W, H, m:{l,r,t,b}, x:[lo,hi], y:[lo,hi], xlab, ylab, xt, yt, nx, ny,
          xlabFmt, ylabFmt, y2:[lo,hi], y2lab, y2t, y2labFmt, grid:false} */
  function frame(svg, o) {
    const W = o.W, H = o.H, m = o.m;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    clear(svg);
    const [x0, x1] = o.x, [y0, y1] = o.y;
    /* what the figure editor needs to find its way: the plot area and the range of each axis */
    svg.setAttribute('data-plot', `${m.l} ${m.t} ${W - m.l - m.r} ${H - m.t - m.b}`);
    svg.setAttribute('data-xr', `${x0} ${x1}`); svg.setAttribute('data-yr', `${y0} ${y1}`);
    if (o.y2) svg.setAttribute('data-y2r', `${o.y2[0]} ${o.y2[1]}`); else svg.removeAttribute('data-y2r');
    const sx = v => m.l + (v - x0) / (x1 - x0) * (W - m.l - m.r);
    const sy = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
    const g = svgEl('g');
    svg.appendChild(g);
    (o.yt || niceTicks(y0, y1, o.ny || 5)).forEach(t => {
      if (t < y0 - 1e-9 || t > y1 + 1e-9) return;
      if (o.grid !== false) g.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: sy(t), y2: sy(t), class: 'art-ax art-grid', 'stroke-width': 0.6, opacity: 0.55 }));
      g.appendChild(svgEl('text', { x: m.l - 5, y: sy(t) + 3, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut', 'data-role': 'ytick' }, (o.ylabFmt || tickLabel)(t)));
    });
    (o.xt || niceTicks(x0, x1, o.nx || 5)).forEach(t => {
      if (t < x0 - 1e-9 || t > x1 + 1e-9) return;
      g.appendChild(svgEl('line', { x1: sx(t), x2: sx(t), y1: H - m.b, y2: H - m.b + 4, class: 'art-ax', 'stroke-width': 1 }));
      g.appendChild(svgEl('text', { x: sx(t), y: H - m.b + 14, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut', 'data-role': 'xtick' }, (o.xlabFmt || tickLabel)(t)));
    });
    g.appendChild(svgEl('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'art-ax', 'stroke-width': 1.2 }));
    g.appendChild(svgEl('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'art-ax', 'stroke-width': 1.2 }));
    if (o.xlab) g.appendChild(svgEl('text', { x: (m.l + W - m.r) / 2, y: H - 6, 'font-size': 10.5, 'text-anchor': 'middle', class: 'art-txt', 'font-weight': 600, 'data-role': 'xlab' }, o.xlab));
    if (o.ylab) g.appendChild(svgEl('text', { x: 13, y: (m.t + H - m.b) / 2, 'font-size': 10.5, 'text-anchor': 'middle', class: 'art-txt', 'font-weight': 600, transform: `rotate(-90 13 ${(m.t + H - m.b) / 2})`, 'data-role': 'ylab' }, o.ylab));
    /* an optional second y axis on the right (rain against temperature, for instance) */
    let sy2 = null;
    if (o.y2) {
      const [b0, b1] = o.y2;
      sy2 = v => H - m.b - (v - b0) / (b1 - b0) * (H - m.t - m.b);
      (o.y2t || niceTicks(b0, b1, o.ny || 5)).forEach(t => {
        if (t < b0 - 1e-9 || t > b1 + 1e-9) return;
        g.appendChild(svgEl('line', { x1: W - m.r, x2: W - m.r + 4, y1: sy2(t), y2: sy2(t), class: 'art-ax', 'stroke-width': 1 }));
        g.appendChild(svgEl('text', { x: W - m.r + 6, y: sy2(t) + 3, 'font-size': 9, 'text-anchor': 'start', class: 'art-mut', 'data-role': 'y2tick' }, (o.y2labFmt || tickLabel)(t)));
      });
      g.appendChild(svgEl('line', { x1: W - m.r, x2: W - m.r, y1: m.t, y2: H - m.b, class: 'art-ax', 'stroke-width': 1.2 }));
      if (o.y2lab) g.appendChild(svgEl('text', { x: W - 8, y: (m.t + H - m.b) / 2, 'font-size': 10.5, 'text-anchor': 'middle', class: 'art-txt', 'font-weight': 600, transform: `rotate(90 ${W - 8} ${(m.t + H - m.b) / 2})`, 'data-role': 'y2lab' }, o.y2lab));
    }
    /* the clip keeps a line from spilling over the axes */
    const id = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = svgEl('defs'), cp = svgEl('clipPath', { id });
    cp.appendChild(svgEl('rect', { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }));
    defs.appendChild(cp); svg.appendChild(defs);
    const plot = svgEl('g', { 'clip-path': `url(#${id})` });
    svg.appendChild(plot);
    /* labels drawn after the plot, above everything */
    const top = svgEl('g');
    svg.appendChild(top);
    return { sx, sy, sy2, g, plot, top, W, H, m, x: o.x, y: o.y };
  }
  const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  /* ---------- marks ---------- */
  function line(f, pts, colour, o) {
    const opt = o || {};
    const p = svgEl('path', { d: pathOf(pts), stroke: colour, 'stroke-width': opt.width || 1.8, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    if (opt.dash) p.setAttribute('stroke-dasharray', opt.dash);
    if (opt.opacity != null) p.setAttribute('opacity', opt.opacity);
    (opt.layer || f.plot).appendChild(p);
    return p;
  }
  /* a filled band between two series of the same x */
  function band(f, xs, lo, hi, colour, opacity) {
    const up = xs.map((x, i) => [f.sx(x), f.sy(hi[i])]);
    const dn = xs.map((x, i) => [f.sx(x), f.sy(lo[i])]).reverse();
    const p = svgEl('path', { d: pathOf(up.concat(dn)) + 'Z', fill: colour, opacity: opacity == null ? 0.18 : opacity, stroke: 'none' });
    f.plot.appendChild(p);
    return p;
  }
  /* an area from a baseline (default 0) to the series */
  function area(f, xs, ys, colour, opacity, baseline) {
    const b = baseline == null ? 0 : baseline;
    const up = xs.map((x, i) => [f.sx(x), f.sy(ys[i])]);
    const pts = [[f.sx(xs[0]), f.sy(b)]].concat(up, [[f.sx(xs[xs.length - 1]), f.sy(b)]]);
    const p = svgEl('path', { d: pathOf(pts) + 'Z', fill: colour, opacity: opacity == null ? 0.25 : opacity, stroke: 'none' });
    f.plot.appendChild(p);
    return p;
  }
  /* vertical bars; `sy` may be f.sy2 for a right-axis series */
  function bars(f, xs, ys, colour, o) {
    const opt = o || {};
    const sy = opt.sy || f.sy;
    const w = opt.width || Math.max(1, (f.sx(xs[1] || xs[0] + 1) - f.sx(xs[0])) * 0.8);
    const g = svgEl('g');
    xs.forEach((x, i) => {
      const v = ys[i];
      if (v == null || !isFinite(v)) return;
      const y = sy(Math.max(0, v)), h = Math.abs(sy(v) - sy(0));
      g.appendChild(svgEl('rect', { x: f.sx(x) - w / 2, y, width: w, height: Math.max(0, h), rx: opt.rx == null ? 1 : opt.rx, fill: typeof colour === 'function' ? colour(v, i) : colour, opacity: opt.opacity == null ? 0.85 : opt.opacity }));
    });
    f.plot.appendChild(g);
    return g;
  }
  function hline(f, y, colour, o) {
    const opt = o || {};
    const sy = opt.sy || f.sy;
    const l = svgEl('line', { x1: f.m.l, x2: f.W - f.m.r, y1: sy(y), y2: sy(y), stroke: colour, 'stroke-width': opt.width || 1.2, 'stroke-dasharray': opt.dash || '4 3', opacity: opt.opacity == null ? 0.9 : opt.opacity });
    f.plot.appendChild(l);
    if (opt.label) f.top.appendChild(svgEl('text', { x: opt.right ? f.W - f.m.r - 3 : f.m.l + 4, y: opt.below ? sy(y) + 10 : sy(y) - 3, 'font-size': 9, class: 'art-txt', fill: colour, 'font-weight': 600, 'text-anchor': opt.right ? 'end' : 'start' }, opt.label));
    return l;
  }
  function vline(f, x, colour, o) {
    const opt = o || {};
    const l = svgEl('line', { x1: f.sx(x), x2: f.sx(x), y1: f.m.t, y2: f.H - f.m.b, stroke: colour, 'stroke-width': opt.width || 1.2, 'stroke-dasharray': opt.dash || '3 3', opacity: opt.opacity == null ? 0.9 : opt.opacity });
    f.plot.appendChild(l);
    if (opt.label) {
      const t = svgEl('text', { x: f.sx(x) + 3, y: f.m.t + 10 + (opt.row || 0) * 11, 'font-size': 8.5, class: 'art-txt', fill: colour, 'font-weight': 600 }, opt.label);
      if (opt.rotate) { t.setAttribute('transform', `rotate(-90 ${f.sx(x) - 3} ${f.H - f.m.b - 4})`); t.setAttribute('x', f.sx(x) - 3); t.setAttribute('y', f.H - f.m.b - 4); t.setAttribute('text-anchor', 'start'); }
      f.top.appendChild(t);
    }
    return l;
  }
  /* a shaded vertical span (a stage, a season) */
  function vspan(f, x0, x1, colour, opacity, label) {
    const r = svgEl('rect', { x: f.sx(x0), y: f.m.t, width: Math.max(0, f.sx(x1) - f.sx(x0)), height: f.H - f.m.t - f.m.b, fill: colour, opacity: opacity == null ? 0.08 : opacity });
    f.plot.appendChild(r);
    if (label) f.top.appendChild(svgEl('text', { x: (f.sx(x0) + f.sx(x1)) / 2, y: f.H - f.m.b - 5, 'font-size': 8.5, 'text-anchor': 'middle', class: 'art-mut' }, label));
    return r;
  }
  function dots(f, pts, colour, r, o) {
    const g = svgEl('g');
    pts.forEach(p => g.appendChild(svgEl('circle', { cx: f.sx(p[0]), cy: f.sy(p[1]), r: r || 2.4, fill: colour, stroke: (o && o.stroke) || 'none', 'stroke-width': 1 })));
    f.plot.appendChild(g);
    return g;
  }
  function label(f, x, y, text, o) {
    const opt = o || {};
    const t = svgEl('text', { x: f.sx(x) + (opt.dx || 0), y: f.sy(y) + (opt.dy || 0), 'font-size': opt.size || 9, class: opt.muted ? 'art-mut' : 'art-txt', 'text-anchor': opt.anchor || 'start', 'font-weight': opt.bold ? 700 : 400 }, text);
    if (opt.fill) t.setAttribute('fill', opt.fill);
    f.top.appendChild(t);
    return t;
  }
  /* a legend along the top of a figure: ['label', colour, 'sq' | 'ln' | 'dash'] */
  function legend(f, items, y, x) {
    const g = svgEl('g', { 'data-role': 'legend' });
    const yy = y == null ? 8 : y;
    let xx = x == null ? f.m.l + 2 : x;
    /* each entry is a mark and its label, tagged with the same index so the figure editor can pair them */
    items.forEach(([lab, colour, kind], k) => {
      if (kind === 'ln') g.appendChild(svgEl('line', { x1: xx, x2: xx + 12, y1: yy, y2: yy, stroke: colour, 'stroke-width': 2.2, 'data-li': k }));
      else if (kind === 'dash') g.appendChild(svgEl('line', { x1: xx, x2: xx + 12, y1: yy, y2: yy, stroke: colour, 'stroke-width': 2.2, 'stroke-dasharray': '4 3', 'data-li': k }));
      else g.appendChild(svgEl('rect', { x: xx, y: yy - 4, width: 10, height: 9, rx: 2, fill: colour, opacity: 0.9, 'data-li': k }));
      g.appendChild(svgEl('text', { x: xx + 16, y: yy + 4, 'font-size': 9.5, class: 'art-mut', 'data-li': k }, lab));
      xx += 26 + lab.length * 5.4;
    });
    f.g.appendChild(g);
    return g;
  }
  /* a title inside the figure, top-left */
  function title(f, text, sub) {
    f.g.appendChild(svgEl('text', { x: f.m.l, y: 12, 'font-size': 11, class: 'art-txt', 'font-weight': 700 }, text));
    if (sub) f.g.appendChild(svgEl('text', { x: f.m.l, y: 24, 'font-size': 9, class: 'art-mut' }, sub));
  }
  /* an empty-state message in a figure that has nothing to draw yet */
  function empty(svg, W, H, text) {
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    clear(svg);
    svg.appendChild(svgEl('text', { x: W / 2, y: H / 2, 'font-size': 11, 'text-anchor': 'middle', class: 'art-mut' }, text));
  }

  /* A slider and the box that shows what it currently means. */
  function bindSlider(id, fmt, onInput) {
    const s = el(id), v = el(id + 'Val');
    if (!s) return;
    const show = () => { if (v) v.innerHTML = fmt(+s.value); };
    s.addEventListener('input', () => { show(); onInput(); });
    show();
  }
  const val = id => +el(id).value;
  function setSlider(id, x) { const s = el(id); if (s) s.value = x; }

  window.Plot = { niceTicks, tickLabel, pctTick, clear, frame, pathOf, monthTicks, monthTickLabel, doyLabel, MONTH_START,
    line, band, area, bars, hline, vline, vspan, dots, label, legend, title, empty, bindSlider, val, setSlider };
})();
