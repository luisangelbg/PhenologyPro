/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 1: the two interactive laboratories of the home page.

   THERMAL TIME LAB. A crop of the catalogue is sown on a chosen date in one
   of six synthetic climates. The engine accumulates degree-days from that
   date with the chosen method and thresholds, finds the day each stage of the
   crop is reached, and reports whether the season closes (first frost, end of
   the series) before maturity. Nothing is an animation: the dates on the
   screen are the real output of the same functions the blocks will use.

   WATER LAB. The same crop and site, now with the soil in the picture: ETo
   by Hargreaves or Penman–Monteith, ETc through the four-segment Kc curve,
   the FAO-56 daily root-zone balance with effective rain, deep percolation
   and stress, and, if the user wants it, automatic irrigation when the
   readily available water runs out. */

(function () {

  const { frame, line, band, bars, hline, vline, vspan, dots, label, legend, bindSlider, val, setSlider, monthTicks, doyLabel } = Plot;

  /* the season of a crop from a sowing day, over a two-year synthetic series */
  const SERIES = {};
  function seriesOf(site) {
    if (!SERIES[site.id]) SERIES[site.id] = Climate.twoYears(site, { year: 2025 });
    return SERIES[site.id];
  }
  const ETO = {};
  function etoOf(site, method) {
    const k = site.id + ':' + method;
    if (!ETO[k]) ETO[k] = Climate.etoSeries(site, seriesOf(site), method);
    return ETO[k];
  }
  /* the first day at or after `from` with Tmin ≤ 0, or null */
  function firstFrost(days, from, to) {
    for (let i = from; i < Math.min(days.length, to); i++) if (days[i].tmin <= 0) return i;
    return null;
  }

  /* ================================================================
     THERMAL TIME LAB
     ================================================================ */
  function fillSelects() {
    ['gdSite', 'wtSite'].forEach(id => {
      const s = el(id); if (!s) return;
      const cur = s.value;
      s.innerHTML = Climate.SITES.map(x => `<option value="${x.id}">${T(x.es, x.en)}</option>`).join('');
      if (cur) s.value = cur;
    });
    ['gdCrop', 'wtCrop'].forEach(id => {
      const s = el(id); if (!s) return;
      const cur = s.value;
      const list = id === 'gdCrop' ? Crops.annuals() : Crops.LIST;
      s.innerHTML = list.map(c => `<option value="${c.id}">${T(c.es, c.en)}</option>`).join('');
      s.value = cur || (id === 'gdCrop' ? 'maize' : 'maize');
    });
    const soil = el('wtSoil');
    if (soil) { const cur = soil.value; soil.innerHTML = Crops.SOILS.map(s => `<option value="${s.id}">${T(s.es, s.en)} · ${s.taw} mm/m</option>`).join(''); soil.value = cur || 'loam'; }
  }

  let gdCropId = null;
  function gdConfig() {
    const site = Climate.byId(el('gdSite').value);
    const crop = Crops.byId(el('gdCrop').value) || Crops.byId('maize');
    /* a change of crop resets the thresholds to the crop's own */
    if (gdCropId !== crop.id) {
      gdCropId = crop.id;
      setSlider('gdBase', crop.tbase); setSlider('gdUpper', crop.tupper);
      el('gdMethod').value = crop.method || 'average';
      ['gdBase', 'gdUpper'].forEach(id => { const v = el(id + 'Val'); if (v) v.textContent = fmtTemp(val(id)); });
    }
    return { site, crop, sow: Math.round(val('gdSow')), base: val('gdBase'), upper: val('gdUpper'), method: el('gdMethod').value, cutoff: el('gdCutoff').value };
  }

  function runGdd() {
    const cfg = gdConfig();
    const days = seriesOf(cfg.site);
    const start = cfg.sow - 1;
    const acc = Agro.accumulate(days, { method: cfg.method, base: cfg.base, upper: cfg.upper, cutoff: cfg.cutoff, start, end: start + 400 });
    const stages = cfg.crop.stages.map(s => {
      const w = acc.when(s.gdd);
      return { s, at: w, das: w == null ? null : Math.round(w - start), date: w == null ? null : fromDoy(2025, Math.round(w) + 1) };
    });
    const last = stages[stages.length - 1];
    const endIdx = last.at != null ? Math.round(last.at) : start + 399;
    const frostIdx = firstFrost(days, start, endIdx + 1);
    const frostCount = days.slice(start, endIdx + 1).filter(d => d.tmin <= 0).length;
    const available = frostIdx != null ? acc.cum[frostIdx - start] : acc.cum[Math.min(acc.cum.length - 1, 364)];
    const res = { cfg, days, acc, stages, start, endIdx, frostIdx, frostCount, available };
    drawTemp(res); drawCum(res); drawClimo(cfg.site, 'gdClimo'); showGdReadout(res); showStages(res);
    return res;
  }

  function drawTemp(r) {
    const svg = el('gdTempChart'); if (!svg) return;
    const { days, start, endIdx, cfg } = r;
    const from = Math.max(0, start - 15), to = Math.min(days.length, endIdx + 30);
    const xs = [], tmax = [], tmin = [], dd = [];
    for (let i = from; i < to; i++) { xs.push(i + 1); tmax.push(days[i].tmax); tmin.push(days[i].tmin); }
    const lo = Math.min(-2, ...tmin) - 2, hi = Math.max(...tmax, cfg.upper) + 3;
    const f = frame(svg, {
      W: 460, H: 280, m: { l: 42, r: 40, t: 24, b: 34 },
      x: [from + 1, to], y: [lo, hi], xt: monthTicks(from + 1, to), xlabFmt: doyLabel,
      y2: [0, Math.max(10, Math.ceil(Math.max(...r.acc.daily) / 5) * 5 * 2.2)], y2lab: T('°C·d del día', 'day\'s °C·d'),
      ylab: '°C', ny: 6,
    });
    vspan(f, start + 1, endIdx + 1, 'var(--leaf)', 0.07);
    const seasonDaily = r.acc.daily.slice(0, endIdx - start + 1);
    bars(f, seasonDaily.map((v, k) => start + 1 + k), seasonDaily, 'var(--c2)', { sy: f.sy2, opacity: 0.45 });
    band(f, xs, tmin, tmax, 'var(--c5)', 0.16);
    line(f, xs.map((x, i) => [f.sx(x), f.sy(tmax[i])]), 'var(--c5)', { width: 1.3 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(tmin[i])]), 'var(--c4)', { width: 1.3 });
    hline(f, cfg.base, 'var(--c1)', { label: T('base ', 'base ') + fmtTemp(cfg.base, 1), dash: '5 3' });
    hline(f, cfg.upper, 'var(--heat)', { label: T('umbral superior ', 'upper threshold ') + fmtTemp(cfg.upper, 1), dash: '5 3', right: true, below: true });
    hline(f, 0, 'var(--frost)', { dash: '2 2', width: 1 });
    vline(f, start + 1, 'var(--leaf)', { label: T('siembra', 'sowing'), dash: '2 2' });
    if (r.frostIdx != null) vline(f, r.frostIdx + 1, 'var(--frost)', { label: T('primera helada', 'first frost'), row: 1 });
    legend(f, [[T('Tmax', 'Tmax'), 'var(--c5)', 'ln'], [T('Tmin', 'Tmin'), 'var(--c4)', 'ln'], [T('°C·d del día', 'day\'s °C·d'), 'var(--c2)', 'sq']], 12, f.m.l + 2);
  }

  function drawCum(r) {
    const svg = el('gdCumChart'); if (!svg) return;
    const { acc, start, endIdx, cfg, stages } = r;
    const n = Math.min(acc.cum.length, endIdx - start + 30);
    const need = Crops.gddToMaturity(cfg.crop);
    const ymax = Math.max(need * 1.12, acc.cum[n - 1] || 0);
    const f = frame(svg, {
      W: 460, H: 280, m: { l: 50, r: 14, t: 24, b: 34 },
      x: [start + 1, start + n], y: [0, ymax], xt: monthTicks(start + 1, start + n), xlabFmt: doyLabel,
      ylab: T('°C·d acumulados desde la siembra', '°C·d accumulated since sowing'), ny: 6,
    });
    const pts = [];
    for (let k = 0; k < n; k++) pts.push([f.sx(start + 1 + k), f.sy(acc.cum[k])]);
    line(f, pts, 'var(--c1)', { width: 2.4 });
    stages.forEach((st, i) => {
      hline(f, st.s.gdd, 'var(--c2)', { dash: '3 3', width: 0.9, opacity: 0.7 });
      f.top.appendChild(svgEl('text', { x: f.m.l + 4, y: f.sy(st.s.gdd) - 3, 'font-size': 8.5, class: 'art-txt', fill: 'var(--c2)', 'font-weight': 600 }, `${st.s.code} · ${T(st.s.es, st.s.en)}`));
      if (st.at != null) {
        const x = st.at + 1;
        f.plot.appendChild(svgEl('line', { x1: f.sx(x), x2: f.sx(x), y1: f.sy(st.s.gdd), y2: f.H - f.m.b, stroke: 'var(--c2)', 'stroke-width': 1, 'stroke-dasharray': '2 2' }));
        f.top.appendChild(svgEl('circle', { cx: f.sx(x), cy: f.sy(st.s.gdd), r: 3.6, fill: 'var(--c2)', stroke: 'var(--card-bg)', 'stroke-width': 1.2 }));
      }
    });
    if (r.frostIdx != null) vline(f, r.frostIdx + 1, 'var(--frost)', { label: T('primera helada', 'first frost') });
    const last = stages[stages.length - 1];
    if (last.at == null) f.top.appendChild(svgEl('text', { x: f.W - f.m.r - 4, y: f.m.t + 12, 'font-size': 9.5, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--danger)', 'font-weight': 700 }, T('no alcanza la madurez', 'does not reach maturity')));
  }

  /* a Walter–Lieth climograph of the site's normals: T on the left, P on the right at 2:1 */
  function drawClimo(site, id) {
    const svg = el(id); if (!svg) return;
    const nm = Climate.normals(site);
    const pmax = Math.max(100, ...nm.P);
    /* above 100 mm the scale compresses 1:10 (Walter & Lieth): the right axis is drawn in mm-equivalent units */
    const toAxis = p => p <= 100 ? p : 100 + (p - 100) / 10;
    const top = toAxis(pmax) * 1.08;
    const f = frame(svg, {
      W: 340, H: 280, m: { l: 40, r: 40, t: 28, b: 34 },
      x: [0.5, 12.5], y: [Math.min(0, ...nm.T) - 2, top / 2], xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], xlabFmt: v => monthName(v, true).slice(0, 1).toUpperCase(),
      y2: [Math.min(0, ...nm.T) * 2 - 4, top], y2labFmt: v => v <= 100 ? String(v) : String(100 + (v - 100) * 10), ylab: '°C', y2lab: 'mm', ny: 6,
    });
    const xs = nm.T.map((_, i) => i + 1);
    /* humid months (P > 2T) in rain blue, dry months (P < 2T) in heat red, perhumid above 100 mm solid */
    for (let i = 0; i < 12; i++) {
      const yT = f.sy(nm.T[i]), yP = f.sy2(toAxis(Math.min(100, nm.P[i])));
      const x0 = f.sx(i + 0.5), x1 = f.sx(i + 1.5);
      if (yP < yT) f.plot.appendChild(svgEl('rect', { x: x0, y: yP, width: x1 - x0, height: yT - yP, fill: 'var(--c4)', opacity: 0.25 }));
      else f.plot.appendChild(svgEl('rect', { x: x0, y: yT, width: x1 - x0, height: yP - yT, fill: 'var(--c5)', opacity: 0.18 }));
      if (nm.P[i] > 100) f.plot.appendChild(svgEl('rect', { x: x0, y: f.sy2(toAxis(nm.P[i])), width: x1 - x0, height: f.sy2(100) - f.sy2(toAxis(nm.P[i])), fill: 'var(--c4)', opacity: 0.8 }));
      if (nm.Tabsmin[i] <= 0) f.g.appendChild(svgEl('rect', { x: x0, y: f.H - f.m.b + 1, width: x1 - x0, height: 4, fill: 'var(--frost)' }));
    }
    line(f, xs.map((x, i) => [f.sx(x), f.sy(nm.T[i])]), 'var(--c5)', { width: 2 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy2(toAxis(nm.P[i]))]), 'var(--c4)', { width: 2 });
    const Pa = Stat.sum(nm.P), Ta = Stat.mean(nm.T);
    f.g.appendChild(svgEl('text', { x: f.m.l, y: 12, 'font-size': 10, class: 'art-txt', 'font-weight': 700 }, `${T(site.es, site.en)}`));
    f.g.appendChild(svgEl('text', { x: f.m.l, y: 23, 'font-size': 8.5, class: 'art-mut' }, `${site.lat.toFixed(1)}° · ${site.z} m · ${fmtFixed(Ta, 1)} °C · ${Math.round(Pa)} mm`));
  }

  function showGdReadout(r) {
    const box = el('gdReadout'); if (!box) return;
    const { cfg, stages, frostIdx, frostCount, available, start } = r;
    const need = Crops.gddToMaturity(cfg.crop);
    const last = stages[stages.length - 1];
    const seasonDays = last.das;
    const meanDaily = seasonDays ? r.acc.cum[seasonDays] / seasonDays : Stat.mean(r.acc.daily.slice(0, 120));
    const margin = available - need;
    const rd = (l, v, t, cls) => `<div class="rd ${cls || ''}"><div class="rd-l">${keepGreek(l)}</div><div class="rd-v">${v}</div>${t ? `<div class="rd-t">${t}</div>` : ''}</div>`;
    box.innerHTML =
      rd(T('°C·d requeridos', '°C·d required'), fmtNum(need, 0), T('hasta la última etapa', 'to the last stage')) +
      rd(T('Días a madurez', 'Days to maturity'), seasonDays == null ? '—' : seasonDays, seasonDays == null ? T('no se alcanza', 'not reached') : fmtDate(last.date), seasonDays == null ? 'bad' : 'good') +
      rd(T('°C·d por día', '°C·d per day'), fmtFixed(meanDaily, 1), T('promedio de la temporada', 'season average')) +
      rd(T('°C·d disponibles', '°C·d available'), fmtNum(available, 0), frostIdx != null ? T('hasta la primera helada', 'to the first frost') : T('en 365 días', 'in 365 days'), margin < 0 ? 'bad' : margin < need * 0.15 ? 'warn' : 'good') +
      rd(T('Margen térmico', 'Thermal margin'), (margin >= 0 ? '+' : '−') + fmtNum(Math.abs(margin), 0), margin < 0 ? T('faltan °C·d', '°C·d short') : T('sobran °C·d', '°C·d to spare'), margin < 0 ? 'bad' : margin < need * 0.15 ? 'warn' : 'good') +
      rd(T('Días con helada', 'Frost days'), frostCount, T('Tmin ≤ 0 °C en el ciclo', 'Tmin ≤ 0 °C in the cycle'), frostCount ? 'bad' : 'good');
    const st = el('gdStatus');
    if (st) {
      const sowDate = fmtDate(fromDoy(2025, cfg.sow));
      let msg;
      if (seasonDays == null) msg = T(`Sembrado el <b>${sowDate}</b>, el cultivo no junta los ${fmtNum(need, 0)} °C·d que necesita: el sitio es demasiado frío para esa fecha o el ciclo es demasiado largo. Prueba una fecha más temprana o un cultivar de ciclo corto.`,
        `Sown on <b>${sowDate}</b>, the crop does not gather the ${fmtNum(need, 0)} °C·d it needs: the site is too cold for that date or the cycle is too long. Try an earlier date or a short-season cultivar.`);
      else if (frostCount > 0) msg = T(`Madura en <b>${seasonDays} días</b> (${fmtDate(last.date)}), pero el ciclo atraviesa ${plural(frostCount, 'día', 'días')} con helada: el calor alcanza, el frío no perdona. Mueve la siembra hasta que la etapa sensible quede fuera de la helada.`,
        `It matures in <b>${seasonDays} days</b> (${fmtDate(last.date)}), but the cycle crosses ${plural(frostCount, 'frost day', 'frost days')}: the heat suffices, the cold does not forgive. Move the sowing until the sensitive stage is clear of frost.`);
      else msg = T(`Sembrado el <b>${sowDate}</b>, madura en <b>${seasonDays} días</b> (${fmtDate(last.date)}) con ${fmtFixed(meanDaily, 1)} °C·d por día en promedio y un margen de ${fmtNum(margin, 0)} °C·d antes de que se cierre la estación.`,
        `Sown on <b>${sowDate}</b>, it matures in <b>${seasonDays} days</b> (${fmtDate(last.date)}) at ${fmtFixed(meanDaily, 1)} °C·d per day on average, with a margin of ${fmtNum(margin, 0)} °C·d before the season closes.`);
      st.innerHTML = msg;
    }
  }
  function showStages(r) {
    const box = el('gdStages'); if (!box) return;
    box.innerHTML = r.stages.map(st => `<div class="stage-chip${st.at == null ? ' miss' : ''}"><div class="sc-n">${st.s.code} · ${T(st.s.es, st.s.en)}</div><div class="sc-d">${st.at == null ? T('no se alcanza', 'not reached') : fmtDate(st.date, true)}</div><div class="sc-s">${fmtNum(st.s.gdd, 0)} °C·d${st.das != null ? ' · ' + plural(st.das, T('día', 'day'), T('días', 'days')) : ''}</div></div>`).join('');
  }

  /* ================================================================
     WATER LAB
     ================================================================ */
  let wtCropId = null;
  function wtConfig() {
    const site = Climate.byId(el('wtSite').value);
    const crop = Crops.byId(el('wtCrop').value) || Crops.byId('maize');
    const soil = Crops.SOILS.find(s => s.id === el('wtSoil').value) || Crops.SOILS[3];
    if (wtCropId !== crop.id) { wtCropId = crop.id; }
    return { site, crop, soil, sow: Math.round(val('wtSow')), eto: el('wtEto').value, irr: el('wtIrr').value, trigger: val('wtTrigger'), eff: val('wtEff'), dr0: val('wtDr0') / 100 };
  }
  function runWater() {
    const cfg = wtConfig();
    const site = cfg.site, crop = cfg.crop;
    const days = seriesOf(site);
    const eto = etoOf(site, cfg.eto);
    const start = cfg.sow - 1;
    const Lsum = Crops.seasonLength(crop);
    const n = Math.min(Lsum, days.length - start);
    /* Kc mid and end corrected to the site's climate (FAO-56 eq. 62, 65) */
    const slice = days.slice(start, start + n);
    const u2m = Stat.mean(slice.map(d => d.u2)), rhmin = Math.max(20, Stat.mean(slice.map(d => d.rhmean)) - 20);
    const kc = { ini: crop.kc.ini, mid: Agro.kcAdjust(crop.kc.mid, u2m, rhmin, crop.h), end: Agro.kcAdjust(crop.kc.end, u2m, rhmin, crop.h) };
    const input = slice.map((d, k) => ({ P: d.prec, eto: eto[start + k] }));
    const taw0 = cfg.soil.taw * crop.zIni;
    const bal = Agro.balanceDaily(input, {
      taw: cfg.soil.taw, L: crop.L, kc, zIni: crop.zIni, zMax: crop.zMax, p: crop.p, dr0: cfg.dr0 * taw0, cn: cfg.soil.cn,
      irrigation: { mode: cfg.irr, trigger: cfg.trigger, depth: null, efficiency: cfg.eff },
    });
    const res = { cfg, days: slice, start, n, bal, kc, eto: input.map(x => x.eto), u2m, rhmin };
    drawEt(res); drawDr(res); showWtReadout(res);
    return res;
  }
  function drawEt(r) {
    const svg = el('wtEtChart'); if (!svg) return;
    const { bal, start, n } = r;
    const xs = bal.rows.map((_, k) => start + 1 + k);
    const etc = bal.rows.map(x => x.etc), eto = bal.rows.map(x => x.eto), etcAdj = bal.rows.map(x => x.etcAdj), P = bal.rows.map(x => x.P);
    const ymax = Math.max(2, ...eto, ...etc) * 1.15;
    const pmax = Math.max(10, ...P) * 1.1;
    const f = frame(svg, {
      W: 460, H: 280, m: { l: 44, r: 40, t: 26, b: 34 },
      x: [start + 1, start + n], y: [0, ymax], xt: monthTicks(start + 1, start + n), xlabFmt: doyLabel,
      ylab: 'mm/día', y2: [0, pmax], y2lab: T('lluvia (mm)', 'rain (mm)'), ny: 5,
    });
    /* the four stages of the Kc curve as bands */
    const L = r.cfg.crop.L;
    const b = [0, L.ini, L.ini + L.dev, L.ini + L.dev + L.mid, L.ini + L.dev + L.mid + L.late];
    [T('inicial', 'initial'), T('desarrollo', 'development'), T('media', 'mid'), T('final', 'late')].forEach((nm, i) => vspan(f, start + 1 + b[i], start + 1 + b[i + 1], i % 2 ? 'var(--leaf)' : 'var(--sky)', 0.06, nm));
    bars(f, xs, P, 'var(--c4)', { sy: f.sy2, opacity: 0.45 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(eto[i])]), 'var(--c2)', { width: 1.3, opacity: 0.9 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(etc[i])]), 'var(--c3)', { width: 2 });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(etcAdj[i])]), 'var(--c5)', { width: 1.4, dash: '4 3' });
    legend(f, [['ETo', 'var(--c2)', 'ln'], ['ETc = Kc·ETo', 'var(--c3)', 'ln'], [T('ETc real (Ks)', 'actual ETc (Ks)'), 'var(--c5)', 'dash'], [T('lluvia', 'rain'), 'var(--c4)', 'sq']], 12, f.m.l + 2);
  }
  function drawDr(r) {
    const svg = el('wtDrChart'); if (!svg) return;
    const { bal, start, n } = r;
    const xs = bal.rows.map((_, k) => start + 1 + k);
    const taw = bal.rows.map(x => x.taw), raw = bal.rows.map(x => x.raw), dr = bal.rows.map(x => x.dr);
    const ymax = Math.max(...taw) * 1.1;
    const f = frame(svg, {
      W: 460, H: 280, m: { l: 44, r: 14, t: 26, b: 34 },
      x: [start + 1, start + n], y: [ymax, 0], xt: monthTicks(start + 1, start + n), xlabFmt: doyLabel,
      ylab: T('agotamiento Dr (mm)', 'depletion Dr (mm)'), ny: 5,
    });
    /* the stress zone between RAW and TAW */
    band(f, xs, raw, taw, 'var(--c5)', 0.12);
    line(f, xs.map((x, i) => [f.sx(x), f.sy(taw[i])]), 'var(--c5)', { width: 1.4, dash: '5 3' });
    line(f, xs.map((x, i) => [f.sx(x), f.sy(raw[i])]), 'var(--c2)', { width: 1.4, dash: '5 3' });
    /* the depletion, filled from field capacity */
    const pts = xs.map((x, i) => [f.sx(x), f.sy(dr[i])]);
    f.plot.appendChild(svgEl('path', { d: Plot.pathOf([[f.sx(xs[0]), f.sy(0)]].concat(pts, [[f.sx(xs[xs.length - 1]), f.sy(0)]])) + 'Z', fill: 'var(--c8)', opacity: 0.18 }));
    line(f, pts, 'var(--c8)', { width: 2 });
    /* irrigation events as drops from the top */
    bal.rows.forEach((row, k) => {
      if (row.I > 0) {
        f.plot.appendChild(svgEl('line', { x1: f.sx(xs[k]), x2: f.sx(xs[k]), y1: f.m.t, y2: f.sy(row.drStart), stroke: 'var(--c4)', 'stroke-width': 1.6 }));
        f.plot.appendChild(svgEl('circle', { cx: f.sx(xs[k]), cy: f.m.t + 4, r: 3, fill: 'var(--c4)' }));
      }
    });
    f.top.appendChild(svgEl('text', { x: f.m.l + 4, y: f.sy(0) + 11, 'font-size': 8.5, class: 'art-txt', fill: 'var(--c1)', 'font-weight': 600 }, T('capacidad de campo (Dr = 0)', 'field capacity (Dr = 0)')));
    f.top.appendChild(svgEl('text', { x: f.W - f.m.r - 4, y: f.sy(raw[Math.floor(n / 2)]) - 4, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c2)', 'font-weight': 600 }, T('AFA (umbral de riego)', 'RAW (irrigation threshold)')));
    f.top.appendChild(svgEl('text', { x: f.W - f.m.r - 4, y: f.sy(taw[n - 1]) - 4, 'font-size': 8.5, 'text-anchor': 'end', class: 'art-txt', fill: 'var(--c5)', 'font-weight': 600 }, T('ADT (marchitez)', 'TAW (wilting)')));
    legend(f, [[T('agotamiento', 'depletion'), 'var(--c8)', 'ln'], [T('riego', 'irrigation'), 'var(--c4)', 'sq'], [T('zona de estrés', 'stress zone'), 'var(--c5)', 'sq']], 12, f.m.l + 2);
  }
  function showWtReadout(r) {
    const box = el('wtReadout'); if (!box) return;
    const t = r.bal.totals;
    const rd = (l, v, s, cls) => `<div class="rd ${cls || ''}"><div class="rd-l">${keepGreek(l)}</div><div class="rd-v">${v}</div>${s ? `<div class="rd-t">${s}</div>` : ''}</div>`;
    const ai = t.eto > 0 ? t.P / t.eto : Infinity;
    const ksTag = Help.tag('ks', t.ksMean);
    box.innerHTML =
      rd('ETo', fmtMm(t.eto, 0), T(`${r.n} días · ${r.cfg.eto === 'pm' ? 'Penman–Monteith' : 'Hargreaves'}`, `${r.n} days · ${r.cfg.eto === 'pm' ? 'Penman–Monteith' : 'Hargreaves'}`)) +
      rd('ETc', fmtMm(t.etc, 0), T(`Kc mid ${fmtFixed(r.kc.mid, 2)} corregido al clima`, `Kc mid ${fmtFixed(r.kc.mid, 2)} corrected to the climate`)) +
      rd(T('Lluvia efectiva', 'Effective rain'), fmtMm(t.Pe, 0), T(`de ${fmtMm(t.P, 0)} caídos`, `of ${fmtMm(t.P, 0)} fallen`), ai < 0.5 ? 'warn' : 'good') +
      rd(T('Riego', 'Irrigation'), t.events ? plural(t.events, T('riego', 'event'), T('riegos', 'events')) : T('ninguno', 'none'), t.events ? T(`${fmtMm(t.I, 0)} netos · ${fmtMm(t.Igross, 0)} brutos`, `${fmtMm(t.I, 0)} net · ${fmtMm(t.Igross, 0)} gross`) : '', t.events ? 'ok' : '') +
      rd(T('Percolación', 'Percolation'), fmtMm(t.DP, 0), T('agua que pasó bajo las raíces', 'water that went below the roots'), t.DP > 0.3 * t.P ? 'warn' : '') +
      rd(T('Días con estrés', 'Stress days'), t.stressDays, T(`Ks medio ${fmtFixed(t.ksMean, 2)}`, `mean Ks ${fmtFixed(t.ksMean, 2)}`) + ksTag, t.ksMean < 0.8 ? 'bad' : t.stressDays ? 'warn' : 'good') +
      rd(T('Déficit de ETc', 'ETc deficit'), fmtMm(t.deficit, 0), fmtPct(t.etc > 0 ? t.deficit / t.etc : 0, 0) + T(' de la demanda', ' of the demand'), t.deficit > 0.2 * t.etc ? 'bad' : t.deficit > 0 ? 'warn' : 'good');
    const st = el('wtStatus');
    if (st) {
      const pct = t.etc > 0 ? t.deficit / t.etc : 0;
      let msg;
      if (r.cfg.irr === 'none') {
        msg = pct < 0.05 ? T(`En temporal el suelo alcanza: la lluvia efectiva cubre la ETc casi todo el ciclo y el estrés es despreciable.`, `Rain-fed, the soil suffices: effective rain covers ETc through almost the whole cycle and stress is negligible.`)
          : T(`En temporal el cultivo pierde <b>${fmtPct(pct, 0)}</b> de su transpiración potencial en ${plural(t.stressDays, 'día', 'días')} de estrés. Activa el riego para ver cuántos eventos y cuántos milímetros harían falta.`,
            `Rain-fed, the crop loses <b>${fmtPct(pct, 0)}</b> of its potential transpiration over ${plural(t.stressDays, 'stress day', 'stress days')}. Turn irrigation on to see how many events and how many millimetres it would take.`);
      } else {
        msg = T(`Regando cuando el agotamiento llega a ${fmtPct(r.cfg.trigger, 0)} del AFA hacen falta <b>${plural(t.events, 'riego', 'riegos')}</b> (${fmtMm(t.Igross, 0)} brutos con ${fmtPct(r.cfg.eff, 0)} de eficiencia). ${t.DP > 0.2 * (t.P + t.I) ? 'La percolación es alta: la lluvia cayó sobre suelo lleno o el riego rellena de más.' : 'La percolación es baja: casi toda el agua se quedó al alcance de las raíces.'}`,
          `Irrigating when depletion reaches ${fmtPct(r.cfg.trigger, 0)} of RAW takes <b>${plural(t.events, 'irrigation', 'irrigations')}</b> (${fmtMm(t.Igross, 0)} gross at ${fmtPct(r.cfg.eff, 0)} efficiency). ${t.DP > 0.2 * (t.P + t.I) ? 'Percolation is high: rain fell on a full soil or the irrigation overfills.' : 'Percolation is low: almost all the water stayed within reach of the roots.'}`);
      }
      st.innerHTML = msg;
    }
  }

  /* ================================================================
     wiring
     ================================================================ */
  function wire() {
    fillSelects();
    /* tabs */
    els('.lab-tab').forEach(b => b.addEventListener('click', () => {
      els('.lab-tab').forEach(x => x.classList.toggle('on', x === b));
      els('.lab').forEach(l => l.classList.toggle('on', l.id === b.dataset.lab));
      if (b.dataset.lab === 'labWater') runWater(); else runGdd();
    }));
    /* thermal lab */
    ['gdSite', 'gdCrop', 'gdMethod', 'gdCutoff'].forEach(id => { const n = el(id); if (n) n.addEventListener('change', runGdd); });
    bindSlider('gdSow', v => fmtDoy(v), runGdd);
    bindSlider('gdBase', v => fmtTemp(v, 1), runGdd);
    bindSlider('gdUpper', v => fmtTemp(v, 1), runGdd);
    const gr = el('gdReset');
    if (gr) gr.addEventListener('click', () => { gdCropId = null; setSlider('gdSow', 105); el('gdCutoff').value = 'horizontal'; runGdd(); });
    /* water lab */
    ['wtSite', 'wtCrop', 'wtSoil', 'wtEto', 'wtIrr'].forEach(id => { const n = el(id); if (n) n.addEventListener('change', runWater); });
    bindSlider('wtSow', v => fmtDoy(v), runWater);
    bindSlider('wtTrigger', v => fmtPct(v, 0) + T(' del AFA', ' of RAW'), runWater);
    bindSlider('wtEff', v => fmtPct(v, 0), runWater);
    bindSlider('wtDr0', v => fmtFixed(v, 0) + '% ADT', runWater);
    const wr = el('wtReset');
    if (wr) wr.addEventListener('click', () => { setSlider('wtSow', 105); setSlider('wtTrigger', 1); setSlider('wtEff', 0.75); setSlider('wtDr0', 30); el('wtIrr').value = 'none'; el('wtEto').value = 'hs'; el('wtSoil').value = 'loam'; ['wtSow', 'wtTrigger', 'wtEff', 'wtDr0'].forEach(id => el(id).dispatchEvent(new Event('input'))); });
    /* both labs redraw with the language (labels live inside the figures) */
    document.addEventListener('langchange', () => { fillSelects(); runGdd(); runWater(); });
    if (window.FigStyle) FigStyle.onChange(() => { /* the CSS rule restyles; nothing to recompute */ });
    runGdd();
    runWater();
  }
  document.addEventListener('DOMContentLoaded', wire);

  window.Playground = { runGdd, runWater, seriesOf, etoOf, drawClimo };
})();
