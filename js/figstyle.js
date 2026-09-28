/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — the figure studio: the look of every figure, in one place.

   Every plot in this program draws its colours through CSS custom properties
   and its text through two or three classes, never a literal colour. So the
   studio does not edit figures one by one: it writes one rule,

       svg { --c1: …; --text: …; --fig-font: … }

   and every curve, bar and band of the ten blocks follows, on screen and in
   the exported file. The rule is scoped to `svg` on purpose: the coloured
   chips of the interface use the same tokens and a figure palette has no
   business recolouring the menus.

   The studio is opened from the palette button of the top bar and is
   available from the first block: a laboratory figure is a figure. */

const FigStyle = {};

(function () {

  /* Ten colours each, in the order the figures use them, chosen to stay apart
     in hue AND in lightness so a figure still reads in greyscale. */
  const PALETTES = [
    { id: 'pheno', name: ['PhenologyPro', 'PhenologyPro'],
      note: ['La del programa: azul de cielo, ámbar de sol, verde de hoja y azul de lluvia.', 'The program\'s own: sky blue, sun amber, leaf green and rain blue.'],
      c: ['#1f6f9f', '#d8901c', '#4f8f3a', '#2f5fc4', '#b8452f', '#7b5ea7', '#3aa39a', '#8a6a4a', '#c0406a', '#5f6b86'] },
    { id: 'okabe', name: ['Okabe–Ito (segura al daltonismo)', 'Okabe–Ito (colour-blind safe)'],
      note: ['Diseñada para distinguirse con deuteranopía y protanopía. La opción prudente para publicar.', 'Designed to stay distinguishable under deuteranopia and protanopia. The prudent choice for publishing.'],
      c: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#D55E00', '#56B4E9', '#F0E442', '#000000', '#7F7F7F', '#B2DF8A'] },
    { id: 'viridis', name: ['Viridis', 'Viridis'],
      note: ['Perceptualmente uniforme y monótona en luminancia: ordena bien y sobrevive al blanco y negro.', 'Perceptually uniform and monotonic in lightness: it orders well and survives greyscale.'],
      c: ['#440154', '#472D7B', '#3B518B', '#2C718E', '#21908C', '#27AD81', '#5CC863', '#AADC32', '#D8E219', '#FDE725'] },
    { id: 'season', name: ['Estaciones', 'Seasons'],
      note: ['Del frío del invierno al calor del verano: para figuras que recorren el año.', 'From winter cold to summer heat: for figures that run through the year.'],
      c: ['#2c5aa0', '#3c8dbc', '#5fb0a0', '#8cc24a', '#e2c044', '#e8912d', '#d0562b', '#a3324a', '#6b4fa0', '#4a6b8a'] },
    { id: 'earth', name: ['Tierra', 'Earth'],
      note: ['Ocres, verdes y arcillas: para suelos, balances y mapas.', 'Ochres, greens and clays: for soils, balances and maps.'],
      c: ['#6B4423', '#A0713B', '#C9A227', '#7D8C3C', '#4A6B3A', '#2E5A50', '#8C5A3C', '#B5793C', '#5C6B47', '#3F4A3C'] },
    { id: 'cool', name: ['Fríos', 'Cool'],
      note: ['Azules, verdes y violetas. Discreta, buena para muchas series.', 'Blues, greens and violets. Quiet, good for many series.'],
      c: ['#1F4E79', '#2E75B6', '#41A5C4', '#3FA37A', '#5FB56B', '#7A6CC4', '#4B3F8F', '#2C8A8A', '#6E8FB5', '#39566B'] },
    { id: 'warm', name: ['Cálidos', 'Warm'],
      note: ['Rojos, naranjas y dorados. Llama la atención; úsala cuando la figura sea el argumento.', 'Reds, oranges and golds. It shouts; use it when the figure is the argument.'],
      c: ['#8C2F1F', '#C1441E', '#E07B24', '#D9A521', '#A85C2E', '#7A3B52', '#B5563F', '#E0A96D', '#96421F', '#C97B2E'] },
    { id: 'contrast', name: ['Alto contraste', 'High contrast'],
      note: ['Máxima separación entre colores contiguos. Para proyectar o imprimir en papel pobre.', 'Maximum separation between neighbouring colours. For projecting or printing on poor paper.'],
      c: ['#000000', '#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#008080', '#9A6324', '#800000', '#808000'] },
    { id: 'grey', name: ['Escala de grises', 'Greyscale'],
      note: ['Para revistas que cobran el color. Comprueba aquí si tu figura se entiende sin él.', 'For journals that charge for colour. Check here whether your figure survives without it.'],
      c: ['#111111', '#3D3D3D', '#5C5C5C', '#777777', '#919191', '#A8A8A8', '#BDBDBD', '#D0D0D0', '#E0E0E0', '#EFEFEF'] },
  ];

  /* Only families that exist on a normal computer: a figure that falls back to
     something else on the reviewer's machine is a figure you did not design. */
  const FONTS = [
    { id: 'system', name: ['Del sistema', 'System'], css: 'system-ui, sans-serif' },
    { id: 'humanist', name: ['Sans humanista', 'Humanist sans'], css: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' },
    { id: 'grotesque', name: ['Sans neogrotesca', 'Neo-grotesque sans'], css: 'Helvetica, Arial, sans-serif' },
    { id: 'serif', name: ['Serif', 'Serif'], css: 'Georgia, "Times New Roman", Times, serif' },
    { id: 'slab', name: ['Serif de trazo grueso', 'Slab serif'], css: '"Bookman Old Style", "Palatino Linotype", Palatino, Georgia, serif' },
    { id: 'condensed', name: ['Estrecha', 'Condensed'], css: '"Arial Narrow", "Liberation Sans Narrow", "Segoe UI", sans-serif' },
    { id: 'mono', name: ['Monoespaciada', 'Monospaced'], css: 'ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace' },
  ];
  const BACKGROUNDS = [
    { id: 'none', name: ['Sin fondo (transparente)', 'No background (transparent)'], css: 'transparent' },
    { id: 'card', name: ['El del tema', 'The theme\'s'], css: 'var(--card-bg)' },
    { id: 'white', name: ['Blanco', 'White'], css: '#ffffff' },
    { id: 'paper', name: ['Papel crema', 'Cream paper'], css: '#fbf8f1' },
  ];
  /* the tokens a figure may recolour; the rest of the theme is left alone */
  const TOKENS = ['text', 'text-muted', 'border', 'border-strong', 'bg-soft', 'card-bg',
    'accent', 'primary', 'gold', 'leaf', 'sky', 'rose', 'rain', 'sun', 'soil', 'frost', 'heat'];

  const DEF = { palette: 'pheno', custom: {}, tokens: {}, font: 'system', fontScale: 1, lineScale: 1, background: 'none', grid: true };
  let S = Object.assign({}, DEF, Prefs.get('figstyle', {}), { custom: {}, tokens: {} });
  const saved = Prefs.get('figstyle', null);
  if (saved) { S.custom = saved.custom || {}; S.tokens = saved.tokens || {}; }
  const listeners = new Set();

  function paletteOf(id) { return PALETTES.find(p => p.id === (id || S.palette)) || PALETTES[0]; }
  function fontOf(id) { return FONTS.find(f => f.id === (id || S.font)) || FONTS[0]; }
  function backgroundOf(id) { return BACKGROUNDS.find(b => b.id === (id || S.background)) || BACKGROUNDS[0]; }
  function colours() {
    const base = paletteOf().c.slice();
    for (let i = 1; i <= 10; i++) if (S.custom['c' + i]) base[i - 1] = S.custom['c' + i];
    return base;
  }
  /* everything the figures should resolve to: what the export needs */
  function vars() {
    const out = {};
    colours().forEach((c, i) => { out['c' + (i + 1)] = c; });
    Object.keys(S.tokens).forEach(k => { if (S.tokens[k]) out[k] = S.tokens[k]; });
    return out;
  }

  const STYLE_ID = 'figstyle-rule';
  function cssText() {
    const v = vars();
    const decl = Object.keys(v).map(k => `--${k}:${v[k]}`).join(';');
    const bg = backgroundOf().css;
    return `svg{${decl};--fig-font:${fontOf().css};` +
      `font-size:${S.fontScale === 1 ? '' : (100 * S.fontScale).toFixed(1) + '%'};` +
      (bg === 'transparent' ? '' : `background:${bg};`) + '}' +
      `svg text{font-family:var(--fig-font)}` +
      (S.fontScale === 1 ? '' : `svg text{font-size:inherit}`) +
      (S.lineScale === 1 ? '' : `svg path,svg polyline{stroke-width:${(1.8 * S.lineScale).toFixed(2)}px}`) +
      (S.grid ? '' : `svg .art-grid{display:none}`);
  }
  function apply() {
    if (typeof document === 'undefined') return;
    let st = document.getElementById(STYLE_ID);
    if (!st) { st = document.createElement('style'); st.id = STYLE_ID; document.head.appendChild(st); }
    st.textContent = cssText();
    Prefs.set('figstyle', S);
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  function set(patch) {
    if (!patch) return;
    if (patch.custom) { S.custom = Object.assign({}, S.custom, patch.custom); delete patch.custom; }
    if (patch.tokens) { S.tokens = Object.assign({}, S.tokens, patch.tokens); delete patch.tokens; }
    S = Object.assign(S, patch);
    apply();
  }
  function reset() { S = Object.assign({}, DEF, { custom: {}, tokens: {} }); apply(); }
  function get() { return JSON.parse(JSON.stringify(S)); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  /* =====================================================================
     the studio panel
     ===================================================================== */
  let panel = null;
  function two(p) { return L2(p[0], p[1]); }
  function buildPanel() {
    if (panel) return panel;
    panel = mk('div', { class: 'fs-panel', id: 'figStylePanel', role: 'dialog' });
    panel.style.display = 'none';
    document.body.appendChild(panel);
    panel.addEventListener('click', e => {
      const chip = e.target.closest('[data-pal]');
      if (chip) { set({ palette: chip.dataset.pal, custom: {} }); fill(); return; }
      if (e.target.closest('[data-fs-reset]')) { reset(); fill(); return; }
      if (e.target.closest('[data-fs-close]')) { hide(); return; }
    });
    panel.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'fsFont') set({ font: t.value });
      else if (t.id === 'fsBg') set({ background: t.value });
      else if (t.id === 'fsFontScale') { set({ fontScale: +t.value }); const v = el('fsFontScaleVal'); if (v) v.textContent = Math.round(+t.value * 100) + '%'; }
      else if (t.id === 'fsLineScale') { set({ lineScale: +t.value }); const v = el('fsLineScaleVal'); if (v) v.textContent = (+t.value).toFixed(2) + '×'; }
      else if (t.id === 'fsGrid') set({ grid: t.checked });
      else if (t.dataset && t.dataset.cust) { const c = {}; c[t.dataset.cust] = t.value; set({ custom: c }); fill(false); }
    });
    document.addEventListener('click', e => {
      if (!panel || panel.style.display === 'none') return;
      if (e.target.closest('#figStylePanel') || e.target.closest('#figStyleBtn')) return;
      hide();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
    document.addEventListener('langchange', () => { if (panel && panel.style.display !== 'none') fill(); });
    return panel;
  }
  function fill(swatchesToo) {
    const p = buildPanel();
    const cols = colours();
    if (swatchesToo === false) {
      p.querySelectorAll('.fs-sw').forEach((n, i) => { n.style.background = cols[i]; });
      return;
    }
    p.innerHTML = `<div class="fs-head"><b>${two(['🎨 Estudio de figuras', '🎨 Figure studio'])}</b><button class="icon-btn fs-x" data-fs-close title="Cerrar">✕</button></div>
      <p class="hint" style="margin:0 0 8px">${two(['Una sola regla restila todas las figuras de la app, en pantalla y al exportar. Nada se recalcula.', 'A single rule restyles every figure of the app, on screen and when exporting. Nothing is recomputed.'])}</p>
      <h4>${two(['Paleta', 'Palette'])}</h4>
      <div class="fs-pals">${PALETTES.map(pl => `<button class="fs-pal${pl.id === S.palette ? ' on' : ''}" data-pal="${pl.id}" title="${esc(T(pl.note))}"><span class="fs-strip">${pl.c.map(c => `<i style="background:${c}"></i>`).join('')}</span><span>${two(pl.name)}</span></button>`).join('')}</div>
      <p class="hint" style="margin:6px 0 4px">${two([paletteOf().note[0], paletteOf().note[1]])}</p>
      <h4>${two(['Ajustar un color', 'Adjust one colour'])}</h4>
      <div class="fs-swatches">${cols.map((c, i) => `<label class="fs-swl"><span class="fs-sw" style="background:${c}"></span><input type="color" value="${c}" data-cust="c${i + 1}"><small>c${i + 1}</small></label>`).join('')}</div>
      <div class="fs-grid">
        <label class="inline-label">${two(['Tipografía', 'Font'])}<select id="fsFont">${FONTS.map(f => `<option value="${f.id}"${f.id === S.font ? ' selected' : ''}>${T(f.name)}</option>`).join('')}</select></label>
        <label class="inline-label">${two(['Fondo', 'Background'])}<select id="fsBg">${BACKGROUNDS.map(b => `<option value="${b.id}"${b.id === S.background ? ' selected' : ''}>${T(b.name)}</option>`).join('')}</select></label>
        <label class="inline-label">${two(['Tamaño del texto', 'Text size'])}<input type="range" id="fsFontScale" min="0.7" max="1.6" step="0.05" value="${S.fontScale}"><span class="range-val" id="fsFontScaleVal">${Math.round(S.fontScale * 100)}%</span></label>
        <label class="inline-label">${two(['Grosor de líneas', 'Line weight'])}<input type="range" id="fsLineScale" min="0.5" max="2.5" step="0.05" value="${S.lineScale}"><span class="range-val" id="fsLineScaleVal">${S.lineScale.toFixed(2)}×</span></label>
        <label class="inline-label"><input type="checkbox" id="fsGrid"${S.grid ? ' checked' : ''}> ${two(['Cuadrícula de fondo', 'Background grid'])}</label>
      </div>
      <div class="btn-row"><button class="btn btn-secondary btn-sm" data-fs-reset>${two(['↻ Volver al estilo original', '↻ Back to the original style'])}</button></div>`;
  }
  function show(anchor) {
    fill();
    panel.style.display = 'block';
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      panel.style.top = (r.bottom + 8 + window.scrollY) + 'px';
      const right = Math.max(8, window.innerWidth - r.right);
      panel.style.right = right + 'px';
      panel.style.left = 'auto';
    }
  }
  function hide() { if (panel) panel.style.display = 'none'; }
  function toggle(anchor) { if (panel && panel.style.display !== 'none') hide(); else show(anchor); }

  Object.assign(FigStyle, { PALETTES, FONTS, BACKGROUNDS, TOKENS, DEF, paletteOf, fontOf, backgroundOf, colours, vars, cssText, apply, set, reset, get, onChange, show, hide, toggle });
  if (typeof window !== 'undefined') window.FigStyle = FigStyle;

  if (typeof document !== 'undefined') {
    apply();
    document.addEventListener('DOMContentLoaded', () => {
      apply();
      const b = el('figStyleBtn');
      if (b) b.addEventListener('click', e => { e.stopPropagation(); toggle(b); });
    });
  }
})();
