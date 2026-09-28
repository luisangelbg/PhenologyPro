/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — the crop catalogue.

   What the app knows about each crop before the user tells it anything:
   the base and upper temperatures of its thermal time, the thermal time that
   the literature reports for each phenological stage, the crop coefficients
   and stage lengths of FAO-56, the rooting depth and the depletion fraction,
   the seasonal yield-response factor Ky of FAO-33 (Doorenbos & Kassam 1979,
   Table 24; 1.0 where the paper gives no value), and, for the deciduous fruit
   trees, the winter chill they need.

   Two honest warnings, printed wherever these values are used:
   · Kc, stage lengths, root depths and depletion fractions are the published
     tables of FAO-56 (Allen et al. 1998, Tables 11, 12 and 22). They are
     averages for a well-managed crop in a sub-humid climate and the app
     corrects Kc for the local wind and humidity (eq. 62).
   · The thermal time to each stage is ORIENTATIVE: it changes with the
     cultivar, and in photoperiod-sensitive crops with the sowing date. The
     ranges come from extension bulletins and the physiology literature
     (McMaster & Wilhelm 1997; Neild & Newman 1990; Abendroth et al. 2011;
     Miller et al. 2001; Bauer et al. 1984), converted to °C when they were
     published in °F. Every number is editable in Block 8 and should be
     replaced by a local calibration as soon as observations exist. */

const Crops = {};

(function () {

  /* a stage: BBCH code (or the growth-stage code of the crop), names, thermal time from sowing */
  const S = (code, es, en, gdd) => ({ code, es, en, gdd });

  const LIST = [
    /* ---------------- cereals ---------------- */
    { id: 'maize', es: 'Maíz (grano)', en: 'Maize (grain)', group: 'cereal', season: 'warm',
      tbase: 10, tupper: 30, method: 'capped',
      stages: [S('09', 'Emergencia', 'Emergence', 65), S('16', 'Seis hojas (V6)', 'Six leaves (V6)', 300),
        S('65', 'Floración (VT/R1)', 'Silking (VT/R1)', 780), S('75', 'Grano lechoso (R3)', 'Milk (R3)', 950),
        S('89', 'Madurez fisiológica (R6)', 'Physiological maturity (R6)', 1450)],
      kc: { ini: 0.30, mid: 1.20, end: 0.60 }, L: { ini: 25, dev: 40, mid: 45, late: 30 },
      zIni: 0.15, zMax: 1.2, p: 0.55, h: 2.0, ky: 1.25,
      note: ['Híbrido de ciclo intermedio (~1 450 °C·d a madurez). Los de ciclo corto cierran en ~1 200 y los tardíos pasan de 1 700.',
        'Medium-season hybrid (~1,450 °C·d to maturity). Short-season ones finish at ~1,200 and late ones exceed 1,700.'] },
    { id: 'sorghum', es: 'Sorgo (grano)', en: 'Sorghum (grain)', group: 'cereal', season: 'warm',
      tbase: 8, tupper: 35, method: 'capped',
      stages: [S('09', 'Emergencia', 'Emergence', 60), S('30', 'Inicio de panoja (GS2)', 'Panicle initiation (GS2)', 400),
        S('45', 'Embuche', 'Boot', 750), S('65', 'Floración media', 'Half bloom', 950), S('89', 'Madurez fisiológica', 'Physiological maturity', 1500)],
      kc: { ini: 0.30, mid: 1.05, end: 0.55 }, L: { ini: 20, dev: 35, mid: 40, late: 30 },
      zIni: 0.15, zMax: 1.5, p: 0.55, h: 1.5, ky: 0.9,
      note: ['Base térmica de 8 °C, aunque la literatura usa entre 7 y 10 °C según el híbrido.', 'Base 8 °C, though the literature uses 7 to 10 °C depending on the hybrid.'] },
    { id: 'wheat', es: 'Trigo (primavera)', en: 'Wheat (spring)', group: 'cereal', season: 'cool',
      tbase: 0, tupper: 30, method: 'average',
      stages: [S('10', 'Emergencia (Z10)', 'Emergence (Z10)', 130), S('21', 'Amacollamiento (Z21)', 'Tillering (Z21)', 350),
        S('31', 'Encañe (Z31)', 'Stem elongation (Z31)', 650), S('55', 'Espigamiento (Z55)', 'Heading (Z55)', 1050),
        S('65', 'Antesis (Z65)', 'Anthesis (Z65)', 1150), S('90', 'Madurez (Z90)', 'Maturity (Z90)', 1900)],
      kc: { ini: 0.30, mid: 1.15, end: 0.30 }, L: { ini: 20, dev: 25, mid: 60, late: 30 },
      zIni: 0.15, zMax: 1.2, p: 0.55, h: 1.0, ky: 1.15,
      note: ['Base 0 °C, la convención de McMaster & Smika (1988). El trigo de invierno necesita además vernalización.',
        'Base 0 °C, the convention of McMaster & Smika (1988). Winter wheat also needs vernalisation.'] },
    { id: 'barley', es: 'Cebada', en: 'Barley', group: 'cereal', season: 'cool',
      tbase: 0, tupper: 30, method: 'average',
      stages: [S('10', 'Emergencia', 'Emergence', 120), S('21', 'Amacollamiento', 'Tillering', 330), S('31', 'Encañe', 'Stem elongation', 600),
        S('55', 'Espigamiento', 'Heading', 950), S('90', 'Madurez', 'Maturity', 1650)],
      kc: { ini: 0.30, mid: 1.15, end: 0.25 }, L: { ini: 15, dev: 25, mid: 50, late: 30 },
      zIni: 0.15, zMax: 1.2, p: 0.55, h: 1.0, ky: 1 },
    /* ---------------- legumes and oilseeds ---------------- */
    { id: 'bean', es: 'Frijol', en: 'Common bean', group: 'legume', season: 'warm',
      tbase: 10, tupper: 32, method: 'average',
      stages: [S('09', 'Emergencia (VE)', 'Emergence (VE)', 90), S('13', 'Tercera hoja trifoliada (V3)', 'Third trifoliate (V3)', 300),
        S('65', 'Floración (R6)', 'Flowering (R6)', 600), S('75', 'Llenado de vaina (R8)', 'Pod fill (R8)', 850), S('89', 'Madurez (R9)', 'Maturity (R9)', 1200)],
      kc: { ini: 0.40, mid: 1.15, end: 0.35 }, L: { ini: 20, dev: 30, mid: 40, late: 20 },
      zIni: 0.15, zMax: 0.8, p: 0.45, h: 0.4, ky: 1.15,
      note: ['Cultivar de hábito determinado y ciclo de ~90 días.', 'Determinate cultivar with a ~90-day cycle.'] },
    { id: 'soybean', es: 'Soya', en: 'Soybean', group: 'legume', season: 'warm',
      tbase: 10, tupper: 30, method: 'average', photoperiod: true,
      stages: [S('09', 'Emergencia (VE)', 'Emergence (VE)', 70), S('13', 'Tres nudos (V3)', 'Three nodes (V3)', 300),
        S('61', 'Inicio de floración (R1)', 'Beginning bloom (R1)', 600), S('75', 'Inicio de llenado (R5)', 'Beginning seed (R5)', 1000), S('89', 'Madurez (R7)', 'Maturity (R7)', 1450)],
      kc: { ini: 0.40, mid: 1.15, end: 0.50 }, L: { ini: 20, dev: 35, mid: 60, late: 25 },
      zIni: 0.15, zMax: 1.0, p: 0.50, h: 0.75, ky: 0.85,
      note: ['Sensible al fotoperiodo: la fecha de floración depende del grupo de madurez y de la latitud tanto como del calor.',
        'Photoperiod-sensitive: the date of flowering depends on the maturity group and the latitude as much as on heat.'] },
    { id: 'sunflower', es: 'Girasol', en: 'Sunflower', group: 'oilseed', season: 'warm',
      tbase: 6.7, tupper: 32, method: 'average',
      stages: [S('09', 'Emergencia (VE)', 'Emergence (VE)', 90), S('51', 'Botón floral (R1)', 'Star bud (R1)', 550),
        S('65', 'Floración (R5)', 'Flowering (R5)', 1000), S('89', 'Madurez (R9)', 'Maturity (R9)', 1650)],
      kc: { ini: 0.35, mid: 1.10, end: 0.35 }, L: { ini: 25, dev: 35, mid: 45, late: 25 },
      zIni: 0.15, zMax: 1.2, p: 0.45, h: 2.0, ky: 0.95 },
    { id: 'cotton', es: 'Algodón', en: 'Cotton', group: 'fibre', season: 'warm',
      tbase: 15.6, tupper: 35, method: 'average',
      stages: [S('09', 'Emergencia', 'Emergence', 50), S('51', 'Primer botón (cuadro)', 'First square', 305),
        S('61', 'Primera flor', 'First flower', 470), S('79', 'Primera bellota abierta', 'First open boll', 945), S('99', 'Cosecha', 'Harvest', 1250)],
      kc: { ini: 0.35, mid: 1.18, end: 0.60 }, L: { ini: 30, dev: 50, mid: 60, late: 55 },
      zIni: 0.15, zMax: 1.4, p: 0.65, h: 1.3, ky: 0.85,
      note: ['Base 15.6 °C (60 °F): los «DD60» de la literatura algodonera.', 'Base 15.6 °C (60 °F): the "DD60s" of the cotton literature.'] },
    /* ---------------- vegetables ---------------- */
    { id: 'potato', es: 'Papa', en: 'Potato', group: 'vegetable', season: 'cool',
      tbase: 7, tupper: 30, method: 'average',
      stages: [S('09', 'Emergencia', 'Emergence', 200), S('40', 'Inicio de tuberización', 'Tuber initiation', 450),
        S('65', 'Floración / dosel completo', 'Flowering / full canopy', 750), S('95', 'Senescencia (madurez)', 'Senescence (maturity)', 1400)],
      kc: { ini: 0.50, mid: 1.15, end: 0.75 }, L: { ini: 25, dev: 30, mid: 45, late: 30 },
      zIni: 0.15, zMax: 0.5, p: 0.35, h: 0.6, ky: 1.1,
      note: ['Cuenta desde la siembra del tubérculo; base 7 °C, aunque hay autores que usan de 2 a 4 °C.',
        'Counted from planting the tuber; base 7 °C, though some authors use 2 to 4 °C.'] },
    { id: 'tomato', es: 'Jitomate (trasplante)', en: 'Tomato (transplanted)', group: 'vegetable', season: 'warm',
      tbase: 10, tupper: 32, method: 'average', fromTransplant: true,
      stages: [S('61', 'Primera floración', 'First flowering', 350), S('71', 'Amarre de fruto', 'Fruit set', 500),
        S('81', 'Primer fruto maduro', 'First ripe fruit', 1050), S('89', 'Fin de cosecha', 'End of harvest', 1600)],
      kc: { ini: 0.60, mid: 1.15, end: 0.80 }, L: { ini: 30, dev: 40, mid: 40, late: 25 },
      zIni: 0.20, zMax: 1.0, p: 0.40, h: 0.6, ky: 1.05,
      note: ['El tiempo térmico se cuenta desde el trasplante; súmale unos 300 °C·d de almácigo si partes de semilla.',
        'Thermal time counts from transplanting; add about 300 °C·d of nursery if you start from seed.'] },
    { id: 'pepper', es: 'Chile (trasplante)', en: 'Pepper (transplanted)', group: 'vegetable', season: 'warm',
      tbase: 10, tupper: 32, method: 'average', fromTransplant: true,
      stages: [S('61', 'Primera floración', 'First flowering', 400), S('71', 'Amarre de fruto', 'Fruit set', 600),
        S('81', 'Primera cosecha', 'First harvest', 1200), S('89', 'Fin de cosecha', 'End of harvest', 1900)],
      kc: { ini: 0.60, mid: 1.05, end: 0.90 }, L: { ini: 30, dev: 35, mid: 40, late: 20 },
      zIni: 0.20, zMax: 0.8, p: 0.30, h: 0.7, ky: 1.1 },
    { id: 'onion', es: 'Cebolla (bulbo seco)', en: 'Onion (dry bulb)', group: 'vegetable', season: 'cool',
      tbase: 5, tupper: 30, method: 'average', photoperiod: true,
      stages: [S('09', 'Emergencia', 'Emergence', 200), S('41', 'Inicio de bulbificación', 'Bulbing starts', 800), S('49', 'Madurez (doblado)', 'Maturity (tops down)', 1800)],
      kc: { ini: 0.70, mid: 1.05, end: 0.75 }, L: { ini: 15, dev: 25, mid: 70, late: 40 },
      zIni: 0.15, zMax: 0.5, p: 0.30, h: 0.4, ky: 1.1,
      note: ['La bulbificación la dispara el fotoperiodo (día corto, intermedio o largo según el cultivar), no el calor acumulado.',
        'Bulbing is triggered by photoperiod (short, intermediate or long-day cultivars), not by accumulated heat.'] },
    /* ---------------- perennials: Kc and, where it applies, chill ---------------- */
    { id: 'apple', es: 'Manzano', en: 'Apple', group: 'deciduous', season: 'perennial',
      tbase: 4.5, tupper: 36, method: 'sine',
      kc: { ini: 0.45, mid: 0.95, end: 0.70 }, L: { ini: 30, dev: 50, mid: 130, late: 30 },
      zIni: 1.0, zMax: 1.5, p: 0.50, h: 4.0, ky: 1,
      chill: { utah: [800, 1200], cp: [45, 70], hours: [800, 1400] },
      note: ['Kc de huerto sin cubierta vegetal y con heladas invernales (FAO-56). El frío que necesita varía mucho entre cultivares.',
        'Kc for an orchard with no ground cover and killing frosts (FAO-56). Chill requirement varies widely among cultivars.'] },
    { id: 'peach', es: 'Durazno', en: 'Peach', group: 'deciduous', season: 'perennial',
      tbase: 4.5, tupper: 36, method: 'sine',
      kc: { ini: 0.45, mid: 0.90, end: 0.65 }, L: { ini: 30, dev: 50, mid: 130, late: 30 },
      zIni: 1.0, zMax: 1.5, p: 0.50, h: 3.0, ky: 1,
      chill: { utah: [150, 1000], cp: [10, 60], hours: [150, 1000] },
      note: ['De bajo a alto requerimiento de frío según el cultivar; los de México suelen estar entre 150 y 400 unidades Utah.',
        'From low- to high-chill cultivars; the Mexican ones are usually between 150 and 400 Utah units.'] },
    { id: 'avocado', es: 'Aguacate', en: 'Avocado', group: 'evergreen', season: 'perennial',
      tbase: 10, tupper: 35, method: 'average',
      kc: { ini: 0.60, mid: 0.85, end: 0.75 }, L: { ini: 60, dev: 90, mid: 120, late: 95 },
      zIni: 0.6, zMax: 1.0, p: 0.70, h: 3.0, ky: 1 },
    { id: 'coffee', es: 'Café (sin sombra)', en: 'Coffee (unshaded)', group: 'evergreen', season: 'perennial',
      tbase: 10, tupper: 32, method: 'average',
      kc: { ini: 0.90, mid: 0.95, end: 0.95 }, L: { ini: 60, dev: 90, mid: 120, late: 95 },
      zIni: 0.6, zMax: 1.2, p: 0.40, h: 2.5, ky: 1 },
    { id: 'citrus', es: 'Cítricos (70 % de cobertura)', en: 'Citrus (70 % canopy)', group: 'evergreen', season: 'perennial',
      tbase: 12.5, tupper: 35, method: 'average',
      kc: { ini: 0.70, mid: 0.65, end: 0.70 }, L: { ini: 60, dev: 90, mid: 120, late: 95 },
      zIni: 0.8, zMax: 1.4, p: 0.50, h: 4.0, ky: 1.1 },
    { id: 'alfalfa', es: 'Alfalfa', en: 'Alfalfa', group: 'forage', season: 'perennial',
      tbase: 5, tupper: 30, method: 'average',
      kc: { ini: 0.40, mid: 0.95, end: 0.90 }, L: { ini: 10, dev: 30, mid: 25, late: 10 },
      zIni: 0.8, zMax: 1.5, p: 0.55, h: 0.7, ky: 1.1,
      note: ['Kc promedio entre cortes; cada corte reinicia la curva.', 'Kc averaged over cuttings; each cutting restarts the curve.'] },
    { id: 'sugarcane', es: 'Caña de azúcar', en: 'Sugarcane', group: 'industrial', season: 'perennial',
      tbase: 10, tupper: 38, method: 'average',
      kc: { ini: 0.40, mid: 1.25, end: 0.75 }, L: { ini: 35, dev: 60, mid: 190, late: 120 },
      zIni: 0.3, zMax: 1.5, p: 0.65, h: 3.0, ky: 1.2 },
  ];

  /* the soils of FAO-56 Table 19, at the middle of each published range */
  const SOILS = [
    { id: 'sand', es: 'Arena', en: 'Sand', fc: 0.12, wp: 0.045, taw: 75, cn: 65 },
    { id: 'loamysand', es: 'Arena francosa', en: 'Loamy sand', fc: 0.145, wp: 0.06, taw: 85, cn: 70 },
    { id: 'sandyloam', es: 'Franco arenoso', en: 'Sandy loam', fc: 0.22, wp: 0.11, taw: 110, cn: 74 },
    { id: 'loam', es: 'Franco', en: 'Loam', fc: 0.25, wp: 0.12, taw: 140, cn: 78 },
    { id: 'siltloam', es: 'Franco limoso', en: 'Silt loam', fc: 0.29, wp: 0.135, taw: 165, cn: 80 },
    { id: 'clayloam', es: 'Franco arcilloso', en: 'Clay loam', fc: 0.32, wp: 0.19, taw: 155, cn: 82 },
    { id: 'clay', es: 'Arcilla', en: 'Clay', fc: 0.36, wp: 0.22, taw: 160, cn: 85 },
  ];

  const GROUPS = {
    cereal: ['Cereales', 'Cereals'], legume: ['Leguminosas', 'Legumes'], oilseed: ['Oleaginosas', 'Oilseeds'], fibre: ['Fibras', 'Fibres'],
    vegetable: ['Hortalizas', 'Vegetables'], deciduous: ['Frutales caducifolios', 'Deciduous fruit'], evergreen: ['Perennes de hoja perenne', 'Evergreen perennials'],
    forage: ['Forrajes', 'Forages'], industrial: ['Industriales', 'Industrial'],
  };

  const byId = id => LIST.find(c => c.id === id) || null;
  const annuals = () => LIST.filter(c => c.stages && c.stages.length);
  /* the total length of the FAO season, days */
  const seasonLength = c => c.L.ini + c.L.dev + c.L.mid + c.L.late;
  /* the thermal time to the last stage, or null for perennials */
  const gddToMaturity = c => c.stages && c.stages.length ? c.stages[c.stages.length - 1].gdd : null;

  Object.assign(Crops, { LIST, SOILS, GROUPS, byId, annuals, seasonLength, gddToMaturity });
  if (typeof window !== 'undefined') window.Crops = Crops;
})();
