/* PhenologyPro — tests of Block 3: the climate of the site. */
(function () {
  const { check, section, near } = window.__t;
  const C = Clim3;

  /* a normals object straight from twelve monthly values, for the classifiers */
  const nmOf = (T, P) => ({ months: T.map((t, i) => ({ m: i + 1, tmean: t, tmax: t + 8, tmin: t - 8, P: P[i], tnAbsMean: t - 12 })), annual: { T: Stat.mean(T), P: Stat.sum(P), hottest: T.indexOf(Math.max(...T)) + 1, coldest: T.indexOf(Math.min(...T)) + 1, wettest: P.indexOf(Math.max(...P)) + 1, driest: P.indexOf(Math.min(...P)) + 1, txAbs: Math.max(...T) + 12, tnAbs: Math.min(...T) - 12 }, years: [2000], nYears: 1, complete: true });

  section('Bloque 3 · clasificación de Köppen–Geiger (Peel et al. 2007)');
  const cdmx = nmOf([13.6, 15.0, 17.2, 18.6, 19.0, 18.2, 17.1, 17.3, 16.9, 16.0, 14.7, 13.6], [8, 5, 10, 25, 55, 130, 160, 150, 130, 50, 10, 8]);
  check('Ciudad de México (Tacubaya) → Cwb', C.koppen(cdmx, 19.4).code === 'Cwb', C.koppen(cdmx, 19.4).code);
  const culiacan = nmOf([20, 21, 23, 26, 29, 31, 30, 30, 29, 28, 24, 21], [20, 8, 3, 2, 3, 45, 150, 170, 120, 45, 15, 20]);
  check('Culiacán → BSh (umbral de aridez con lluvia de verano: 2 MAT + 28)', C.koppen(culiacan, 24.8).code === 'BSh' && near(C.koppen(culiacan, 24.8).Pth, 2 * Stat.mean([20, 21, 23, 26, 29, 31, 30, 30, 29, 28, 24, 21]) + 28, 1e-9), C.koppen(culiacan, 24.8).code);
  const veracruz = nmOf([21.5, 22.3, 24.2, 26.5, 28.2, 28.0, 27.5, 27.8, 27.3, 26.3, 24.1, 22.4], [30, 25, 20, 30, 60, 290, 380, 320, 340, 160, 60, 40]);
  check('Veracruz → Aw (mes más seco 20 mm < 100 − MAP/25)', C.koppen(veracruz, 19.2).code === 'Aw', C.koppen(veracruz, 19.2).code);
  const singapore = nmOf([26.5, 27.1, 27.5, 27.9, 28.3, 28.3, 27.9, 27.9, 27.6, 27.6, 27.0, 26.4], [250, 160, 190, 180, 170, 130, 150, 170, 170, 190, 250, 300]);
  check('Singapur → Af (ningún mes bajo 60 mm)', C.koppen(singapore, 1.3).code === 'Af');
  const cairo = nmOf([13.6, 14.9, 17.2, 21.5, 24.9, 27.7, 28.5, 28.3, 26.4, 23.5, 18.9, 15.0], [5, 4, 4, 1, 0.5, 0, 0, 0, 0, 1, 3, 6]);
  check('El Cairo → BWh', C.koppen(cairo, 30).code === 'BWh');
  const rome = nmOf([7.5, 8.5, 10.8, 13.5, 17.6, 21.5, 24.5, 24.6, 21.2, 16.6, 11.9, 8.5], [70, 65, 60, 55, 35, 20, 12, 25, 65, 110, 100, 90]);
  check('Roma → Csa (verano seco: julio 12 < 40 y < 110/3)', C.koppen(rome, 41.9).code === 'Csa', C.koppen(rome, 41.9).code);
  const london = nmOf([5.2, 5.3, 7.6, 9.9, 13.3, 16.4, 18.7, 18.5, 15.7, 12.0, 8.0, 5.5], [55, 40, 42, 44, 49, 45, 45, 50, 49, 69, 59, 55]);
  check('Londres → Cfb', C.koppen(london, 51.5).code === 'Cfb');
  const moscow = nmOf([-6.5, -6.7, -1.0, 6.7, 13.2, 17.0, 19.2, 17.0, 11.3, 5.6, -1.2, -5.2], [50, 40, 35, 40, 50, 80, 85, 80, 65, 70, 55, 50]);
  check('Moscú → Dfb', C.koppen(moscow, 55.7).code === 'Dfb');
  const tundra = nmOf([-25, -24, -20, -12, -2, 5, 8, 6, 1, -8, -18, -23], [10, 8, 8, 10, 12, 20, 30, 30, 25, 20, 12, 10]);
  check('Tundra (mes más cálido 8 °C) → ET', C.koppen(tundra, 70).code === 'ET');
  const sh = nmOf([22, 22, 20, 17, 14, 11, 10, 12, 14, 17, 19, 21], [135, 120, 105, 60, 30, 15, 12, 18, 38, 75, 105, 128]);
  check('Hemisferio sur: el verano es octubre–marzo (lluvia de verano → Cwa)', C.koppen(sh, -25).code === 'Cwa', C.koppen(sh, -25).code);
  check('García: P/T 40 → w0, 50 → w1, 60 → w2 en un C', C.garciaHumidity(40, 'Cwb').sub === 'w0' && C.garciaHumidity(50, 'Cwb').sub === 'w1' && C.garciaHumidity(60, 'Aw').sub === 'w2');

  section('Bloque 3 · régimen de lluvias e índices');
  check('PCI: lluvia uniforme = 8.33; todo en un mes = 100', near(C.pci(new Array(12).fill(50)), 100 / 12, 1e-9) && near(C.pci([0, 0, 0, 0, 0, 600, 0, 0, 0, 0, 0, 0]), 100, 1e-9));
  check('PCI de Culiacán ≈ 19.6 (estacional, en el límite de fuertemente estacional)', near(C.pci([20, 8, 3, 2, 3, 45, 150, 170, 120, 45, 15, 20]), 19.6, 0.1) && C.pciClass(19.6) === 'seasonal' && C.pciClass(21) === 'strong', C.pci([20, 8, 3, 2, 3, 45, 150, 170, 120, 45, 15, 20]).toFixed(1));
  check('Lluvia del semestre cálido: CDMX 88 % (abr–sep)', near(C.summerShare([8, 5, 10, 25, 55, 130, 160, 150, 130, 50, 10, 8], 19.4), (25 + 55 + 130 + 160 + 150 + 130) / 741, 1e-9));
  const cg = C.climograph(cdmx);
  check('Climograma CDMX: 6 meses húmedos (P > 2T), 6 secos, 4 perhúmedos (jun–sep > 100 mm)', cg.humidMonths === 6 && cg.dryMonths === 6 && cg.perhumidMonths === 4, `${cg.humidMonths}/${cg.dryMonths}/${cg.perhumidMonths}`);
  const ind = C.indices(cdmx, 19.4, 100);
  check('Índices CDMX: PET Thornthwaite entre 700 y 900 mm; PNUMA subhúmedo seco o húmedo', ind.PETann > 700 && ind.PETann < 900 && ['drysubhumid', 'humid', 'semiarid'].includes(ind.unep.cls), `${ind.PETann.toFixed(0)} · ${ind.unep.cls}`);
  check('Índices: De Martonne y Lang coinciden con Agro', near(ind.martonne.I, 741 / (Stat.mean(cdmx.months.map(x => x.tmean)) + 10), 1e-9) && ind.lang.I > 40);
  check('Índice de humedad: 100 (P − ETP)/ETP y su clase', near(ind.Im, 100 * (741 - ind.PETann) / ind.PETann, 1e-9) && ['C1', 'C2', 'B1', 'D'].includes(ind.ImClass));
  check('Periodo de crecimiento FAO: meses con P > 0.5 ETP (5 a 7 en CDMX)', ind.growingMonths >= 5 && ind.growingMonths <= 7, ind.growingMonths);
  check('Balance TM cierra: P = ETR + excedente', near(ind.bal.P, ind.bal.AET + ind.bal.surplus, 1e-6));

  section('Bloque 3 · normales, lluvias y heladas sobre una serie');
  const ex = WxIO.exampleSeries('cold', 10, false);
  const rows = WxIO.qc(ex.rows, { maxGap: 3 }).rows;
  const nm = C.normals(rows, {});
  check('normals: 12 meses completos de 10 años', nm.complete && nm.nYears === 10 && nm.months.every(x => x.nT === 10 && x.nP === 10));
  check('normals: la lluvia anual queda a ±25 % de la normal del sitio (841 mm)', Math.abs(nm.annual.P - 841) / 841 < 0.25, nm.annual.P.toFixed(0));
  check('normals: el mes más cálido es de primavera (abr–jun) y el más lluvioso de verano', nm.annual.hottest >= 4 && nm.annual.hottest <= 6 && nm.annual.wettest >= 6 && nm.annual.wettest <= 9, `${nm.annual.hottest}/${nm.annual.wettest}`);
  check('normals: Tmax > Tmedia > Tmin y P20 ≤ P50 ≤ P80 en todos los meses', nm.months.every(x => x.tmax > x.tmean && x.tmean > x.tmin && x.P20 <= x.P50 && x.P50 <= x.P80));
  check('normals con un subconjunto de años', C.normals(rows, { years: new Set([2020, 2021]) }).nYears === 2);
  const rr = C.rainRegime(rows, nm, 19.3, {});
  check('rainRegime: inicio detectado en la mayoría de los años, entre abril y julio', rr.ok && rr.seasons.onset && rr.seasons.onset.n >= 8 && rr.seasons.onset.median >= 91 && rr.seasons.onset.median <= 212, rr.seasons.onset && fmtDoy(rr.seasons.onset.median));
  check('rainRegime: fin después del inicio y duración entre 90 y 220 días', rr.seasons.end && rr.seasons.length && rr.seasons.length.median > 90 && rr.seasons.length.median < 220, rr.seasons.length && rr.seasons.length.median);
  check('rainRegime: sin lluvia no hay inicio', (() => { const dry = rows.map(r => Object.assign({}, r, { prec: 0 })); const nmd = C.normals(dry, {}); return C.rainRegime(dry, nmd, 19.3, {}).seasons.onset === null; })());
  const fr = C.frost(rows, nm, { threshold: 0 });
  check('frost: 10 temporadas, todas con helada en el altiplano frío', fr.n === 10 && fr.frostSeasons === 10 && fr.anyFrost);
  check('frost: última de primavera antes del pivote y primera de otoño después', fr.years.every(a => (a.last == null || a.last < fr.pivotDoy) && (a.first == null || a.first >= fr.pivotDoy)));
  check('frost: periodo libre = primera − última − 1', fr.years.filter(a => a.last != null && a.first != null).every(a => a.free === a.first - a.last - 1));
  check('frost: las curvas van de 1 a 0 (primavera) y de 0 a 1 (otoño) y son monótonas', fr.springCurve[0] === 1 && fr.springCurve[364] === 0 && fr.autumnCurve[0] === 0 && fr.autumnCurve[364] === 1 && fr.springCurve.every((v, i) => i === 0 || v <= fr.springCurve[i - 1]) && fr.autumnCurve.every((v, i) => i === 0 || v >= fr.autumnCurve[i - 1]));
  check('frost: la fecha al 10 % es más tardía que al 50 % en primavera y más temprana en otoño', fr.probs[2].last >= fr.probs[0].last && fr.probs[2].first <= fr.probs[0].first);
  check('frost: en la fecha del 20 % la curva vale ≤ 0.2', fr.springCurve[fr.probs[1].last - 1] <= 0.2 && fr.autumnCurve[fr.probs[1].first - 1] <= 0.2);
  check('frost: con umbral −20 °C no hay heladas y el periodo libre es todo el año', (() => { const f2 = C.frost(rows, nm, { threshold: -20 }); return !f2.anyFrost && f2.freeMean === 365 && f2.lastMean === null; })());
  const trop = WxIO.qc(WxIO.exampleSeries('tropical', 3, false).rows, {}).rows;
  const nmT = C.normals(trop, {});
  check('trópico húmedo: sin heladas, Af o Am, a lo sumo 4 meses secos (ene–abr)', !C.frost(trop, nmT, {}).anyFrost && ['Af', 'Am', 'Aw'].includes(C.koppen(nmT, 19.2).code) && C.climograph(nmT).dryMonths <= 4, C.koppen(nmT, 19.2).code);
  check('Help: 9 fichas del Bloque 3 y escala del índice de humedad', Help.BLOCK_KEYS[3].length === 9 && Help.BLOCK_KEYS[3].every(k => Help.HELP[k]) && Help.band('moisture', -70).tone === 'bad' && Help.band('moisture', 120).tone === 'good');

  window.__t.finish();
})();
