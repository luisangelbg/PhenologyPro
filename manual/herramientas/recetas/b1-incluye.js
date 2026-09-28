/* Bloque 1: «Qué incluye» y los seis sistemas de producción */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const h2 = re => [...document.querySelectorAll("#panel-1 h2, #panel-1 .section-title")].find(x => re.test(x.textContent));
  await W(1200); goStep(1); await W(400);
  const h = h2(/Qué incluye/); const g = document.getElementById("featureGrid"); const m = document.getElementById("materialStrip"); irA(h); await W(300); return caja([h, g, m], 10);
})()
