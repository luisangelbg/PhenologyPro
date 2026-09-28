/* Bloque 2: el control de calidad del ejemplo CON errores sembrados: opciones, recuadros y tabla por variable */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const carga = async (sitio = "semiarid", anios = "20", sucia = false) => { goStep(2); await W(300); document.getElementById("b2ExYears").value = anios; document.getElementById("b2ExDirty").checked = sucia; document.querySelector('#b2Examples .design-tile[data-site="' + sitio + '"]').click(); await W(700); document.getElementById("b2Build").click(); await W(1500); };
  await W(800); await carga("semiarid", "20", true);
  const c = document.getElementById("b2QcCard"); irA(c); await W(400);
  const t = document.getElementById("b2VarTable");
  return caja([c.querySelector("h2"), t], 10);
})()
