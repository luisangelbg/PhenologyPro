/* Bloque 8: el frío invernal del Valle templado */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const irA = n => window.scrollTo({ top: top(n) - 96, behavior: "instant" });
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const carga = async (sitio = "semiarid", anios = "20", sucia = false) => { goStep(2); await W(300); document.getElementById("b2ExYears").value = anios; document.getElementById("b2ExDirty").checked = sucia; document.querySelector('#b2Examples .design-tile[data-site="' + sitio + '"]').click(); await W(700); document.getElementById("b2Build").click(); await W(1500); };
  const tarjeta = (n, i) => document.querySelectorAll("#panel-" + n + " .card")[i];
  const pane = id => document.getElementById(id).closest(".pg-pane");
  const q = s => document.querySelector(s);
  const pasos = async (...ns) => { for (const n of ns) { goStep(n); await W(1400); } };
  await W(800); await carga("temperate", "20"); await pasos(3, 4); goStep(8); await W(2200);
  document.getElementById("b8Crop").value = "apple"; document.getElementById("b8Crop").dispatchEvent(new Event("change")); await W(2000);
  const nodos = [tarjeta(8, 3).querySelector(".results-summary"), pane("b8ChillCurves"), pane("b8ChillYears")];
  irA(nodos.filter(Boolean).reduce((a, b) => (top(b) < top(a) ? b : a))); await W(500);
  return caja(nodos, 8);
})()
