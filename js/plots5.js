/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 5 figures: the methods by month, the record of ETo,
   the two halves of Penman–Monteith, the radiation budget, the agreement of
   Hargreaves with Penman–Monteith and the annual totals. */

const Plots5 = {};

(function () {
  const { frame, line, band, bars, hline, legend, empty } = Plot;
  const MX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const mlab = v => monthName(v, true);
  const COL = { pm: 'var(--c1)', hs: 'var(--c2)', pt: 'var(--c3)', turc: 'var(--c6)', tw: 'var(--c8)' };
  const NAME = { pm: 'Penman–Monteith', hs: 'Hargreaves', pt: 'Priestley–Taylor', turc: 'Turc', tw: 'Thornthwaite' };

  /* 1 · monthly means by method, with the P20–P80 band of the reference */
  function methods(svgId, mon, tw) {
    const svg = el(svgId); if (!svg) return;
    const all = Object.keys(mon).flatMap(k => mon[k].map(x => x.perDay)).concat(tw ? tw.map(x => x.perDay) : []).filter(v => v != null);
    if (!all.length) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const f = frame(svg, { W: 700, H: 300, m: { l: 48, r: 16, t: 28, b: 34 }, x: [0.5, 12.5], y: [0, Math.max(...all) * 1.15], xt: MX, xlabFmt: mlab, ylab: 'ETo (mm/día)', ny: 6 });
    const pmM = mon.pm;
    if (pmM.every(x => x.p20 != null)) band(f, MX, pmM.map(x => x.p20), pmM.map(x => x.p80), COL.pm, 0.14);
    const draw = (arr, colour, o) => { const pts = MX.map((m, i) => arr[i] == null ? null : [f.sx(m), f.sy(arr[i])]).filter(Boolean); if (pts.length > 1) line(f, pts, colour, o); };
    ['turc', 'pt', 'hs'].forEach(k => draw(mon[k].map(x => x.perDay), COL[k], { width: 1.6 }));
    if (tw) draw(tw.map(x => x.perDay), COL.tw, { width: 1.4, dash: '4 3' });
    draw(pmM.map(x => x.perDay), COL.pm, { width: 2.6 });
    MX.forEach((m, i) => { if (pmM[i].perDay != null) f.plot.appendChild(svgEl('circle', { cx: f.sx(m), cy: f.sy(pmM[i].perDay), r: 2.6, fill: COL.pm })); });
    legend(f, [['Penman–Monteith (P20–P80)', COL.pm, 'ln'], ['Hargreaves', COL.hs, 'ln'], ['Priestley–Taylor', COL.pt, 'ln'], ['Turc', COL.turc, 'ln']].concat(tw ? [['Thornthwaite', COL.tw, 'dash']] : []), 12, f.m.l + 2);
  }

  /* 2 · the record: daily up to three years, monthly means beyond */
  function record(svgId, rows, pm, hs) {
    const svg = el(svgId); if (!svg) return;
    const daily = rows.length <= 1100;
    const xs = [], a = [], b = [];
    if (daily) rows.forEach((r, i) => { xs.push(i); a.push(pm[i]); b.push(hs[i]); });
    else {
      const by = new Map();
      rows.forEach((r, i) => { const k = r.y * 12 + r.m - 1; if (!by.has(k)) by.set(k, { i, pa: [], pb: [] }); const t = by.get(k); if (pm[i] != null) t.pa.push(pm[i]); if (hs[i] != null) t.pb.push(hs[i]); });
      [...by.values()].forEach(t => { xs.push(t.i); a.push(t.pa.length ? Stat.mean(t.pa) : null); b.push(t.pb.length ? Stat.mean(t.pb) : null); });
    }
    const all = a.concat(b).filter(v => v != null);
    if (!all.length) { empty(svg, 900, 160, T('Sin datos', 'No data')); return; }
    const ticks = [], labels = {};
    rows.forEach((r, i) => { if ((r.m === 1 && r.d === 1) || i === 0) { ticks.push(i); labels[i] = String(r.y); } });
    const years = ticks.length;
    const keep = years > 12 ? ticks.filter((_, k) => k % Math.ceil(years / 12) === 0) : ticks;
    const f = frame(svg, { W: 900, H: 260, m: { l: 44, r: 16, t: 26, b: 34 }, x: [0, rows.length - 1], y: [0, Math.max(...all) * 1.12], xt: keep, xlabFmt: v => labels[v] || '', ylab: 'ETo (mm/día)', ny: 5 });
    const segs = arr => { const out = []; let cur = []; xs.forEach((x, i) => { if (arr[i] == null) { if (cur.length) out.push(cur); cur = []; } else cur.push([f.sx(x), f.sy(arr[i])]); }); if (cur.length) out.push(cur); return out; };
    segs(b).forEach(s => line(f, s, COL.hs, { width: daily ? 0.8 : 1.4, opacity: 0.8 }));
    segs(a).forEach(s => line(f, s, COL.pm, { width: daily ? 1 : 1.8 }));
    legend(f, [['Penman–Monteith', COL.pm, 'ln'], ['Hargreaves', COL.hs, 'ln']], 12, f.m.l + 2);
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r, y: 12, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, daily ? T('valores diarios', 'daily values') : T('promedios mensuales', 'monthly means')));
  }

  /* 3 · the two halves of Penman–Monteith by month, stacked */
  function terms(svgId, sh) {
    const svg = el(svgId); if (!svg) return;
    const tot = sh.map(x => (x.rad == null ? null : x.rad + x.aero));
    if (tot.every(v => v == null)) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const f = frame(svg, { W: 700, H: 240, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 12.5], y: [0, Math.max(...tot.filter(v => v != null)) * 1.15], xt: MX, xlabFmt: mlab, ylab: 'mm/día', ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.62;
    sh.forEach((x, i) => {
      if (x.rad == null) return;
      const m = i + 1;
      f.plot.appendChild(svgEl('rect', { x: f.sx(m) - w / 2, y: f.sy(x.rad), width: w, height: f.sy(0) - f.sy(x.rad), fill: 'var(--sun)', opacity: 0.85 }));
      f.plot.appendChild(svgEl('rect', { x: f.sx(m) - w / 2, y: f.sy(x.rad + x.aero), width: w, height: f.sy(x.rad) - f.sy(x.rad + x.aero), fill: 'var(--sky)', opacity: 0.85 }));
      f.top.appendChild(svgEl('text', { x: f.sx(m), y: f.sy(x.rad + x.aero) - 4, 'font-size': 8.5, 'text-anchor': 'middle', class: 'art-mut' }, fmtPct(x.share, 0)));
    });
    legend(f, [[T('término de radiación', 'radiation term'), 'var(--sun)', 'sq'], [T('término aerodinámico (el % es su parte)', 'aerodynamic term (the % is its share)'), 'var(--sky)', 'sq']], 12, f.m.l + 2);
  }

  /* 4 · Ra, Rso, Rs and Rn by month */
  function radiation(svgId, rad) {
    const svg = el(svgId); if (!svg) return;
    if (rad.every(x => x.ra == null)) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const f = frame(svg, { W: 700, H: 240, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 12.5], y: [0, Math.max(...rad.map(x => x.ra || 0)) * 1.1], xt: MX, xlabFmt: mlab, ylab: 'MJ m⁻² d⁻¹', ny: 5 });
    const draw = (k, colour, o) => { const pts = MX.map((m, i) => rad[i][k] == null ? null : [f.sx(m), f.sy(rad[i][k])]).filter(Boolean); if (pts.length > 1) line(f, pts, colour, o); };
    Plot.area(f, MX, rad.map(x => x.rs || 0), 'var(--sun)', 0.15);
    draw('ra', 'var(--c10)', { width: 1.4, dash: '4 3' }); draw('rso', 'var(--c2)', { width: 1.4, dash: '2 2' }); draw('rs', 'var(--sun)', { width: 2.2 }); draw('rn', 'var(--c5)', { width: 2 });
    legend(f, [[T('Ra extraterrestre', 'Ra extraterrestrial'), 'var(--c10)', 'dash'], [T('Rso cielo despejado', 'Rso clear sky'), 'var(--c2)', 'dash'], [T('Rs en superficie', 'Rs at the surface'), 'var(--sun)', 'ln'], [T('Rn neta', 'Rn net'), 'var(--c5)', 'ln']], 12, f.m.l + 2);
  }

  /* 5 · Hargreaves against Penman–Monteith, day by day, with the 1:1 and the fitted lines */
  function scatter(svgId, ref, alt, cal, labelAlt) {
    const svg = el(svgId); if (!svg) return;
    const pts = [];
    for (let i = 0; i < ref.length; i++) if (ref[i] != null && alt[i] != null) pts.push([alt[i], ref[i]]);
    if (pts.length < 10) { empty(svg, 460, 300, T('Sin datos', 'No data')); return; }
    const mx = Math.max(...pts.map(p => Math.max(p[0], p[1]))) * 1.05;
    const f = frame(svg, { W: 460, H: 380, m: { l: 48, r: 16, t: 28, b: 40 }, x: [0, mx], y: [0, mx], xlab: `${labelAlt || 'Hargreaves'} (mm/día)`, ylab: 'Penman–Monteith (mm/día)', ny: 6 });
    /* thin the cloud: at most ~3000 points */
    const step = Math.max(1, Math.floor(pts.length / 3000));
    const g = svgEl('g');
    for (let i = 0; i < pts.length; i += step) g.appendChild(svgEl('circle', { cx: f.sx(pts[i][0]), cy: f.sy(pts[i][1]), r: 1.6, fill: 'var(--c1)', opacity: 0.35 }));
    f.plot.appendChild(g);
    line(f, [[f.sx(0), f.sy(0)], [f.sx(mx), f.sy(mx)]], 'var(--text-muted)', { width: 1, dash: '4 3' });
    if (cal) {
      line(f, [[f.sx(0), f.sy(cal.a)], [f.sx(mx), f.sy(cal.a + cal.b * mx)]], 'var(--c5)', { width: 2 });
      line(f, [[f.sx(0), f.sy(0)], [f.sx(mx), f.sy(cal.k * mx)]], 'var(--c2)', { width: 1.6, dash: '6 3' });
      f.top.appendChild(svgEl('text', { x: f.m.l + 6, y: f.m.t + 14, 'font-size': 9.5, class: 'art-txt' }, `PM = ${fmtFixed(cal.a, 2)} + ${fmtFixed(cal.b, 3)} · ${labelAlt || 'HS'}   R² = ${fmtFixed(cal.r2, 3)}`));
      f.top.appendChild(svgEl('text', { x: f.m.l + 6, y: f.m.t + 27, 'font-size': 9.5, class: 'art-txt' }, `k = ${fmtFixed(cal.k, 3)}   RMSE = ${fmtFixed(cal.rmse, 2)} mm/día   ${T('sesgo', 'bias')} = ${fmtFixed(cal.bias, 2)}`));
    }
    legend(f, [['1:1', 'var(--text-muted)', 'dash'], [T('regresión', 'regression'), 'var(--c5)', 'ln'], [T('factor k', 'factor k'), 'var(--c2)', 'dash']], f.H - 8, f.m.l + 2);
  }

  /* 6 · annual totals by method */
  function yearlyTotals(svgId, yr) {
    const svg = el(svgId); if (!svg) return;
    const years = yr.pm.map(a => a.y);
    if (!years.length) { empty(svg, 700, 160, T('Sin años completos', 'No complete years')); return; }
    const all = Object.keys(yr).flatMap(k => yr[k].map(a => a.total));
    const f = frame(svg, { W: 700, H: 240, m: { l: 56, r: 16, t: 26, b: 34 }, x: [years[0] - 0.6, years[years.length - 1] + 0.6], y: [Math.min(...all) * 0.85, Math.max(...all) * 1.08], xt: years.length > 14 ? years.filter((_, i) => i % Math.ceil(years.length / 14) === 0) : years, xlabFmt: v => String(v), ylab: T('ETo anual (mm)', 'annual ETo (mm)'), ny: 5 });
    const w = (f.sx(years[0] + 1) - f.sx(years[0])) * 0.2;
    ['pm', 'hs', 'pt', 'turc'].forEach((k, j) => yr[k].forEach(a => f.plot.appendChild(svgEl('rect', { x: f.sx(a.y) + (j - 1.5) * w, y: f.sy(a.total), width: w - 1, height: f.sy(f.y[0]) - f.sy(a.total), fill: COL[k], opacity: 0.85 }))));
    legend(f, ['pm', 'hs', 'pt', 'turc'].map(k => [NAME[k], COL[k], 'sq']), 12, f.m.l + 2);
  }

  Object.assign(Plots5, { methods, record, terms, radiation, scatter, yearlyTotals, COL, NAME });
  if (typeof window !== 'undefined') window.Plots5 = Plots5;
})();
