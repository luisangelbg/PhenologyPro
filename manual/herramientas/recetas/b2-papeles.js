/* Bloque 2: la tarjeta 3, qué columna es cada cosa, con el ejemplo recién leído */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  await W(800); goStep(2); await W(300);
  document.getElementById("b2ExYears").value = "20"; document.getElementById("b2ExDirty").checked = false;
  document.querySelector('#b2Examples .design-tile[data-site="semiarid"]').click(); await W(900);
  const c = document.getElementById("b2RolesCard"); irA(c); await W(400);
  return caja([c], 10);
})()
