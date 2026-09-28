/* Bloque 1: la galería de métodos, filtrada a tiempo térmico */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const h2 = re => [...document.querySelectorAll("#panel-1 h2, #panel-1 .section-title")].find(x => re.test(x.textContent));
  await W(1200); goStep(1); await W(400);
  const h = h2(/Métodos que cubre/); const f = document.getElementById("methodFilter"); const b = [...f.querySelectorAll("button")].find(x => /térmico/.test(x.textContent)); if (b) b.click(); await W(400); const g = document.getElementById("methodGallery"); irA(h); await W(300); return caja([h, f, g], 10);
})()
