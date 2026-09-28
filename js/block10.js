/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 10: figures, report and package.

   1 · the state of the study: which blocks have run, which have not;
   2 · the catalogue of every figure drawn so far, with export one by one or all
       at once in the chosen format, resolution, theme and style;
   3 · the report: a self-contained HTML that opens anywhere and prints to PDF;
   4 · the package: a .zip with the report, the figures, the tables and the
       project file that reproduces the study, written by the app itself. */

const Block10 = {};

(function () {

  const two = (es, en) => T(es, en);
  const PANELS = [2, 3, 4, 5, 6, 7, 8, 9];
  const BLOCK_NAME = n => { const s = STEPS.find(x => x.n === n); return s ? two(s.es, s.en) : String(n); };
  const SLOT = { 2: 'weather', 3: 'climate', 4: 'degreeDays', 5: 'eto', 6: 'balance', 7: 'irrigation', 8: 'phenology', 9: 'risk' };
  const SECTION = { 2: 'data', 3: 'climate', 4: 'gdd', 5: 'eto', 6: 'balance', 7: 'irrigation', 8: 'phenology', 9: 'risk' };

  let selected = new Set();   /* svg ids ticked in the catalogue */
  let lastZipSize = null;

  /* ---------- the figures on screen ---------- */
  function titleOf(pane) {
    const t = pane.querySelector('.pg-title'); if (!t) return '';
    const sp = t.querySelector(`[data-l="${I18N.lang}"]`);
    return (sp ? sp.textContent : t.textContent).trim();
  }
  function drawn(svg) { return svg && svg.childElementCount > 0 && !(svg.childElementCount === 1 && svg.firstElementChild.tagName === 'text'); }
  /* every figure of blocks 2–9 that has something drawn */
  function catalogue() {
    const out = [];
    PANELS.forEach(n => {
      const panel = el('panel-' + n); if (!panel) return;
      panel.querySelectorAll('.pg-pane').forEach(pane => {
        const svg = pane.querySelector('svg'); if (!svg || !svg.id || !drawn(svg)) return;
        out.push({ id: svg.id, block: n, title: titleOf(pane), svg });
      });
    });
    return out;
  }

  /* ---------- 1 · the state ---------- */
  function renderState() {
    const host = el('b10State');
    host.innerHTML = PANELS.map(n => {
      const ok = !!state[SLOT[n]];
      return `<div class="b10-block ${ok ? 'ok' : 'off'}"><div class="b10-num">${n}</div><div><b>${BLOCK_NAME(n)}</b><div class="b10-sub">${ok ? two('calculado', 'computed') : two('sin calcular', 'not computed')}</div></div><button class="btn btn-ghost btn-sm" data-go="${n}">${ok ? two('Ver', 'View') : two('Ir', 'Go')}</button></div>`;
    }).join('');
    host.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.go)));
    const done = PANELS.filter(n => state[SLOT[n]]).length;
    const figs = catalogue().length;
    const msg = el('b10StateMsg');
    if (!state.weather) msg.innerHTML = `<b>${two('Sin serie', 'No series')}</b> ${two('Carga y limpia una serie diaria en el Bloque 2; después cada bloque que visites queda calculado y entra en el informe.', 'Load and clean a daily series in Block 2; afterwards every block you visit is computed and enters the report.')}`;
    else msg.innerHTML = `<b>${done} ${two('de 8 bloques calculados', 'of 8 blocks computed')} · ${figs} ${two('figuras dibujadas', 'figures drawn')}</b> ${done < 8 ? two('Los bloques sin calcular no aparecen en el informe: visita cada uno (se calcula solo al abrirlo) y vuelve aquí.', 'Blocks not computed do not appear in the report: visit each one (it computes itself on opening) and come back here.') : two('El estudio está completo: exporta las figuras, revisa el informe y descarga el paquete.', 'The study is complete: export the figures, review the report and download the package.')}`;
  }

  /* ---------- 2 · the catalogue ---------- */
  function figOpts() {
    return { format: el('b10Format').value, dpi: +el('b10Dpi').value, theme: el('b10Theme').value === 'auto' ? Theme.current() : el('b10Theme').value, background: el('b10Bg').value === 'auto' ? null : el('b10Bg').value, withTitle: el('b10WithTitle').checked };
  }
  /* a thumbnail is a copy of a live figure: its inner ids (clip paths, patterns)
     get a suffix so the page never holds the same id twice */
  function thumbIds(svg, suf) {
    const map = {};
    svg.querySelectorAll('[id]').forEach(n => { map[n.id] = n.id + suf; n.id = map[n.id]; });
    if (!Object.keys(map).length) return;
    svg.querySelectorAll('*').forEach(n => {
      for (const a of [...n.attributes]) {
        let v = a.value.replace(/url\(#([^)]+)\)/g, (m, k) => map[k] ? 'url(#' + map[k] + ')' : m);
        if (/href$/.test(a.name) && v[0] === '#' && map[v.slice(1)]) v = '#' + map[v.slice(1)];
        if (v !== a.value) n.setAttribute(a.name, v);
      }
    });
  }
  function renderCatalogue() {
    const cat = catalogue();
    const host = el('b10Catalogue');
    if (!cat.length) { host.innerHTML = `<p class="hint">${two('Todavía no hay figuras: se dibujan al visitar los bloques.', 'No figures yet: they are drawn when the blocks are visited.')}</p>`; el('b10CatCount').textContent = ''; return; }
    /* keep only selections that still exist; tick everything the first time */
    const ids = new Set(cat.map(f => f.id));
    if (!selected.size) cat.forEach(f => selected.add(f.id)); else selected = new Set([...selected].filter(id => ids.has(id)));
    let cur = null, h = '';
    cat.forEach(f => {
      if (f.block !== cur) { cur = f.block; h += `<div class="b10-group"><span class="b10-num">${f.block}</span> ${BLOCK_NAME(f.block)} <button class="btn btn-ghost btn-sm" data-sel-block="${f.block}">${two('solo estas', 'only these')}</button></div>`; }
      const clone = f.svg.cloneNode(true); clone.removeAttribute('id'); clone.setAttribute('class', 'b10-thumb'); clone.setAttribute('preserveAspectRatio', 'xMidYMid meet'); thumbIds(clone, '-t' + f.id);
      h += `<label class="b10-fig ${selected.has(f.id) ? 'on' : ''}" data-fig="${f.id}"><input type="checkbox" ${selected.has(f.id) ? 'checked' : ''} data-id="${f.id}"><div class="b10-thumbwrap">${clone.outerHTML}</div><div class="b10-figtitle">${esc(f.title)}</div><button class="btn btn-ghost btn-sm" type="button" data-one="${f.id}" title="${two('Exportar solo esta figura', 'Export this figure only')}">⤓</button></label>`;
    });
    host.innerHTML = h;
    host.querySelectorAll('input[data-id]').forEach(cb => cb.addEventListener('change', () => { if (cb.checked) selected.add(cb.dataset.id); else selected.delete(cb.dataset.id); cb.closest('.b10-fig').classList.toggle('on', cb.checked); updateCount(cat.length); }));
    host.querySelectorAll('[data-sel-block]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); selected = new Set(cat.filter(f => f.block === +b.dataset.selBlock).map(f => f.id)); renderCatalogue(); }));
    host.querySelectorAll('[data-one]').forEach(b => b.addEventListener('click', async e => { e.preventDefault(); e.stopPropagation(); const f = cat.find(x => x.id === b.dataset.one); if (f) await exportOne(f, figOpts()); }));
    updateCount(cat.length);
  }
  function updateCount(total) { el('b10CatCount').textContent = `${selected.size} / ${total}`; el('b10ExportSel').disabled = !selected.size; el('b10ZipFigs').disabled = !selected.size; }
  const fileName = f => `${String(f.block).padStart(2, '0')}_${slug(f.title || f.id)}`;
  async function exportOne(f, o) {
    return Fig.exportSvg(f.svg, { format: o.format, dpi: o.dpi, theme: o.theme, background: o.background, title: o.withTitle ? f.title : '', filename: fileName(f) });
  }
  /* a Blob per selected figure, for the package or the batch */
  async function figureFiles(o, onProgress) {
    const cat = catalogue().filter(f => selected.has(f.id));
    const out = [];
    for (let i = 0; i < cat.length; i++) {
      const f = cat[i];
      const composed = Fig.compose(f.svg, { theme: o.theme, background: o.background, title: o.withTitle ? f.title : '' });
      const file = await Fig.fileOf(composed, { format: o.format, dpi: o.dpi });
      out.push({ name: `figuras/${fileName(f)}.${file.ext}`, data: file.blob, title: f.title, block: f.block });
      if (onProgress) onProgress(i + 1, cat.length);
    }
    return out;
  }
  async function exportSelected() {
    const o = figOpts();
    const btn = el('b10ExportSel'); btn.disabled = true; btn.classList.add('is-busy');
    try {
      const files = await figureFiles(o, (i, n) => { el('b10CatStatus').textContent = two(`Exportando ${i} de ${n}…`, `Exporting ${i} of ${n}…`); });
      if (files.length > 6) {
        /* many downloads at once get blocked by the browser: one .zip instead */
        const blob = await Zip.build(files);
        download(blob, `${slug((state.site && state.site.name) || 'phenologypro')}_figuras.zip`, 'application/zip');
        el('b10CatStatus').innerHTML = two(`<b>${files.length} figuras</b> en un .zip (más de seis descargas seguidas las bloquea el navegador).`, `<b>${files.length} figures</b> in one .zip (the browser blocks more than six downloads in a row).`);
      } else {
        for (const f of files) { download(f.data, f.name.replace(/^figuras\//, ''), f.data.type); await new Promise(r => setTimeout(r, 350)); }
        el('b10CatStatus').innerHTML = two(`<b>${files.length} figuras</b> descargadas (${o.format.toUpperCase()}${o.format !== 'svg' ? ', ' + o.dpi + ' ppp' : ''}).`, `<b>${files.length} figures</b> downloaded (${o.format.toUpperCase()}${o.format !== 'svg' ? ', ' + o.dpi + ' dpi' : ''}).`);
      }
    } finally { btn.disabled = !selected.size; btn.classList.remove('is-busy'); }
  }

  /* ---------- 3 · the report ---------- */
  function reportOpts() {
    const include = {};
    PANELS.forEach(n => { include[SECTION[n]] = el('b10Sec' + n).checked; });
    return { title: el('b10Title').value.trim(), author: el('b10Author').value.trim(), include, appendix: el('b10Appendix').checked };
  }
  function renderSections() {
    el('b10Sections').innerHTML = PANELS.map(n => `<label class="checkbox-label"><input type="checkbox" id="b10Sec${n}" ${state[SLOT[n]] ? 'checked' : 'disabled'}> ${n} · ${BLOCK_NAME(n)}${state[SLOT[n]] ? '' : ` <span class="b10-sub">(${two('sin calcular', 'not computed')})</span>`}</label>`).join('');
  }
  function preview() {
    if (!state.weather) return;
    const html = Report.build(reportOpts());
    const fr = el('b10Preview'); fr.srcdoc = html; el('b10PreviewWrap').style.display = '';
    const kb = Math.round(new Blob([html]).size / 1024);
    el('b10ReportStatus').innerHTML = two(`<b>Vista previa lista</b> · ${kb} kB · ${(html.match(/<h2>/g) || []).length} secciones · ${(html.match(/<figure>/g) || []).length} figuras · ${(html.match(/<table>/g) || []).length} cuadros. Los números del informe son los que calculaste; si cambias algo en un bloque, vuelve a generar.`, `<b>Preview ready</b> · ${kb} kB · ${(html.match(/<h2>/g) || []).length} sections · ${(html.match(/<figure>/g) || []).length} figures · ${(html.match(/<table>/g) || []).length} tables. The numbers are the ones you computed; if you change anything in a block, generate again.`);
    return html;
  }
  function downloadReport() {
    if (!state.weather) return;
    const html = Report.build(reportOpts());
    download(html, `${slug((state.site && state.site.name) || 'estudio')}_informe.html`, 'text/html;charset=utf-8');
  }
  function printReport() {
    if (!state.weather) return;
    const html = Report.build(reportOpts());
    const w = window.open('', '_blank');
    if (!w) { el('b10ReportStatus').innerHTML = two('<b>El navegador bloqueó la ventana.</b> Descarga el informe y ábrelo; desde ahí, Imprimir → Guardar como PDF.', '<b>The browser blocked the window.</b> Download the report and open it; from there, Print → Save as PDF.'); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.addEventListener('load', () => setTimeout(() => w.print(), 300));
    setTimeout(() => { try { w.print(); } catch (e) { /* the load handler will */ } }, 800);
  }

  /* ---------- 4 · the package ---------- */
  function readme(files) {
    const lines = [
      two('PAQUETE DE PhenologyPro', 'PhenologyPro PACKAGE'), '',
      two(`Estudio: ${(state.site && state.site.name) || '—'}`, `Study: ${(state.site && state.site.name) || '—'}`),
      two(`Generado: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · PhenologyPro ${APP_VERSION}`, `Generated: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · PhenologyPro ${APP_VERSION}`), '',
      two('CONTENIDO', 'CONTENTS'),
      two('  informe.html      el informe completo; se abre en cualquier navegador y se imprime a PDF', '  informe.html      the full report; opens in any browser and prints to PDF'),
      two('  proyecto.json     la serie limpia y el sitio; ábrelo en el Bloque 2 para reproducir el estudio', '  proyecto.json     the clean series and the site; open it in Block 2 to reproduce the study'),
      two('  parametros.json   todos los parámetros de cada bloque (registro de cálculo)', '  parametros.json   every parameter of each block (calculation record)'),
      two('  cuadros/*.csv     los cuadros del estudio, en texto separado por comas', '  cuadros/*.csv     the tables of the study, as comma-separated text'),
      two('  figuras/*         las figuras seleccionadas, en el formato y la resolución elegidos', '  figuras/*         the selected figures, in the chosen format and resolution'), '',
      two('CÓMO REPRODUCIRLO', 'HOW TO REPRODUCE IT'),
      two('  1. Abre PhenologyPro (index.html) y en el Bloque 2 carga proyecto.json.', '  1. Open PhenologyPro (index.html) and load proyecto.json in Block 2.'),
      two('  2. Visita los Bloques 3 a 9 escribiendo en cada uno los valores de parametros.json.', '  2. Visit Blocks 3 to 9 typing in each the values of parametros.json.'),
      two('  3. Cada cuadro y cada figura vuelven a salir iguales: los cálculos son deterministas.', '  3. Every table and figure comes out the same: the computations are deterministic.'), '',
      two('ARCHIVOS', 'FILES'),
    ].concat(files.map(f => '  ' + f.name));
    return lines.join('\n');
  }
  async function buildPackage() {
    if (!state.weather) return;
    const btn = el('b10Build'); btn.disabled = true; btn.classList.add('is-busy');
    const st = el('b10PkgStatus');
    try {
      const o = figOpts();
      const files = [];
      st.textContent = two('Redactando el informe…', 'Writing the report…');
      files.push({ name: 'informe.html', data: Report.build(reportOpts()) });
      files.push({ name: 'proyecto.json', data: JSON.stringify(WxIO.pack(state.site, state.weather.rows, state.weather.meta)) });
      files.push({ name: 'parametros.json', data: JSON.stringify(Report.params(), null, 1) });
      Report.csvs().forEach(c => files.push({ name: c.name, data: c.text }));
      if (el('b10PkgFigs').checked && selected.size) {
        const figs = await figureFiles(o, (i, n) => { st.textContent = two(`Figura ${i} de ${n}…`, `Figure ${i} of ${n}…`); });
        figs.forEach(f => files.push({ name: f.name, data: f.data }));
        if (el('b10PkgSvgToo').checked && o.format !== 'svg') {
          const svgs = await figureFiles(Object.assign({}, o, { format: 'svg' }));
          svgs.forEach(f => files.push({ name: f.name, data: f.data }));
        }
      }
      files.unshift({ name: 'LEEME.txt', data: readme(files) });
      st.textContent = two('Comprimiendo…', 'Compressing…');
      const blob = await Zip.build(files);
      lastZipSize = blob.size;
      download(blob, `${slug((state.site && state.site.name) || 'phenologypro')}_paquete.zip`, 'application/zip');
      st.innerHTML = two(`<b>Paquete listo</b> · ${files.length} archivos · ${fmtSize(blob.size)}. Guárdalo junto al artículo o la tesis: quien lo abra tiene el informe, las figuras, los cuadros y el proyecto que los reproduce.`, `<b>Package ready</b> · ${files.length} files · ${fmtSize(blob.size)}. Keep it with the paper or the thesis: whoever opens it has the report, the figures, the tables and the project that reproduces them.`);
    } catch (e) {
      st.innerHTML = `<b>${two('No se pudo construir el paquete', 'The package could not be built')}</b> · ${esc(e && e.message || String(e))}`;
    } finally { btn.disabled = false; btn.classList.remove('is-busy'); }
  }
  const fmtSize = b => (b < 1024 * 1024 ? `${Math.round(b / 1024)} kB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
  function renderPkgList() {
    const n = { csv: Report.csvs().length, figs: selected.size };
    el('b10PkgList').innerHTML = [
      ['LEEME.txt', two('qué contiene y cómo reproducirlo', 'what it contains and how to reproduce it')],
      ['informe.html', two('el informe con las secciones marcadas arriba', 'the report with the sections ticked above')],
      ['proyecto.json', two('la serie limpia y el sitio (se abre en el Bloque 2)', 'the clean series and the site (opens in Block 2)')],
      ['parametros.json', two('el registro de cálculo de todos los bloques', 'the calculation record of every block')],
      [`cuadros/ (${n.csv})`, two('los cuadros en .csv', 'the tables as .csv')],
      [`figuras/ (${n.figs})`, two('las figuras seleccionadas en el catálogo', 'the figures selected in the catalogue')],
    ].map(([a, b]) => `<li><code>${a}</code> — ${b}</li>`).join('');
  }

  /* ---------- run ---------- */
  function run() {
    const has = !!state.weather;
    el('b10Empty').style.display = has ? 'none' : '';
    el('b10Body').style.display = has ? '' : 'none';
    renderState();
    if (!has) return;
    if (!el('b10Title').value) el('b10Title').placeholder = two(`Estudio agroclimático de ${state.site.name || 'el sitio'}`, `Agroclimatic study of ${state.site.name || 'the site'}`);
    renderCatalogue(); renderSections(); renderPkgList();
  }

  function init() {
    if (!el('panel-10')) return;
    el('b10ToData').addEventListener('click', () => goStep(2));
    el('b10ExportSel').addEventListener('click', exportSelected);
    el('b10SelAll').addEventListener('click', () => { selected = new Set(catalogue().map(f => f.id)); renderCatalogue(); renderPkgList(); });
    el('b10SelNone').addEventListener('click', () => { selected = new Set(); renderCatalogue(); renderPkgList(); });
    el('b10Style').addEventListener('click', () => FigStyle.show());
    el('b10ZipFigs').addEventListener('click', async () => { const o = figOpts(); const b = el('b10ZipFigs'); b.disabled = true; b.classList.add('is-busy'); try { const files = await figureFiles(o, (i, n) => { el('b10CatStatus').textContent = two(`Figura ${i} de ${n}…`, `Figure ${i} of ${n}…`); }); const blob = await Zip.build(files); download(blob, `${slug((state.site && state.site.name) || 'phenologypro')}_figuras.zip`, 'application/zip'); el('b10CatStatus').innerHTML = two(`<b>${files.length} figuras</b> en un .zip de ${fmtSize(blob.size)}.`, `<b>${files.length} figures</b> in a ${fmtSize(blob.size)} .zip.`); } finally { b.disabled = false; b.classList.remove('is-busy'); } });
    el('b10Format').addEventListener('change', () => { el('b10DpiWrap').style.display = el('b10Format').value === 'svg' ? 'none' : ''; });
    el('b10Preview_btn').addEventListener('click', preview);
    el('b10Download').addEventListener('click', downloadReport);
    el('b10Print').addEventListener('click', printReport);
    el('b10Build').addEventListener('click', buildPackage);
    document.addEventListener('stepchange', e => { if (e.detail && e.detail.step === 10) run(); });
    document.addEventListener('langchange', () => { if (document.querySelector('#panel-10.active')) run(); });
    document.addEventListener('weatherchange', () => { selected = new Set(); if (document.querySelector('#panel-10.active')) run(); });
    ['climatechange', 'etochange', 'balancechange', 'irrigationchange', 'phenologychange', 'riskchange'].forEach(ev => document.addEventListener(ev, () => { if (document.querySelector('#panel-10.active')) run(); }));
    if (window.FigStyle && FigStyle.onChange) FigStyle.onChange(() => { if (document.querySelector('#panel-10.active')) renderCatalogue(); });
  }
  document.addEventListener('DOMContentLoaded', init);

  Object.assign(Block10, { run, catalogue, figOpts, reportOpts, fileName });
  window.Block10 = Block10;
})();
