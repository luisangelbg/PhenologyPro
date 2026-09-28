/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 4 figures: the accumulation of every year, the thermal
   calendar, the sowing-date map, the between-year variability and the methods. */

const Plots4 = {};

(function () {
  const { frame, line, band, bars, hline, vline, legend, empty, dots } = Plot;
  const MX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  /* 1 · one curve per year from the start date, the median band and the stages */
  function spaghetti(svgId, by, med, opts) {
    const svg = el(svgId); if (!svg) return;
    if (!by.years.length) { empty(svg, 700, 200, T('Sin años con esa fecha', 'No years with that date')); return; }
    const n = Math.max(...by.years.map(r => r.cum.length));
    const ymax = Math.max(opts.target || 0, ...by.years.map(r => r.total)) * 1.08;
    const f = frame(svg, { W: 700, H: 320, m: { l: 52, r: 16, t: 28, b: 36 }, x: [0, n], y: [0, ymax], xlab: T('días desde la siembra', 'days since sowing'), ylab: T('°C·d acumulados', 'accumulated °C·d'), ny: 6 });
    if (med.median.length > 1) {
      const xs = med.median.map((_, k) => k + 1);
      band(f, xs, med.p20, med.p80, 'var(--c1)', 0.15);
    }
    by.years.forEach(r => {
      const pts = r.cum.map((v, k) => [f.sx(k + 1), f.sy(v)]);
      line(f, pts, r.days != null ? 'var(--c1)' : 'var(--c5)', { width: 1, opacity: 0.55 });
      if (r.frostAt != null) f.plot.appendChild(svgEl('circle', { cx: f.sx(r.frostAt + 1), cy: f.sy(r.cum[r.frostAt]), r: 3, fill: 'var(--frost)', stroke: 'var(--card-bg)', 'stroke-width': 1 }));
    });
    if (med.median.length > 1) line(f, med.median.map((v, k) => [f.sx(k + 1), f.sy(v)]), 'var(--c1)', { width: 2.6 });
    if (opts.stages) opts.stages.forEach(s => { hline(f, s.gdd, 'var(--c2)', { dash: '3 3', width: 0.9, label: `${s.code} · ${T(s.es, s.en)}`, opacity: 0.8 }); });
    else if (opts.target) hline(f, opts.target, 'var(--c2)', { dash: '4 3', label: T(`meta ${fmtNum(opts.target, 0)} °C·d`, `target ${fmtNum(opts.target, 0)} °C·d`) });
    if (by.days) { vline(f, by.days.median, 'var(--c2)', { dash: '2 2', width: 1, label: T(`mediana ${Math.round(by.days.median)} d`, `median ${Math.round(by.days.median)} d`) }); }
    legend(f, [[T('cada año', 'each year'), 'var(--c1)', 'ln'], [T('mediana y P20–P80', 'median and P20–P80'), 'var(--c1)', 'sq'], [T('no alcanzó la meta', 'did not reach the target'), 'var(--c5)', 'ln'], [T('helada', 'frost'), 'var(--frost)', 'sq']], 12, f.m.l + 2);
  }

  /* 2 · the thermal calendar: mean °C·d per day by month, with the between-year whiskers */
  function calendar(svgId, months, base) {
    const svg = el(svgId); if (!svg) return;
    const v = months.map(x => x.perDay);
    if (v.every(x => x == null)) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const ymax = Math.max(1, ...months.map(x => x.perDayP80 == null ? 0 : x.perDayP80)) * 1.2;
    const f = frame(svg, { W: 700, H: 240, m: { l: 48, r: 16, t: 26, b: 34 }, x: [0.5, 12.5], y: [0, ymax], xt: MX, xlabFmt: m => monthName(m, true), ylab: T('°C·d por día', '°C·d per day'), ny: 5 });
    bars(f, MX, v, 'var(--c2)', { opacity: 0.75, width: (f.sx(2) - f.sx(1)) * 0.62 });
    MX.forEach((m, i) => { const x = months[i]; if (x.perDayP20 != null) f.plot.appendChild(svgEl('line', { x1: f.sx(m), x2: f.sx(m), y1: f.sy(x.perDayP20), y2: f.sy(x.perDayP80), stroke: 'var(--text)', 'stroke-width': 1.2, opacity: 0.7 })); if (x.perMonth != null) f.top.appendChild(svgEl('text', { x: f.sx(m), y: f.sy(x.perDayP80 == null ? x.perDay : x.perDayP80) - 5, 'font-size': 8.5, 'text-anchor': 'middle', class: 'art-mut' }, fmtNum(x.perMonth, 0))); });
    f.g.appendChild(svgEl('text', { x: f.W - f.m.r, y: 12, 'font-size': 9, 'text-anchor': 'end', class: 'art-mut' }, T(`base ${fmtTemp(base, 1)} · el número es el total del mes`, `base ${fmtTemp(base, 1)} · the number is the month's total`)));
  }

  /* 3 · what each sowing date offers: °C·d in the season (median and P20–P80) */
  function sowingTotals(svgId, map, target, seasonDays) {
    const svg = el(svgId); if (!svg) return;
    const rows = map.rows.filter(r => r.total);
    if (!rows.length) { empty(svg, 700, 160, T('Sin datos', 'No data')); return; }
    const ymax = Math.max(target || 0, ...rows.map(r => r.total.p80)) * 1.1;
    const f = frame(svg, { W: 700, H: 280, m: { l: 52, r: 16, t: 28, b: 36 }, x: [1, 365], y: [0, ymax], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, xlab: T('fecha de siembra', 'sowing date'), ylab: T(`°C·d en ${seasonDays} días`, `°C·d in ${seasonDays} days`), ny: 6 });
    const xs = rows.map(r => r.J);
    band(f, xs, rows.map(r => r.total.p20), rows.map(r => r.total.p80), 'var(--c2)', 0.2);
    line(f, rows.map(r => [f.sx(r.J), f.sy(r.total.median)]), 'var(--c2)', { width: 2.4 });
    if (target) {
      hline(f, target, 'var(--c1)', { dash: '4 3', label: T(`requerimiento ${fmtNum(target, 0)} °C·d`, `requirement ${fmtNum(target, 0)} °C·d`) });
      /* the dates whose P20 clears the target: safe in 4 of 5 years */
      rows.forEach(r => { if (r.total.p20 >= target) f.plot.appendChild(svgEl('rect', { x: f.sx(r.J) - 2, y: f.H - f.m.b - 5, width: 4, height: 5, fill: 'var(--c3)' })); });
    }
    legend(f, [[T('mediana', 'median'), 'var(--c2)', 'ln'], [T('P20–P80 entre años', 'P20–P80 between years'), 'var(--c2)', 'sq'], [T('4 de 5 años alcanzan el requerimiento', '4 of 5 years reach the requirement'), 'var(--c3)', 'sq']], 12, f.m.l + 2);
  }

  /* 4 · days to reach the target by sowing date, with the probability of reaching it */
  function sowingDays(svgId, map) {
    const svg = el(svgId); if (!svg) return;
    const rows = map.rows.filter(r => r.days);
    if (!rows.length) { empty(svg, 700, 160, T('La meta no se alcanza desde ninguna fecha en la temporada elegida', 'The target is not reached from any date in the chosen season')); return; }
    const ymax = Math.max(...rows.map(r => r.days.p80)) * 1.15;
    const f = frame(svg, { W: 700, H: 280, m: { l: 52, r: 44, t: 28, b: 36 }, x: [1, 365], y: [0, ymax], xt: Plot.monthTicks(1, 365), xlabFmt: Plot.monthTickLabel, xlab: T('fecha de siembra', 'sowing date'), ylab: T('días a la meta', 'days to the target'), y2: [0, 1], y2labFmt: Plot.pctTick, y2lab: T('años que la alcanzan', 'years reaching it'), ny: 6 });
    const all = map.rows.filter(r => r.pReached != null);
    Plot.area(f, all.map(r => r.J), all.map(r => r.pReached * ymax), 'var(--c3)', 0.12);
    const xs = rows.map(r => r.J);
    band(f, xs, rows.map(r => r.days.p20), rows.map(r => r.days.p80), 'var(--c1)', 0.18);
    line(f, rows.map(r => [f.sx(r.J), f.sy(r.days.median)]), 'var(--c1)', { width: 2.4 });
    if (map.best) { vline(f, map.best.J, 'var(--c2)', { dash: '3 3', label: T(`mejor: ${fmtDoy(map.best.J)}`, `best: ${fmtDoy(map.best.J)}`) }); }
    legend(f, [[T('días (mediana)', 'days (median)'), 'var(--c1)', 'ln'], [T('P20–P80', 'P20–P80'), 'var(--c1)', 'sq'], [T('% de años que alcanzan la meta (eje derecho)', '% of years reaching the target (right axis)'), 'var(--c3)', 'sq']], 12, f.m.l + 2);
  }

  /* 5 · °C·d of each calendar year */
  function yearly(svgId, ann) {
    const svg = el(svgId); if (!svg) return;
    if (!ann.length) { empty(svg, 700, 140, T('Sin años completos', 'No complete years')); return; }
    const xs = ann.map(a => a.y), v = ann.map(a => a.total);
    const mean = Stat.mean(v);
    const f = frame(svg, { W: 700, H: 220, m: { l: 56, r: 16, t: 26, b: 34 }, x: [xs[0] - 0.6, xs[xs.length - 1] + 0.6], y: [Math.min(...v) * 0.85, Math.max(...v) * 1.05], xt: xs.length > 14 ? xs.filter((_, i) => i % Math.ceil(xs.length / 14) === 0) : xs, xlabFmt: x => String(x), ylab: T('°C·d del año', '°C·d of the year'), ny: 5 });
    bars(f, xs, v, x => (x >= mean ? 'var(--c5)' : 'var(--c1)'), { opacity: 0.8, width: (f.sx(xs[0] + 1) - f.sx(xs[0])) * 0.7 });
    hline(f, mean, 'var(--text)', { dash: '4 3', width: 1, label: T(`media ${fmtNum(mean, 0)}`, `mean ${fmtNum(mean, 0)}`) });
  }

  /* 6 · the six methods and the cut-offs on the same season */
  function methods(svgId, cmp) {
    const svg = el(svgId); if (!svg) return;
    const NAMES = { average: ['Promedio', 'Average'], capped: ['Acotado (maíz)', 'Capped (maize)'], triangle: ['Triángulo', 'Triangle'], sine: ['Seno', 'Sine'], doubleTriangle: ['Triángulo doble', 'Double triangle'], doubleSine: ['Seno doble', 'Double sine'] };
    const CUT = { none: ['sin corte', 'no cut-off'], horizontal: ['horizontal', 'horizontal'], intermediate: ['intermedio', 'intermediate'], vertical: ['vertical', 'vertical'] };
    const cuts = ['none', 'horizontal', 'intermediate', 'vertical'];
    const vals = cmp.rows.flatMap(r => cuts.map(c => r[c])).filter(v => v != null);
    const f = frame(svg, { W: 700, H: 260, m: { l: 52, r: 16, t: 28, b: 44 }, x: [0.5, 6.5], y: [Math.min(...vals) * 0.9, Math.max(...vals) * 1.05], xt: [1, 2, 3, 4, 5, 6], xlabFmt: i => T(NAMES[cmp.rows[i - 1].method][0], NAMES[cmp.rows[i - 1].method][1]), ylab: T('°C·d de la temporada', '°C·d of the season'), ny: 5 });
    const colours = ['var(--c10)', 'var(--c1)', 'var(--c2)', 'var(--c5)'];
    const w = (f.sx(2) - f.sx(1)) / 5;
    cmp.rows.forEach((r, i) => cuts.forEach((c, k) => { if (r[c] == null) return; const x = f.sx(i + 1) + (k - 1.5) * w; f.plot.appendChild(svgEl('rect', { x: x - w / 2 + 1, y: f.sy(r[c]), width: w - 2, height: f.sy(f.y[0]) - f.sy(r[c]), fill: colours[k], opacity: 0.85, rx: 1 })); }));
    legend(f, cuts.map((c, k) => [T(CUT[c][0], CUT[c][1]), colours[k], 'sq']), 12, f.m.l + 2);
  }

  Object.assign(Plots4, { spaghetti, calendar, sowingTotals, sowingDays, yearly, methods });
  if (typeof window !== 'undefined') window.Plots4 = Plots4;
})();
