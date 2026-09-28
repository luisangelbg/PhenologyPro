/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — synthetic climates for the laboratories and the examples.

   The home page needs weather to compute with before the user has loaded a
   station, and a learner needs several contrasting climates to see what a
   method does. These six sites are FICTIONAL: their orders of magnitude are
   those of real regions of Mexico (a temperate valley at 2 250 m, a hot dry
   coast, the humid tropics, a cold plateau, a semi-arid basin and the dry
   north), but no number comes from an observed record and none should be
   cited as one. Block 2 is where real data enter.

   A year of daily weather is built from the monthly normals of the site: the
   mean temperature follows an annual cosine, the daily range shrinks on rainy
   days, a first-order autoregression adds the synoptic ups and downs, and rain
   falls through a two-state Markov chain whose wet days and amounts reproduce
   the monthly normals. Everything is seeded, so the same site always gives the
   same year and a result can be reproduced. */

const Climate = {};

(function () {

  const SITES = [
    { id: 'temperate', es: 'Valle templado (2 250 m)', en: 'Temperate valley (2,250 m)',
      tag: ['templado subhúmedo, lluvias de verano', 'temperate sub-humid, summer rains'],
      lat: 19.5, lon: -98.9, z: 2250, tmean: 15.5, amp: 3.2, phase: 135, range: 16, rangeWet: 0.6,
      P: [8, 6, 10, 25, 55, 110, 130, 125, 115, 45, 10, 5], wet: [2, 2, 3, 5, 9, 15, 18, 17, 16, 8, 3, 2],
      rh: [55, 50, 45, 45, 52, 65, 72, 72, 74, 66, 60, 58], u2: 1.6, kRs: 0.16, arid: 1, seed: 11 },
    { id: 'hotdry', es: 'Costa cálida seca (50 m)', en: 'Hot dry coast (50 m)',
      tag: ['cálido seco, lluvias de julio a septiembre', 'hot and dry, rains from July to September'],
      lat: 24.8, lon: -107.4, z: 50, tmean: 25.5, amp: 6.0, phase: 200, range: 14, rangeWet: 0.65,
      P: [20, 8, 3, 2, 3, 45, 150, 170, 120, 45, 15, 20], wet: [3, 1, 1, 1, 1, 5, 13, 14, 11, 4, 2, 3],
      rh: [60, 55, 50, 48, 50, 58, 70, 74, 74, 66, 62, 62], u2: 1.9, kRs: 0.19, arid: 2, seed: 23 },
    { id: 'tropical', es: 'Trópico húmedo (10 m)', en: 'Humid tropics (10 m)',
      tag: ['cálido húmedo, más de 1 700 mm', 'hot and humid, over 1,700 mm'],
      lat: 19.2, lon: -96.1, z: 10, tmean: 25.0, amp: 4.0, phase: 190, range: 8, rangeWet: 0.75,
      P: [30, 25, 20, 30, 60, 290, 380, 320, 340, 160, 60, 40], wet: [6, 5, 4, 4, 7, 17, 22, 20, 21, 12, 8, 7],
      rh: [76, 74, 72, 72, 74, 80, 82, 82, 83, 80, 78, 77], u2: 2.4, kRs: 0.19, arid: 0, seed: 37 },
    { id: 'cold', es: 'Altiplano frío (2 650 m)', en: 'Cold plateau (2,650 m)',
      tag: ['frío subhúmedo, heladas de noviembre a marzo', 'cold sub-humid, frosts from November to March'],
      lat: 19.3, lon: -99.7, z: 2650, tmean: 12.5, amp: 3.0, phase: 140, range: 18, rangeWet: 0.6,
      P: [12, 8, 10, 35, 70, 150, 170, 160, 150, 50, 15, 8], wet: [3, 2, 3, 7, 11, 18, 21, 20, 19, 8, 3, 2],
      rh: [58, 54, 50, 50, 58, 70, 76, 76, 78, 70, 64, 62], u2: 1.7, kRs: 0.16, arid: 1, seed: 41 },
    { id: 'semiarid', es: 'Bajío semiárido (1 800 m)', en: 'Semi-arid basin (1,800 m)',
      tag: ['semiárido templado, 520 mm', 'temperate semi-arid, 520 mm'],
      lat: 20.6, lon: -100.4, z: 1800, tmean: 18.5, amp: 4.5, phase: 140, range: 15, rangeWet: 0.65,
      P: [10, 5, 5, 15, 35, 95, 110, 105, 90, 35, 10, 5], wet: [2, 1, 1, 3, 6, 12, 14, 14, 12, 5, 2, 1],
      rh: [52, 46, 40, 38, 44, 60, 68, 68, 70, 62, 56, 54], u2: 2.0, kRs: 0.16, arid: 2, seed: 53 },
    { id: 'north', es: 'Norte seco extremoso (1 400 m)', en: 'Dry continental north (1,400 m)',
      tag: ['seco, inviernos fríos y veranos ardientes', 'dry, cold winters and scorching summers'],
      lat: 28.6, lon: -106.1, z: 1400, tmean: 18.0, amp: 10.0, phase: 195, range: 16, rangeWet: 0.65,
      P: [10, 8, 5, 5, 10, 35, 90, 85, 60, 25, 10, 12], wet: [2, 2, 1, 1, 2, 5, 11, 11, 8, 4, 2, 2],
      rh: [50, 44, 36, 32, 34, 44, 60, 64, 62, 54, 50, 50], u2: 2.6, kRs: 0.16, arid: 2, seed: 67 },
  ];
  const byId = id => SITES.find(s => s.id === id) || SITES[0];

  /* the smooth annual mean temperature of a site on day J */
  function tmeanOf(site, J) { return site.tmean + site.amp * Math.cos(2 * Math.PI * (J - site.phase) / 365); }

  /* monthly normals, straight from the parameters: what a climograph shows */
  function normals(site) {
    const mid = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
    const T = mid.map(J => tmeanOf(site, J));
    /* the mean range of a month is shortened by its share of wet days */
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const R = site.wet.map((w, i) => site.range * (1 - (1 - site.rangeWet) * w / days[i]));
    return {
      T, Tmax: T.map((t, i) => t + R[i] / 2), Tmin: T.map((t, i) => t - R[i] / 2),
      P: site.P.slice(), RH: site.rh.slice(),
      /* the absolute minimum a month typically reaches: two synoptic deviations below the mean minimum */
      Tabsmin: T.map((t, i) => t - R[i] / 2 - 4.5),
    };
  }

  /* one year of daily weather; opts.year (default 2025), opts.seed to vary */
  function synthesize(site, opts) {
    const o = opts || {};
    const year = o.year || 2025;
    const r = rng((site.seed * 1000 + (o.seed || 0)) >>> 0);
    const days = [];
    const nDays = daysInYear(year);
    let anom = 0, wetPrev = false;
    for (let J = 1; J <= nDays; J++) {
      const dt = fromDoy(year, J);
      const m = dt.m, dim = daysInMonth(year, m);
      const pw = site.wet[m - 1] / dim;
      /* wet spells persist: P(wet|wet) above the base probability, P(wet|dry) balanced so that the month keeps its wet days */
      const pww = Math.min(0.92, pw + 0.4 * (1 - pw));
      const pwd = pw >= 1 ? 1 : Math.max(0, pw * (1 - pww) / (1 - pw));
      const wet = r() < (wetPrev ? pww : pwd);
      let prec = 0;
      if (wet) {
        const mean = site.P[m - 1] / Math.max(1, site.wet[m - 1]);
        /* a gamma-like skew: the product of two exponentials' mean is kept at `mean` */
        prec = Math.round(mean * (-Math.log(1 - r()) * 0.7 + -Math.log(1 - r()) * 0.3) * 10) / 10;
      }
      anom = 0.72 * anom + 1.6 * randn(r);
      const tm = tmeanOf(site, J) + anom;
      const range = site.range * (wet ? site.rangeWet : 1) * (0.85 + 0.3 * r());
      const rh = Math.min(98, Math.max(15, site.rh[m - 1] + (wet ? 14 : -3) + 5 * randn(r)));
      const u2 = Math.max(0.5, site.u2 * (0.7 + 0.6 * r()));
      days.push({ y: year, m, d: dt.d, J, tmax: +(tm + range / 2).toFixed(1), tmin: +(tm - range / 2).toFixed(1), prec, rhmean: Math.round(rh), u2: +u2.toFixed(1), wet });
      wetPrev = wet;
    }
    return days;
  }

  /* the same series wrapped around so that a season sown in October can run
     into the next spring: two identical years back to back */
  function twoYears(site, opts) {
    const a = synthesize(site, opts);
    const b = synthesize(site, Object.assign({}, opts, { year: (opts && opts.year || 2025) + 1 }));
    return a.concat(b);
  }

  /* ETo for every day of a synthetic series, by the two methods the labs offer */
  function etoSeries(site, days, method) {
    return days.map(d => {
      if (method === 'pm') {
        return Agro.etoPMDaily({ lat: site.lat, z: site.z, J: d.J, tmax: d.tmax, tmin: d.tmin, rhmean: d.rhmean, u2: d.u2, kRs: site.kRs }).eto;
      }
      return Agro.etoHargreaves(d.tmax, d.tmin, Agro.Ra(site.lat, d.J));
    });
  }

  Object.assign(Climate, { SITES, byId, tmeanOf, normals, synthesize, twoYears, etoSeries });
  if (typeof window !== 'undefined') window.Climate = Climate;
})();
