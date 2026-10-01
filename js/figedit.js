/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — the editor of each figure.

   The figure studio of the top bar restyles every figure at once (palette,
   font, background). This editor works on ONE figure, the way a plotting
   program does:

     General       font family, sizes, line and point scale, text colour,
                   background, border, title, subtitle and footnote
     Axes & grid   the titles of the axes, the tick labels, the colour and
                   weight of the axes, the grid and the box of the plot area
     Series        every colour the figure uses, named after its legend
                   entry: colour, line weight, dash, opacity, hide
     Legend        show or hide, eight positions, horizontal or vertical,
                   size, box; it can be dragged on the figure
     Texts         every text one by one: wording, size, bold, italics,
                   colour, hide
     Annotations   notes, arrows, reference lines at a value of either axis,
                   shaded bands and a panel letter; notes and arrows are
                   dragged on the figure

   It needs nothing from the module that drew the figure: it reads the SVG as
   it is (the plotting kit only tags the legend, the axis titles, the ticks
   and the plot area so the editor can find them). The edits are kept per
   figure, by the id of its SVG, and put back every time the figure is redrawn
   — when the data, the language or the theme change — so they are never lost:
   texts are matched by their original wording and colours by their original
   value. Whatever is on screen is what the export menu, the catalogue of
   Block 10, the report and the package take. */

const FigEdit = {};

(function () {
  const KEY = 'phenologypro:figedit';
  let E = {};
  try { E = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { E = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(E)); } catch (e) { /* storage blocked */ } };
  const two = (es, en) => L2(es, en);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const nums = s => String(s || '').trim().split(/[\s,]+/).map(Number);
  const SHAPES = 'path, line, rect, circle, polyline, polygon, ellipse';

  const FONTS = {
    '': ['La del estudio de figuras', 'The figure studio\'s', ''],
    sans: ['Sans', 'Sans', 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'],
    humanist: ['Sans humanista', 'Humanist sans', '"Segoe UI", "Helvetica Neue", Arial, sans-serif'],
    arial: ['Arial / Helvetica', 'Arial / Helvetica', 'Arial, Helvetica, sans-serif'],
    serif: ['Serif', 'Serif', 'Georgia, Cambria, "Times New Roman", serif'],
    times: ['Times New Roman', 'Times New Roman', '"Times New Roman", Times, serif'],
    classic: ['Serif clásica', 'Classic serif', '"Palatino Linotype", "Book Antiqua", Palatino, serif'],
    condensed: ['Sans estrecha', 'Condensed sans', '"Arial Narrow", "Roboto Condensed", sans-serif'],
    mono: ['Monoespaciada', 'Monospace', 'ui-monospace, Consolas, "Courier New", monospace'],
  };
  const DASH = { solid: 'none', dash: '6 4', dot: '1.5 3.5', dashdot: '7 3 1.5 3' };
  const POS = [['orig', 'donde la dibuja la figura', 'where the figure draws it'], ['tl', 'dentro, arriba a la izquierda', 'inside, top left'], ['tr', 'dentro, arriba a la derecha', 'inside, top right'],
    ['bl', 'dentro, abajo a la izquierda', 'inside, bottom left'], ['br', 'dentro, abajo a la derecha', 'inside, bottom right'], ['tc', 'arriba, al centro', 'top, centred'],
    ['below', 'debajo de la figura', 'below the figure'], ['belowc', 'debajo, al centro', 'below, centred']];
  const GENERAL = ['font', 'fontScale', 'lineScale', 'markerScale', 'textColor', 'bg', 'bgColor', 'border', 'tickScale', 'tickColor', 'axisColor', 'axisWidth', 'grid', 'gridDash', 'gridOpacity', 'box'];

  const blank = () => ({ texts: {}, colors: {}, series: {}, legend: {}, notes: [] });
  function edits(id) {
    const d = (E[id] = E[id] || blank());
    ['texts', 'colors', 'series', 'legend'].forEach(k => { if (!d[k]) d[k] = {}; });
    if (!d.notes) d.notes = [];
    return d;
  }
  const has = id => !!E[id];

  /* ---------------- colours as the eye sees them ---------------- */
  const probe = () => { let p = document.getElementById('figEditProbe'); if (!p) { p = mk('span', { id: 'figEditProbe', style: 'display:none' }); document.body.appendChild(p); } return p; };
  function toHex(value, ctxEl) {
    if (!value || value === 'none' || value === 'transparent' || /^url\(/.test(value)) return null;
    let v = value;
    if (/var\(/.test(v)) { const m = v.match(/var\((--[\w-]+)/); v = m ? getComputedStyle(ctxEl || document.documentElement).getPropertyValue(m[1]).trim() : ''; }
    if (!v) return null;
    const p = probe(); p.style.color = ''; p.style.color = v;
    const m = getComputedStyle(p).color.match(/[\d.]+/g);
    if (!m) return null;
    return '#' + m.slice(0, 3).map(x => Math.round(+x).toString(16).padStart(2, '0')).join('');
  }

  /* ---------------- helpers on the SVG ---------------- */
  const own = (tag, attrs, text) => { const n = svgEl(tag, attrs, text); n.setAttribute('data-fe-own', '1'); return n; };
  function remember(n, attr, key) { if (!n.hasAttribute(key)) n.setAttribute(key, n.getAttribute(attr) ?? ''); return n.getAttribute(key); }
  const baseBox = svg => nums(svg.dataset.feVb0 || svg.getAttribute('viewBox') || '0 0 700 320');
  const plotRect = svg => { const p = nums(svg.dataset.plot); return p.length === 4 && p.every(isFinite) ? { l: p[0], t: p[1], w: p[2], h: p[3] } : null; };
  const range = (svg, k) => { const r = nums(svg.dataset[k]); return r.length === 2 && r.every(isFinite) && r[1] !== r[0] ? r : null; };
  function wrap(text, perLine) {
    const out = []; let line = '';
    String(text).split(/\s+/).forEach(w => { if ((line + ' ' + w).trim().length > perLine) { if (line) out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) out.push(line);
    return out.slice(0, 5);
  }
  /* the entries of the legend the plotting kit drew: [{i, mark, text, key, label}] */
  function legendOf(svg) {
    const g = svg.querySelector('[data-role="legend"]');
    if (!g) return null;
    const items = new Map();
    g.querySelectorAll('[data-li]').forEach(n => {
      const i = +n.getAttribute('data-li');
      if (!items.has(i)) items.set(i, { i, mark: null, text: null });
      if (n.tagName === 'text') items.get(i).text = n; else items.get(i).mark = n;
    });
    const list = [...items.values()].sort((a, b) => a.i - b.i).filter(x => x.mark && x.text);
    list.forEach(x => {
      const m = x.mark;
      x.key = m.getAttribute('data-fe-stroke') || m.getAttribute('stroke') || m.getAttribute('data-fe-fill') || m.getAttribute('fill') || '';
      if (m.tagName !== 'line') x.key = m.getAttribute('data-fe-fill') || m.getAttribute('fill') || x.key;
      x.label = x.text.getAttribute('data-fe-t') ?? x.text.textContent;
    });
    return { g, items: list };
  }

  /* ---------------- applying the edits to an SVG ---------------- */
  const observers = new WeakMap();
  const watchedIds = new Set();
  function apply(svg) {
    if (!svg || !svg.id || !has(svg.id)) return;
    const ob = observers.get(svg);
    if (ob) ob.disconnect();
    try { applyNow(svg, edits(svg.id)); } catch (e) { console.error('FigEdit', e); }
    if (ob) ob.observe(svg, { childList: true });
  }
  function applyNow(svg, ed) {
    /* the box the figure was drawn in: ours may be larger (title, footnote, legend below) */
    const vbNow = svg.getAttribute('viewBox') || '0 0 700 320';
    if (!(svg.dataset.feVbx === vbNow && svg.dataset.feVb0)) svg.dataset.feVb0 = vbNow;
    const [bx, by, bw, bh] = nums(svg.dataset.feVb0);
    svg.querySelectorAll('[data-fe-own]').forEach(n => n.remove());
    const rendered = svg.getClientRects().length > 0;
    const pr = plotRect(svg);
    const famOn = ed.font && FONTS[ed.font] ? FONTS[ed.font][2] : null;
    const fScale = ed.fontScale || 1;

    /* texts */
    svg.querySelectorAll('text').forEach(t => {
      const orig = t.hasAttribute('data-fe-t') ? t.getAttribute('data-fe-t') : (t.setAttribute('data-fe-t', t.textContent), t.textContent);
      const fs0 = +remember(t, 'font-size', 'data-fe-fs') || 10;
      const te = ed.texts[orig] || {};
      const role = t.getAttribute('data-role') || '';
      const tick = /tick$/.test(role);
      t.style.fontFamily = famOn || '';
      if (te.t != null && t.textContent !== te.t) t.textContent = te.t;
      else if (te.t == null && t.textContent !== orig) t.textContent = orig;
      const k = fScale * (te.scale || 1) * (tick ? (ed.tickScale || 1) : 1);
      t.style.fontSize = Math.abs(k - 1) > 1e-6 ? (fs0 * k).toFixed(2) + 'px' : '';
      remember(t, 'font-weight', 'data-fe-fw');
      if (te.bold != null) t.setAttribute('font-weight', te.bold ? 700 : 400);
      else { const w0 = t.getAttribute('data-fe-fw'); if (w0) t.setAttribute('font-weight', w0); else t.removeAttribute('font-weight'); }
      if (te.italic) t.setAttribute('font-style', 'italic'); else t.removeAttribute('font-style');
      remember(t, 'fill', 'data-fe-fill');
      const col = te.color || (tick && ed.tickColor) || ed.textColor;
      if (col) t.setAttribute('fill', col);
      else { const f0 = t.getAttribute('data-fe-fill'); if (f0) t.setAttribute('fill', f0); else t.removeAttribute('fill'); }
      t.style.display = te.hidden ? 'none' : '';
    });

    /* lines, bars, points: colours and the style of each series */
    svg.querySelectorAll(SHAPES).forEach(n => {
      if (n.closest('defs')) return;
      const cls = n.getAttribute('class') || '';
      const sw0 = remember(n, 'stroke-width', 'data-fe-sw');
      if (/art-ax/.test(cls)) {
        const grid = /art-grid/.test(cls);
        if (grid) {
          n.style.display = ed.grid === false ? 'none' : '';
          n.style.strokeDasharray = ed.gridDash && DASH[ed.gridDash] ? DASH[ed.gridDash] : '';
          n.style.opacity = ed.gridOpacity != null ? ed.gridOpacity : '';
          n.style.stroke = ed.gridColor || '';
        } else {
          n.style.stroke = ed.axisColor || '';
          n.style.strokeWidth = ed.axisWidth && sw0 !== '' ? (+sw0 * ed.axisWidth).toFixed(2) + 'px' : '';
        }
        return;
      }
      const f0 = remember(n, 'fill', 'data-fe-fill'), s0 = remember(n, 'stroke', 'data-fe-stroke');
      [['fill', f0], ['stroke', s0]].forEach(([a, o]) => {
        if (!o) return;
        const mapped = ed.colors[o];
        if (mapped) n.setAttribute(a, mapped); else if (n.getAttribute(a) !== o) n.setAttribute(a, o);
      });
      const se = (s0 && s0 !== 'none' && ed.series[s0]) || (f0 && f0 !== 'none' && ed.series[f0]) || null;
      const k = (ed.lineScale || 1) * (se && se.width ? se.width : 1);
      n.style.strokeWidth = sw0 !== '' && Math.abs(k - 1) > 1e-6 ? (+sw0 * k).toFixed(2) + 'px' : '';
      n.style.strokeDasharray = se && se.dash && DASH[se.dash] ? DASH[se.dash] : '';
      const op0 = remember(n, 'opacity', 'data-fe-op');
      n.style.opacity = se && se.opacity != null && se.opacity !== 1 ? ((op0 === '' ? 1 : +op0) * se.opacity).toFixed(3) : '';
      n.style.display = se && se.hidden ? 'none' : '';
      if (n.tagName === 'circle') { const r0 = +remember(n, 'r', 'data-fe-r'); n.setAttribute('r', (r0 * (ed.markerScale || 1)).toFixed(2)); }
    });

    /* the legend: entries, layout, size, place */
    let below = 0;
    const lg = legendOf(svg), L = ed.legend || {};
    if (lg) {
      const g = lg.g;
      g.removeAttribute('transform');
      g.style.display = L.hidden ? 'none' : '';
      const x0 = lg.items.length ? +(lg.items[0].mark.getAttribute('x1') ?? lg.items[0].mark.getAttribute('x') ?? 0) : 0;
      lg.items.forEach((it, k) => {
        const xi = +(it.mark.getAttribute('x1') ?? it.mark.getAttribute('x') ?? 0);
        const tr = L.vertical ? `translate(${(x0 - xi).toFixed(1)} ${(k * 13).toFixed(1)})` : null;
        [it.mark, it.text].forEach(n => { if (tr) n.setAttribute('transform', tr); else n.removeAttribute('transform'); });
        const hide = ed.series[it.key] && ed.series[it.key].hidden;
        it.text.style.display = hide || (ed.texts[it.label] && ed.texts[it.label].hidden) ? 'none' : '';
      });
      if (rendered && !L.hidden && lg.items.length) {
        let bb = null;
        try { bb = g.getBBox(); } catch (e) { bb = null; }
        if (bb && bb.width > 0) {
          const s = L.scale || 1, w = bb.width * s, h = bb.height * s;
          const P = pr || { l: bx + 44, t: by + 18, w: bw - 60, h: bh - 54 };
          let X = bb.x, Y = bb.y;
          const pos = L.pos || 'orig';
          if (pos === 'tl') { X = P.l + 8; Y = P.t + 8; }
          else if (pos === 'tr') { X = P.l + P.w - w - 8; Y = P.t + 8; }
          else if (pos === 'bl') { X = P.l + 8; Y = P.t + P.h - h - 8; }
          else if (pos === 'br') { X = P.l + P.w - w - 8; Y = P.t + P.h - h - 8; }
          else if (pos === 'tc') { X = bx + (bw - w) / 2; }
          else if (pos === 'below' || pos === 'belowc') { X = pos === 'below' ? P.l : bx + (bw - w) / 2; Y = by + bh + 4; below = h + 10; }
          X += L.dx || 0; Y += L.dy || 0;
          if (L.box) g.insertBefore(own('rect', { x: bb.x - 5, y: bb.y - 4, width: bb.width + 10, height: bb.height + 8, rx: 3, fill: 'var(--card-bg)', stroke: 'var(--border-strong)', 'stroke-width': 0.8, opacity: 0.94 }), g.firstChild);
          if (s !== 1 || X !== bb.x || Y !== bb.y) g.setAttribute('transform', `translate(${X.toFixed(1)} ${Y.toFixed(1)}) scale(${s}) translate(${(-bb.x).toFixed(1)} ${(-bb.y).toFixed(1)})`);
          g.setAttribute('data-fe-drag', 'legend');
        }
      }
    }

    /* title, subtitle and footnote enlarge the box of the figure */
    const ts = ed.titleScale || 1;
    let top = 0;
    if (ed.title) top += 19 * ts;
    if (ed.subtitle) top += 14 * ts;
    if (top) top += 5;
    const noteLines = ed.note ? wrap(ed.note, Math.floor(bw / 5.2)) : [];
    const bottom = below + (noteLines.length ? noteLines.length * 12 + 8 : 0);
    const txt = (attrs, text) => { const t = own('text', attrs, text); if (famOn) t.style.fontFamily = famOn; if (ed.textColor && !attrs.fill) t.setAttribute('fill', ed.textColor); return t; };
    const centre = ed.titleAlign === 'center';
    let ty = by - top;
    if (ed.title) { ty += 15 * ts; svg.appendChild(txt({ x: centre ? bx + bw / 2 : bx + 8, y: ty, 'font-size': (13.5 * ts * fScale).toFixed(2), 'font-weight': 700, class: 'art-txt', 'text-anchor': centre ? 'middle' : 'start', 'data-fe-part': 'title' }, ed.title)); }
    if (ed.subtitle) { ty += (ed.title ? 14 : 12) * ts; svg.appendChild(txt({ x: centre ? bx + bw / 2 : bx + 8, y: ty, 'font-size': (10.5 * ts * fScale).toFixed(2), class: 'art-mut', 'text-anchor': centre ? 'middle' : 'start', 'data-fe-part': 'subtitle' }, ed.subtitle)); }
    noteLines.forEach((line, i) => svg.appendChild(txt({ x: bx + 8, y: by + bh + below + 12 + i * 12, 'font-size': (9.5 * fScale).toFixed(2), class: 'art-mut', 'data-fe-part': 'note' }, line)));
    if (top || bottom) {
      const vbx = `${bx} ${(by - top).toFixed(1)} ${bw} ${(bh + top + bottom).toFixed(1)}`;
      svg.setAttribute('viewBox', vbx); svg.dataset.feVbx = vbx;
    } else if (svg.dataset.feVbx) { svg.setAttribute('viewBox', svg.dataset.feVb0); delete svg.dataset.feVbx; }
    const [vx, vy, vw, vh] = nums(svg.getAttribute('viewBox'));

    /* background and border */
    if (ed.bg && ed.bg !== 'none') svg.insertBefore(own('rect', { x: vx, y: vy, width: vw, height: vh, fill: ed.bg === 'white' ? '#ffffff' : ed.bgColor || '#ffffff', 'data-fe-part': 'bg' }), svg.firstChild);
    if (ed.box && pr) svg.appendChild(own('rect', { x: pr.l, y: pr.t, width: pr.w, height: pr.h, fill: 'none', class: 'art-ax', 'stroke-width': 1.2 * (ed.axisWidth || 1), style: ed.axisColor ? `stroke:${ed.axisColor}` : null, 'data-fe-part': 'box' }));
    if (ed.border) svg.appendChild(own('rect', { x: vx + 0.6, y: vy + 0.6, width: vw - 1.2, height: vh - 1.2, fill: 'none', class: 'art-ax', 'stroke-width': 1, style: ed.axisColor ? `stroke:${ed.axisColor}` : null, 'data-fe-part': 'border' }));

    /* annotations */
    if (ed.notes && ed.notes.length) {
      const layer = own('g', { 'data-fe-part': 'notes' });
      svg.appendChild(layer);   /* attached first: a boxed note measures its own text */
      const yr = range(svg, 'yr'), y2r = range(svg, 'y2r'), xr = range(svg, 'xr');
      const fx = v => bx + v * bw, fy = v => by + v * bh;
      ed.notes.forEach(nt => {
        const col = nt.color || 'var(--text)';
        const drag = { 'data-fe-drag': 'note:' + nt.id };
        if (nt.type === 'text' || nt.type === 'letter') {
          const size = (nt.size || (nt.type === 'letter' ? 16 : 10)) * fScale;
          const t = txt(Object.assign({ x: fx(nt.x), y: fy(nt.y), 'font-size': size.toFixed(2), fill: col, 'font-weight': nt.bold || nt.type === 'letter' ? 700 : 400, 'font-style': nt.italic ? 'italic' : null, 'text-anchor': nt.anchor || 'start' }, drag), nt.t || '');
          if (nt.box && rendered) {
            layer.appendChild(t);
            let bb = null; try { bb = t.getBBox(); } catch (e) { bb = null; }
            if (bb && bb.width) layer.insertBefore(own('rect', { x: bb.x - 4, y: bb.y - 2, width: bb.width + 8, height: bb.height + 4, rx: 3, fill: 'var(--card-bg)', stroke: col, 'stroke-width': 0.7, opacity: 0.92 }), t);
          } else layer.appendChild(t);
        } else if (nt.type === 'arrow') {
          const x1 = fx(nt.x), y1 = fy(nt.y), x2 = fx(nt.x2), y2 = fy(nt.y2), w = nt.width || 1.4;
          const a = Math.atan2(y2 - y1, x2 - x1), h = 6 + w * 1.6;
          const g = own('g', drag);
          g.appendChild(own('line', { x1, y1, x2: x2 - Math.cos(a) * h * 0.6, y2: y2 - Math.sin(a) * h * 0.6, stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-dasharray': nt.dash && DASH[nt.dash] !== 'none' ? DASH[nt.dash] : null }));
          g.appendChild(own('path', { d: `M${x2.toFixed(1)} ${y2.toFixed(1)}L${(x2 - Math.cos(a - 0.42) * h).toFixed(1)} ${(y2 - Math.sin(a - 0.42) * h).toFixed(1)}L${(x2 - Math.cos(a + 0.42) * h).toFixed(1)} ${(y2 - Math.sin(a + 0.42) * h).toFixed(1)}Z`, fill: col }));
          g.appendChild(own('line', { x1, y1, x2, y2, stroke: 'transparent', 'stroke-width': 10 }));
          if (nt.t) g.appendChild(txt({ x: x1, y: y1 - 4, 'font-size': ((nt.size || 9.5) * fScale).toFixed(2), fill: col, 'text-anchor': x2 >= x1 ? 'end' : 'start' }, nt.t));
          layer.appendChild(g);
        } else if (pr && (nt.type === 'hline' || nt.type === 'band')) {
          const r = nt.axis === 'y2' && y2r ? y2r : yr;
          if (!r) return;
          const Y = v => pr.t + pr.h - (v - r[0]) / (r[1] - r[0]) * pr.h;
          const inside = v => v >= Math.min(r[0], r[1]) && v <= Math.max(r[0], r[1]);
          if (nt.type === 'hline' && isFinite(nt.v) && inside(nt.v)) {
            layer.appendChild(own('line', { x1: pr.l, x2: pr.l + pr.w, y1: Y(nt.v), y2: Y(nt.v), stroke: col, 'stroke-width': nt.width || 1.3, 'stroke-dasharray': DASH[nt.dash || 'dash'] === 'none' ? null : DASH[nt.dash || 'dash'] }));
            if (nt.t) layer.appendChild(txt({ x: nt.right ? pr.l + pr.w - 4 : pr.l + 5, y: Y(nt.v) - 3, 'font-size': ((nt.size || 9) * fScale).toFixed(2), fill: col, 'font-weight': 600, 'text-anchor': nt.right ? 'end' : 'start' }, nt.t));
          } else if (nt.type === 'band' && isFinite(nt.v) && isFinite(nt.v2)) {
            const a = clamp(Y(Math.max(nt.v, nt.v2)), pr.t, pr.t + pr.h), b = clamp(Y(Math.min(nt.v, nt.v2)), pr.t, pr.t + pr.h);
            layer.appendChild(own('rect', { x: pr.l, y: a, width: pr.w, height: Math.max(0, b - a), fill: col, opacity: nt.opacity == null ? 0.14 : nt.opacity }));
            if (nt.t) layer.appendChild(txt({ x: pr.l + 5, y: a + 11, 'font-size': ((nt.size || 9) * fScale).toFixed(2), fill: col, 'font-weight': 600 }, nt.t));
          }
        } else if (pr && nt.type === 'vline' && xr && isFinite(nt.v)) {
          const X = pr.l + (nt.v - xr[0]) / (xr[1] - xr[0]) * pr.w;
          if (X < pr.l - 0.5 || X > pr.l + pr.w + 0.5) return;
          layer.appendChild(own('line', { x1: X, x2: X, y1: pr.t, y2: pr.t + pr.h, stroke: col, 'stroke-width': nt.width || 1.3, 'stroke-dasharray': DASH[nt.dash || 'dash'] === 'none' ? null : DASH[nt.dash || 'dash'] }));
          if (nt.t) layer.appendChild(txt({ x: X + 4, y: pr.t + 11, 'font-size': ((nt.size || 9) * fScale).toFixed(2), fill: col, 'font-weight': 600 }, nt.t));
        }
      });
    }
  }
  /* an SVG is watched: when its module redraws it, the edits go back on */
  function watch(svg) {
    if (!svg || observers.has(svg)) return;
    let t = null;
    const ob = new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => apply(svg), 0); });
    observers.set(svg, ob);
    watchedIds.add(svg.id);
    ob.observe(svg, { childList: true });
    apply(svg);
  }
  const reapplyVisible = () => watchedIds.forEach(id => { const s = document.getElementById(id); if (s && has(id) && s.getClientRects().length) apply(s); });

  /* ---------------- what the panel lists ---------------- */
  function textsOf(svg, withTicks) {
    const seen = new Map();
    svg.querySelectorAll('text:not([data-fe-own])').forEach(t => {
      if (t.closest('[data-fe-own]')) return;
      if (!withTicks && /tick$/.test(t.getAttribute('data-role') || '')) return;
      const o = t.getAttribute('data-fe-t') ?? t.textContent;
      if (o.trim() && !seen.has(o)) seen.set(o, t.getAttribute('data-role') || '');
    });
    return [...seen.keys()];
  }
  function seriesOf(svg) {
    const m = new Map();
    const names = new Map();
    const lg = legendOf(svg);
    if (lg) lg.items.forEach(it => { if (it.key && !names.has(it.key)) names.set(it.key, it.label); });
    svg.querySelectorAll(SHAPES).forEach(n => {
      if (n.closest('defs') || n.closest('[data-fe-own]') || n.hasAttribute('data-fe-own')) return;
      if (/art-ax/.test(n.getAttribute('class') || '')) return;
      ['fill', 'stroke'].forEach(a => {
        const o = n.getAttribute('data-fe-' + a) || n.getAttribute(a);
        if (!o || o === 'none' || o === 'transparent') return;
        const hx = toHex(o, svg); if (!hx) return;
        if (!m.has(o)) m.set(o, { key: o, hex: hx, n: 0, line: false, name: names.get(o) || '' });
        const r = m.get(o); r.n++; if (a === 'stroke') r.line = true;
      });
    });
    return [...m.values()].sort((a, b) => (b.name ? 1 : 0) - (a.name ? 1 : 0) || b.n - a.n).slice(0, 24);
  }
  function axisTitles(svg) {
    return ['xlab', 'ylab', 'y2lab'].map(r => { const t = svg.querySelector(`text[data-role="${r}"]`); return t ? { role: r, orig: t.getAttribute('data-fe-t') ?? t.textContent } : null; }).filter(Boolean);
  }

  /* ---------------- the panel ---------------- */
  let panel = null, cur = null, tab = 'general', cache = { texts: [], series: [] }, showTicks = false;
  const row = (lab, ctl, cls) => `<label class="inline-label fe-row${cls ? ' ' + cls : ''}"><span>${lab}</span>${ctl}</label>`;
  const rng = (attr, v, lo, hi, step, suf) => `<input type="range" min="${lo}" max="${hi}" step="${step}" value="${v}" ${attr}><b>${(+v).toFixed(2)}${suf == null ? '×' : suf}</b>`;
  const colOpt = (attr, v, def) => `<span class="fe-col"><input type="color" value="${v || def}" ${attr}><button type="button" class="fe-b fe-clear${v ? ' on' : ''}" ${attr.replace('data-', 'data-clear-')} title="${esc(T('quitar: volver al color del estudio', 'clear: back to the studio colour'))}">${v ? '✓' : '—'}</button></span>`;
  const sel = (attr, v, opts) => `<select ${attr}>${opts.map(([k, es, en]) => `<option value="${k}"${(v || '') === k ? ' selected' : ''}>${T(es, en)}</option>`).join('')}</select>`;
  const chk = (attr, on, es, en) => `<label class="checkbox-label"><input type="checkbox" ${attr}${on ? ' checked' : ''}> ${two(es, en)}</label>`;
  const DASH_OPTS = [['', 'como está', 'as drawn'], ['solid', 'continua', 'solid'], ['dash', 'guiones', 'dashed'], ['dot', 'puntos', 'dotted'], ['dashdot', 'guion y punto', 'dash-dot']];
  const TABS = [['general', 'General', 'General'], ['axes', 'Ejes y rejilla', 'Axes & grid'], ['series', 'Series', 'Series'], ['legend', 'Leyenda', 'Legend'], ['texts', 'Textos', 'Texts'], ['notes', 'Anotaciones', 'Annotations']];

  function body() {
    const svg = document.getElementById(cur), ed = edits(cur);
    if (tab === 'general') {
      return `<div class="fe-grid">
        <h4>${two('Título dentro de la figura', 'Title inside the figure')}</h4>
        <input type="text" class="fe-wide" data-g="title" value="${esc(ed.title || '')}" placeholder="${esc(T('Título (vacío = sin título)', 'Title (empty = none)'))}">
        <input type="text" class="fe-wide" data-g="subtitle" value="${esc(ed.subtitle || '')}" placeholder="${esc(T('Subtítulo', 'Subtitle'))}">
        <input type="text" class="fe-wide" data-g="note" value="${esc(ed.note || '')}" placeholder="${esc(T('Nota al pie: fuente de los datos, periodo, n…', 'Footnote: data source, period, n…'))}">
        ${row(two('Tamaño y alineación del título', 'Title size and alignment'), rng('data-g="titleScale"', ed.titleScale || 1, 0.7, 1.8, 0.05) + sel('data-g="titleAlign"', ed.titleAlign || 'left', [['left', 'izquierda', 'left'], ['center', 'centro', 'centre']]), 'fe-row3')}
        <h4>${two('Tipografía y trazo', 'Type and stroke')}</h4>
        ${row(two('Familia tipográfica', 'Font family'), `<select data-g="font">${Object.entries(FONTS).map(([k, v]) => `<option value="${k}"${(ed.font || '') === k ? ' selected' : ''}>${T(v[0], v[1])}</option>`).join('')}</select>`)}
        ${row(two('Tamaño de todos los textos', 'Size of every text'), rng('data-g="fontScale"', ed.fontScale || 1, 0.6, 2.2, 0.05))}
        ${row(two('Color de todos los textos', 'Colour of every text'), colOpt('data-g="textColor"', ed.textColor, '#152230'))}
        ${row(two('Grosor de las líneas', 'Line weight'), rng('data-g="lineScale"', ed.lineScale || 1, 0.3, 3, 0.05))}
        ${row(two('Tamaño de los puntos', 'Point size'), rng('data-g="markerScale"', ed.markerScale || 1, 0.3, 3, 0.05))}
        <h4>${two('Fondo y marco', 'Background and frame')}</h4>
        ${row(two('Fondo', 'Background'), sel('data-g="bg"', ed.bg || 'none', [['none', 'el del estudio de figuras', 'the figure studio\'s'], ['white', 'blanco', 'white'], ['custom', 'color propio', 'own colour']]) + ` <input type="color" data-g="bgColor" value="${ed.bgColor || '#ffffff'}">`, 'fe-row3')}
        ${chk('data-g="border"', ed.border, 'Marco alrededor de toda la figura', 'Border around the whole figure')}
      </div>`;
    }
    if (tab === 'axes') {
      const ax = axisTitles(svg);
      const NAME = { xlab: ['Título del eje X', 'X-axis title'], ylab: ['Título del eje Y', 'Y-axis title'], y2lab: ['Título del eje Y derecho', 'Right Y-axis title'] };
      return `<div class="fe-grid">
        <h4>${two('Títulos de los ejes', 'Axis titles')}</h4>
        ${ax.length ? ax.map(a => { const te = ed.texts[a.orig] || {}; return `<div class="fe-t fe-ax" data-o="${esc(a.orig)}"><span class="fe-lab">${two(NAME[a.role][0], NAME[a.role][1])}</span>
          <input type="text" data-t="t" value="${esc(te.t ?? a.orig)}"><input type="range" min="0.5" max="2.5" step="0.05" value="${te.scale || 1}" data-t="scale" title="${esc(T('tamaño', 'size'))}">
          <button type="button" class="fe-b${te.hidden ? ' on' : ''}" data-t="hidden" title="${esc(T('ocultar', 'hide'))}">⦸</button></div>`; }).join('') : `<p class="hint">${T('Esta figura no tiene títulos de eje reconocibles; sus textos están en la pestaña Textos.', 'This figure has no recognisable axis titles; its texts are in the Texts tab.')}</p>`}
        <h4>${two('Marcas y números de los ejes', 'Ticks and axis numbers')}</h4>
        ${row(two('Tamaño de los números', 'Size of the numbers'), rng('data-g="tickScale"', ed.tickScale || 1, 0.6, 2, 0.05))}
        ${row(two('Color de los números', 'Colour of the numbers'), colOpt('data-g="tickColor"', ed.tickColor, '#5a6b7a'))}
        ${row(two('Color de los ejes', 'Axis colour'), colOpt('data-g="axisColor"', ed.axisColor, '#8a97a3'))}
        ${row(two('Grosor de los ejes', 'Axis weight'), rng('data-g="axisWidth"', ed.axisWidth || 1, 0.4, 3, 0.05))}
        ${chk('data-g="box"', ed.box, 'Recuadro alrededor del área de trazado (ejes superior y derecho)', 'Box around the plot area (top and right axes)')}
        <h4>${two('Rejilla', 'Grid')}</h4>
        ${chk('data-g="grid"', ed.grid !== false, 'Líneas de la rejilla', 'Grid lines')}
        ${row(two('Trazo de la rejilla', 'Grid stroke'), sel('data-g="gridDash"', ed.gridDash || '', DASH_OPTS))}
        ${row(two('Intensidad de la rejilla', 'Grid strength'), rng('data-g="gridOpacity"', ed.gridOpacity == null ? 0.55 : ed.gridOpacity, 0.1, 1, 0.05, ''))}
        ${row(two('Color de la rejilla', 'Grid colour'), colOpt('data-g="gridColor"', ed.gridColor, '#bfcdd9'))}
      </div>`;
    }
    if (tab === 'series') {
      const list = cache.series;
      return `<p class="hint">${T('Cada color que usa la figura, con el nombre que le da la leyenda. Cambia el color, el grosor, el trazo o la opacidad, u oculta la serie.', 'Every colour the figure uses, named after its legend entry. Change the colour, the weight, the stroke or the opacity, or hide the series.')}</p>
        <div class="fe-series">${list.map((c, i) => { const se = ed.series[c.key] || {}; return `<div class="fe-s" data-i="${i}">
          <input type="color" data-s="color" value="${ed.colors[c.key] || c.hex}">
          <span class="fe-sname" title="${esc(c.key)}">${c.name ? esc(c.name) : `<i>${c.n} ${T('elementos', 'elements')}</i>`}${ed.colors[c.key] ? ' ✓' : ''}</span>
          <input type="range" min="0.3" max="3" step="0.05" value="${se.width || 1}" data-s="width" title="${esc(T('grosor', 'weight'))}"${c.line ? '' : ' disabled'}>
          ${sel('data-s="dash"', se.dash || '', DASH_OPTS)}
          <input type="range" min="0.1" max="1" step="0.05" value="${se.opacity == null ? 1 : se.opacity}" data-s="opacity" title="${esc(T('opacidad', 'opacity'))}">
          <button type="button" class="fe-b${se.hidden ? ' on' : ''}" data-s="hidden" title="${esc(T('ocultar la serie', 'hide the series'))}">⦸</button></div>`; }).join('')}</div>
        <div class="fe-legend-key">${T('color · nombre · grosor · trazo · opacidad · ocultar', 'colour · name · weight · stroke · opacity · hide')}</div>`;
    }
    if (tab === 'legend') {
      const lg = legendOf(svg), L = ed.legend;
      if (!lg) return `<p class="hint">${T('Esta figura no tiene una leyenda propia: sus rótulos están dentro del dibujo y se editan en la pestaña Textos.', 'This figure has no legend of its own: its labels are inside the drawing and are edited in the Texts tab.')}</p>`;
      return `<div class="fe-grid">
        ${chk('data-l="show"', !L.hidden, 'Mostrar la leyenda', 'Show the legend')}
        ${row(two('Posición', 'Position'), sel('data-l="pos"', L.pos || 'orig', POS))}
        ${chk('data-l="vertical"', L.vertical, 'En columna (una entrada por renglón)', 'As a column (one entry per line)')}
        ${chk('data-l="box"', L.box, 'Con recuadro y fondo', 'With a box and background')}
        ${row(two('Tamaño', 'Size'), rng('data-l="scale"', L.scale || 1, 0.6, 2, 0.05))}
        <p class="hint">${T('También puedes <b>arrastrarla</b> sobre la figura con el ratón.', 'You can also <b>drag it</b> on the figure with the mouse.')} ${L.dx || L.dy ? `<button type="button" class="btn btn-ghost btn-sm" data-l-reset>${T('Deshacer el arrastre', 'Undo the drag')}</button>` : ''}</p>
        <h4>${two('Entradas', 'Entries')}</h4>
        <div class="fe-texts">${lg.items.map(it => { const te = ed.texts[it.label] || {}; return `<div class="fe-t fe-leg" data-o="${esc(it.label)}"><span class="fe-sw" style="background:${ed.colors[it.key] || toHex(it.key, svg) || '#888'}"></span>
          <input type="text" data-t="t" value="${esc(te.t ?? it.label)}"><button type="button" class="fe-b${te.hidden ? ' on' : ''}" data-t="hidden" title="${esc(T('ocultar el rótulo', 'hide the label'))}">⦸</button></div>`; }).join('')}</div>
      </div>`;
    }
    if (tab === 'texts') {
      const list = cache.texts;
      return `<p class="hint">${T('Cada texto de la figura, por su redacción original. Escribe otro, cambia su tamaño, su estilo o su color, u ocúltalo. Con el editor abierto, <b>haz clic en un texto de la figura</b> para saltar a su renglón.', 'Every text of the figure, by its original wording. Type another, change its size, style or colour, or hide it. With the editor open, <b>click a text on the figure</b> to jump to its row.')}</p>
        ${chk('data-ticks', showTicks, 'Listar también los números de los ejes', 'List the axis numbers too')}
        <div class="fe-texts">${list.map((o, i) => { const te = ed.texts[o] || {}; return `<div class="fe-t" data-i="${i}">
          <input type="text" data-t="t" value="${esc(te.t ?? o)}" title="${esc(o)}">
          <input type="range" min="0.5" max="2.5" step="0.05" value="${te.scale || 1}" data-t="scale" title="${esc(T('tamaño', 'size'))}">
          <button type="button" class="fe-b${te.bold ? ' on' : ''}" data-t="bold"><b>N</b></button><button type="button" class="fe-b${te.italic ? ' on' : ''}" data-t="italic"><i>K</i></button>
          <input type="color" data-t="color" value="${te.color || '#152230'}"><button type="button" class="fe-b${te.hidden ? ' on' : ''}" data-t="hidden" title="${esc(T('ocultar', 'hide'))}">⦸</button></div>`; }).join('')}</div>`;
    }
    /* annotations */
    const pr = plotRect(svg), yr = range(svg, 'yr'), xr = range(svg, 'xr'), y2r = range(svg, 'y2r');
    const can = pr && yr;
    const KIND = { text: ['Nota', 'Note'], letter: ['Letra de panel', 'Panel letter'], arrow: ['Flecha', 'Arrow'], hline: ['Línea horizontal', 'Horizontal line'], vline: ['Línea vertical', 'Vertical line'], band: ['Banda', 'Band'] };
    const f = v => (isFinite(v) ? +(+v).toPrecision(4) : '');
    return `<p class="hint">${T('Añade lo que la figura necesita para explicarse sola. Las notas, las letras y las flechas <b>se arrastran</b> sobre la figura; las líneas y las bandas se colocan en un valor del eje.', 'Add what the figure needs to explain itself. Notes, letters and arrows <b>are dragged</b> on the figure; lines and bands sit at a value of the axis.')}</p>
      <div class="btn-row fe-add">
        <button type="button" class="btn btn-secondary btn-sm" data-add="text">+ ${T('Nota', 'Note')}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-add="arrow">+ ${T('Flecha', 'Arrow')}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-add="hline"${can ? '' : ' disabled'}>+ ${T('Línea horizontal', 'Horizontal line')}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-add="vline"${pr && xr ? '' : ' disabled'}>+ ${T('Línea vertical', 'Vertical line')}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-add="band"${can ? '' : ' disabled'}>+ ${T('Banda', 'Band')}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-add="letter">+ ${T('Letra de panel', 'Panel letter')}</button>
      </div>
      ${can ? `<p class="hint fe-range">${T('Eje Y', 'Y axis')}: ${f(yr[0])} – ${f(yr[1])}${y2r ? ` · ${T('eje derecho', 'right axis')}: ${f(y2r[0])} – ${f(y2r[1])}` : ''}${xr ? ` · ${T('eje X', 'X axis')}: ${f(xr[0])} – ${f(xr[1])}` : ''}</p>` : `<p class="hint fe-range">${T('Esta figura no tiene ejes numéricos reconocibles: solo admite notas, flechas y letras.', 'This figure has no recognisable numeric axes: it only takes notes, arrows and letters.')}</p>`}
      <div class="fe-notes">${(ed.notes || []).map(nt => `<div class="fe-n" data-id="${nt.id}">
        <div class="fe-n-head"><b>${two(KIND[nt.type][0], KIND[nt.type][1])}</b><button type="button" class="fe-b" data-del="${nt.id}" title="${esc(T('quitar', 'remove'))}">✕</button></div>
        <div class="fe-n-body">
          <input type="text" data-n="t" value="${esc(nt.t || '')}" placeholder="${esc(T('texto', 'text'))}">
          ${nt.type === 'hline' || nt.type === 'vline' || nt.type === 'band' ? `<input type="number" step="any" data-n="v" value="${f(nt.v)}" title="${esc(T('valor del eje', 'axis value'))}">` : ''}
          ${nt.type === 'band' ? `<input type="number" step="any" data-n="v2" value="${f(nt.v2)}" title="${esc(T('hasta', 'to'))}">` : ''}
          ${(nt.type === 'hline' || nt.type === 'band') && y2r ? sel('data-n="axis"', nt.axis || 'y', [['y', 'eje Y', 'Y axis'], ['y2', 'eje derecho', 'right axis']]) : ''}
          <input type="color" data-n="color" value="${nt.color || '#c0406a'}">
          ${nt.type === 'text' || nt.type === 'letter' ? `<input type="range" min="7" max="28" step="0.5" value="${nt.size || (nt.type === 'letter' ? 16 : 10)}" data-n="size" title="${esc(T('tamaño', 'size'))}"><button type="button" class="fe-b${nt.bold ? ' on' : ''}" data-n="bold"><b>N</b></button><button type="button" class="fe-b${nt.italic ? ' on' : ''}" data-n="italic"><i>K</i></button>${nt.type === 'text' ? `<button type="button" class="fe-b${nt.box ? ' on' : ''}" data-n="box" title="${esc(T('con recuadro', 'boxed'))}">▭</button>` : ''}` : ''}
          ${nt.type === 'arrow' || nt.type === 'hline' || nt.type === 'vline' ? `<input type="range" min="0.5" max="4" step="0.1" value="${nt.width || 1.3}" data-n="width" title="${esc(T('grosor', 'weight'))}">${sel('data-n="dash"', nt.dash || (nt.type === 'arrow' ? 'solid' : 'dash'), DASH_OPTS.slice(1))}` : ''}
          ${nt.type === 'band' ? `<input type="range" min="0.05" max="0.6" step="0.01" value="${nt.opacity == null ? 0.14 : nt.opacity}" data-n="opacity" title="${esc(T('opacidad', 'opacity'))}">` : ''}
          ${nt.type === 'hline' ? `<button type="button" class="fe-b${nt.right ? ' on' : ''}" data-n="right" title="${esc(T('rótulo a la derecha', 'label on the right'))}">→</button>` : ''}
        </div></div>`).join('') || `<p class="hint">${T('Todavía no hay anotaciones en esta figura.', 'No annotations on this figure yet.')}</p>`}</div>`;
  }
  function render() {
    const svg = document.getElementById(cur);
    if (!svg) return hide();
    cache = { texts: textsOf(svg, showTicks), series: seriesOf(svg) };
    panel.querySelector('.fe-body').innerHTML = body();
    panel.querySelectorAll('.fe-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    if (window.I18N) I18N.apply(panel);
  }
  const commit = () => { save(); const svg = document.getElementById(cur); if (svg) apply(svg); };
  let nid = 0;
  const newId = () => 'n' + Date.now().toString(36) + (nid++);
  function addNote(id, type, o) {
    const svg = document.getElementById(id), ed = edits(id);
    const yr = svg ? range(svg, 'yr') : null, xr = svg ? range(svg, 'xr') : null;
    const k = ed.notes.filter(n => n.type === type).length;
    const base = { id: newId(), type, color: '#c0406a' };
    const d = type === 'text' ? { t: T('Nota', 'Note'), x: 0.3 + 0.04 * k, y: 0.3 + 0.06 * k, size: 10 }
      : type === 'letter' ? { t: String.fromCharCode(65 + k), x: 0.012, y: 0.07, size: 16, color: '#152230', bold: true }
      : type === 'arrow' ? { t: '', x: 0.36 + 0.03 * k, y: 0.3 + 0.05 * k, x2: 0.48 + 0.03 * k, y2: 0.44 + 0.05 * k, width: 1.4 }
      : type === 'hline' ? { t: '', v: yr ? +((yr[0] + yr[1]) / 2).toPrecision(3) : 0, dash: 'dash' }
      : type === 'vline' ? { t: '', v: xr ? +((xr[0] + xr[1]) / 2).toPrecision(3) : 0, dash: 'dash' }
      : { t: '', v: yr ? +(yr[0] + (yr[1] - yr[0]) * 0.55).toPrecision(3) : 0, v2: yr ? +(yr[0] + (yr[1] - yr[0]) * 0.75).toPrecision(3) : 1, opacity: 0.14 };
    const nt = Object.assign(base, d, o || {});
    ed.notes.push(nt);
    return nt;
  }
  function reset(id) {
    const svg = document.getElementById(id);
    E[id] = blank();
    if (svg) apply(svg);
    delete E[id]; save();
  }
  function ensure() {
    if (panel) return panel;
    panel = mk('div', { class: 'fe-panel fs-panel', id: 'figEditPanel' });
    panel.style.display = 'none';
    panel.innerHTML = `<div class="fs-head fe-handle"><b>${two('✎ Editar esta figura', '✎ Edit this figure')}</b><span class="fe-which"></span><button class="icon-btn fs-x" data-fe-close aria-label="Cerrar">✕</button></div>
      <div class="fe-tabs">${TABS.map(([k, es, en]) => `<button type="button" class="fe-tab" data-tab="${k}">${two(es, en)}</button>`).join('')}</div>
      <div class="fe-body"></div>
      <div class="btn-row fe-foot"><button type="button" class="btn btn-ghost btn-sm" data-fe-reset>${two('Deshacer todo en esta figura', 'Undo everything on this figure')}</button><button type="button" class="btn btn-ghost btn-sm" data-fe-copy>${two('Copiar el estilo a todas las figuras', 'Copy the style to every figure')}</button><button type="button" class="btn btn-primary btn-sm" data-fe-export>${two('⤓ Exportar', '⤓ Export')}</button></div>`;
    document.body.appendChild(panel);
    panel.addEventListener('click', e => {
      if (e.target.closest('[data-fe-close]')) return hide();
      const tb = e.target.closest('.fe-tab'); if (tb) { tab = tb.dataset.tab; render(); return; }
      if (e.target.closest('[data-fe-reset]')) { reset(cur); render(); return; }
      if (e.target.closest('[data-fe-export]')) { const svg = document.getElementById(cur); const pane = svg && svg.closest('.pg-pane, [data-fig]'); const b = pane && pane.querySelector('.fig-dl'); if (b) b.click(); return; }
      if (e.target.closest('[data-fe-copy]')) {
        const g = edits(cur);
        let n = 0;
        document.querySelectorAll('.pg-pane svg[id], [data-fig] svg[id]').forEach(svg => { if (svg.id === cur) return; const d = edits(svg.id); GENERAL.concat(['gridColor']).forEach(k => { if (g[k] === undefined) delete d[k]; else d[k] = g[k]; }); watch(svg); apply(svg); n++; });
        save();
        const b = e.target.closest('[data-fe-copy]'); b.textContent = T(`Copiado a ${n} figuras ✓`, `Copied to ${n} figures ✓`);
        return;
      }
      if (e.target.closest('[data-l-reset]')) { const L = edits(cur).legend; delete L.dx; delete L.dy; commit(); render(); return; }
      const cl = e.target.closest('.fe-clear');
      if (cl) { const k = cl.getAttribute('data-clear-g'); if (k) { delete edits(cur)[k]; commit(); render(); } return; }
      const add = e.target.closest('[data-add]'); if (add) { addNote(cur, add.dataset.add); commit(); render(); return; }
      const del = e.target.closest('[data-del]'); if (del) { const ed = edits(cur); ed.notes = ed.notes.filter(n => n.id !== del.dataset.del); commit(); render(); return; }
      const b = e.target.closest('.fe-b');
      if (!b) return;
      const ed = edits(cur);
      if (b.dataset.t) {
        const r = b.closest('.fe-t'), o = r.dataset.o != null ? r.dataset.o : cache.texts[+r.dataset.i], te = (ed.texts[o] = ed.texts[o] || {});
        te[b.dataset.t] = !te[b.dataset.t]; b.classList.toggle('on', !!te[b.dataset.t]); commit();
      } else if (b.dataset.s) {
        const c = cache.series[+b.closest('.fe-s').dataset.i], se = (ed.series[c.key] = ed.series[c.key] || {});
        se.hidden = !se.hidden; b.classList.toggle('on', se.hidden); commit();
      } else if (b.dataset.n) {
        const nt = ed.notes.find(n => n.id === b.closest('.fe-n').dataset.id); if (!nt) return;
        nt[b.dataset.n] = !nt[b.dataset.n]; b.classList.toggle('on', !!nt[b.dataset.n]); commit();
      }
    });
    const onInput = e => {
      const t = e.target, ed = edits(cur);
      const val = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? +t.value : t.value;
      const lab = () => { if (t.type === 'range') { const b = t.nextElementSibling; if (b && b.tagName === 'B') b.textContent = (+t.value).toFixed(2) + (/Opacity/.test(t.dataset.g || '') ? '' : '×'); } };
      if (t.hasAttribute('data-ticks')) { showTicks = t.checked; render(); return; }
      if (t.dataset.g) {
        const g = t.dataset.g;
        if (g === 'grid') ed.grid = t.checked;
        else if (t.type === 'text') { if (t.value.trim()) ed[g] = t.value; else delete ed[g]; }
        else if (val === '' || (t.type === 'range' && g !== 'gridOpacity' && Math.abs(val - 1) < 1e-9)) delete ed[g];
        else ed[g] = val;
        lab(); commit();
        if (t.type === 'color') { const c = t.parentElement.querySelector('.fe-clear'); if (c) { c.classList.add('on'); c.textContent = '✓'; } }
        return;
      }
      if (t.dataset.l) {
        const L = ed.legend, k = t.dataset.l;
        if (k === 'show') L.hidden = !t.checked; else if (k === 'pos') { L.pos = val; delete L.dx; delete L.dy; } else L[k] = val;
        lab(); commit(); return;
      }
      if (t.dataset.t) {
        const r = t.closest('.fe-t'), o = r.dataset.o != null ? r.dataset.o : cache.texts[+r.dataset.i], te = (ed.texts[o] = ed.texts[o] || {});
        if (t.dataset.t === 't') { if (t.value === o) delete te.t; else te.t = t.value; }
        else te[t.dataset.t] = val;
        commit(); return;
      }
      if (t.dataset.s) {
        const c = cache.series[+t.closest('.fe-s').dataset.i]; if (!c) return;
        if (t.dataset.s === 'color') ed.colors[c.key] = t.value;
        else { const se = (ed.series[c.key] = ed.series[c.key] || {}); if (val === '') delete se[t.dataset.s]; else se[t.dataset.s] = val; }
        commit(); return;
      }
      if (t.dataset.n) {
        const nt = ed.notes.find(n => n.id === t.closest('.fe-n').dataset.id); if (!nt) return;
        nt[t.dataset.n] = val; commit();
      }
    };
    panel.addEventListener('input', onInput);
    panel.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') onInput(e); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) hide(); });
    /* the panel is moved by its header */
    let mv = null;
    panel.querySelector('.fe-handle').addEventListener('pointerdown', e => { if (e.target.closest('button')) return; mv = { x: e.clientX, y: e.clientY, l: panel.offsetLeft, t: panel.offsetTop }; e.preventDefault(); });
    window.addEventListener('pointermove', e => { if (!mv) return; panel.style.left = Math.max(4, mv.l + e.clientX - mv.x) + 'px'; panel.style.top = Math.max(4, mv.t + e.clientY - mv.y) + 'px'; });
    window.addEventListener('pointerup', () => { mv = null; });
    return panel;
  }

  /* ---------------- dragging on the figure ---------------- */
  let drag = null;
  function svgPoint(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const m = svg.getScreenCTM(); return m ? p.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  function onDown(e) {
    const svg = e.currentTarget;
    if (svg.id !== cur) return;
    const h = e.target.closest('[data-fe-drag]');
    if (h && svg.contains(h)) {
      const p = svgPoint(svg, e), what = h.getAttribute('data-fe-drag'), ed = edits(cur);
      drag = { svg, what, p, moved: false };
      if (what === 'legend') drag.start = { dx: ed.legend.dx || 0, dy: ed.legend.dy || 0 };
      else { const nt = ed.notes.find(n => 'note:' + n.id === what); if (!nt) { drag = null; return; } drag.nt = nt; drag.start = { x: nt.x, y: nt.y, x2: nt.x2, y2: nt.y2 }; }
      try { svg.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the move still works */ }
      e.preventDefault();
      return;
    }
    /* a click on a text of the figure opens its row */
    const t = e.target.closest('text');
    if (t && !t.closest('[data-fe-own]') && !t.hasAttribute('data-fe-own')) {
      const o = t.getAttribute('data-fe-t') ?? t.textContent;
      if (/tick$/.test(t.getAttribute('data-role') || '')) showTicks = true;
      tab = 'texts'; render();
      const i = cache.texts.indexOf(o), r = panel.querySelector(`.fe-t[data-i="${i}"] input[type=text]`);
      if (r) { r.scrollIntoView({ block: 'center' }); r.focus(); r.select(); }
    }
  }
  function onMove(e) {
    if (!drag) return;
    const p = svgPoint(drag.svg, e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.5) return;
    drag.moved = true;
    const ed = edits(cur), [, , bw, bh] = baseBox(drag.svg);
    if (drag.what === 'legend') { ed.legend.dx = +(drag.start.dx + dx).toFixed(1); ed.legend.dy = +(drag.start.dy + dy).toFixed(1); }
    else {
      const nt = drag.nt;
      nt.x = +(drag.start.x + dx / bw).toFixed(4); nt.y = +(drag.start.y + dy / bh).toFixed(4);
      if (nt.type === 'arrow') { nt.x2 = +(drag.start.x2 + dx / bw).toFixed(4); nt.y2 = +(drag.start.y2 + dy / bh).toFixed(4); }
    }
    apply(drag.svg);
  }
  function onUp() { if (!drag) return; const moved = drag.moved; drag = null; if (moved) { save(); if (tab === 'legend') render(); } }
  const armed = new WeakSet();
  function arm(svg) {
    if (armed.has(svg)) return;
    armed.add(svg);
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
  }

  function show(btn, svg) {
    ensure();
    if (cur) { const prev = document.getElementById(cur); if (prev) prev.classList.remove('fe-editing'); }
    cur = svg.id;
    edits(cur);
    watch(svg); arm(svg);
    svg.classList.add('fe-editing');
    panel.style.display = 'block';
    const r = btn.getBoundingClientRect();
    const w = Math.min(460, window.innerWidth - 16);
    panel.style.top = (r.bottom + 6 + window.scrollY) + 'px';
    panel.style.left = Math.max(8, Math.min(r.right + window.scrollX - w, window.innerWidth - w - 8)) + 'px';
    const pane = svg.closest('.pg-pane, [data-fig]'), tt = pane && pane.querySelector('.pg-title');
    const sp = tt && tt.querySelector(`[data-l="${I18N.lang}"]`);
    panel.querySelector('.fe-which').textContent = tt ? (sp ? sp.textContent : tt.textContent).trim() : '';
    render();
  }
  function hide() {
    if (panel) panel.style.display = 'none';
    if (cur) { const svg = document.getElementById(cur); if (svg) svg.classList.remove('fe-editing'); if (E[cur] && isEmpty(E[cur])) { delete E[cur]; save(); } }
    cur = null;
  }
  const isEmpty = d => !d || (Object.keys(d).every(k => ['texts', 'colors', 'series', 'legend', 'notes'].includes(k)) && !Object.keys(d.texts || {}).length && !Object.keys(d.colors || {}).length && !Object.keys(d.series || {}).length && !Object.keys(d.legend || {}).length && !(d.notes || []).length);

  /* every figure gets its ✎ button, and every edited figure is watched */
  function decorate(root) {
    (root || document).querySelectorAll('.pg-pane, [data-fig]').forEach(pane => {
      const svg = pane.querySelector('svg');
      if (!svg || !svg.id) return;
      if (has(svg.id)) watch(svg);
      if (pane.querySelector(':scope > .fig-ed')) return;
      const b = mk('button', { class: 'fig-ed', type: 'button', 'data-es-title': 'Editar esta figura: títulos, ejes, series, leyenda, textos y anotaciones', 'data-en-title': 'Edit this figure: titles, axes, series, legend, texts and annotations' }, '✎');
      b.addEventListener('click', e => { e.stopPropagation(); if (!svg.childElementCount) return; if (cur === svg.id && panel && panel.style.display !== 'none') hide(); else show(b, svg); });
      pane.appendChild(b);
    });
    if (window.I18N) I18N.apply(root || document);
  }
  document.addEventListener('langchange', () => { if (panel && cur) setTimeout(render, 30); });
  document.addEventListener('stepchange', () => setTimeout(reapplyVisible, 60));

  /* how many figures carry edits, and what kind: for the report's calculation record */
  function summary() {
    const out = {};
    Object.keys(E).forEach(id => { const d = E[id]; if (isEmpty(d)) return; out[id] = { title: d.title || null, texts: Object.keys(d.texts || {}).length, colours: Object.keys(d.colors || {}).length, series: Object.keys(d.series || {}).length, legend: Object.keys(d.legend || {}).length > 0, annotations: (d.notes || []).length, font: d.font || null }; });
    return out;
  }
  function load(obj) { if (obj && typeof obj === 'object') { E = JSON.parse(JSON.stringify(obj)); save(); watchedIds.forEach(id => { const s = document.getElementById(id); if (s) apply(s); }); Object.keys(E).forEach(id => { const s = document.getElementById(id); if (s) watch(s); }); } }

  Object.assign(FigEdit, { apply, watch, decorate, show, hide, reset, addNote, summary, load, FONTS, POS, DASH,
    get: id => edits(id), has, all: () => JSON.parse(JSON.stringify(E)), save,
    textsOf, seriesOf, legendOf, toHex, _isEmpty: isEmpty });
  window.FigEdit = FigEdit;
  /* hook into the export buttons' decoration, which every block calls after drawing */
  function hook() {
    if (window.Fig && Fig.decorate && !Fig.decorate.__fe) {
      const orig = Fig.decorate;
      Fig.decorate = function (root) { const r = orig.apply(this, arguments); try { decorate(root); } catch (e) { /* never break the page */ } return r; };
      Fig.decorate.__fe = true;
    }
  }
  hook();
  document.addEventListener('DOMContentLoaded', () => { hook(); decorate(); });
})();
