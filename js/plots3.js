/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 3 figures: the normals, the Walter–Lieth climograph,
   the spread of the monthly rain, the calendar of each year's seasons, the
   frost probability curves and the Thornthwaite–Mather balance. */

const Plots3 = {};

(function () {
  const { frame, line, band, bars, hline, vline, legend, empty, dots } = Plot;
  const MX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const mlab = v => monthName(v, true);

  /* 1 · monthly normals: rain as bars on the right axis, temperatures as lines */
  function monthly(svgId, nm) {
    const svg = el(svgId); if (!svg) return;
    const ms = nm.months;
    const P = ms.map(x => x.P), tx = ms.map(x => x.tmax), tn = ms.map(x => x.tmin), tm = ms.map(x => x.tmean), ab = ms.map(x => x.tnAbsMean);
    const tAll = tx.concat(tn, ab).filter(v => v != null);
    const f = frame(svg, {
      W: 700, H: 320, m: { l: 44, r: 48, t: 28, b: 34 }, x: [0.5, 12.5], y: [Math.min(-2, ...tAll) - 2, Math.max(...tAll) + 4], xt: MX, xlabFmt: mlab, ylab: '°C',
      y2: [0, Math.max(20, ...P.filter(v => v != null)) * 1.15], y2lab: T('lluvia (mm/mes)', 'rain (mm/month)'), ny: 6,
    });
    bars(f, MX, P, 'var(--c4)', { sy: f.sy2, opacity: 0.4, width: (f.sx(2) - f.sx(1)) * 0.6 });
    if (ms.every(x => x.P20 != null)) {
      MX.forEach((m, i) => { const x = f.sx(m); f.plot.appendChild(svgEl('line', { x1: x, x2: x, y1: f.sy2(ms[i].P20), y2: f.sy2(ms[i].P80), stroke: 'var(--c4)', 'stroke-width': 1.4, opacity: 0.9 })); });
    }
    const seg = (arr, colour, o) => { const pts = MX.map((m, i) => arr[i] == null ? null : [f.sx(m), f.sy(arr[i])]).filter(Boolean); if (pts.length > 1) line(f, pts, colour, o); };
    seg(ab, 'var(--frost)', { width: 1.2, dash: '3 3' });
    seg(tx, 'var(--c5)', { width: 2 }); seg(tm, 'var(--c2)', { width: 1.6 }); seg(tn, 'var(--c1)', { width: 2 });
    MX.forEach((m, i) => { if (tx[i] != null) f.plot.appendChild(svgEl('circle', { cx: f.sx(m), cy: f.sy(tx[i]), r: 2.4, fill: 'var(--c5)' })); if (tn[i] != null) f.plot.appendChild(svgEl('circle', { cx: f.sx(m), cy: f.sy(tn[i]), r: 2.4, fill: 'var(--c1)' })); });
    hline(f, 0, 'var(--frost)', { dash: '2 2', width: 1 });
    legend(f, [['Tmax', 'var(--c5)', 'ln'], [T('media', 'mean'), 'var(--c2)', 'ln'], ['Tmin', 'var(--c1)', 'ln'], [T('mín. absoluta media', 'mean abs. min'), 'var(--frost)', 'dash'], [T('lluvia (barra) y P20–P80', 'rain (bar) and P20–P80'), 'var(--c4)', 'sq']], 12, f.m.l + 2);
  }

  /* 2 · Walter–Lieth, with the conventions of the atlas: 10 °C = 20 mm, the
     scale compressed 1:10 above 100 mm, humid hatched, dry dotted, perhumid
     solid, frost bars under the axis, the extremes written on the left */
  function walterLieth(svgId, nm, site, cg) {
    const svg = el(svgId); if (!svg) return;
    const W = 700, H = 380, m = { l: 62, r: 62, t: 62, b: 44 };
    const Tm = cg.T, P = cg.P;
    const pmax = Math.max(100, ...P);
    const toAxis = p => p <= 100 ? p : 100 + (p - 100) / 10;   /* mm-equivalent units of the right axis */
    const top = Math.max(toAxis(pmax) * 1.06, 2 * (Math.max(...Tm) + 4));
    const tLo = Math.min(0, Math.floor(Math.min(...Tm, cg.tnAbs == null ? 0 : cg.tnAbs) / 10) * 10 - 10);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); Plot.clear(svg);
    const x0 = m.l, x1 = W - m.r, y1 = H - m.b, y0 = m.t;
    const sx = i => x0 + (i / 12) * (x1 - x0);
    const syT = t => y1 - (t - tLo) / (top / 2 - tLo) * (y1 - y0);
    const syP = p => y1 - (toAxis(p) - 2 * tLo) / (top - 2 * tLo) * (y1 - y0);
    /* the hatch patterns */
    const defs = svgEl('defs');
    const pat = svgEl('pattern', { id: 'wlHumid', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--c4)', 'stroke-width': 1.4 }));
    const pat2 = svgEl('pattern', { id: 'wlDry', width: 5, height: 5, patternUnits: 'userSpaceOnUse' });
    pat2.appendChild(svgEl('circle', { cx: 2.5, cy: 2.5, r: 0.9, fill: 'var(--c5)' }));
    const pat3 = svgEl('pattern', { id: 'wlFrostLikely', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat3.appendChild(svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: 'var(--frost)', 'stroke-width': 2 }));
    defs.appendChild(pat); defs.appendChild(pat2); defs.appendChild(pat3); svg.appendChild(defs);
    /* curves as polylines through the middle of each month, closed at the edges */
    const xm = i => sx(i + 0.5);
    const tPts = Tm.map((t, i) => [xm(i), syT(t)]), pPts = P.map((p, i) => [xm(i), syP(Math.min(p, 100))]);
    const ext = pts => [[x0, pts[0][1]]].concat(pts, [[x1, pts[11][1]]]);
    const tE = ext(tPts), pE = ext(pPts);
    /* areas between the curves: humid where P above T, dry where below; done by sampling */
    const N = 240;
    const interp = (pts, x) => { for (let k = 0; k < pts.length - 1; k++) if (x >= pts[k][0] && x <= pts[k + 1][0]) { const t = (x - pts[k][0]) / (pts[k + 1][0] - pts[k][0]); return pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t; } return pts[pts.length - 1][1]; };
    let humidD = '', dryD = '';
    for (let k = 0; k < N; k++) {
      const xa = x0 + k / N * (x1 - x0), xb = x0 + (k + 1) / N * (x1 - x0);
      const ta = interp(tE, xa), tb = interp(tE, xb), pa = interp(pE, xa), pb = interp(pE, xb);
      const d = `M${xa.toFixed(1)} ${ta.toFixed(1)} L${xb.toFixed(1)} ${tb.toFixed(1)} L${xb.toFixed(1)} ${pb.toFixed(1)} L${xa.toFixed(1)} ${pa.toFixed(1)} Z`;
      if ((pa + pb) / 2 < (ta + tb) / 2) humidD += d; else dryD += d;
    }
    svg.appendChild(svgEl('path', { d: humidD, fill: 'url(#wlHumid)', stroke: 'none' }));
    svg.appendChild(svgEl('path', { d: dryD, fill: 'url(#wlDry)', stroke: 'none' }));
    /* perhumid: solid above 100 mm */
    P.forEach((p, i) => { if (p > 100) svg.appendChild(svgEl('rect', { x: sx(i), y: syP(p), width: sx(i + 1) - sx(i), height: syP(100) - syP(p), fill: 'var(--c4)', opacity: 0.85 })); });
    svg.appendChild(svgEl('path', { d: Plot.pathOf(tE), stroke: 'var(--c5)', 'stroke-width': 2, fill: 'none' }));
    svg.appendChild(svgEl('path', { d: Plot.pathOf(pE), stroke: 'var(--c4)', 'stroke-width': 2, fill: 'none' }));
    if (P.some(p => p > 100)) svg.appendChild(svgEl('line', { x1: x0, x2: x1, y1: syP(100), y2: syP(100), stroke: 'var(--c4)', 'stroke-width': 0.8, 'stroke-dasharray': '3 3' }));
    /* axes */
    svg.appendChild(svgEl('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: 'none', class: 'art-ax', 'stroke-width': 1.2 }));
    for (let t = Math.ceil(tLo / 10) * 10; t <= top / 2; t += 10) {
      svg.appendChild(svgEl('line', { x1: x0 - 4, x2: x0, y1: syT(t), y2: syT(t), class: 'art-ax' }));
      svg.appendChild(svgEl('text', { x: x0 - 7, y: syT(t) + 3, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, String(t)));
      if (t >= 0) { svg.appendChild(svgEl('line', { x1: x1, x2: x1 + 4, y1: syT(t), y2: syT(t), class: 'art-ax' })); svg.appendChild(svgEl('text', { x: x1 + 7, y: syT(t) + 3, 'font-size': 9, class: 'art-mut' }, String(2 * t))); }
    }
    for (let p = 200; p <= pmax; p += 100) { svg.appendChild(svgEl('line', { x1: x1, x2: x1 + 4, y1: syP(p), y2: syP(p), class: 'art-ax' })); svg.appendChild(svgEl('text', { x: x1 + 7, y: syP(p) + 3, 'font-size': 9, class: 'art-mut' }, String(p))); }
    svg.appendChild(svgEl('text', { x: x0 - 30, y: y0 - 8, 'font-size': 9.5, class: 'art-txt', 'font-weight': 700, fill: 'var(--c5)' }, '°C'));
    svg.appendChild(svgEl('text', { x: x1 + 12, y: y0 - 8, 'font-size': 9.5, class: 'art-txt', 'font-weight': 700, fill: 'var(--c4)' }, 'mm'));
    MX.forEach((mm, i) => svg.appendChild(svgEl('text', { x: xm(i), y: y1 + 14, 'font-size': 9, 'text-anchor': 'middle', class: 'art-mut' }, mlab(mm).slice(0, 1).toUpperCase())));
    /* frost bars under the axis */
    cg.frostSure.forEach((s, i) => { if (s) svg.appendChild(svgEl('rect', { x: sx(i), y: y1 + 18, width: sx(i + 1) - sx(i), height: 7, fill: 'var(--text)' })); });
    cg.frostLikely.forEach((s, i) => { if (s) svg.appendChild(svgEl('rect', { x: sx(i), y: y1 + 18, width: sx(i + 1) - sx(i), height: 7, fill: 'url(#wlFrostLikely)', stroke: 'var(--frost)', 'stroke-width': 0.6 })); });
    /* header: station, coordinates, years, means; extremes on the left */
    const name = (site && site.name) || T('Estación', 'Station');
    svg.appendChild(svgEl('text', { x: x0, y: 16, 'font-size': 12, class: 'art-txt', 'font-weight': 700 }, `${name} (${site && site.z != null ? site.z + ' m' : '—'})`));
    svg.appendChild(svgEl('text', { x: x0, y: 30, 'font-size': 9.5, class: 'art-mut' }, `${site && site.lat != null ? site.lat.toFixed(2) + '°' : ''}${site && site.lon != null ? ', ' + site.lon.toFixed(2) + '°' : ''} · ${nm.years[0]}–${nm.years[nm.years.length - 1]} (${nm.nYears} ${T('años', 'years')})`));
    svg.appendChild(svgEl('text', { x: x1, y: 16, 'font-size': 12, 'text-anchor': 'end', class: 'art-txt', 'font-weight': 700 }, `${fmtFixed(cg.Tann, 1)} °C   ${Math.round(cg.Pann)} mm`));
    if (cg.txAbs != null && isFinite(cg.txAbs)) svg.appendChild(svgEl('text', { x: x0 - 7, y: y0 + 4, 'font-size': 9, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c5)' }, fmtFixed(cg.txAbs, 1)));
    if (cg.tnAbs != null && isFinite(cg.tnAbs)) svg.appendChild(svgEl('text', { x: x0 - 7, y: y1 - 2, 'font-size': 9, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c1)' }, fmtFixed(cg.tnAbs, 1)));
    svg.appendChild(svgEl('text', { x: x0, y: 44, 'font-size': 8.5, class: 'art-mut' }, T(`${cg.humidMonths} meses húmedos (P > 2T), ${cg.dryMonths} secos, ${cg.perhumidMonths} perhúmedos (> 100 mm)`, `${cg.humidMonths} humid months (P > 2T), ${cg.dryMonths} dry, ${cg.perhumidMonths} perhumid (> 100 mm)`)));
    svg.appendChild(svgEl('text', { x: x1, y: y1 + 36, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-mut' }, T('barra negra: helada segura (Tmin media ≤ 0); rayada: probable (mínima absoluta ≤ 0)', 'black bar: certain frost (mean Tmin ≤ 0); hatched: probable (absolute minimum ≤ 0)')));
  }

  /* 3 · the season calendar of every year: the frost-free period as a bar,
     the rains as a darker span, the pivot month as a line */
  function seasons(svgId, fr, rr) {
    const svg = el(svgId); if (!svg) return;
    const years = fr.years;
    if (!years.length) { empty(svg, 700, 100, T('Sin años completos', 'No complete years')); return; }
    const rowH = years.length > 25 ? 9 : years.length > 12 ? 12 : 16;
    const W = 700, m = { l: 48, r: 16, t: 30, b: 30 }, H = m.t + m.b + rowH * years.length;
    const f = frame(svg, { W, H, m, x: [1, 366], y: [0, 1], xt: Plot.monthTicks(1, 366), xlabFmt: Plot.monthTickLabel, yt: [], grid: false });
    const seasonOf = y => rr && rr.seasons && rr.seasons.seasons ? rr.seasons.seasons.find(s => s.y === y) : null;
    years.forEach((a, i) => {
      const y = m.t + i * rowH;
      f.g.appendChild(svgEl('text', { x: m.l - 6, y: y + rowH / 2 + 3, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt' }, String(a.y)));
      const from = a.last == null ? 1 : a.last + 1, to = a.first == null ? 365 : a.first - 1;
      f.plot.appendChild(svgEl('rect', { x: f.sx(1), y: y + 1, width: f.sx(366) - f.sx(1), height: rowH - 2, fill: 'var(--frost)', opacity: 0.18 }));
      if (to >= from) f.plot.appendChild(svgEl('rect', { x: f.sx(from), y: y + 1, width: f.sx(to + 1) - f.sx(from), height: rowH - 2, fill: 'var(--c3)', opacity: 0.35 }));
      const s = seasonOf(a.y);
      if (s && s.onset != null) {
        /* a season that crosses the New Year (southern hemisphere) is drawn in two pieces */
        const e = s.end != null ? s.end : (s.onset + 150 <= 366 ? s.onset + 150 : 366);
        const piece = (a, b) => f.plot.appendChild(svgEl('rect', { x: f.sx(a), y: y + rowH * 0.3, width: Math.max(1, f.sx(b) - f.sx(a)), height: rowH * 0.4, fill: 'var(--c4)', opacity: 0.8 }));
        if (e >= s.onset) piece(s.onset, e); else { piece(s.onset, 366); piece(1, e); }
      }
      if (a.last != null) f.plot.appendChild(svgEl('line', { x1: f.sx(a.last), x2: f.sx(a.last), y1: y + 1, y2: y + rowH - 1, stroke: 'var(--c1)', 'stroke-width': 1.8 }));
      if (a.first != null) f.plot.appendChild(svgEl('line', { x1: f.sx(a.first), x2: f.sx(a.first), y1: y + 1, y2: y + rowH - 1, stroke: 'var(--c1)', 'stroke-width': 1.8 }));
    });
    vline(f, fr.pivotDoy, 'var(--c2)', { dash: '3 3', width: 1 });
    legend(f, [[T('sin helada', 'frost-free'), 'var(--c3)', 'sq'], [T('última / primera helada', 'last / first frost'), 'var(--c1)', 'ln'], [T('temporada de lluvias', 'rainy season'), 'var(--c4)', 'sq'], [T('mes más cálido', 'warmest month'), 'var(--c2)', 'dash']], 12, f.m.l + 2);
  }

  /* 4 · frost probability through the year */
  function frostCurves(svgId, fr) {
    const svg = el(svgId); if (!svg) return;
    if (!fr.n) { empty(svg, 700, 120, T('Sin años completos', 'No complete years')); return; }
    const f = frame(svg, { W: 700, H: 280, m: { l: 44, r: 16, t: 28, b: 34 }, x: [1, 365], y: [0, 1], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, ylabFmt: Plot.pctTick, ylab: T('probabilidad', 'probability'), ny: 5 });
    const xs = Array.from({ length: 365 }, (_, i) => i + 1);
    Plot.area(f, xs, fr.springCurve, 'var(--c1)', 0.12); Plot.area(f, xs, fr.autumnCurve, 'var(--c1)', 0.12);
    line(f, xs.map((x, i) => [f.sx(x), f.sy(fr.springCurve[i])]), 'var(--c1)', { width: 2 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(fr.autumnCurve[i])]), 'var(--c5)', { width: 2 });
    [0.5, 0.2, 0.1].forEach(p => hline(f, p, 'var(--c2)', { dash: '3 3', width: 0.9, label: Plot.pctTick(p), right: true }));
    fr.probs.forEach(pr => { if (pr.last) vline(f, pr.last, 'var(--c1)', { dash: '2 2', width: 0.8 }); if (pr.first) vline(f, pr.first, 'var(--c5)', { dash: '2 2', width: 0.8 }); });
    legend(f, [[T(`P(helada después de la fecha) · primavera`, 'P(frost after the date) · spring'), 'var(--c1)', 'ln'], [T('P(helada antes de la fecha) · otoño', 'P(frost before the date) · autumn'), 'var(--c5)', 'ln']], 12, f.m.l + 2);
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r, y: 12, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, T(`umbral ${fmtTemp(fr.threshold, 0)} · ${fr.n} temporadas`, `threshold ${fmtTemp(fr.threshold, 0)} · ${fr.n} seasons`)));
  }

  /* 5 · Thornthwaite–Mather monthly balance: P, PET, AET and the areas of deficit, surplus and use/recharge of the soil */
  function balance(svgId, ind) {
    const svg = el(svgId); if (!svg || !ind.ok) return;
    const rows = ind.bal.rows;
    const P = rows.map(r => r.P), PET = rows.map(r => r.PET), AET = rows.map(r => r.AET);
    const f = frame(svg, { W: 700, H: 300, m: { l: 44, r: 16, t: 28, b: 34 }, x: [0.5, 12.5], y: [0, Math.max(...P, ...PET) * 1.15], xt: MX, xlabFmt: mlab, ylab: 'mm/mes', ny: 6 });
    /* areas by pairs of months, coloured by what happens */
    for (let i = 0; i < 12; i++) {
      const x0 = f.sx(i + 0.5), x1 = f.sx(i + 1.5);
      const r = rows[i];
      if (r.deficit > 0) f.plot.appendChild(svgEl('rect', { x: x0, y: f.sy(r.PET), width: x1 - x0, height: f.sy(r.AET) - f.sy(r.PET), fill: 'var(--c5)', opacity: 0.35 }));
      if (r.surplus > 0) f.plot.appendChild(svgEl('rect', { x: x0, y: f.sy(r.P), width: x1 - x0, height: f.sy(r.P - r.surplus) - f.sy(r.P), fill: 'var(--c4)', opacity: 0.45 }));
      if (r.dST > 0) f.plot.appendChild(svgEl('rect', { x: x0, y: f.sy(r.PET + r.dST), width: x1 - x0, height: f.sy(r.PET) - f.sy(r.PET + r.dST), fill: 'var(--c3)', opacity: 0.4 }));
      if (r.dST < 0) f.plot.appendChild(svgEl('rect', { x: x0, y: f.sy(r.AET), width: x1 - x0, height: f.sy(r.P) - f.sy(r.AET), fill: 'var(--c8)', opacity: 0.4 }));
    }
    line(f, MX.map((m, i) => [f.sx(m), f.sy(P[i])]), 'var(--c4)', { width: 2 });
    line(f, MX.map((m, i) => [f.sx(m), f.sy(PET[i])]), 'var(--c5)', { width: 2 });
    line(f, MX.map((m, i) => [f.sx(m), f.sy(AET[i])]), 'var(--c3)', { width: 1.6, dash: '4 3' });
    legend(f, [['P', 'var(--c4)', 'ln'], ['ETP', 'var(--c5)', 'ln'], ['ETR', 'var(--c3)', 'dash'], [T('déficit', 'deficit'), 'var(--c5)', 'sq'], [T('excedente', 'surplus'), 'var(--c4)', 'sq'], [T('recarga', 'recharge'), 'var(--c3)', 'sq'], [T('uso del suelo', 'soil use'), 'var(--c8)', 'sq']], 12, f.m.l + 2);
  }

  /* 6 · the storage of the soil through the year, from the same balance */
  function storage(svgId, ind) {
    const svg = el(svgId); if (!svg || !ind.ok) return;
    const rows = ind.bal.rows, awc = ind.bal.awc;
    const f = frame(svg, { W: 700, H: 200, m: { l: 44, r: 16, t: 24, b: 34 }, x: [0.5, 12.5], y: [0, awc * 1.1], xt: MX, xlabFmt: mlab, ylab: T('almacenamiento (mm)', 'storage (mm)'), ny: 4 });
    Plot.area(f, MX, rows.map(r => r.ST), 'var(--c8)', 0.25);
    line(f, MX.map((m, i) => [f.sx(m), f.sy(rows[i].ST)]), 'var(--c8)', { width: 2 });
    hline(f, awc, 'var(--c1)', { dash: '4 3', label: T(`capacidad ${awc} mm`, `capacity ${awc} mm`) });
  }

  Object.assign(Plots3, { monthly, walterLieth, seasons, frostCurves, balance, storage });
  if (typeof window !== 'undefined') window.Plots3 = Plots3;
})();
