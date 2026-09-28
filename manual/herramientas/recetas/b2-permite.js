/* Bloque 2: «Lo que estos datos permiten» y la tarjeta 5 de la serie limpia */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const carga = async (sitio = "semiarid", anios = "20", sucia = false) => { goStep(2); await W(300); document.getElementById("b2ExYears").value = anios; document.getElementById("b2ExDirty").checked = sucia; document.querySelector('#b2Examples .design-tile[data-site="' + sitio + '"]').click(); await W(700); document.getElementById("b2Build").click(); await W(1500); };
  await W(800); await carga();
  const h = [...document.querySelectorAll("#b2QcCard h3")].find(x => /permiten/.test(x.textContent));
  const caps = document.getElementById("b2CapMsg");
  irA(h); await W(400);
  return caja([h, caps], 10);
})()
