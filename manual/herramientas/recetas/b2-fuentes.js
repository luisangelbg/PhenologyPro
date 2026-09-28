/* Bloque 2: la tarjeta 2, las cuatro formas de traer la serie, con los seis ejemplos */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const tarjeta = (n, i) => document.querySelectorAll("#panel-" + n + " .card")[i];
  await W(800); goStep(2); await W(500);
  const c = tarjeta(2, 1); irA(c); await W(400);
  return caja([c], 10);
})()
