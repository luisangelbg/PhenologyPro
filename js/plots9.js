/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 9 figures: the risk by stage and by date, the sowing
   window and the scenarios. */

const Plots9 = {};

(function () {
  const { frame, line, band, bars, hline, vline, vspan, legend, empty } = Plot;

  /* 1 · frost and heat probability by stage */
  function byStage(svgId, risk) {
    const svg = el(svgId); if (!svg) return;
    const st = risk.summary.filter(s => s.n > 0);
    if (!st.length) { empty(svg, 700, 160, T('Sin etapas alcanzadas', 'No stage reached')); return; }
    const f = frame(svg, { W: 700, H: 260, m: { l: 52, r: 16, t: 26, b: 48 }, x: [0.5, st.length + 0.5], y: [0, 1.05], xt: st.map((_, i) => i + 1), xlabFmt: i => `${st[i - 1].code} · ${T(st[i - 1].es, st[i - 1].en)}`.slice(0, 24), ylabFmt: Plot.pctTick, ylab: T('años con al menos un día', 'years with at least one day'), ny: 5 });
    const w = (f.sx(2) - f.sx(1)) * 0.3;
    st.forEach((s, i) => {
      const x = f.sx(i + 1);
      if (s.sensitive) f.plot.appendChild(svgEl('rect', { x: x - w * 1.3, y: f.m.t, width: w * 2.6, height: f.H - f.m.t - f.m.b, fill: 'var(--accent)', opacity: 0.08 }));
      f.plot.appendChild(svgEl('rect', { x: x - w, y: f.sy(s.pFrost), width: w - 1, height: f.sy(0) - f.sy(s.pFrost), fill: 'var(--frost)', opacity: 0.9 }));
      f.plot.appendChild(svgEl('rect', { x, y: f.sy(s.pHeat), width: w - 1, height: f.sy(0) - f.sy(s.pHeat), fill: 'var(--heat)', opacity: 0.9 }));
      if (s.meanFrost > 0) f.top.appendChild(svgEl('text', { x: x - w / 2, y: f.sy(s.pFrost) - 4, 'font-size': 8, 'text-anchor': 'middle', class: 'art-mut' }, fmtFixed(s.meanFrost, 1) + ' d'));
      if (s.meanHeat > 0) f.top.appendChild(svgEl('text', { x: x + w / 2, y: f.sy(s.pHeat) - 4, 'font-size': 8, 'text-anchor': 'middle', class: 'art-mut' }, fmtFixed(s.meanHeat, 1) + ' d'));
    });
    legend(f, [[T('helada (el número es la media de días)', 'frost (the number is the mean days)'), 'var(--frost)', 'sq'], [T('golpe de calor', 'heat shock'), 'var(--heat)', 'sq'], [T('etapa sensible', 'sensitive stage'), 'var(--accent)', 'sq']], 12, f.m.l + 2);
  }

  /* 2 · the probability of frost and heat on each day of the year, with the crop's stages laid over */
  function byDate(svgId, dr, stagesJ) {
    const svg = el(svgId); if (!svg) return;
    const xs = Array.from({ length: 365 }, (_, i) => i + 1);
    const f = frame(svg, { W: 700, H: 240, m: { l: 52, r: 16, t: 26, b: 34 }, x: [1, 365], y: [0, 1.05], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, ylabFmt: Plot.pctTick, ylab: T('probabilidad ese día', 'probability that day'), ny: 5 });
    (stagesJ || []).forEach((s, i) => { if (s.from != null && s.to != null) vspan(f, s.from, s.to, i % 2 ? 'var(--leaf)' : 'var(--sky)', 0.07, s.code); });
    Plot.area(f, xs, dr.frost.map(v => v || 0), 'var(--frost)', 0.25);
    Plot.area(f, xs, dr.heat.map(v => v || 0), 'var(--heat)', 0.25);
    line(f, xs.map((x, i) => [f.sx(x), f.sy(dr.frost[i] || 0)]), 'var(--frost)', { width: 1.8 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(dr.heat[i] || 0)]), 'var(--heat)', { width: 1.8 });
    legend(f, [[T('helada', 'frost'), 'var(--frost)', 'ln'], [T('golpe de calor', 'heat shock'), 'var(--heat)', 'ln'], [T('etapas del cultivo (siembra elegida)', 'crop stages (chosen sowing)'), 'var(--sky)', 'sq']], 12, f.m.l + 2);
  }

  /* 3 · the sowing window: every criterion and their conjunction */
  function window(svgId, sw) {
    const svg = el(svgId); if (!svg) return;
    const rows = sw.rows.filter(r => r.n > 0);
    if (!rows.length) { empty(svg, 700, 200, T('Sin datos', 'No data')); return; }
    const f = frame(svg, { W: 700, H: 320, m: { l: 52, r: 16, t: 28, b: 36 }, x: [1, 365], y: [0, 1.05], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, xlab: T('fecha de siembra', 'sowing date'), ylabFmt: Plot.pctTick, ylab: T('fracción de los años', 'share of the years'), ny: 5 });
    sw.windows.forEach(w => vspan(f, w.from - sw.opts.step / 2, w.to + sw.opts.step / 2, 'var(--leaf)', 0.16));
    const xs = rows.map(r => r.J);
    Plot.area(f, xs, rows.map(r => r.pSuccess || 0), 'var(--c3)', 0.15);
    const draw = (k, colour, o) => line(f, rows.filter(r => r[k] != null).map(r => [f.sx(r.J), f.sy(r[k])]), colour, o);
    draw('pMature', 'var(--c2)', { width: 1.4, dash: '4 3' });
    draw('pNoFrost', 'var(--frost)', { width: 1.4, dash: '4 3' });
    draw('pNoHeat', 'var(--heat)', { width: 1.4, dash: '4 3' });
    if (sw.opts.useWater) draw('pWater', 'var(--c4)', { width: 1.4, dash: '4 3' });
    draw('pSuccess', 'var(--c3)', { width: 2.8 });
    hline(f, sw.opts.target, 'var(--text-muted)', { dash: '2 2', width: 0.9, label: T(`objetivo ${fmtPct(sw.opts.target, 0)}`, `target ${fmtPct(sw.opts.target, 0)}`), right: true });
    if (sw.best) vline(f, sw.best.J, 'var(--c3)', { label: T(`mejor: ${fmtDoy(sw.best.J)}`, `best: ${fmtDoy(sw.best.J)}`) });
    legend(f, [[T('madura', 'matures'), 'var(--c2)', 'dash'], [T('sin helada', 'no frost'), 'var(--frost)', 'dash'], [T('sin golpe de calor', 'no heat shock'), 'var(--heat)', 'dash']].concat(sw.opts.useWater ? [[T('agua suficiente', 'enough water'), 'var(--c4)', 'dash']] : []).concat([[T('todo a la vez: éxito', 'all at once: success'), 'var(--c3)', 'ln'], [T('ventana recomendada', 'recommended window'), 'var(--leaf)', 'sq']]), 12, f.m.l + 2);
  }

  /* 4 · the scenarios: one line per indicator against ΔT, on relative scales */
  function scenarios(svgId, sc) {
    const svg = el(svgId); if (!svg) return;
    const base = sc[0];
    const items = [
      { k: 'daysToMaturity', es: 'días a madurez', en: 'days to maturity', c: 'var(--c2)' },
      { k: 'etoAnnual', es: 'ETo anual', en: 'annual ETo', c: 'var(--c1)' },
      { k: 'relYield', es: 'rendimiento en temporal', en: 'rain-fed yield', c: 'var(--c3)', get: s => (s.water ? s.water.relYield : null) },
      { k: 'cp', es: 'porciones de frío', en: 'chill portions', c: 'var(--frost)', get: s => (s.chill ? s.chill.cp : null) },
      { k: 'frost', es: 'días de helada en el ciclo', en: 'frost days in the cycle', c: 'var(--c10)', get: s => s.risk.meanFrostCycle },
      { k: 'heat', es: 'días de calor en el ciclo', en: 'heat days in the cycle', c: 'var(--heat)', get: s => s.risk.meanHeatCycle },
    ];
    const val = (it, s) => (it.get ? it.get(s) : s[it.k]);
    const series = items.map(it => ({ it, pts: sc.map(s => { const v = val(it, s), b = val(it, base); return { dT: s.dT, rel: v == null || b == null || b === 0 ? null : v / b, v }; }) })).filter(s => s.pts.some(p => p.rel != null));
    const all = series.flatMap(s => s.pts.map(p => p.rel)).filter(v => v != null);
    const f = frame(svg, { W: 700, H: 280, m: { l: 52, r: 16, t: 28, b: 36 }, x: [Math.min(...sc.map(s => s.dT)) - 0.2, Math.max(...sc.map(s => s.dT)) + 0.2], y: [Math.min(0.5, ...all) * 0.95, Math.max(1.2, ...all) * 1.05], xt: sc.map(s => s.dT), xlabFmt: v => (v > 0 ? '+' : '') + v + ' °C', xlab: T('cambio de la temperatura', 'temperature change'), ylabFmt: v => fmtFixed(v, 2) + '×', ylab: T('respecto al clima actual', 'relative to the current climate'), ny: 6 });
    hline(f, 1, 'var(--text-muted)', { dash: '2 2', width: 0.9 });
    series.forEach(s => { line(f, s.pts.filter(p => p.rel != null).map(p => [f.sx(p.dT), f.sy(p.rel)]), s.it.c, { width: 2 }); Plot.dots(f, s.pts.filter(p => p.rel != null).map(p => [p.dT, p.rel]), s.it.c, 3); });
    legend(f, series.map(s => [T(s.it.es, s.it.en), s.it.c, 'ln']), 12, f.m.l + 2);
  }

  /* 5 · the phenological calendar of every scenario */
  function scenarioCalendar(svgId, sc, sowJ) {
    const svg = el(svgId); if (!svg) return;
    const rowH = 22, m = { l: 70, r: 20, t: 28, b: 34 }, W = 700, H = m.t + m.b + rowH * sc.length;
    const xmax = sowJ + Math.max(...sc.map(s => Math.max(0, ...s.stages.summary.map(x => x.p80 == null ? 0 : x.p80)))) + 15;
    const f = frame(svg, { W, H, m, x: [sowJ - 5, xmax], y: [0, 1], xt: Plot.monthTicks(sowJ - 5, xmax), xlabFmt: Plot.monthTickLabel, yt: [], grid: false });
    vline(f, sowJ, 'var(--leaf)', { dash: '2 2' });
    sc.forEach((s, i) => {
      const y = m.t + i * rowH;
      f.g.appendChild(svgEl('text', { x: m.l - 8, y: y + rowH / 2 + 3, 'font-size': 9.5, 'text-anchor': 'end', class: 'art-txt' }, (s.dT > 0 ? '+' : '') + s.dT + ' °C'));
      let prev = 0;
      s.stages.summary.forEach((st, k) => {
        if (st.median == null) return;
        f.plot.appendChild(svgEl('rect', { x: f.sx(sowJ + prev), y: y + 4, width: Math.max(1, f.sx(sowJ + st.median) - f.sx(sowJ + prev)), height: rowH - 8, rx: 2, fill: `var(--c${(k % 5) + 1})`, opacity: 0.6 }));
        prev = st.median;
      });
      const last = s.stages.summary[s.stages.summary.length - 1];
      if (last && last.median != null) f.top.appendChild(svgEl('text', { x: f.sx(sowJ + last.median) + 5, y: y + rowH / 2 + 3, 'font-size': 8.5, class: 'art-mut' }, `${fmtDoy(sowJ + last.median)} · ${Math.round(last.median)} d`));
    });
    legend(f, sc[0].stages.summary.map((s, k) => [s.code, `var(--c${(k % 5) + 1})`, 'sq']), 12, f.m.l + 2);
  }

  Object.assign(Plots9, { byStage, byDate, window, scenarios, scenarioCalendar });
  if (typeof window !== 'undefined') window.Plots9 = Plots9;
})();
