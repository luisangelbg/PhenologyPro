/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — exporting a figure.

   Every figure lives on the screen as an SVG that reads its colours from the
   stylesheet and from the figure studio. To leave the app —for a thesis, a
   slide or a printed page— it has to become a file that stands on its own:
   the colours resolved, a title of its own, a note, a background and the
   resolution a journal asks for.

   Nothing is recomputed: what leaves is exactly what the block drew. Every
   panel that holds a figure gets a small ⤓ button; it opens a menu with the
   format (PNG, JPG, SVG), the resolution and the title and note to print. */

(function () {

  const NS = 'http://www.w3.org/2000/svg';
  const FONT_FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const TOKENS = ['bg', 'bg-soft', 'card-bg', 'text', 'text-muted', 'border', 'border-strong', 'primary', 'primary-dark',
    'accent', 'gold', 'leaf', 'sky', 'rose', 'rain', 'sun', 'soil', 'frost', 'heat', 'success', 'danger', 'warning',
    'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];

  /* the colours as they stand right now: theme first, then the studio's overrides */
  function readVars(theme) {
    const out = {};
    const root = document.documentElement;
    const prev = root.getAttribute('data-theme');
    if (theme && theme !== Theme.current()) root.setAttribute('data-theme', theme);
    const cs = getComputedStyle(root);
    TOKENS.forEach(k => { out[k] = cs.getPropertyValue('--' + k).trim() || '#000000'; });
    if (theme && theme !== Theme.current()) { if (prev) root.setAttribute('data-theme', prev); else root.removeAttribute('data-theme'); }
    if (window.FigStyle) Object.assign(out, FigStyle.vars());
    return out;
  }
  const fontFamily = () => (window.FigStyle ? FigStyle.fontOf().css : FONT_FALLBACK);

  /* the classes the plotting kit uses, written as plain rules for a file that travels without the stylesheet */
  function styleSheet(P) {
    const fam = fontFamily();
    const fs = window.FigStyle ? FigStyle.get() : { fontScale: 1, lineScale: 1, grid: true };
    return `text{font-family:${fam}${fs.fontScale !== 1 ? ';font-size:' + (100 * fs.fontScale).toFixed(0) + '%' : ''}}
.art-txt:not([fill]){fill:${P.text}}
.art-mut:not([fill]){fill:${P['text-muted']}}
.art-ax{stroke:${P['border-strong']};fill:none}
.art-line{stroke:${P['text-muted']};fill:none}
.art-bg{fill:${P['bg-soft']}}
.art-card{fill:${P['card-bg']};stroke:${P.border}}
.art-p{fill:${P.primary}}.art-a{fill:${P.accent}}.art-g{fill:${P.gold}}.art-lf{fill:${P.leaf}}.art-s{fill:${P.sky}}.art-r{fill:${P.rose}}
${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `.art-c${i}{fill:${P['c' + i]}}.art-l${i}{stroke:${P['c' + i]};fill:none}`).join('')}
${fs.grid === false ? '.art-grid{display:none}' : ''}
${fs.lineScale !== 1 ? `path,polyline{stroke-width:${(1.8 * fs.lineScale).toFixed(2)}px}` : ''}`;
  }

  /* var(--x) inside an attribute is CSS, and CSS is what the exported file does not carry */
  function bake(text, P) {
    return String(text).replace(/var\(\s*--([a-z0-9-]+)\s*(?:,\s*([^)]*))?\)/gi,
      (all, name, fallback) => P[name] || (fallback ? fallback.trim() : '#1f6f9f'));
  }

  function wrapText(text, perLine) {
    const words = String(text).split(/\s+/);
    const out = [];
    let line = '';
    words.forEach(w => {
      if ((line + ' ' + w).trim().length > perLine) { if (line) out.push(line); line = w; }
      else line = (line + ' ' + w).trim();
    });
    if (line) out.push(line);
    return out.slice(0, 6);
  }
  function rect(x, y, w, h, fill) {
    const r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('fill', fill);
    return r;
  }

  /* the figure of the block, with a title above it and a note below, on a background of its own */
  function compose(source, o) {
    const opt = o || {};
    const theme = opt.theme === 'dark' ? 'dark' : 'light';
    const P = readVars(theme);
    const vb = (source.getAttribute('viewBox') || '0 0 700 320').split(/\s+/).map(Number);
    const W = vb[2] || 700, H = vb[3] || 320;
    const title = (opt.title || '').trim(), note = (opt.note || '').trim();
    const pad = 10, titleH = title ? 26 : 0;
    const noteLines = note ? wrapText(note, Math.floor(W / 5.6)) : [];
    const noteH = noteLines.length ? 8 + noteLines.length * 13 : 0;
    const total = H + titleH + noteH + pad * 2;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('xmlns', NS);
    svg.setAttribute('viewBox', `0 0 ${W} ${total}`);
    svg.setAttribute('width', W); svg.setAttribute('height', total);
    const style = document.createElementNS(NS, 'style');
    style.textContent = styleSheet(P);
    svg.appendChild(style);
    const bgId = window.FigStyle ? FigStyle.backgroundOf().id : 'none';
    let bgFill = null;
    if (opt.background === 'white') bgFill = '#ffffff';
    else if (opt.background === 'card' || (opt.background == null && bgId === 'card')) bgFill = P['card-bg'];
    else if (opt.background == null && bgId === 'white') bgFill = '#ffffff';
    else if (opt.background == null && bgId === 'paper') bgFill = '#fbf8f1';
    if (bgFill) svg.appendChild(rect(0, 0, W, total, bgFill));
    if (title) {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', pad + 4); t.setAttribute('y', pad + 16); t.setAttribute('font-size', 14); t.setAttribute('font-weight', 700); t.setAttribute('fill', P.text);
      t.textContent = title; svg.appendChild(t);
    }
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${-(vb[0] || 0)} ${pad + titleH - (vb[1] || 0)})`);   /* the figure editor may have enlarged the box upwards */
    [...source.childNodes].forEach(n => g.appendChild(n.cloneNode(true)));
    svg.appendChild(g);
    noteLines.forEach((line, i) => {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', pad + 4); t.setAttribute('y', pad + titleH + H + 16 + i * 13); t.setAttribute('font-size', 10.5); t.setAttribute('fill', P['text-muted']);
      t.textContent = line; svg.appendChild(t);
    });
    svg.dataset.w = W; svg.dataset.h = total; svg.dataset.theme = theme;
    svg.__vars = P;
    return svg;
  }

  function serialize(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', NS);
    clone.removeAttribute('data-w'); clone.removeAttribute('data-h'); clone.removeAttribute('data-theme');
    /* the bookkeeping of the figure editor stays in the app */
    clone.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if (/^data-(fe-|li$|role$)/.test(a.name)) n.removeAttribute(a.name); }));
    const text = new XMLSerializer().serializeToString(clone);
    return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + bake(text, svg.__vars || readVars());
  }

  /* CRC-32 for the PNG chunk, the same table every PNG writer builds */
  let CRC_TABLE = null;
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  /* PNG carries its resolution in a pHYs chunk, and that is what a journal reads when it asks for 300 dpi */
  function pngWithDpi(buffer, dpi) {
    const src = new Uint8Array(buffer);
    const ppm = Math.round(dpi / 0.0254);
    const chunk = new Uint8Array(21);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9);
    chunk.set([0x70, 0x48, 0x59, 0x73], 4);
    dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    const out = new Uint8Array(src.length + chunk.length);
    out.set(src.subarray(0, 33), 0); out.set(chunk, 33); out.set(src.subarray(33), 33 + chunk.length);
    return out;
  }
  function jpgWithDpi(buffer, dpi) {
    const b = new Uint8Array(buffer);
    const jfif = b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[7] === 0x46 && b[8] === 0x49 && b[9] === 0x46 && b[10] === 0;
    if (jfif) { const d = Math.max(1, Math.min(65535, Math.round(dpi))); b[13] = 1; b[14] = d >> 8; b[15] = d & 255; b[16] = d >> 8; b[17] = d & 255; }
    return b;
  }
  const scaleFor = dpi => Math.max(1, dpi / 96);

  function toRaster(svg, o) {
    const opt = o || {};
    const dpi = opt.dpi || 300;
    const format = opt.format === 'jpg' ? 'jpg' : 'png';
    const w = +svg.dataset.w || 700, h = +svg.dataset.h || 320;
    let scale = scaleFor(dpi), realDpi = dpi;
    const MAX = 16000;
    if (w * scale > MAX || h * scale > MAX) { scale = Math.min(MAX / w, MAX / h); realDpi = Math.round(scale * 96); }
    const blob = new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        const ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return; }
        if (format === 'jpg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => {
          if (!b) { reject(new Error('blob')); return; }
          b.arrayBuffer().then(ab => resolve({
            blob: new Blob([format === 'jpg' ? jpgWithDpi(ab, realDpi) : pngWithDpi(ab, realDpi)], { type: format === 'jpg' ? 'image/jpeg' : 'image/png' }),
            dpi: realDpi, width: c.width, height: c.height,
          }));
        }, format === 'jpg' ? 'image/jpeg' : 'image/png', 0.97);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('svg')); };
      img.src = url;
    });
  }
  async function fileOf(svg, o) {
    const opt = o || {};
    if (opt.format === 'svg') return { blob: new Blob([serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), ext: 'svg' };
    const r = await toRaster(svg, opt);
    return { blob: r.blob, ext: opt.format === 'jpg' ? 'jpg' : 'png', dpi: r.dpi, width: r.width, height: r.height };
  }
  /* the whole trip: the SVG on screen → a file in the downloads folder */
  async function exportSvg(source, o) {
    const opt = o || {};
    const composed = compose(source, opt);
    const f = await fileOf(composed, opt);
    download(f.blob, `${slug(opt.filename || opt.title || 'figura')}.${f.ext}`, f.blob.type);
    return f;
  }

  /* =====================================================================
     the ⤓ button of every panel and its menu
     ===================================================================== */
  let menu = null, target = null;
  function buildMenu() {
    if (menu) return menu;
    menu = mk('div', { class: 'fig-menu', id: 'figMenu' });
    menu.style.display = 'none';
    document.body.appendChild(menu);
    menu.addEventListener('click', async e => {
      if (e.target.closest('[data-fig-close]')) { hideMenu(); return; }
      const go = e.target.closest('[data-fig-go]');
      if (!go || !target) return;
      go.disabled = true;
      try {
        await exportSvg(target.svg, {
          format: el('fmFormat').value, dpi: +el('fmDpi').value, theme: el('fmTheme').value,
          background: el('fmBg').value === 'auto' ? null : el('fmBg').value,
          title: el('fmTitle').value, note: el('fmNote').value, filename: el('fmTitle').value || target.title,
        });
        hideMenu();
      } catch (err) {
        console.error(err);
        const m = el('fmMsg'); if (m) m.textContent = T('No se pudo exportar la figura.', 'The figure could not be exported.');
      } finally { go.disabled = false; }
    });
    document.addEventListener('click', e => {
      if (!menu || menu.style.display === 'none') return;
      if (e.target.closest('#figMenu') || e.target.closest('.fig-dl')) return;
      hideMenu();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideMenu(); });
    return menu;
  }
  function two(es, en) { return L2(es, en); }
  function showMenu(btn, svg, titleText) {
    buildMenu();
    target = { svg, title: titleText };
    const dark = Theme.current() === 'dark';
    menu.innerHTML = `<div class="fs-head"><b>${two('⤓ Exportar esta figura', '⤓ Export this figure')}</b><button class="icon-btn fs-x" data-fig-close>✕</button></div>
      <div class="fig-menu-grid">
        <label class="inline-label">${two('Formato', 'Format')}<select id="fmFormat"><option value="png">PNG</option><option value="jpg">JPG</option><option value="svg">SVG</option></select></label>
        <label class="inline-label">${two('Resolución', 'Resolution')}<select id="fmDpi"><option value="150">150 ppp</option><option value="300" selected>300 ppp</option><option value="600">600 ppp</option><option value="900">900 ppp</option></select></label>
        <label class="inline-label">${two('Tema', 'Theme')}<select id="fmTheme"><option value="light"${dark ? '' : ' selected'}>${T('Claro', 'Light')}</option><option value="dark"${dark ? ' selected' : ''}>${T('Oscuro', 'Dark')}</option></select></label>
        <label class="inline-label">${two('Fondo', 'Background')}<select id="fmBg"><option value="auto">${T('El del estudio', 'The studio\'s')}</option><option value="white">${T('Blanco', 'White')}</option><option value="card">${T('El del tema', 'The theme\'s')}</option><option value="none">${T('Transparente', 'Transparent')}</option></select></label>
      </div>
      <label class="inline-label fm-wide">${two('Título', 'Title')}<input type="text" id="fmTitle" value="${esc(titleText || '')}"></label>
      <label class="inline-label fm-wide">${two('Nota al pie', 'Footnote')}<input type="text" id="fmNote" placeholder="${esc(T('Fuente, método, unidad…', 'Source, method, unit…'))}"></label>
      <div class="btn-row"><button class="btn btn-primary btn-sm" data-fig-go>${two('Descargar', 'Download')}</button><span class="hint" id="fmMsg" style="margin:0"></span></div>`;
    menu.style.display = 'block';
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 6 + window.scrollY) + 'px';
    const left = Math.min(r.left + window.scrollX, window.innerWidth - 340);
    menu.style.left = Math.max(8, left) + 'px';
  }
  function hideMenu() { if (menu) menu.style.display = 'none'; target = null; }

  /* every .pg-pane (and any element with data-fig) gets its button once */
  function decorate(root) {
    (root || document).querySelectorAll('.pg-pane, [data-fig]').forEach(pane => {
      if (pane.querySelector(':scope > .fig-dl')) return;
      const svg = pane.querySelector('svg');
      if (!svg) return;
      const b = mk('button', { class: 'fig-dl', type: 'button', 'data-es-title': 'Exportar esta figura (PNG, JPG o SVG)', 'data-en-title': 'Export this figure (PNG, JPG or SVG)' }, '⤓');
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (!svg.childElementCount) return;
        const t = pane.querySelector('.pg-title');
        showMenu(b, svg, t ? t.textContent.trim() : '');
      });
      pane.appendChild(b);
    });
    if (window.I18N) I18N.apply(root || document);
  }

  window.Fig = { TOKENS, readVars, styleSheet, bake, compose, serialize, toRaster, fileOf, exportSvg, pngWithDpi, jpgWithDpi, crc32, scaleFor, wrapText, decorate, showMenu, hideMenu };
  document.addEventListener('DOMContentLoaded', () => decorate());
})();
