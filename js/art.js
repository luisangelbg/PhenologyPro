/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — hand-drawn SVG illustrations.
   Every picture is generated here with CSS-variable colours, so the whole app
   follows the light/dark theme and nothing depends on external images.
   Each function returns an SVG string. */

(function () {

  const f1 = v => (+v).toFixed(1);
  const V = n => `var(--${n})`;
  const PI = Math.PI;
  function wrap(vb, inner, extra) { return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" ${extra || ''}>${inner}</svg>`; }
  function txt(x, y, s, fill, size, anchor, extra) {
    return `<text x="${f1(x)}" y="${f1(y)}" fill="${fill || V('text-muted')}" font-size="${size || 8}" text-anchor="${anchor || 'start'}" class="art-font" ${extra || ''}>${s}</text>`;
  }
  const line = (x1, y1, x2, y2, stroke, w, extra) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${stroke}" stroke-width="${w || 1}" ${extra || ''}/>`;
  const circ = (cx, cy, r, fill, extra) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${fill}" ${extra || ''}/>`;
  const rect = (x, y, w, h, fill, extra) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0, w))}" height="${f1(Math.max(0, h))}" fill="${fill}" ${extra || ''}/>`;
  const poly = pts => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
  const path = (d, stroke, w, extra) => `<path d="${d}" stroke="${stroke}" stroke-width="${w || 1.4}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${extra || ''}/>`;
  const fillPath = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra || ''}/>`;

  function axes(x0, y0, x1, y1) {
    return line(x0, y1, x1, y1, V('border-strong'), 1) + line(x0, y0, x0, y1, V('border-strong'), 1);
  }
  /* the sun, with or without rays */
  function sun(cx, cy, r, rays) {
    let s = '';
    if (rays !== false) for (let i = 0; i < 8; i++) {
      const a = i * PI / 4;
      s += line(cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8, V('sun'), r * 0.16, 'stroke-linecap="round" opacity="0.85"');
    }
    return s + circ(cx, cy, r, V('sun')) + circ(cx - r * 0.25, cy - r * 0.25, r * 0.45, V('gold'), 'opacity="0.55"');
  }
  function cloud(cx, cy, w, tone) {
    const c = tone || 'border-strong';
    return circ(cx - w * 0.28, cy, w * 0.2, V(c)) + circ(cx, cy - w * 0.1, w * 0.26, V(c)) + circ(cx + w * 0.28, cy + 0.02 * w, w * 0.2, V(c)) + rect(cx - w * 0.28, cy, w * 0.56, w * 0.2, V(c));
  }
  function drops(cx, cy, n, spread) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = cx - spread / 2 + spread * (i + 0.5) / n, y = cy + (i % 2) * 6;
      s += fillPath(`M${f1(x)} ${f1(y)} c -2.2 3.2 -2.2 5.8 0 5.8 c 2.2 0 2.2 -2.6 0 -5.8 z`, V('rain'), 'opacity="0.9"');
    }
    return s;
  }
  /* the profile of a field with furrows */
  function ground(x0, x1, y, rows, tone) {
    let s = fillPath(`M${f1(x0)} ${f1(y)} L${f1(x1)} ${f1(y)} L${f1(x1)} ${f1(y + 16)} L${f1(x0)} ${f1(y + 16)}Z`, V(tone || 'soil'), 'opacity="0.22"');
    const k = rows || 6;
    for (let i = 0; i <= k; i++) {
      const t = i / k;
      s += line(x0 + t * (x1 - x0), y, x0 + (t - 0.08) * (x1 - x0), y + 16, V(tone || 'soil'), 0.7, 'opacity="0.5"');
    }
    return s;
  }
  /* a plant at a stage from 0 (seed) to 1 (mature, with ear/fruit) */
  function plant(cx, yBase, h, stage, tone) {
    const c = tone || 'leaf';
    let s = '';
    if (stage < 0.08) return circ(cx, yBase - 2, 2.2, V('soil'));
    const H = h * Math.min(1, stage / 0.75);
    s += path(`M${f1(cx)} ${f1(yBase)} L${f1(cx)} ${f1(yBase - H)}`, V(c), Math.max(1, h * 0.05));
    const nLeaves = Math.min(6, Math.floor(stage * 8));
    for (let i = 1; i <= nLeaves; i++) {
      const y = yBase - H * i / (nLeaves + 1), dir = i % 2 ? -1 : 1, L = h * 0.28 * (1 - i / (nLeaves + 3));
      s += fillPath(`M${f1(cx)} ${f1(y)} q ${f1(dir * L * 0.5)} ${f1(-L * 0.35)} ${f1(dir * L)} ${f1(-L * 0.15)} q ${f1(-dir * L * 0.5)} ${f1(L * 0.05)} ${f1(-dir * L)} ${f1(L * 0.15)} z`, V(c), 'opacity="0.9"');
    }
    if (stage > 0.55) s += fillPath(`M${f1(cx)} ${f1(yBase - H)} l -3 -8 l 3 -6 l 3 6 z`, V('gold'), 'opacity="0.95"');
    if (stage > 0.8) s += `<ellipse cx="${f1(cx + h * 0.1)}" cy="${f1(yBase - H * 0.55)}" rx="${f1(h * 0.06)}" ry="${f1(h * 0.14)}" fill="${V('accent')}"/>`;
    return s;
  }
  /* a soil bucket with its water level and the FC / RAW / WP marks */
  function bucket(x, y, w, h, level, marks) {
    let s = fillPath(`M${f1(x)} ${f1(y)} L${f1(x + w)} ${f1(y)} L${f1(x + w - w * 0.08)} ${f1(y + h)} L${f1(x + w * 0.08)} ${f1(y + h)} Z`, V('bg-soft'), `stroke="${V('border-strong')}" stroke-width="1.2"`);
    const lvl = Math.max(0, Math.min(1, level));
    const yw = y + h * (1 - lvl);
    const inset = w * 0.08 * (1 - lvl);
    s += fillPath(`M${f1(x + inset)} ${f1(yw)} L${f1(x + w - inset)} ${f1(yw)} L${f1(x + w - w * 0.08)} ${f1(y + h)} L${f1(x + w * 0.08)} ${f1(y + h)} Z`, V('rain'), 'opacity="0.55"');
    if (marks) {
      const mk2 = (frac, label, tone) => line(x - 4, y + h * (1 - frac), x + w + 4, y + h * (1 - frac), V(tone), 1, 'stroke-dasharray="3 2"') + txt(x + w + 7, y + h * (1 - frac) + 3, label, V(tone), 7, 'start', 'font-weight="700"');
      s += mk2(1, 'CC', 'sky') + mk2(marks.raw != null ? 1 - marks.raw : 0.5, 'AFA', 'accent') + mk2(0, 'PMP', 'heat');
    }
    return s;
  }
  /* a sine day above a base with the area filled: the degree-day picture */
  function sineDay(x0, y0, x1, y1, tmin, tmax, base, upper, cutoff, tone) {
    const H = y1 - y0, W = x1 - x0;
    const sy = t => y1 - (t - 0) / 40 * H;
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, temp = (tmax + tmin) / 2 - (tmax - tmin) / 2 * Math.cos(2 * PI * t);
      pts.push([x0 + t * W, sy(temp)]);
    }
    let s = axes(x0, y0, x1, y1);
    /* area between base and the curve (capped at upper if horizontal) */
    const capped = pts.map(p => [p[0], upper != null && cutoff === 'horizontal' ? Math.max(p[1], sy(upper)) : p[1]]);
    const area = capped.filter((p) => p[1] < sy(base));
    if (area.length) {
      const d = poly([[area[0][0], sy(base)]].concat(area, [[area[area.length - 1][0], sy(base)]])) + 'Z';
      s += fillPath(d, V(tone || 'accent'), 'opacity="0.35"');
    }
    if (upper != null && cutoff === 'vertical') {
      const over = pts.filter(p => p[1] < sy(upper));
      if (over.length) s += fillPath(poly([[over[0][0], sy(base)]].concat(over.map(p => [p[0], sy(base)]), [[over[over.length - 1][0], sy(base)]])) + 'Z', V('heat'), 'opacity="0"');
    }
    s += path(poly(pts), V('heat'), 1.6);
    s += line(x0, sy(base), x1, sy(base), V('primary'), 1, 'stroke-dasharray="3 2"') + txt(x1 + 3, sy(base) + 3, 'Tb', V('primary'), 7, 'start', 'font-weight="700"');
    if (upper != null) s += line(x0, sy(upper), x1, sy(upper), V('heat'), 1, 'stroke-dasharray="3 2"') + txt(x1 + 3, sy(upper) + 3, 'Tu', V('heat'), 7, 'start', 'font-weight="700"');
    return s;
  }

  /* ============================================================
     HERO — the year of a crop seen whole: the sun that drives everything,
     the temperature wave and the heat it accumulates above the base, the
     plant that advances stage by stage, the rain and the soil reservoir.
     ============================================================ */
  function hero() {
    const W = 540, H = 450;
    let s = `<defs>
      <linearGradient id="ppSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--sky)" stop-opacity="0.18"/><stop offset="100%" stop-color="var(--sky)" stop-opacity="0"/></linearGradient>
      <linearGradient id="ppHeat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.55"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0.08"/></linearGradient>
    </defs>`;
    s += rect(0, 0, W, H, 'url(#ppSky)');
    s += sun(468, 58, 24, true);
    s += cloud(120, 62, 70) + drops(120, 82, 5, 44);
    s += txt(26, 28, T('AGROCLIMATOLOGÍA Y FENOLOGÍA', 'AGROCLIMATOLOGY AND PHENOLOGY'), V('primary'), 11, 'start', 'letter-spacing="1.6" font-weight="700"');
    s += txt(26, 44, T('calor · agua · luz · tiempo', 'heat · water · light · time'), V('text-muted'), 10);

    /* --- the temperature wave of the year with the base line and the heat above it --- */
    const x0 = 46, x1 = W - 40, yT = 120, yB = 232;
    const sy = t => yB - (t + 5) / 40 * (yB - yT);
    const N = 120, tm = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const mean = 16 + 6 * Math.cos(2 * PI * (t - 0.45));
      const daily = 7 * Math.sin(2 * PI * t * 18);
      tm.push([x0 + t * (x1 - x0), mean + daily]);
    }
    const base = 10;
    let d = `M${f1(tm[0][0])} ${f1(sy(base))}`;
    tm.forEach(p => { d += ` L${f1(p[0])} ${f1(sy(Math.max(base, p[1])))}`; });
    d += ` L${f1(tm[tm.length - 1][0])} ${f1(sy(base))} Z`;
    s += fillPath(d, 'url(#ppHeat)');
    s += path(poly(tm.map(p => [p[0], sy(p[1])])), V('heat'), 1.3);
    s += line(x0, sy(base), x1, sy(base), V('primary'), 1.2, 'stroke-dasharray="4 3"');
    s += txt(x0 + 2, sy(base) + 11, T('temperatura base', 'base temperature'), V('primary'), 8.5, 'start', 'font-weight="700"');
    s += txt(x0 - 4, yT + 4, '°C', V('text-muted'), 8.5, 'end');
    s += line(x0, yB, x1, yB, V('border-strong'), 1);
    ['E', 'M', 'M', 'J', 'S', 'N'].forEach((m, i) => s += txt(x0 + (i * 2 + 0.5) / 12 * (x1 - x0), yB + 11, T(m, ['J', 'M', 'M', 'J', 'S', 'N'][i]), V('text-muted'), 8, 'middle'));
    s += txt(x1, yB + 11, T('mes', 'month'), V('text-muted'), 8, 'end');

    /* --- the accumulated heat as a rising curve and the plant that follows it --- */
    const yC0 = 262, yC1 = 372;
    let acc = 0; const cum = [];
    tm.forEach((p, i) => { acc += Math.max(0, p[1] - base); cum.push(acc); });
    const max = cum[cum.length - 1];
    const cpts = cum.map((c, i) => [tm[i][0], yC1 - c / max * (yC1 - yC0)]);
    s += axes(x0, yC0 - 6, x1, yC1);
    s += path(poly(cpts), V('primary'), 2.2);
    s += txt(x0 - 4, yC0, '°C·d', V('text-muted'), 8.5, 'end');
    /* stage marks on the curve */
    const stages = [[0.12, T('emergencia', 'emergence')], [0.45, T('floración', 'flowering')], [0.9, T('madurez', 'maturity')]];
    stages.forEach(([frac, label]) => {
      const k = cum.findIndex(c => c >= frac * max);
      const p = cpts[k];
      s += line(p[0], p[1], p[0], yC1, V('accent'), 1, 'stroke-dasharray="2 2"');
      s += circ(p[0], p[1], 3.2, V('accent'));
      s += txt(p[0] + 4, p[1] - 5, label, V('text'), 8.5, 'start', 'font-weight="600"');
    });
    /* the plants on the field, one per stage */
    s += ground(24, W - 24, 400, 10);
    [0.05, 0.2, 0.38, 0.55, 0.72, 0.9, 1].forEach((st, i) => s += plant(70 + i * 66, 402, 52, st));
    /* the bucket of soil water at the right */
    s += bucket(W - 96, 262, 46, 90, 0.62, { raw: 0.45 });
    s += txt(W - 73, 372 + 12, T('agua del suelo', 'soil water'), V('text-muted'), 7.5, 'middle');
    s += txt(26, 438, T('la planta no cuenta días: cuenta calor, agua y luz', 'the plant does not count days: it counts heat, water and light'), V('text-muted'), 9, 'start', 'font-style="italic"');
    return wrap(`0 0 ${W} ${H}`, s);
  }

  /* ============================================================
     BLOCK CARDS — one small picture per block
     ============================================================ */
  function climData() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    /* a table of daily rows */
    s += rect(14, 14, 120, 84, V('card-bg'), `rx="6" stroke="${V('border')}"`);
    for (let i = 0; i < 6; i++) {
      const y = 28 + i * 12;
      s += txt(22, y + 3, ['2025-05-0' + (i + 1)], V('text-muted'), 6.5);
      [70, 92, 112].forEach((x, k) => s += rect(x, y - 4, 14 + (k === 2 ? (i % 3) * 4 : 4), 6, V(k === 0 ? 'heat' : k === 1 ? 'sky' : 'rain'), 'rx="1.5" opacity="0.75"'));
    }
    s += txt(22, 24, 'Tmax  Tmin  P', V('text'), 6.5, 'start', 'font-weight="700" x="70"');
    /* a thermometer and a rain gauge */
    s += rect(160, 18, 10, 60, V('card-bg'), `rx="5" stroke="${V('border-strong')}"`) + rect(163, 40, 4, 36, V('heat'), 'rx="2"') + circ(165, 80, 8, V('heat'));
    s += fillPath(`M188 24 L214 24 L210 82 L192 82 Z`, V('card-bg'), `stroke="${V('border-strong')}"`) + fillPath(`M195 56 L208 56 L210 82 L192 82 Z`, V('rain'), 'opacity="0.7"');
    for (let i = 0; i < 6; i++) s += line(190 + i * 0.6, 30 + i * 9, 196 + i * 0.6, 30 + i * 9, V('border-strong'), 0.8);
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function walterLieth(W, H, o) {
    const opt = o || {};
    W = W || 240; H = H || 112;
    const x0 = 34, x1 = W - 34, y0 = 16, y1 = H - 18;
    let s = rect(0, 0, W, H, V(opt.bg || 'bg-soft'));
    const T12 = opt.T || [12, 13, 15, 17, 18, 17, 16, 16, 16, 15, 13, 12];
    const P12 = opt.P || [8, 6, 10, 25, 55, 110, 130, 125, 115, 45, 10, 5];
    const sx = i => x0 + (i + 0.5) / 12 * (x1 - x0);
    const syT = t => y1 - t / 50 * (y1 - y0);
    const syP = p => p <= 100 ? y1 - p / 100 * (y1 - y0) : y1 - (y1 - y0) * (1 + (p - 100) / 1000);
    s += axes(x0, y0, x1, y1);
    const tp = T12.map((t, i) => [sx(i), syT(t)]), pp = P12.map((p, i) => [sx(i), syP(p)]);
    /* humid where P > 2T: hatched blue; dry where P < 2T: dotted red */
    for (let i = 0; i < 12; i++) {
      const yT = syT(T12[i]), yP = syP(Math.min(100, P12[i]));
      const xa = x0 + i / 12 * (x1 - x0), xb = x0 + (i + 1) / 12 * (x1 - x0);
      if (yP < yT) s += rect(xa, yP, xb - xa, yT - yP, V('rain'), 'opacity="0.28"');
      else s += rect(xa, yT, xb - xa, yP - yT, V('heat'), 'opacity="0.18"');
      if (P12[i] > 100) s += rect(xa, syP(P12[i]), xb - xa, syP(100) - syP(P12[i]), V('rain'), 'opacity="0.85"');
    }
    s += path(poly(tp), V('heat'), 1.6) + path(poly(pp), V('rain'), 1.6);
    s += txt(x0 - 4, y0 + 4, '°C', V('heat'), 7, 'end') + txt(x1 + 4, y0 + 4, 'mm', V('rain'), 7, 'start');
    [0, 10, 20, 30].forEach(t => s += txt(x0 - 3, syT(t) + 2.5, t, V('text-muted'), 6, 'end') + txt(x1 + 3, syT(t) + 2.5, t * 2, V('text-muted'), 6, 'start'));
    /* frost months under the axis */
    (opt.frost || [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]).forEach((f, i) => { if (f) s += rect(x0 + i / 12 * (x1 - x0), y1 + 2, (x1 - x0) / 12, 4, V('frost')); });
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function siteClimate() { return walterLieth(240, 112); }
  function degreeDays() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    s += sineDay(20, 14, 150, 96, 8, 30, 10, 30, 'horizontal');
    s += txt(85, 108, T('un día: área sobre la base', 'one day: area above the base'), V('text-muted'), 7, 'middle');
    /* the accumulation at the right */
    const pts = []; let acc = 0;
    for (let i = 0; i <= 20; i++) { acc += 3 + 4 * Math.sin(i / 20 * PI); pts.push([172 + i * 2.8, 92 - acc / 130 * 70]); }
    s += axes(172, 14, 230, 92) + path(poly(pts), V('primary'), 2);
    s += txt(201, 108, '°C·d', V('primary'), 7, 'middle', 'font-weight="700"');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function eto() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    s += sun(48, 34, 14, true);
    /* grass */
    for (let i = 0; i < 26; i++) s += path(`M${f1(20 + i * 8)} 92 q 2 -8 ${f1(3 + (i % 3))} -16`, V('leaf'), 1.6);
    s += ground(14, W - 14, 92, 10);
    /* vapour arrows */
    for (let i = 0; i < 4; i++) s += path(`M${f1(110 + i * 26)} 84 q -4 -10 0 -18 q 4 -8 0 -16`, V('sky'), 1.4, 'opacity="0.8"');
    /* wind */
    s += path('M150 30 q 12 -6 24 0 q 8 4 16 0', V('text-muted'), 1.2) + path('M160 44 q 12 -6 24 0 q 8 4 16 0', V('text-muted'), 1.2);
    s += txt(196, 22, 'u₂', V('text-muted'), 8, 'start', 'font-weight="700"') + txt(72, 22, 'Rn', V('sun'), 8, 'start', 'font-weight="700"');
    s += txt(120, 108, T('ETo = radiación + aire seco y viento', 'ETo = radiation + dry air and wind'), V('text-muted'), 7, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function balance() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    s += bucket(30, 16, 60, 78, 0.55, { raw: 0.45 });
    s += cloud(150, 26, 44) + drops(150, 40, 4, 30);
    s += path('M160 62 q 16 -4 26 8', V('rain'), 1.6, 'marker-end=""') + txt(190, 78, 'P', V('rain'), 8, 'start', 'font-weight="700"');
    for (let i = 0; i < 3; i++) s += path(`M${f1(120 + i * 12)} 92 q -3 -8 0 -14 q 3 -6 0 -12`, V('sky'), 1.3);
    s += txt(156, 96, 'ETc', V('sky'), 8, 'start', 'font-weight="700"');
    s += txt(120, 108, T('lluvia − ETc = lo que queda en el suelo', 'rain − ETc = what stays in the soil'), V('text-muted'), 7, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function irrigation() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    /* a calendar */
    s += rect(16, 14, 118, 84, V('card-bg'), `rx="6" stroke="${V('border')}"`) + rect(16, 14, 118, 16, V('primary'), 'rx="6"') + rect(16, 24, 118, 6, V('primary'));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) {
      const x = 22 + c * 16, y = 36 + r * 15;
      const wet = (r * 7 + c) % 9 === 3;
      s += rect(x, y, 12, 11, wet ? V('rain') : V('bg-soft'), 'rx="2"' + (wet ? ' opacity="0.85"' : ''));
    }
    /* the depletion curve with the trigger */
    const pts = []; let d = 0;
    for (let i = 0; i <= 40; i++) { d += 1.4; if (d > 32) d = 2; pts.push([150 + i * 2, 30 + d]); }
    s += axes(150, 18, 232, 80) + path(poly(pts), V('soil'), 1.8);
    s += line(150, 62, 232, 62, V('accent'), 1, 'stroke-dasharray="3 2"') + txt(234, 65, 'AFA', V('accent'), 6.5, 'start', 'font-weight="700"');
    s += txt(191, 108, T('regar cuando se agota el AFA', 'irrigate when RAW runs out'), V('text-muted'), 7, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function phenology() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    s += ground(14, W - 14, 86, 9);
    [0.05, 0.18, 0.36, 0.55, 0.75, 0.92, 1].forEach((st, i) => s += plant(32 + i * 30, 88, 56, st));
    ['00', '10', '15', '30', '61', '75', '89'].forEach((c, i) => s += txt(32 + i * 30, 106, c, V('text-muted'), 6.5, 'middle', 'font-weight="700"'));
    s += txt(16, 16, 'BBCH', V('primary'), 8, 'start', 'font-weight="700" letter-spacing="1"');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function risks() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    /* a snowflake and a sun on either side of a probability curve */
    const sf = (cx, cy, r) => { let z = ''; for (let i = 0; i < 6; i++) { const a = i * PI / 3; z += line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, V('frost'), 1.6); z += line(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, cx + Math.cos(a + 0.5) * r * 0.85, cy + Math.sin(a + 0.5) * r * 0.85, V('frost'), 1.2); } return z; };
    s += sf(40, 40, 16) + sun(200, 40, 12, true);
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([60 + t * 120, 90 - 60 / (1 + Math.exp(-(t - 0.5) * 12))]); }
    s += axes(60, 24, 180, 92) + path(poly(pts), V('primary'), 2);
    s += line(60, 90 - 60 * 0.2, 180, 90 - 60 * 0.2, V('accent'), 1, 'stroke-dasharray="3 2"') + txt(182, 90 - 60 * 0.2 + 3, '20 %', V('accent'), 6.5, 'start', 'font-weight="700"');
    s += txt(120, 108, T('probabilidad de helada por fecha', 'frost probability by date'), V('text-muted'), 7, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function report() {
    const W = 240, H = 112;
    let s = rect(0, 0, W, H, V('bg-soft'));
    s += rect(60, 8, 120, 100, V('card-bg'), `rx="4" stroke="${V('border')}"`);
    s += rect(70, 18, 70, 5, V('text'), 'rx="1.5" opacity="0.7"') + rect(70, 28, 100, 3, V('text-muted'), 'rx="1" opacity="0.5"') + rect(70, 34, 90, 3, V('text-muted'), 'rx="1" opacity="0.5"');
    s += rect(70, 44, 100, 38, V('bg-soft'), 'rx="3"');
    const pts = []; for (let i = 0; i <= 20; i++) pts.push([74 + i * 4.6, 78 - 12 * (1 + Math.sin(i / 3))]);
    s += path(poly(pts), V('primary'), 1.6);
    [0, 1, 2, 3, 4].forEach(i => s += rect(74 + i * 19, 76 - 6 - i * 3, 8, 6 + i * 3, V('accent'), 'opacity="0.55"'));
    s += rect(70, 88, 100, 3, V('text-muted'), 'rx="1" opacity="0.5"') + rect(70, 94, 80, 3, V('text-muted'), 'rx="1" opacity="0.5"');
    return wrap(`0 0 ${W} ${H}`, s);
  }

  /* ============================================================
     MATERIAL STRIP — the kinds of system the app is written for
     ============================================================ */
  function matRainfed() {
    let s = cloud(40, 18, 34) + drops(40, 30, 3, 22);
    s += ground(6, 154, 44, 10);
    [0.35, 0.5, 0.65, 0.5, 0.4].forEach((st, i) => s += plant(30 + i * 26, 46, 30, st));
    return wrap('0 0 160 64', s);
  }
  function matIrrigated() {
    let s = ground(6, 154, 44, 10);
    s += line(10, 22, 150, 22, V('rain'), 2.2);
    for (let i = 0; i < 7; i++) s += drops(20 + i * 20, 26, 1, 4);
    [0.6, 0.7, 0.75, 0.7, 0.65, 0.7].forEach((st, i) => s += plant(24 + i * 22, 46, 28, st));
    return wrap('0 0 160 64', s);
  }
  function matVegetables() {
    let s = fillPath('M20 48 L20 24 Q80 -4 140 24 L140 48 Z', V('sky'), 'opacity="0.18" stroke="var(--sky)" stroke-width="1.2"');
    s += ground(6, 154, 48, 10);
    [0.5, 0.8, 0.95, 0.8, 0.5].forEach((st, i) => s += plant(44 + i * 18, 50, 26, st, 'leaf'));
    return wrap('0 0 160 64', s);
  }
  function matDeciduous() {
    let s = ground(6, 154, 50, 10);
    const tree = (cx, leaves) => path(`M${cx} 50 L${cx} 30 M${cx} 36 L${cx - 8} 26 M${cx} 34 L${cx + 9} 24`, V('soil'), 2.2) + (leaves ? circ(cx, 24, 12, V('leaf'), 'opacity="0.85"') + circ(cx - 4, 22, 3, V('rose')) + circ(cx + 5, 27, 3, V('rose')) : '');
    s += tree(40, false) + tree(80, true) + tree(120, true);
    for (let i = 0; i < 6; i++) { const a = i * PI / 3; s += line(24, 14, 24 + Math.cos(a) * 7, 14 + Math.sin(a) * 7, V('frost'), 1.4); }
    return wrap('0 0 160 64', s);
  }
  function matTropical() {
    let s = ground(6, 154, 50, 10);
    const shrub = cx => `<ellipse cx="${cx}" cy="30" rx="16" ry="18" fill="${V('leaf')}" opacity="0.85"/>` + circ(cx - 6, 32, 2.6, V('heat')) + circ(cx + 5, 26, 2.6, V('heat')) + circ(cx + 2, 38, 2.6, V('heat'));
    s += shrub(40) + shrub(80) + shrub(120);
    s += sun(146, 12, 8, true);
    return wrap('0 0 160 64', s);
  }
  function matForage() {
    let s = ground(6, 154, 50, 10);
    for (let i = 0; i < 30; i++) s += path(`M${f1(12 + i * 4.8)} 50 q 1.5 -9 ${f1(2 + (i % 3))} -18`, V('leaf'), 1.4);
    s += rect(110, 24, 26, 14, V('gold'), 'rx="3"') + line(110, 31, 136, 31, V('accent'), 0.8) + line(123, 24, 123, 38, V('accent'), 0.8);
    return wrap('0 0 160 64', s);
  }

  /* ============================================================
     METHOD GALLERY — one small figure per method
     ============================================================ */
  function mSine() { return wrap('0 0 200 124', rect(0, 0, 200, 124, V('bg-soft')) + sineDay(24, 14, 176, 104, 6, 30, 10, null, 'none')); }
  function mTriangle() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const sy = t => 104 - t / 40 * 90;
    s += fillPath(poly([[24 + 152 * 0.1, sy(10)], [100, sy(30)], [176 - 152 * 0.1, sy(10)]]) + 'Z', V('accent'), 'opacity="0.35"');
    s += path(poly([[24, sy(6)], [100, sy(30)], [176, sy(6)]]), V('heat'), 1.6);
    s += line(24, sy(10), 176, sy(10), V('primary'), 1, 'stroke-dasharray="3 2"') + txt(179, sy(10) + 3, 'Tb', V('primary'), 7, 'start', 'font-weight="700"');
    return wrap('0 0 200 124', s);
  }
  function mAverage() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const sy = t => 104 - t / 40 * 90;
    s += rect(24, sy(18), 152, sy(10) - sy(18), V('accent'), 'opacity="0.35"');
    s += line(24, sy(18), 176, sy(18), V('heat'), 1.8) + line(24, sy(30), 176, sy(30), V('heat'), 0.8, 'stroke-dasharray="2 2"') + line(24, sy(6), 176, sy(6), V('heat'), 0.8, 'stroke-dasharray="2 2"');
    s += line(24, sy(10), 176, sy(10), V('primary'), 1, 'stroke-dasharray="3 2"') + txt(179, sy(10) + 3, 'Tb', V('primary'), 7, 'start', 'font-weight="700"');
    s += txt(179, sy(18) + 3, 'T̄', V('heat'), 7, 'start', 'font-weight="700"');
    return wrap('0 0 200 124', s);
  }
  function mCutoffs() { return wrap('0 0 200 124', rect(0, 0, 200, 124, V('bg-soft')) + sineDay(24, 14, 176, 104, 12, 38, 10, 30, 'horizontal')); }
  function mChu() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const sx = t => 24 + (t - 0) / 45 * 152, sy = y => 104 - y / 35 * 90;
    const pts = []; for (let t = 10; t <= 45; t += 1) pts.push([sx(t), sy(Math.max(0, 3.33 * (t - 10) - 0.084 * (t - 10) * (t - 10)))]);
    s += path(poly(pts), V('heat'), 1.8);
    const pn = []; for (let t = 4.4; t <= 25; t += 1) pn.push([sx(t), sy(1.8 * (t - 4.4))]);
    s += path(poly(pn), V('frost'), 1.8);
    s += txt(sx(30), sy(33) - 4, T('día', 'day'), V('heat'), 7, 'middle') + txt(sx(22), sy(31) + 10, T('noche', 'night'), V('frost'), 7, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mPM() {
    let s = rect(0, 0, 200, 124, V('bg-soft'));
    s += rect(30, 30, 60, 60, V('sun'), 'rx="6" opacity="0.35"') + rect(110, 30, 60, 60, V('sky'), 'rx="6" opacity="0.35"');
    s += sun(60, 60, 12, true);
    s += path('M120 52 q 12 -6 24 0 q 8 4 16 0', V('primary'), 1.6) + path('M124 66 q 12 -6 24 0 q 8 4 16 0', V('primary'), 1.6) + path('M120 80 q 12 -6 24 0 q 8 4 16 0', V('primary'), 1.6);
    s += txt(60, 106, T('radiación', 'radiation'), V('text'), 8, 'middle', 'font-weight="700"') + txt(140, 106, T('aerodinámico', 'aerodynamic'), V('text'), 8, 'middle', 'font-weight="700"');
    s += txt(100, 20, 'ETo', V('primary'), 10, 'middle', 'font-weight="800"') + txt(100, 66, '+', V('text'), 16, 'middle', 'font-weight="700"');
    return wrap('0 0 200 124', s);
  }
  function mHargreaves() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const pts1 = [], pts2 = [];
    for (let i = 0; i <= 30; i++) { const t = i / 30; pts1.push([24 + t * 152, 40 - 10 * Math.sin(t * 6)]); pts2.push([24 + t * 152, 84 - 10 * Math.sin(t * 6 + 1)]); }
    s += fillPath(poly(pts1.concat(pts2.slice().reverse())) + 'Z', V('accent'), 'opacity="0.25"');
    s += path(poly(pts1), V('heat'), 1.6) + path(poly(pts2), V('frost'), 1.6);
    s += txt(178, 42, 'Tmax', V('heat'), 7, 'start', 'font-weight="700"') + txt(178, 86, 'Tmin', V('frost'), 7, 'start', 'font-weight="700"');
    s += sun(44, 26, 7, true);
    s += txt(100, 116, '√(Tmax − Tmin) · Ra', V('text-muted'), 7.5, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mThornthwaite() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const T12 = [12, 13, 15, 17, 18, 17, 16, 16, 16, 15, 13, 12];
    T12.forEach((t, i) => s += rect(28 + i * 12.4, 104 - t * 4.5, 9, t * 4.5, V('accent'), 'opacity="0.7" rx="1"'));
    s += txt(100, 116, 'PET = 16 (10T/I)ᵃ', V('text-muted'), 7.5, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mPriestley() {
    let s = rect(0, 0, 200, 124, V('bg-soft'));
    s += sun(100, 40, 16, true);
    for (let i = 0; i < 5; i++) s += path(`M${f1(60 + i * 20)} 100 q -3 -8 0 -14 q 3 -6 0 -12`, V('sky'), 1.5);
    s += ground(20, 180, 100, 8);
    s += txt(100, 118, 'α · Δ/(Δ+γ) · Rn', V('text-muted'), 7.5, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mKc() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const sy = k => 104 - k / 1.4 * 90;
    s += path(poly([[24, sy(0.35)], [60, sy(0.35)], [100, sy(1.15)], [140, sy(1.15)], [176, sy(0.6)]]), V('leaf'), 2.2);
    s += line(24, sy(1), 176, sy(1), V('border-strong'), 0.8, 'stroke-dasharray="2 2"');
    ['ini', 'des', 'med', 'fin'].forEach((l, i) => s += txt(42 + i * 38, 114, T(l, ['ini', 'dev', 'mid', 'late'][i]), V('text-muted'), 7, 'middle'));
    s += txt(20, sy(1) + 3, '1', V('text-muted'), 7, 'end');
    return wrap('0 0 200 124', s);
  }
  function mBalanceTM() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const P = [8, 6, 10, 25, 55, 110, 130, 125, 115, 45, 10, 5], E = [45, 55, 75, 90, 100, 95, 85, 85, 75, 65, 50, 42];
    const sx = i => 24 + (i + 0.5) / 12 * 152, sy = v => 104 - v / 140 * 90;
    for (let i = 0; i < 12; i++) {
      const a = sx(i) - 6, w = 12;
      if (P[i] > E[i]) s += rect(a, sy(P[i]), w, sy(E[i]) - sy(P[i]), V('rain'), 'opacity="0.45"');
      else s += rect(a, sy(E[i]), w, sy(P[i]) - sy(E[i]), V('heat'), 'opacity="0.35"');
    }
    s += path(poly(P.map((p, i) => [sx(i), sy(p)])), V('rain'), 1.8) + path(poly(E.map((e, i) => [sx(i), sy(e)])), V('heat'), 1.8);
    return wrap('0 0 200 124', s);
  }
  function mBalanceDaily() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const pts = []; let d = 4;
    for (let i = 0; i <= 60; i++) { d += 1.1 + (i % 7 === 0 ? -8 : 0); if (d > 40) d = 3; d = Math.max(0, d); pts.push([24 + i * 2.53, 20 + d * 1.8]); }
    s += path(poly(pts), V('soil'), 1.8);
    s += line(24, 20 + 40 * 1.8 * 0.55, 176, 20 + 40 * 1.8 * 0.55, V('accent'), 1, 'stroke-dasharray="3 2"') + txt(178, 20 + 40 * 1.8 * 0.55 + 3, 'AFA', V('accent'), 6.5, 'start', 'font-weight="700"');
    s += line(24, 20 + 40 * 1.8, 176, 20 + 40 * 1.8, V('heat'), 1, 'stroke-dasharray="3 2"') + txt(178, 20 + 40 * 1.8 + 3, 'ADT', V('heat'), 6.5, 'start', 'font-weight="700"');
    s += txt(100, 116, T('agotamiento diario', 'daily depletion'), V('text-muted'), 7.5, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mIrrigation() { return irrigation().replace('viewBox="0 0 240 112"', 'viewBox="0 0 240 112" preserveAspectRatio="xMidYMid meet"'); }
  function mUtah() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const sx = t => 24 + (t + 2) / 24 * 152, sy = w => 59 - w * 36;
    const steps = [[-2, 1.4, 0], [1.4, 2.4, 0.5], [2.4, 9.1, 1], [9.1, 12.4, 0.5], [12.4, 15.9, 0], [15.9, 18, -0.5], [18, 22, -1]];
    steps.forEach(([a, b, w]) => s += rect(sx(a), Math.min(sy(w), sy(0)), sx(b) - sx(a), Math.abs(sy(w) - sy(0)), w >= 0 ? V('frost') : V('heat'), 'opacity="0.7"'));
    s += line(24, sy(0), 176, sy(0), V('border-strong'), 1);
    s += txt(100, 116, T('peso por hora según su temperatura', 'weight per hour by its temperature'), V('text-muted'), 7, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mDynamic() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const pts = []; let x = 0, cp = 0;
    for (let i = 0; i <= 60; i++) { x += 0.06 + 0.02 * Math.sin(i); if (x >= 1) { x = 0.3; cp += 1; } pts.push([24 + i * 2.53, 100 - cp * 9 - x * 8]); }
    s += path(poly(pts), V('primary'), 1.6);
    s += txt(100, 116, T('porciones que el calor no borra', 'portions that warmth does not erase'), V('text-muted'), 7, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mPhotoperiod() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48; pts.push([24 + t * 152, 60 - 30 * Math.cos(2 * PI * (t - 0.47))]); }
    s += path(poly(pts), V('sun'), 2);
    s += line(24, 60, 176, 60, V('border-strong'), 0.8, 'stroke-dasharray="2 2"') + txt(20, 63, '12 h', V('text-muted'), 7, 'end');
    s += txt(100, 116, T('horas de luz a lo largo del año', 'hours of light through the year'), V('text-muted'), 7, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mClimograph() { return walterLieth(200, 124); }
  function mAridity() {
    let s = rect(0, 0, 200, 124, V('bg-soft'));
    const cls = [['0.05', 'heat'], ['0.2', 'accent'], ['0.5', 'gold'], ['0.65', 'leaf'], ['', 'rain']];
    cls.forEach(([l, c], i) => s += rect(20 + i * 32, 40, 30, 30, V(c), 'opacity="0.7" rx="3"') + (l ? txt(50 + i * 32, 84, l, V('text-muted'), 7, 'middle') : ''));
    s += txt(100, 28, 'P / ETP', V('text'), 9, 'middle', 'font-weight="700"');
    s += txt(100, 110, T('hiperárido → húmedo', 'hyper-arid → humid'), V('text-muted'), 7.5, 'middle');
    return wrap('0 0 200 124', s);
  }
  function mFrost() { return risks().replace('viewBox="0 0 240 112"', 'viewBox="0 0 240 112" preserveAspectRatio="xMidYMid meet"'); }
  function mWindow() {
    let s = rect(0, 0, 200, 124, V('bg-soft')) + axes(24, 14, 176, 104);
    const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48; pts.push([24 + t * 152, 96 - 70 * Math.exp(-Math.pow((t - 0.42) / 0.16, 2))]); }
    s += fillPath(poly([[24 + 0.3 * 152, 104]].concat(pts.filter(p => p[0] >= 24 + 0.3 * 152 && p[0] <= 24 + 0.56 * 152), [[24 + 0.56 * 152, 104]])) + 'Z', V('leaf'), 'opacity="0.3"');
    s += path(poly(pts), V('primary'), 2);
    s += txt(100, 116, T('rendimiento esperado por fecha de siembra', 'expected yield by sowing date'), V('text-muted'), 7, 'middle');
    return wrap('0 0 200 124', s);
  }

  /* ============================================================
     THEORY FIGURES
     ============================================================ */
  function figCutoffs() {
    const W = 310, H = 150;
    let s = '';
    const cols = [['horizontal', T('horizontal', 'horizontal')], ['vertical', T('vertical', 'vertical')], ['intermediate', T('intermedio', 'intermediate')]];
    cols.forEach(([c, name], i) => {
      const x0 = 14 + i * 100;
      s += sineDay(x0, 16, x0 + 76, 116, 12, 38, 10, 30, c === 'intermediate' ? 'none' : c);
      if (c === 'vertical') {
        /* the hours above the upper threshold count zero: white them out */
        const sy = t => 116 - t / 40 * 100;
        const M = 25, A = 13;
        const th = Math.asin((30 - M) / A);
        const ta = (PI / 2 - th) / (2 * PI), tb = 1 - ta; /* fraction of the day where the sine is above Tu, around the middle */
        const xa = x0 + (0.5 - (0.5 - ta)) * 76 - 0, xb = x0 + (0.5 + (0.5 - ta)) * 76;
        s += rect(x0 + 76 * (0.5 - (tb - 0.5)), sy(30) - 0.5, 76 * (2 * (tb - 0.5)), sy(10) - sy(30), V('bg-soft'), 'opacity="1"');
        s += rect(x0 + 76 * (0.5 - (tb - 0.5)), sy(30) - 0.5, 76 * (2 * (tb - 0.5)), sy(10) - sy(30), V('heat'), 'opacity="0.08"');
      }
      if (c === 'intermediate') {
        const sy = t => 116 - t / 40 * 100;
        const pts = []; for (let k = 0; k <= 48; k++) { const t = k / 48; pts.push([x0 + t * 76, sy(25 - 13 * Math.cos(2 * PI * t))]); }
        const over = pts.filter(p => p[1] < sy(30));
        if (over.length) s += fillPath(poly([[over[0][0], sy(30)]].concat(over, [[over[over.length - 1][0], sy(30)]])) + 'Z', V('heat'), 'opacity="0.55"');
        s += txt(x0 + 38, 30, '−', V('heat'), 12, 'middle', 'font-weight="800"');
      }
      s += txt(x0 + 38, 134, name, V('text'), 8, 'middle', 'font-weight="700"');
    });
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function figPM() {
    const W = 310, H = 150;
    let s = '';
    s += sun(40, 34, 14, true);
    /* energy balance arrows */
    s += path('M60 40 L120 76', V('sun'), 2) + txt(72, 52, 'Rs', V('sun'), 8, 'start', 'font-weight="700"');
    s += path('M150 60 L150 20', V('text-muted'), 1.6, 'stroke-dasharray="3 2"') + txt(154, 30, 'Rnl', V('text-muted'), 8);
    s += path('M124 76 L100 36', V('sky'), 1.2, 'stroke-dasharray="2 2"') + txt(96, 60, 'α', V('sky'), 8, 'end');
    for (let i = 0; i < 20; i++) s += path(`M${f1(30 + i * 13)} 96 q 2 -8 3 -14`, V('leaf'), 1.4);
    s += ground(20, 290, 96, 12);
    s += path('M60 118 L60 104', V('soil'), 1.4) + txt(64, 116, 'G', V('soil'), 8);
    s += path('M190 40 q 14 -6 28 0 q 8 4 18 0', V('primary'), 1.6) + path('M196 56 q 14 -6 28 0 q 8 4 18 0', V('primary'), 1.6);
    s += txt(240, 32, 'u₂ · (es − ea)', V('primary'), 8, 'start', 'font-weight="700"');
    for (let i = 0; i < 4; i++) s += path(`M${f1(180 + i * 22)} 90 q -3 -8 0 -14 q 3 -6 0 -12`, V('sky'), 1.5);
    s += txt(220, 140, 'ETo = [0.408Δ(Rn−G) + γ·900/(T+273)·u₂(es−ea)] / [Δ + γ(1+0.34u₂)]', V('text-muted'), 6.4, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function figBucket() {
    const W = 310, H = 150;
    let s = bucket(40, 16, 90, 110, 0.7, { raw: 0.45 });
    s += txt(200, 30, T('capacidad de campo: Dr = 0', 'field capacity: Dr = 0'), V('sky'), 8, 'start', 'font-weight="700"');
    s += txt(200, 48, T('agua fácilmente aprovechable', 'readily available water'), V('text'), 8);
    s += txt(200, 60, 'AFA = p · ADT', V('text-muted'), 8);
    s += txt(200, 82, T('umbral de riego: Dr = AFA', 'irrigation threshold: Dr = RAW'), V('accent'), 8, 'start', 'font-weight="700"');
    s += txt(200, 100, T('de aquí abajo, estrés (Ks < 1)', 'below here, stress (Ks < 1)'), V('text'), 8);
    s += txt(200, 122, T('marchitez: Dr = ADT', 'wilting: Dr = TAW'), V('heat'), 8, 'start', 'font-weight="700"');
    s += txt(200, 140, 'ADT = 1000 (θCC − θPMP) Zr', V('text-muted'), 8);
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function figKc() {
    const W = 310, H = 150;
    let s = axes(34, 14, 296, 116);
    const sy = k => 116 - k / 1.4 * 102;
    const sx = d => 34 + d / 150 * 262;
    const L = { ini: 25, dev: 40, mid: 45, late: 40 };
    const x1 = L.ini, x2 = x1 + L.dev, x3 = x2 + L.mid, x4 = x3 + L.late;
    [[0, x1, 'bg-soft'], [x1, x2, 'card-bg'], [x2, x3, 'bg-soft'], [x3, x4, 'card-bg']].forEach(([a, b, c]) => s += rect(sx(a), 14, sx(b) - sx(a), 102, V(c), 'opacity="0.7"'));
    s += path(poly([[sx(0), sy(0.3)], [sx(x1), sy(0.3)], [sx(x2), sy(1.2)], [sx(x3), sy(1.2)], [sx(x4), sy(0.6)]]), V('leaf'), 2.4);
    s += line(34, sy(1), 296, sy(1), V('border-strong'), 0.8, 'stroke-dasharray="2 2"');
    ['0.5', '1.0'].forEach((k, i) => s += txt(30, sy(+k) + 3, k, V('text-muted'), 7.5, 'end'));
    txt(30, sy(1.2) + 3, 'Kc', V('text'), 7.5, 'end');
    [['inicial', 'initial', 0, x1], ['desarrollo', 'development', x1, x2], ['media estación', 'mid-season', x2, x3], ['final', 'late', x3, x4]].forEach(([es, en, a, b]) => s += txt((sx(a) + sx(b)) / 2, 128, T(es, en), V('text'), 7.5, 'middle', 'font-weight="600"'));
    s += txt(sx(x1) + 4, sy(0.3) - 6, 'Kc ini', V('leaf'), 7.5) + txt((sx(x2) + sx(x3)) / 2, sy(1.2) - 6, 'Kc mid', V('leaf'), 7.5, 'middle') + txt(sx(x4) - 2, sy(0.6) - 8, 'Kc end', V('leaf'), 7.5, 'end');
    s += ground(34, 296, 138, 12);
    [0.05, 0.2, 0.45, 0.7, 0.9, 1].forEach((st, i) => s += plant(sx(8 + i * 27), 140, 22, st));
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function figClimograph() { return walterLieth(310, 150, { bg: 'card-bg' }); }
  function figChill() {
    const W = 310, H = 150;
    let s = axes(34, 14, 296, 116);
    const sx = t => 34 + (t + 4) / 28 * 262, sy = w => 65 - w * 46;
    const steps = [[-4, 1.4, 0], [1.4, 2.4, 0.5], [2.4, 9.1, 1], [9.1, 12.4, 0.5], [12.4, 15.9, 0], [15.9, 18, -0.5], [18, 24, -1]];
    steps.forEach(([a, b, w]) => s += rect(sx(a), Math.min(sy(w), sy(0)), sx(b) - sx(a), Math.abs(sy(w) - sy(0)), w >= 0 ? V('frost') : V('heat'), 'opacity="0.7"'));
    s += line(34, sy(0), 296, sy(0), V('border-strong'), 1.2);
    [0, 5, 10, 15, 20].forEach(t => s += txt(sx(t), 126, t + ' °C', V('text-muted'), 7.5, 'middle'));
    [1, 0.5, 0, -0.5, -1].forEach(w => s += txt(30, sy(w) + 3, w, V('text-muted'), 7, 'end'));
    s += txt(sx(6), sy(1) - 5, T('1 unidad Utah por hora', '1 Utah unit per hour'), V('frost'), 8, 'middle', 'font-weight="700"');
    s += txt(sx(21), sy(-1) + 12, T('el calor resta', 'warmth subtracts'), V('heat'), 8, 'middle', 'font-weight="700"');
    s += txt(165, 144, T('modelo Utah (Richardson et al. 1974)', 'Utah model (Richardson et al. 1974)'), V('text-muted'), 7.5, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function figSeason() {
    const W = 310, H = 150;
    let s = axes(34, 14, 296, 116);
    const sx = J => 34 + J / 365 * 262;
    /* frost-free span, rain span and the thermal time available */
    s += rect(sx(75), 30, sx(310) - sx(75), 14, V('frost'), 'opacity="0.35" rx="3"') + txt(sx(190), 40, T('sin heladas', 'frost-free'), V('text'), 7.5, 'middle', 'font-weight="600"');
    s += rect(sx(150), 52, sx(285) - sx(150), 14, V('rain'), 'opacity="0.4" rx="3"') + txt(sx(217), 62, T('lluvias', 'rains'), V('text'), 7.5, 'middle', 'font-weight="600"');
    s += rect(sx(120), 74, sx(240) - sx(120), 14, V('accent'), 'opacity="0.45" rx="3"') + txt(sx(180), 84, T('1 450 °C·d', '1,450 °C·d'), V('text'), 7.5, 'middle', 'font-weight="600"');
    s += rect(sx(150), 96, sx(200) - sx(150), 14, V('leaf'), 'opacity="0.6" rx="3"') + txt(sx(175), 106, T('ventana', 'window'), V('text'), 7.5, 'middle', 'font-weight="700"');
    ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach((m, i) => s += txt(sx(15 + i * 30.4), 126, T(m, ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]), V('text-muted'), 7.5, 'middle'));
    s += txt(165, 144, T('la ventana de siembra es la intersección de las tres condiciones', 'the sowing window is the intersection of the three conditions'), V('text-muted'), 7.5, 'middle');
    return wrap(`0 0 ${W} ${H}`, s);
  }
  function soon() {
    let s = rect(0, 0, 240, 140, V('bg-soft'), 'rx="12"');
    s += sun(190, 36, 16, true) + cloud(70, 44, 60) + drops(70, 60, 4, 40);
    s += ground(20, 220, 112, 10);
    [0.1, 0.35, 0.6, 0.85].forEach((st, i) => s += plant(60 + i * 40, 114, 40, st));
    return wrap('0 0 240 140', s);
  }
  function logo() {
    return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="22" cy="10" r="5.2" fill="var(--sun)"/>
      <path d="M6 27 C 8 17, 14 12, 20 11 C 19 19, 14 25, 6 27 Z" fill="var(--leaf)"/>
      <path d="M7 26 C 10 21, 13 17, 18 13" stroke="var(--card-bg)" stroke-width="1.1" fill="none" stroke-linecap="round"/>
      <path d="M22 18 c -2.6 3.6 -2.6 6.6 0 6.6 c 2.6 0 2.6 -3 0 -6.6 z" fill="var(--rain)"/>
    </svg>`;
  }

  window.Art = {
    hero, logo, soon, walterLieth,
    climData, siteClimate, degreeDays, eto, balance, irrigation, phenology, risks, report,
    matRainfed, matIrrigated, matVegetables, matDeciduous, matTropical, matForage,
    mSine, mTriangle, mAverage, mCutoffs, mChu, mPM, mHargreaves, mThornthwaite, mPriestley, mKc, mBalanceTM, mBalanceDaily, mIrrigation, mUtah, mDynamic, mPhotoperiod, mClimograph, mAridity, mFrost, mWindow,
    figCutoffs, figPM, figBucket, figKc, figClimograph, figChill, figSeason,
    _plant: plant, _bucket: bucket, _sun: sun,
  };
})();
