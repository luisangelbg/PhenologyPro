/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — the agrometeorological engine.

   Everything the app computes lives here, as pure functions with no DOM:
   the blocks call them, the laboratories of the home page call them, and the
   test page calls them against the worked examples of the literature. Every
   equation names its source; the numbering "FAO-56 eq. 21" refers to Allen,
   Pereira, Raes & Smith (1998), FAO Irrigation and Drainage Paper 56.

   Units, once and for all: temperatures in °C, water in mm, radiation in
   MJ m⁻² day⁻¹, pressure in kPa, wind in m s⁻¹ at 2 m, latitude in decimal
   degrees (south negative), elevation in m, angles inside in radians. */

const Agro = {};

(function () {

  const PI = Math.PI;
  const rad = d => d * PI / 180;
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const GSC = 0.0820;         /* solar constant, MJ m⁻² min⁻¹ (FAO-56 eq. 21) */
  const SIGMA = 4.903e-9;     /* Stefan–Boltzmann, MJ K⁻⁴ m⁻² day⁻¹ (FAO-56 eq. 39) */
  const LAMBDA = 2.45;        /* latent heat of vaporisation, MJ kg⁻¹; 1/λ = 0.408 mm per MJ m⁻² */

  /* =====================================================================
     1 · astronomy and radiation (FAO-56 chapter 3)
     ===================================================================== */

  /* inverse relative distance Earth–Sun (eq. 23) */
  function dr(J) { return 1 + 0.033 * Math.cos(2 * PI * J / 365); }
  /* solar declination, radians (eq. 24) */
  function declination(J) { return 0.409 * Math.sin(2 * PI * J / 365 - 1.39); }
  /* sunset hour angle, radians (eq. 25); clamped for the polar day and night */
  function sunsetAngle(latDeg, J) {
    const x = -Math.tan(rad(latDeg)) * Math.tan(declination(J));
    return Math.acos(clamp(x, -1, 1));
  }
  /* extraterrestrial radiation, MJ m⁻² day⁻¹ (eq. 21) */
  function Ra(latDeg, J) {
    const phi = rad(latDeg), d = declination(J), ws = sunsetAngle(latDeg, J);
    return 24 * 60 / PI * GSC * dr(J) * (ws * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(ws));
  }
  /* daylight hours (eq. 34) */
  function daylength(latDeg, J) { return 24 / PI * sunsetAngle(latDeg, J); }
  /* Photoperiod with a sun-elevation threshold: 0° is the FAO daylight, −0.833°
     the visible sunrise with refraction, −6° the civil twilight that many crop
     models use because plants respond to light too dim to be "day". */
  function photoperiod(latDeg, J, thresholdDeg) {
    const a = rad(thresholdDeg == null ? -6 : thresholdDeg);
    const phi = rad(latDeg), d = declination(J);
    const x = (Math.sin(a) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d));
    return 24 / PI * Math.acos(clamp(x, -1, 1));
  }
  /* solar radiation from sunshine hours: Ångström–Prescott (eq. 35) */
  function RsAngstrom(ra, n, N, as, bs) { return ((as == null ? 0.25 : as) + (bs == null ? 0.50 : bs) * n / N) * ra; }
  /* solar radiation from the temperature range: Hargreaves (eq. 50);
     kRs 0.16 for interior sites and 0.19 for coastal ones */
  function RsHargreaves(ra, tmax, tmin, kRs) { return (kRs == null ? 0.16 : kRs) * Math.sqrt(Math.max(0, tmax - tmin)) * ra; }
  /* clear-sky radiation (eq. 37) */
  function Rso(ra, z) { return (0.75 + 2e-5 * (z || 0)) * ra; }
  /* net shortwave radiation (eq. 38), albedo 0.23 for the reference grass */
  function Rns(rs, albedo) { return (1 - (albedo == null ? 0.23 : albedo)) * rs; }
  /* net longwave radiation (eq. 39) */
  function Rnl(tmax, tmin, ea, rs, rso) {
    const tk4 = (Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2;
    const ratio = rso > 0 ? clamp(rs / rso, 0.3, 1) : 1;
    return SIGMA * tk4 * (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) * (1.35 * ratio - 0.35);
  }

  /* =====================================================================
     2 · the atmosphere (FAO-56 chapter 3)
     ===================================================================== */

  /* atmospheric pressure from elevation, kPa (eq. 7) */
  function pressure(z) { return 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26); }
  /* psychrometric constant, kPa °C⁻¹ (eq. 8) */
  function gamma(P) { return 0.665e-3 * P; }
  /* saturation vapour pressure at T, kPa (eq. 11) */
  function es(T) { return 0.6108 * Math.exp(17.27 * T / (T + 237.3)); }
  /* mean saturation vapour pressure of a day (eq. 12): the mean of the two,
     never es of the mean temperature, which underestimates it */
  function esMean(tmax, tmin) { return (es(tmax) + es(tmin)) / 2; }
  /* slope of the saturation curve, kPa °C⁻¹ (eq. 13) */
  function delta(T) { return 4098 * es(T) / Math.pow(T + 237.3, 2); }
  /* actual vapour pressure from the dew point (eq. 14) */
  function eaFromTdew(tdew) { return es(tdew); }
  /* from maximum and minimum relative humidity (eq. 17) */
  function eaFromRH(tmax, tmin, rhmax, rhmin) { return (es(tmin) * rhmax / 100 + es(tmax) * rhmin / 100) / 2; }
  /* from the maximum humidity alone (eq. 18), the one that is measured best */
  function eaFromRHmax(tmin, rhmax) { return es(tmin) * rhmax / 100; }
  /* from the mean humidity (eq. 19), the weakest of the three */
  function eaFromRHmean(tmax, tmin, rhmean) { return rhmean / 100 * esMean(tmax, tmin); }
  /* when there is no humidity at all: dew point ≈ Tmin (eq. 48); in arid sites
     the air is drier than that and 2–3 °C are subtracted */
  function eaFromTmin(tmin, aridOffset) { return es(tmin - (aridOffset || 0)); }
  /* wind measured at z metres brought to the standard 2 m (eq. 47) */
  function u2(uz, z) { return z == null || z === 2 ? uz : uz * 4.87 / Math.log(67.8 * z - 5.42); }
  /* soil heat flux of a month from its neighbours (eq. 43); a day's is 0 (eq. 42) */
  function soilHeatMonthly(tPrev, tNext) { return 0.07 * (tNext - tPrev); }
  function soilHeatMonthlyEnd(tThis, tPrev) { return 0.14 * (tThis - tPrev); }

  /* =====================================================================
     3 · reference evapotranspiration
     ===================================================================== */

  /* FAO-56 Penman–Monteith with the terms already resolved (eq. 6).
     Returns the value and its two halves, radiation and aerodynamic. */
  function etoPM(o) {
    const D = o.delta, g = o.gamma, T = o.tmean, U = o.u2;
    const denom = D + g * (1 + 0.34 * U);
    const radTerm = 0.408 * D * (o.rn - (o.g || 0)) / denom;
    const aeroTerm = g * 900 / (T + 273) * U * (o.es - o.ea) / denom;
    return { eto: Math.max(0, radTerm + aeroTerm), radTerm, aeroTerm };
  }

  /* The whole daily pipeline from what a station gives. Takes whatever is
     available and says how each missing piece was estimated, so the report
     can state it:
       lat, z, J, tmax, tmin                              required
       rhmax+rhmin | rhmax | rhmean | tdew | ea | (none)  humidity, best first
       rs | n (sunshine hours) | (none → Hargreaves Rs)   radiation
       u2 | uz+zw | (none → 2 m/s, FAO-56 default)        wind
       kRs (0.16 | 0.19), arid (°C subtracted from Tmin), albedo, g */
  function etoPMDaily(o) {
    const notes = [];
    const tmean = o.tmean != null ? o.tmean : (o.tmax + o.tmin) / 2;
    const P = o.P != null ? o.P : pressure(o.z || 0);
    const g = gamma(P);
    const D = delta(tmean);
    const esM = esMean(o.tmax, o.tmin);
    let ea;
    if (o.ea != null) ea = o.ea;
    else if (o.tdew != null) { ea = eaFromTdew(o.tdew); notes.push('tdew'); }
    else if (o.rhmax != null && o.rhmin != null) { ea = eaFromRH(o.tmax, o.tmin, o.rhmax, o.rhmin); notes.push('rh'); }
    else if (o.rhmax != null) { ea = eaFromRHmax(o.tmin, o.rhmax); notes.push('rhmax'); }
    else if (o.rhmean != null) { ea = eaFromRHmean(o.tmax, o.tmin, o.rhmean); notes.push('rhmean'); }
    else { ea = eaFromTmin(o.tmin, o.arid || 0); notes.push('tmin'); }
    ea = Math.min(ea, esM);
    const ra = Ra(o.lat, o.J);
    const N = daylength(o.lat, o.J);
    let rs;
    if (o.rs != null) rs = o.rs;
    else if (o.n != null) { rs = RsAngstrom(ra, o.n, N, o.as, o.bs); notes.push('sun'); }
    else { rs = RsHargreaves(ra, o.tmax, o.tmin, o.kRs); notes.push('hargreaves'); }
    const rso = Rso(ra, o.z || 0);
    rs = Math.min(rs, rso);
    const rns = Rns(rs, o.albedo);
    const rnl = Rnl(o.tmax, o.tmin, ea, rs, rso);
    const rn = rns - rnl;
    let U;
    if (o.u2 != null) U = o.u2;
    else if (o.uz != null) { U = u2(o.uz, o.zw || 10); notes.push('uz'); }
    else { U = 2; notes.push('wind2'); }
    U = Math.max(0.5, U);   /* FAO-56 recommends never going below 0.5 m/s */
    const pm = etoPM({ delta: D, gamma: g, tmean, u2: U, rn, g: o.g || 0, es: esM, ea });
    return Object.assign({ tmean, P, gamma: g, delta: D, es: esM, ea, vpd: esM - ea, ra, N, rs, rso, rns, rnl, rn, u2: U, notes }, pm);
  }

  /* Hargreaves & Samani (1985), as written in FAO-56 eq. 52; Ra in MJ turned
     into mm with 0.408 */
  function etoHargreaves(tmax, tmin, ra, tmean) {
    const tm = tmean != null ? tmean : (tmax + tmin) / 2;
    return Math.max(0, 0.0023 * (tm + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)) * 0.408 * ra);
  }
  /* Priestley & Taylor (1972): the radiation half of Penman scaled by α = 1.26 */
  function etoPriestleyTaylor(tmean, rn, g, gam, alpha) {
    const D = delta(tmean);
    return Math.max(0, (alpha || 1.26) * D / (D + gam) * (rn - (g || 0)) * 0.408);
  }
  /* Turc (1961): Rs in MJ m⁻² day⁻¹ converted to cal cm⁻² day⁻¹ (× 23.885);
     the humidity correction applies when the mean RH is below 50 % */
  function etoTurc(tmean, rs, rhmean) {
    if (tmean <= 0) return 0;
    const rsCal = rs * 23.885;
    let et = 0.013 * tmean / (tmean + 15) * (rsCal + 50);
    if (rhmean != null && rhmean < 50) et *= 1 + (50 - rhmean) / 70;
    return Math.max(0, et);
  }
  /* Thornthwaite (1948): monthly PET from the twelve monthly means. The
     standard month has 30 days of 12 hours; the correction uses the real
     day length at mid-month and the real number of days. */
  function thornthwaiteIndex(tMonthly) {
    return tMonthly.reduce((s, t) => s + (t > 0 ? Math.pow(t / 5, 1.514) : 0), 0);
  }
  function etoThornthwaite(tMonthly, latDeg, year) {
    const I = thornthwaiteIndex(tMonthly);
    const a = 6.75e-7 * I * I * I - 7.71e-5 * I * I + 1.792e-2 * I + 0.49239;
    const y = year || 2025;
    const mid = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349];
    return tMonthly.map((t, i) => {
      if (t <= 0 || I <= 0) return 0;
      /* Thornthwaite caps the unadjusted value above 26.5 °C (Willmott et al. 1985) */
      const pet0 = t < 26.5 ? 16 * Math.pow(10 * t / I, a) : -415.85 + 32.24 * t - 0.43 * t * t;
      const N = daylength(latDeg, mid[i]);
      const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i];
      return pet0 * (N / 12) * (days / 30);
    });
  }

  /* =====================================================================
     4 · thermal time: degree-days
     ===================================================================== */

  /* Every method is the same integral of a daily temperature curve above the
     base, with the upper threshold handled in one of three ways (the
     terminology of the University of California IPM programme):
       horizontal   above the upper threshold development stays at its maximum
       vertical     above the upper threshold development stops (counts zero)
       intermediate above it development slows: the excess is subtracted
     What changes between methods is the shape of the curve: a flat mean, a
     triangle (Lindsey & Newman 1956) or a sine (Baskerville & Emin 1969; the
     closed forms follow Allen 1976). The area above a level c, as a fraction of
     the day, is all that is needed. */
  const CURVES = {
    average: {
      above(tmax, tmin, c) { const M = (tmax + tmin) / 2; return Math.max(0, M - c); },
      frac(tmax, tmin, c) { return (tmax + tmin) / 2 > c ? 1 : 0; },
    },
    triangle: {
      above(tmax, tmin, c) {
        if (c <= tmin) return (tmax + tmin) / 2 - c;
        if (c >= tmax) return 0;
        return Math.pow(tmax - c, 2) / (2 * (tmax - tmin));
      },
      frac(tmax, tmin, c) {
        if (c <= tmin) return 1;
        if (c >= tmax) return 0;
        return (tmax - c) / (tmax - tmin);
      },
    },
    sine: {
      above(tmax, tmin, c) {
        const M = (tmax + tmin) / 2, A = (tmax - tmin) / 2;
        if (c <= tmin) return M - c;
        if (c >= tmax) return 0;
        const th = Math.asin((c - M) / A);
        return ((M - c) * (PI / 2 - th) + A * Math.cos(th)) / PI;
      },
      frac(tmax, tmin, c) {
        const M = (tmax + tmin) / 2, A = (tmax - tmin) / 2;
        if (c <= tmin) return 1;
        if (c >= tmax) return 0;
        return (PI / 2 - Math.asin((c - M) / A)) / PI;
      },
    },
  };

  /* one day, one curve, one cutoff */
  function ddCurve(curve, tmax, tmin, base, upper, cutoff) {
    if (!(tmax >= tmin)) { const t = tmax; tmax = tmin; tmin = t; }
    const K = CURVES[curve] || CURVES.average;
    const aboveBase = K.above(tmax, tmin, base);
    if (upper == null || cutoff === 'none' || !(upper > base)) return Math.max(0, aboveBase);
    const aboveUpper = K.above(tmax, tmin, upper);
    if (cutoff === 'vertical') return Math.max(0, aboveBase - aboveUpper - (upper - base) * K.frac(tmax, tmin, upper));
    if (cutoff === 'intermediate') return Math.max(0, aboveBase - 2 * aboveUpper);
    return Math.max(0, aboveBase - aboveUpper);   /* horizontal, the default */
  }

  /* The methods the app offers by name. The "double" ones use the next day's
     minimum for the second half of the day, which is how they are defined.
       average        (Tmax + Tmin)/2 − base, with the cutoff on the mean
       capped         Tmax and Tmin clamped to [base, upper] before averaging:
                      the maize convention (McMaster & Wilhelm 1997, method 2)
       triangle, sine, doubleTriangle, doubleSine */
  function degreeDay(method, tmax, tmin, base, upper, cutoff, tminNext) {
    switch (method) {
      case 'capped': {
        const hi = upper == null ? tmax : Math.min(tmax, upper);
        const lo = upper == null ? Math.max(tmin, base) : clamp(tmin, base, upper);
        return Math.max(0, (Math.max(hi, base) + lo) / 2 - base);
      }
      case 'triangle': return ddCurve('triangle', tmax, tmin, base, upper, cutoff);
      case 'sine': return ddCurve('sine', tmax, tmin, base, upper, cutoff);
      case 'doubleTriangle':
      case 'doubleSine': {
        const c = method === 'doubleSine' ? 'sine' : 'triangle';
        const tn = tminNext == null ? tmin : tminNext;
        return 0.5 * ddCurve(c, tmax, tmin, base, upper, cutoff) + 0.5 * ddCurve(c, tmax, tn, base, upper, cutoff);
      }
      default: return ddCurve('average', tmax, tmin, base, upper, cutoff);
    }
  }

  /* Ontario crop heat units (Brown 1975): a night term linear from 4.4 °C and
     a day term that peaks at 30 °C; negatives count as zero */
  function chu(tmax, tmin) {
    const ymax = Math.max(0, 3.33 * (tmax - 10) - 0.084 * Math.pow(tmax - 10, 2));
    const ymin = Math.max(0, 1.8 * (tmin - 4.4));
    return (ymax + ymin) / 2;
  }

  /* Accumulates over a series of {tmax, tmin} from a start index. Returns the
     daily values and the running total; `when(target)` gives the fractional
     day index at which the total reaches a target, or null. */
  function accumulate(days, o) {
    const opt = o || {};
    const method = opt.method || 'average';
    const base = opt.base == null ? 10 : opt.base;
    const upper = opt.upper;
    const cutoff = opt.cutoff || 'horizontal';
    const start = opt.start || 0;
    const end = opt.end == null ? days.length : Math.min(days.length, opt.end);
    const daily = [], cum = [];
    let total = 0;
    for (let i = start; i < end; i++) {
      const d = days[i];
      const next = days[i + 1];
      const v = method === 'chu' ? chu(d.tmax, d.tmin)
        : degreeDay(method, d.tmax, d.tmin, base, upper, cutoff, next ? next.tmin : null);
      daily.push(v);
      total += v;
      cum.push(total);
    }
    const when = target => {
      if (!(target > 0)) return start;
      for (let k = 0; k < cum.length; k++) {
        if (cum[k] >= target) {
          const prev = k ? cum[k - 1] : 0;
          const frac = cum[k] > prev ? (target - prev) / (cum[k] - prev) : 0;
          return start + k + frac;
        }
      }
      return null;
    };
    return { daily, cum, total, start, when };
  }

  /* =====================================================================
     5 · hourly temperatures from the daily extremes (Linvill 1990)
     ===================================================================== */

  /* Daytime follows a sine from sunrise, with the maximum reached before
     sunset; the night cools along a logarithm from the sunset temperature to
     the next morning's minimum. DL is the day length in hours. */
  function hourlyLinvill(tmin, tmax, tminNext, DL, tsetPrev, DLprev) {
    const out = new Array(24);
    const rise = 12 - DL / 2, set = 12 + DL / 2;
    const tset = tmin + (tmax - tmin) * Math.sin(PI * DL / (DL + 4));
    const nightLen = 24 - DL;
    for (let h = 0; h < 24; h++) {
      const t = h + 0.5;
      if (t >= rise && t <= set) out[h] = tmin + (tmax - tmin) * Math.sin(PI * (t - rise) / (DL + 4));
      else if (t > set) {
        const n = t - set;
        out[h] = tset - (tset - tminNext) * Math.log(n + 1) / Math.log(nightLen + 1);
      } else {
        /* before sunrise: still cooling from yesterday's sunset towards today's minimum */
        const dlp = DLprev == null ? DL : DLprev;
        const tp = tsetPrev == null ? tset : tsetPrev;
        const n = t + (24 - (12 + dlp / 2));
        out[h] = tp - (tp - tmin) * Math.log(n + 1) / Math.log((24 - dlp) + 1);
      }
    }
    return out;
  }
  /* the whole series: days [{tmax, tmin, J}] → one flat array of hourly values */
  function hourlySeries(days, latDeg) {
    const out = [];
    let tsetPrev = null, DLprev = null;
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const DL = daylength(latDeg, d.J || (i % 365) + 1);
      const next = days[i + 1] || d;
      const hrs = hourlyLinvill(d.tmin, d.tmax, next.tmin, DL, tsetPrev, DLprev);
      for (let h = 0; h < 24; h++) out.push(hrs[h]);
      tsetPrev = d.tmin + (d.tmax - d.tmin) * Math.sin(PI * DL / (DL + 4));
      DLprev = DL;
    }
    return out;
  }

  /* =====================================================================
     6 · winter chill
     ===================================================================== */

  /* Chill hours (Weinberger 1950): hours between 0 and 7.2 °C. Some authors
     count every hour below 7.2 °C, frost included; `belowOnly` does that. */
  function chillHours(hourly, belowOnly) {
    let n = 0;
    for (const t of hourly) if (t <= 7.2 && (belowOnly || t >= 0)) n++;
    return n;
  }
  /* Utah model (Richardson, Seeley & Walker 1974): weighted hours, with
     negative weights for warm hours that undo chill */
  function utahWeight(t) {
    if (t < 1.4) return 0;
    if (t < 2.4) return 0.5;
    if (t < 9.1) return 1;
    if (t < 12.4) return 0.5;
    if (t < 15.9) return 0;
    if (t < 18) return -0.5;
    return -1;
  }
  function utahUnits(hourly) {
    let s = 0;
    for (const t of hourly) s += utahWeight(t);
    return s;
  }
  /* Dynamic model (Fishman, Erez & Couvillon 1987; Erez et al. 1990): a
     thermally labile precursor accumulates at cold temperatures, is destroyed
     by heat, and once it reaches a threshold it is fixed as a "chill portion"
     that no later warmth can undo. The constants are those published by the
     authors and used since by every implementation. */
  const DYN = { e0: 4153.5, e1: 12888.8, a0: 139500, a1: 2.567e18, slp: 1.6, tetmlt: 277 };
  function chillPortions(hourly, withSeries) {
    const aa = DYN.a0 / DYN.a1, ee = DYN.e1 - DYN.e0;
    let interS = 0, portions = 0;
    const series = withSeries ? new Array(hourly.length) : null;
    for (let i = 0; i < hourly.length; i++) {
      const TK = hourly[i] + 273;
      const sr = Math.exp(DYN.slp * DYN.tetmlt * (TK - DYN.tetmlt) / TK);
      const xi = sr / (1 + sr);
      const xs = aa * Math.exp(ee / TK);
      const ak1 = DYN.a1 * Math.exp(-DYN.e1 / TK);
      const interE = xs - (xs - interS) * Math.exp(-ak1);
      if (interE >= 1) { const delt = xi * interE; portions += delt; interS = interE - delt; }
      else interS = interE;
      if (series) series[i] = portions;
    }
    return withSeries ? { portions, series } : portions;
  }
  /* growing degree hours (Anderson, Richardson & Kesner 1986): the heat that
     follows the chill and brings the bud to bloom; base 4.5 °C, optimum 25 °C,
     critical 36 °C */
  function gdh(hourly) {
    const Tb = 4.5, Tu = 25, Tc = 36, F = 1;
    let s = 0;
    for (const t of hourly) {
      if (t <= Tb || t >= Tc) continue;
      if (t <= Tu) s += F * (Tu - Tb) / 2 * (1 + Math.cos(PI + PI * (t - Tb) / (Tu - Tb)));
      else s += F * (Tu - Tb) * (1 + Math.cos(PI / 2 + PI / 2 * (t - Tu) / (Tc - Tu)));
    }
    return s;
  }

  /* =====================================================================
     7 · crop coefficients and the soil water balance (FAO-56 chapters 6–8)
     ===================================================================== */

  /* The four-segment Kc curve (FAO-56 fig. 25): flat during the initial stage,
     a straight line up through development, flat at mid-season and a straight
     line down through the late season. `day` counts from 1 on the sowing day. */
  function kcAt(day, L, kc) {
    const l1 = L.ini, l2 = l1 + L.dev, l3 = l2 + L.mid, l4 = l3 + L.late;
    if (day <= 0) return 0;
    if (day <= l1) return kc.ini;
    if (day <= l2) return kc.ini + (kc.mid - kc.ini) * (day - l1) / L.dev;
    if (day <= l3) return kc.mid;
    if (day <= l4) return kc.mid + (kc.end - kc.mid) * (day - l3) / L.late;
    return null;   /* the season is over */
  }
  /* Kc mid and Kc end for a climate other than the table's (RHmin 45 %,
     u2 2 m/s): FAO-56 eq. 62 and 65, with the crop height h in metres */
  function kcAdjust(kcTab, u2mean, rhmin, h) {
    if (kcTab < 0.45) return kcTab;   /* eq. 65 applies the correction only above 0.45 */
    return kcTab + (0.04 * (u2mean - 2) - 0.004 * (rhmin - 45)) * Math.pow(Math.max(0.1, h) / 3, 0.3);
  }
  /* root depth growing linearly from the sowing value to the maximum, reached
     at the end of the development stage (the convention of CROPWAT) */
  function rootDepthAt(day, L, zIni, zMax) {
    const l2 = L.ini + L.dev;
    if (day <= 0) return zIni;
    if (day >= l2) return zMax;
    return zIni + (zMax - zIni) * day / l2;
  }
  /* the depletion fraction of Table 22 corrected for the day's ETc (footnote 2) */
  function pAdjusted(pTab, etc) { return clamp(pTab + 0.04 * (5 - etc), 0.1, 0.8); }

  /* Effective rainfall of a month. USDA Soil Conservation Service, as
     programmed in CROPWAT; and the FAO/AGLW "dependable rain" formula. */
  function effectiveRainUSDA(P) { return P <= 250 ? P * (125 - 0.2 * P) / 125 : 125 + 0.1 * P; }
  function effectiveRainFAO(P) { return Math.max(0, P <= 70 ? 0.6 * P - 10 : 0.8 * P - 24); }
  /* daily runoff by the NRCS curve number, mm (initial abstraction 0.2 S) */
  function runoffCN(P, CN) {
    if (!(CN > 0) || CN >= 100) return CN >= 100 ? P : 0;
    const S = 25400 / CN - 254, Ia = 0.2 * S;
    return P > Ia ? Math.pow(P - Ia, 2) / (P + 0.8 * S) : 0;
  }

  /* Monthly water balance of Thornthwaite & Mather (1955, 1957). Storage
     drains exponentially with the accumulated potential water loss when
     PET exceeds P, refills when P exceeds PET, and once it is full the
     rest is surplus. The year is run three times so that the December storage
     is the one January starts from. */
  function balanceTM(P, PET, awc) {
    const AWC = awc > 0 ? awc : 100;
    let ST = AWC, APWL = 0;
    let rows = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      rows = [];
      for (let i = 0; i < 12; i++) {
        const diff = P[i] - PET[i];
        const stPrev = ST;
        if (diff < 0) { APWL += diff; ST = AWC * Math.exp(APWL / AWC); }
        else {
          ST = Math.min(AWC, ST + diff);
          APWL = ST < AWC ? AWC * Math.log(ST / AWC) : 0;
        }
        const dST = ST - stPrev;
        const AET = diff >= 0 ? PET[i] : P[i] - dST;
        const deficit = Math.max(0, PET[i] - AET);
        const surplus = diff >= 0 ? Math.max(0, diff - dST) : 0;
        rows.push({ month: i + 1, P: P[i], PET: PET[i], diff, APWL, ST, dST, AET, deficit, surplus });
      }
    }
    const tot = k => rows.reduce((s, r) => s + r[k], 0);
    return { rows, awc: AWC, P: tot('P'), PET: tot('PET'), AET: tot('AET'), deficit: tot('deficit'), surplus: tot('surplus') };
  }

  /* Daily root-zone water balance (FAO-56 eq. 85 onwards). Input days carry
     {P, eto, kc} (or etc), and the options describe the soil and the crop:
       taw       total available water per metre of soil, mm/m (or fc & wp)
       L, zIni, zMax   stage lengths and root depths (crop)
       p         depletion fraction of Table 22
       dr0       initial depletion, mm (0 = field capacity)
       cn        curve number for runoff (0 = no runoff)
       irrigation {mode: 'none'|'auto'|'dates', trigger, depth, efficiency, dates: {index: mm}}
     `trigger` is the fraction of RAW at which an automatic irrigation is
     applied (1 = exactly when the readily available water runs out); `depth`
     is null to refill to field capacity or a fixed net depth in mm. */
  function balanceDaily(days, o) {
    const opt = o || {};
    const tawPerM = opt.taw != null ? opt.taw : 1000 * ((opt.fc || 0.23) - (opt.wp || 0.10));
    const L = opt.L || { ini: 25, dev: 35, mid: 40, late: 30 };
    const zIni = opt.zIni == null ? 0.15 : opt.zIni, zMax = opt.zMax == null ? 1.0 : opt.zMax;
    const pTab = opt.p == null ? 0.5 : opt.p;
    /* irrigation rules: mode 'none' | 'auto' (when depletion reaches trigger × RAW) | 'depth' (when depletion
       reaches a fixed net depth) | 'interval' (every `interval` days) | 'dates' ({index: mm});
       depth null = refill to field capacity; startAfter / stopBefore = days without irrigation at the
       start and the end of the season; minInterval = the system cannot return sooner */
    const irr = Object.assign({ mode: 'none', trigger: 1, depth: null, efficiency: 1, dates: {}, interval: 7, startAfter: 0, stopBefore: 0, minInterval: 1 }, opt.irrigation || {});
    const rows = [];
    let dr = opt.dr0 || 0;
    let tawPrev = null, lastI = null;
    const tot = { P: 0, RO: 0, Pe: 0, etc: 0, etcAdj: 0, I: 0, Igross: 0, DP: 0, events: 0, stressDays: 0, ksSum: 0, deficit: 0, midKs: [], eto: 0 };
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const day = i + 1;
      const zr = rootDepthAt(day, L, zIni, zMax);
      const taw = tawPerM * zr;
      /* the soil the roots reach for the first time carries the same relative
         depletion as the layer above: the depletion scales with the reservoir */
      if (tawPrev != null && taw !== tawPrev) dr = dr * taw / tawPrev;
      tawPrev = taw;
      const kc = d.kc != null ? d.kc : (kcAt(day, L, opt.kc || { ini: 0.4, mid: 1.15, end: 0.5 }) || 0);
      const etc = d.etc != null ? d.etc : kc * d.eto;
      const p = pAdjusted(pTab, etc);
      const raw = p * taw;
      const drStart = clamp(dr, 0, taw);
      /* irrigation is decided on the depletion at the start of the day and
         applied before the crop transpires: a soil refilled in the morning does
         not stress the crop that afternoon */
      let I = 0;
      const can = kc > 0 && day > irr.startAfter && day <= days.length - irr.stopBefore && (lastI == null || day - lastI >= irr.minInterval);
      if (irr.mode === 'auto' && can && raw > 0 && drStart >= irr.trigger * raw) I = irr.depth != null ? irr.depth : drStart;
      else if (irr.mode === 'depth' && can && irr.depth > 0 && drStart >= irr.depth) I = irr.depth;
      else if (irr.mode === 'interval' && can && irr.interval > 0 && (lastI == null ? day > irr.startAfter : day - lastI >= irr.interval) && drStart > 1) I = irr.depth != null ? irr.depth : drStart;
      else if (irr.mode === 'dates' && irr.dates && irr.dates[i] != null) I = irr.dates[i];
      if (I > 0) lastI = day;
      const drWet = Math.max(0, drStart - I);
      const ks = drWet > raw ? clamp((taw - drWet) / ((1 - p) * taw), 0, 1) : 1;
      const etcAdj = ks * etc;
      const ro = opt.cn ? runoffCN(d.P, opt.cn) : (opt.roFrac ? d.P * opt.roFrac : 0);
      const pe = d.P - ro;
      const drEnd0 = drStart - pe - I + etcAdj;
      const dp = Math.max(0, -drEnd0);
      dr = clamp(drEnd0, 0, taw);
      rows.push({ i, day, P: d.P, RO: ro, Pe: pe, eto: d.eto, kc, etc, etcAdj, ks, p, taw, raw, zr, drStart, I, Igross: I / (irr.efficiency || 1), DP: dp, dr, stress: ks < 1 });
      tot.P += d.P; tot.RO += ro; tot.Pe += pe; tot.etc += etc; tot.etcAdj += etcAdj; tot.I += I; tot.Igross += I / (irr.efficiency || 1);
      tot.DP += dp; tot.eto += d.eto;
      if (I > 0) tot.events++;
      if (ks < 1) tot.stressDays++;
      tot.ksSum += ks;
      tot.deficit += etc - etcAdj;
    }
    tot.ksMean = rows.length ? tot.ksSum / rows.length : 1;
    return { rows, totals: tot, tawPerM, L, zIni, zMax, p: pTab, irrigation: irr };
  }

  /* Irrigation calendar summary from a balance: the events with their depth,
     the interval between them and the depth that would have been applied. */
  function irrigationEvents(balance) {
    const ev = [];
    let last = null;
    balance.rows.forEach(r => {
      if (r.I > 0) {
        ev.push({ i: r.i, day: r.day, net: r.I, gross: r.Igross, interval: last == null ? null : r.day - last, drBefore: r.drStart, raw: r.raw, taw: r.taw });
        last = r.day;
      }
    });
    return ev;
  }

  /* =====================================================================
     8 · climate indices and classifications
     ===================================================================== */

  /* UNEP (1992) aridity index P/PET and its classes */
  function aridityUNEP(P, PET) {
    const ai = PET > 0 ? P / PET : Infinity;
    const cls = ai < 0.05 ? 'hyperarid' : ai < 0.2 ? 'arid' : ai < 0.5 ? 'semiarid' : ai < 0.65 ? 'drysubhumid' : 'humid';
    return { ai, cls };
  }
  /* De Martonne (1926) aridity index P/(T+10), annual */
  function deMartonne(P, T) {
    const I = P / (T + 10);
    const cls = I < 5 ? 'arid' : I < 10 ? 'semiarid' : I < 20 ? 'mediterranean' : I < 30 ? 'subhumid' : I < 60 ? 'humid' : 'perhumid';
    return { I, cls };
  }
  /* Lang (1920) rain factor P/T */
  function lang(P, T) {
    const I = T > 0 ? P / T : Infinity;
    const cls = I < 20 ? 'desert' : I < 40 ? 'arid' : I < 60 ? 'humidsteppe' : I < 100 ? 'humidforest' : I < 160 ? 'wet' : 'perhumid';
    return { I, cls };
  }
  /* Thornthwaite (1948) moisture index from the annual balance */
  function moistureIndexTW(surplus, deficit, PET) { return PET > 0 ? 100 * (surplus - deficit) / PET : NaN; }

  /* =====================================================================
     9 · series helpers
     ===================================================================== */

  /* mean of a field by calendar month over a daily series [{y, m, d, ...}] */
  function monthlyMeans(rows, field, sumInstead) {
    const acc = Array.from({ length: 12 }, () => ({ s: 0, n: 0, years: new Set() }));
    rows.forEach(r => {
      const v = r[field];
      if (v == null || !isFinite(v)) return;
      const a = acc[r.m - 1];
      a.s += v; a.n++; a.years.add(r.y);
    });
    return acc.map(a => a.n === 0 ? null : (sumInstead ? a.s / Math.max(1, a.years.size) : a.s / a.n));
  }

  Object.assign(Agro, {
    GSC, SIGMA, LAMBDA, DYN,
    dr, declination, sunsetAngle, Ra, daylength, photoperiod, RsAngstrom, RsHargreaves, Rso, Rns, Rnl,
    pressure, gamma, es, esMean, delta, eaFromTdew, eaFromRH, eaFromRHmax, eaFromRHmean, eaFromTmin, u2, soilHeatMonthly, soilHeatMonthlyEnd,
    etoPM, etoPMDaily, etoHargreaves, etoPriestleyTaylor, etoTurc, thornthwaiteIndex, etoThornthwaite,
    CURVES, ddCurve, degreeDay, chu, accumulate,
    hourlyLinvill, hourlySeries, chillHours, utahWeight, utahUnits, chillPortions, gdh,
    kcAt, kcAdjust, rootDepthAt, pAdjusted, effectiveRainUSDA, effectiveRainFAO, runoffCN, balanceTM, balanceDaily, irrigationEvents,
    aridityUNEP, deMartonne, lang, moistureIndexTW, monthlyMeans,
  });
  if (typeof window !== 'undefined') window.Agro = Agro;
})();
