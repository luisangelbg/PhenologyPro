/* Bloque 10 (y todos): el editor ✎ de una figura, con la demanda de agua del Bloque 6 ya editada */
(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const top = n => n.getBoundingClientRect().top + window.scrollY;
  const caja = (nodos, p) => { const rs = nodos.filter(Boolean).map(n => n.getBoundingClientRect()); const x = Math.min(...rs.map(r => r.left)) - p, y = Math.min(...rs.map(r => r.top)) - p; window.__recorte = [x, y, Math.max(...rs.map(r => r.right)) + p - x, Math.max(...rs.map(r => r.bottom)) + p - y].map(Math.round).join(","); return window.__recorte; };
  const carga = async (sitio = "semiarid", anios = "20", sucia = false) => { goStep(2); await W(300); document.getElementById("b2ExYears").value = anios; document.getElementById("b2ExDirty").checked = sucia; document.querySelector('#b2Examples .design-tile[data-site="' + sitio + '"]').click(); await W(700); document.getElementById("b2Build").click(); await W(1500); };
  try { localStorage.removeItem("phenologypro:figedit"); } catch (e) {}
  await W(800); await carga(); for (const n of [3, 5]) { goStep(n); await W(1400); } goStep(6); await W(1900);
  const svg = document.getElementById("b6Demand"), pane = svg.closest(".pg-pane");
  const ed = FigEdit.get("b6Demand");
  Object.assign(ed, { title: "Demanda de agua del maíz, año mediano", note: "Bajío semiárido, serie de ejemplo 2006–2025. ETo por Penman–Monteith FAO-56.", font: "serif", fontScale: 1.1, box: true, gridDash: "dot" });
  ed.legend = { pos: "tr", vertical: true, box: true };
  FigEdit.addNote("b6Demand", "hline", { v: 5, t: "demanda de diseño: 5 mm/día", color: "#c0406a" });
  FigEdit.addNote("b6Demand", "letter");
  FigEdit.save();
  window.scrollTo({ top: top(pane) - 96, behavior: "instant" }); await W(300);
  pane.querySelector(".fig-ed").click(); await W(500);
  const panel = document.getElementById("figEditPanel");
  panel.querySelector('.fe-tab[data-tab="series"]').click(); await W(300);
  const r = pane.getBoundingClientRect();
  panel.style.left = Math.round(r.right + 14 + window.scrollX) + "px"; panel.style.top = Math.round(r.top + window.scrollY) + "px";
  await W(500);
  return caja([pane, panel], 8);
})()
