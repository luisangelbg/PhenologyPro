/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — interpretation help.

   A number a reader cannot place is not a result. This is a registry of short
   explanations, one per concept or statistic the app prints, each with what it
   measures, how it is read, the scale that says whether a value is low or
   high, and the mistake most commonly made with it.

     Help.badge(key)             the circled question mark to put next to a label
     Help.panel(keys, title)     a collapsible guide listing several entries
     Help.markTable(box, map)    decorates the headers of a table already built
     Help.markTiles(box, map)    the same for the summary tiles
     Help.hydrate(root)          turns every <span data-help="key"> into a badge
     Help.band(key, value)       which band of the scale a computed value falls in
     Help.tag(key, value)        that band as a small coloured chip, ready to print

   The last two are the point. A scale printed in a manual is documentation; a
   scale applied to the number on screen is a decision rule, which is what the
   reader actually needed. Where a scale is a convention rather than a law, the
   entry says so: agroclimatology is full of habits stated as thresholds. */

const Help = {};

(function () {

  const two = p => (Array.isArray(p) ? L2(p[0], p[1]) : String(p || ''));
  const num = v => (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01) ? String(v) : String(+(+v).toFixed(3)));
  /* a band of a scale: from/to may be null for an open end */
  const S = (from, to, label, tone, txt) => ({ from, to, label, tone, txt });
  const HELP = {};
  const E = (key, def) => { HELP[key] = def; return key; };

  /* =====================================================================
     1 · the catalogue — Block 1: the ideas the whole app rests on
     ===================================================================== */

  E('gdd', {
    t: ['Grados-día (tiempo térmico)', 'Degree-days (thermal time)'],
    what: ['La suma, día tras día, de lo que la temperatura media excede una <b>temperatura base</b> por debajo de la cual el cultivo no avanza. Una planta no cuenta días: cuenta calor. Un mismo híbrido de maíz tarda 95 días en un valle cálido y 150 en uno frío, pero en los dos acumula los mismos ~1 450 °C·d hasta madurar.',
      'The sum, day after day, of how much the mean temperature exceeds a <b>base temperature</b> below which the crop does not advance. A plant does not count days: it counts heat. The same maize hybrid takes 95 days in a warm valley and 150 in a cold one, yet in both it accumulates the same ~1,450 °C·d to maturity.'],
    read: ['Se lee contra el requerimiento de cada etapa del cultivo. Si el sitio junta 1 200 °C·d entre la siembra y la primera helada y el híbrido necesita 1 450, no madura, por muchos días que pasen. Compara siempre <b>°C·d acumulados</b> contra <b>°C·d requeridos</b>, y en las mismas unidades: un valor en °F·d es 1.8 veces el de °C·d.',
      'It is read against what each stage of the crop requires. If the site gathers 1,200 °C·d between sowing and the first frost and the hybrid needs 1,450, it does not mature, however many days go by. Always compare <b>accumulated °C·d</b> with <b>required °C·d</b>, in the same units: a value in °F·d is 1.8 times the one in °C·d.'],
    care: ['Dos errores repetidos: sumar con una base distinta de la que usó quien publicó el requerimiento (800 °C·d con base 10 no son 800 con base 8), y olvidar el umbral superior, con lo que un día de 38 °C «hace crecer» al maíz más que uno de 30 °C, que es falso.',
      'Two repeated mistakes: summing with a base other than the one used by whoever published the requirement (800 °C·d at base 10 are not 800 at base 8), and forgetting the upper threshold, so that a 38 °C day "grows" the maize more than a 30 °C one, which is false.'],
    ref: 'McMaster & Wilhelm 1997; Baskerville & Emin 1969',
  });

  E('tbase', {
    t: ['Temperatura base y umbral superior', 'Base temperature and upper threshold'],
    what: ['La <b>base</b> es la temperatura por debajo de la cual el desarrollo se detiene; el <b>umbral superior</b>, aquella a partir de la cual deja de acelerarse (o se frena). Son propiedades del cultivo, estimadas por regresión del ritmo de desarrollo contra la temperatura, no números que se elijan a gusto.',
      'The <b>base</b> is the temperature below which development stops; the <b>upper threshold</b>, the one above which it stops speeding up (or slows down). They are properties of the crop, estimated by regressing the rate of development on temperature, not numbers chosen at will.'],
    read: ['Valores de uso general: 0 °C para trigo, cebada y avena; 4–7 °C para papa y frutales de zona templada; 10 °C para maíz, frijol, soya, jitomate y sorgo (algunos autores 8 °C); 15.6 °C (60 °F) para algodón. Umbrales superiores: 30 °C para maíz y trigo, 32–35 °C para los cultivos de clima cálido.',
      'Values in general use: 0 °C for wheat, barley and oats; 4–7 °C for potato and temperate fruit trees; 10 °C for maize, bean, soybean, tomato and sorghum (some authors 8 °C); 15.6 °C (60 °F) for cotton. Upper thresholds: 30 °C for maize and wheat, 32–35 °C for warm-season crops.'],
    care: ['Usa la base que usó la fuente de tu requerimiento térmico. Si calibras con tus propias observaciones, la base que minimiza el coeficiente de variación de los °C·d a la etapa entre años es la mejor estimación (método de Arnold 1959).',
      'Use the base that the source of your thermal requirement used. If you calibrate with your own observations, the base that minimises the coefficient of variation of the °C·d to the stage across years is the best estimate (Arnold 1959).'],
    ref: 'Arnold 1959; McMaster & Wilhelm 1997',
  });

  E('cutoff', {
    t: ['Métodos de cálculo y cortes del umbral', 'Calculation methods and threshold cut-offs'],
    what: ['Con solo la máxima y la mínima del día hay que suponer cómo fue la temperatura hora a hora: constante en la media (<b>promedio</b>), un <b>triángulo</b> o una <b>senoide</b>. Y hay que decidir qué pasa por encima del umbral superior: se cuenta como si fuera el umbral (<b>horizontal</b>), no se cuenta nada (<b>vertical</b>) o se resta el exceso (<b>intermedio</b>).',
      'With only the day\'s maximum and minimum one has to assume how the temperature went hour by hour: constant at the mean (<b>average</b>), a <b>triangle</b> or a <b>sine</b>. And one has to decide what happens above the upper threshold: it counts as the threshold (<b>horizontal</b>), nothing counts (<b>vertical</b>) or the excess is subtracted (<b>intermediate</b>).'],
    read: ['Cuando la mínima está por encima de la base, los tres métodos dan lo mismo. Difieren en los días frescos, en que la temperatura cruza la base durante parte del día: ahí el promedio subestima (da cero si la media queda abajo) y el seno y el triángulo cuentan las horas cálidas. El corte horizontal es el más usado; el «método del maíz» acota la máxima a 30 °C y la mínima a 10 °C antes de promediar.',
      'When the minimum is above the base, the three methods agree. They differ on cool days, when the temperature crosses the base during part of the day: there the average underestimates (it gives zero if the mean is below) and the sine and the triangle count the warm hours. The horizontal cut-off is the most used; the "maize method" caps the maximum at 30 °C and the minimum at 10 °C before averaging.'],
    care: ['Elige el método de la fuente que publicó el requerimiento térmico y decláralo: la app lo escribe en el informe. Cambiar de método a mitad de un análisis compara peras con manzanas.',
      'Choose the method of the source that published the thermal requirement and state it: the app writes it in the report. Changing method halfway through an analysis compares apples with oranges.'],
    ref: 'Allen 1976; Zalom et al. 1983',
  });

  E('eto', {
    t: ['Evapotranspiración de referencia (ETo)', 'Reference evapotranspiration (ETo)'],
    what: ['El agua que perdería por día una superficie extensa de pasto bien regado, de 12 cm, con resistencia superficial de 70 s/m y albedo 0.23. No es la demanda de tu cultivo: es la <b>demanda de la atmósfera</b>, la misma para todos los cultivos del sitio ese día, y de ella se parte para todo lo demás.',
      'The water that an extensive, well-watered grass surface, 12 cm tall, with a surface resistance of 70 s/m and an albedo of 0.23, would lose in a day. It is not your crop\'s demand: it is the <b>demand of the atmosphere</b>, the same for every crop of the site that day, and everything else starts from it.'],
    read: ['Se lee en mm/día (un litro por m²). Sube con la radiación, la temperatura y el viento; baja con la humedad. La tabla 2 de FAO-56 da los órdenes de magnitud por clima; con ellos se arma la escala de abajo.',
      'It is read in mm/day (one litre per m²). It rises with radiation, temperature and wind; it falls with humidity. Table 2 of FAO-56 gives the orders of magnitude by climate; the scale below is built from them.'],
    scaleTitle: ['ETo diaria (mm/día)', 'Daily ETo (mm/day)'],
    scale: [
      S(null, 2, ['baja', 'low'], 'good', ['clima fresco o húmedo, invierno', 'cool or humid climate, winter']),
      S(2, 4, ['moderada', 'moderate'], 'ok', ['templado, primavera y otoño', 'temperate, spring and autumn']),
      S(4, 6, ['alta', 'high'], 'warn', ['verano templado, trópico húmedo', 'temperate summer, humid tropics']),
      S(6, 8, ['muy alta', 'very high'], 'bad', ['cálido y seco', 'hot and dry']),
      S(8, null, ['extrema', 'extreme'], 'bad', ['desierto con viento', 'windy desert']),
    ],
    conv: true,
    care: ['La ETo no se «mide» con un tanque sin corregir ni se saca de la temperatura sola cuando hay datos mejores. Penman–Monteith FAO-56 es el estándar; Hargreaves es el sustituto cuando solo hay temperatura, y en ese caso conviene calibrarlo contra PM en el mismo sitio.',
      'ETo is not "measured" with an uncorrected pan nor derived from temperature alone when better data exist. FAO-56 Penman–Monteith is the standard; Hargreaves is the substitute when only temperature is available, and then it pays to calibrate it against PM at the same site.'],
    ref: 'Allen et al. 1998 (FAO-56)',
  });

  E('etomethods', {
    t: ['Penman–Monteith contra Hargreaves', 'Penman–Monteith against Hargreaves'],
    what: ['<b>Penman–Monteith FAO-56</b> combina un término de radiación (energía disponible) y uno aerodinámico (viento y sequedad del aire); necesita temperatura, humedad, viento y radiación o insolación. <b>Hargreaves–Samani</b> usa solo la temperatura máxima, la mínima y la radiación extraterrestre, que se calcula de la latitud y la fecha.',
      '<b>FAO-56 Penman–Monteith</b> combines a radiation term (available energy) and an aerodynamic one (wind and dryness of the air); it needs temperature, humidity, wind and radiation or sunshine. <b>Hargreaves–Samani</b> uses only the maximum and minimum temperature and the extraterrestrial radiation, computed from the latitude and the date.'],
    read: ['A escala mensual Hargreaves suele quedar dentro de ±15 % de PM. Falla de forma conocida: sobreestima en climas húmedos y en la costa (la amplitud térmica es chica por la nubosidad, no porque haya poca radiación) y subestima en zonas ventosas y áridas. Si tienes ambos, la pendiente de la regresión HS contra PM es tu factor de corrección local.',
      'At the monthly scale Hargreaves usually stays within ±15 % of PM. It fails in known ways: it overestimates in humid climates and on the coast (the temperature range is small because of clouds, not because of little radiation) and underestimates in windy, arid areas. If you have both, the slope of the HS-on-PM regression is your local correction factor.'],
    scaleTitle: ['Desviación de Hargreaves respecto a PM', 'Deviation of Hargreaves from PM'],
    scale: [
      S(null, 0.10, ['aceptable', 'acceptable'], 'good'),
      S(0.10, 0.20, ['calibrar', 'calibrate'], 'warn'),
      S(0.20, null, ['no usar sin corregir', 'do not use uncorrected'], 'bad'),
    ],
    conv: true,
    care: ['Cuando falte solo una variable no abandones PM: FAO-56 da procedimientos para estimar la humedad de la mínima, la radiación de la amplitud térmica y el viento de un valor regional (2 m/s). La app los aplica y anota cuáles usó.',
      'When only one variable is missing do not abandon PM: FAO-56 gives procedures to estimate humidity from the minimum, radiation from the temperature range and wind from a regional value (2 m/s). The app applies them and records which ones it used.'],
    ref: 'Allen et al. 1998, cap. 3; Hargreaves & Samani 1985',
  });

  E('kc', {
    t: ['Coeficiente de cultivo (Kc)', 'Crop coefficient (Kc)'],
    what: ['El factor que convierte la ETo en la evapotranspiración del cultivo: <b>ETc = Kc · ETo</b>. Resume la altura del cultivo, su cobertura, la resistencia de sus hojas y la humedad de la superficie del suelo. Cambia a lo largo del ciclo en cuatro tramos: inicial, desarrollo, media estación y final.',
      'The factor that turns ETo into the crop\'s evapotranspiration: <b>ETc = Kc · ETo</b>. It summarises the crop\'s height, its cover, the resistance of its leaves and the wetness of the soil surface. It changes along the cycle in four segments: initial, development, mid-season and late season.'],
    read: ['Valores bajos al inicio (suelo casi desnudo), el máximo cuando el dosel cubre todo, y una caída al final cuando el cultivo madura o se seca. Los de la tabla de FAO-56 valen para RHmin 45 % y viento 2 m/s; la app los corrige para tu clima con la ecuación 62.',
      'Low values at the start (nearly bare soil), the maximum when the canopy covers everything, and a fall at the end as the crop matures or dries. The FAO-56 table values hold for RHmin 45 % and 2 m/s wind; the app corrects them for your climate with equation 62.'],
    scaleTitle: ['Kc', 'Kc'],
    scale: [
      S(null, 0.5, ['suelo casi desnudo', 'nearly bare soil'], 'ok', ['etapa inicial', 'initial stage']),
      S(0.5, 0.9, ['cobertura parcial', 'partial cover'], 'ok', ['desarrollo, perennes con poca copa', 'development, perennials with small canopy']),
      S(0.9, 1.2, ['dosel completo', 'full canopy'], 'good', ['media estación', 'mid-season']),
      S(1.2, null, ['muy alto', 'very high'], 'warn', ['cultivos altos con viento y aire seco', 'tall crops in wind and dry air']),
    ],
    conv: true,
    care: ['El Kc de tabla supone un cultivo sano, denso y sin estrés. Un cultivo ralo, enfermo o con malezas controladas transpira menos; la longitud de las etapas cambia con el clima y el cultivar y conviene ajustarla con las fechas observadas.',
      'A table Kc assumes a healthy, dense, unstressed crop. A thin, diseased or weed-free crop transpires less; the stage lengths change with the climate and the cultivar, and they should be adjusted with observed dates.'],
    ref: 'Allen et al. 1998, cap. 6',
  });

  E('taw', {
    t: ['Agua disponible total (ADT) y fácilmente aprovechable (AFA)', 'Total (TAW) and readily available water (RAW)'],
    what: ['El <b>ADT</b> es el agua que el suelo puede guardar entre capacidad de campo y punto de marchitez permanente en la profundidad de las raíces: ADT = 1000 (θCC − θPMP) Zr, en mm. El <b>AFA</b> es la fracción <i>p</i> de esa agua que el cultivo toma sin estrés: AFA = p · ADT.',
      '<b>TAW</b> is the water the soil can hold between field capacity and permanent wilting point within the root depth: TAW = 1000 (θFC − θWP) Zr, in mm. <b>RAW</b> is the fraction <i>p</i> of that water the crop takes up without stress: RAW = p · TAW.'],
    read: ['Un suelo arenoso guarda 60–90 mm por metro; uno franco 120–170; uno arcilloso 150–200. Con raíces a 0.6 m, un franco ofrece unos 85 mm de ADT y, con p = 0.5, unos 42 mm de AFA: esa es la lámina que se puede agotar antes de regar.',
      'A sandy soil holds 60–90 mm per metre; a loam 120–170; a clay 150–200. With roots at 0.6 m a loam offers about 85 mm of TAW and, with p = 0.5, about 42 mm of RAW: that is the depth that can be depleted before irrigating.'],
    scaleTitle: ['ADT por metro de suelo (mm/m)', 'TAW per metre of soil (mm/m)'],
    scale: [
      S(null, 90, ['baja (arenosos)', 'low (sandy)'], 'warn'),
      S(90, 140, ['media (francos ligeros)', 'medium (light loams)'], 'ok'),
      S(140, null, ['alta (francos y arcillas)', 'high (loams and clays)'], 'good'),
    ],
    conv: true,
    care: ['La fracción <i>p</i> no es fija: baja cuando la ETc es alta (el cultivo no alcanza a extraer tan rápido) y sube cuando es baja. FAO-56 la corrige con p = p<sub>tabla</sub> + 0.04 (5 − ETc), y la app lo hace cada día.',
      'The fraction <i>p</i> is not fixed: it falls when ETc is high (the crop cannot extract fast enough) and rises when it is low. FAO-56 corrects it with p = p<sub>table</sub> + 0.04 (5 − ETc), and the app does so every day.'],
    ref: 'Allen et al. 1998, cap. 8, tablas 19 y 22',
  });

  E('ks', {
    t: ['Coeficiente de estrés hídrico (Ks)', 'Water stress coefficient (Ks)'],
    what: ['Cuánto de la transpiración potencial logra el cultivo con el agua que le queda. Vale 1 mientras el agotamiento no pasa del AFA y cae linealmente hasta 0 en el punto de marchitez: Ks = (ADT − Dr) / ((1 − p) ADT).',
      'How much of its potential transpiration the crop achieves with the water it has left. It is 1 while depletion does not exceed RAW and falls linearly to 0 at wilting point: Ks = (TAW − Dr) / ((1 − p) TAW).'],
    read: ['El promedio de Ks a lo largo de una etapa es una primera aproximación al rendimiento relativo: en la etapa sensible (floración, llenado), un Ks medio de 0.8 puede costar más del 20 % de la cosecha.',
      'The mean Ks over a stage is a first approximation to relative yield: in the sensitive stage (flowering, grain filling), a mean Ks of 0.8 can cost more than 20 % of the harvest.'],
    scaleTitle: ['Ks', 'Ks'],
    scale: [
      S(0.999, null, ['sin estrés', 'no stress'], 'good'),
      S(0.8, 0.999, ['estrés leve', 'mild stress'], 'ok'),
      S(0.5, 0.8, ['estrés moderado', 'moderate stress'], 'warn'),
      S(null, 0.5, ['estrés severo', 'severe stress'], 'bad'),
    ],
    conv: true,
    care: ['Ks describe el déficit de agua en el suelo, no el estrés por calor ni por salinidad, que FAO-56 trata aparte. Y un Ks bajo en la etapa final de un grano seco es normal y hasta deseable.',
      'Ks describes the soil water deficit, not heat or salinity stress, which FAO-56 treats separately. And a low Ks at the final stage of a dry grain is normal and even desirable.'],
    ref: 'Allen et al. 1998, ec. 84',
  });

  E('depletion', {
    t: ['Agotamiento de la zona radical (Dr)', 'Root-zone depletion (Dr)'],
    what: ['Los milímetros que faltan para volver a capacidad de campo en la profundidad de raíces. Cero es suelo lleno; igual al ADT es suelo en marchitez. Cada día sube con la ETc y baja con la lluvia efectiva y el riego; lo que sobra por encima de capacidad de campo se pierde como percolación.',
      'The millimetres missing to get back to field capacity within the root depth. Zero is a full soil; equal to TAW is a soil at wilting point. Each day it rises with ETc and falls with effective rain and irrigation; what exceeds field capacity is lost as deep percolation.'],
    read: ['La regla de programación de FAO-56: regar cuando Dr llega al AFA, con una lámina neta igual a Dr (rellenar). Regar antes desperdicia agua en percolación; regar después cuesta rendimiento.',
      'The FAO-56 scheduling rule: irrigate when Dr reaches RAW, with a net depth equal to Dr (refill). Irrigating earlier wastes water to percolation; irrigating later costs yield.'],
    care: ['El agotamiento inicial rara vez es cero: al sembrar en seco el perfil puede traer la mitad del ADT agotada. Estímalo o mide la humedad; la app lo pide.',
      'Initial depletion is rarely zero: sowing into dry soil, the profile may already have half its TAW depleted. Estimate it or measure the moisture; the app asks for it.'],
    ref: 'Allen et al. 1998, ec. 85–88',
  });

  E('pe', {
    t: ['Lluvia efectiva', 'Effective rainfall'],
    what: ['La parte de la lluvia que de verdad queda en la zona de raíces: lo que no escurre, no percola por debajo y no se evapora de inmediato. A escala mensual se estima con fórmulas empíricas (USDA-SCS, FAO/AGLW); a escala diaria con el balance mismo, restando el escurrimiento y la percolación.',
      'The share of the rain that actually stays in the root zone: what does not run off, does not percolate below and does not evaporate at once. At the monthly scale it is estimated with empirical formulas (USDA-SCS, FAO/AGLW); at the daily scale with the balance itself, subtracting runoff and percolation.'],
    read: ['Con 100 mm en el mes, USDA-SCS da unos 84 mm efectivos y FAO/AGLW 56: la diferencia es la incertidumbre real del concepto. Con lluvias intensas y suelos llenos la fracción efectiva cae mucho.',
      'With 100 mm in a month, USDA-SCS gives about 84 mm effective and FAO/AGLW 56: the difference is the real uncertainty of the concept. With intense rains and full soils the effective fraction falls a lot.'],
    care: ['Nunca sumes la lluvia bruta al balance: sobreestima el agua disponible y subestima el riego necesario.', 'Never add gross rain to the balance: it overestimates available water and underestimates the irrigation needed.'],
    ref: 'Smith 1992 (CROPWAT); Dastane 1974 (FAO 25)',
  });

  E('chill', {
    t: ['Frío invernal: horas frío, unidades Utah y porciones de frío', 'Winter chill: chill hours, Utah units and chill portions'],
    what: ['Los frutales caducifolios necesitan una dosis de frío para salir de la dormancia y florecer parejo. Se cuenta de tres maneras: <b>horas frío</b> entre 0 y 7.2 °C (Weinberger 1950); <b>unidades Utah</b>, que pesan cada hora según su temperatura y restan las horas cálidas (Richardson et al. 1974); y <b>porciones de frío</b> del modelo dinámico (Fishman et al. 1987), en el que el frío se fija en porciones que el calor posterior ya no borra.',
      'Deciduous fruit trees need a dose of cold to break dormancy and bloom evenly. It is counted in three ways: <b>chill hours</b> between 0 and 7.2 °C (Weinberger 1950); <b>Utah units</b>, which weight each hour by its temperature and subtract warm hours (Richardson et al. 1974); and the <b>chill portions</b> of the Dynamic model (Fishman et al. 1987), in which chill is fixed in portions that later warmth no longer erases.'],
    read: ['El modelo dinámico es el más robusto en climas cálidos o de invierno irregular, donde Utah da valores negativos absurdos. Las porciones de un invierno se comparan con el requerimiento del cultivar; los rangos de la escala son los de las zonas frutícolas.',
      'The Dynamic model is the most robust in warm or irregular-winter climates, where Utah gives absurd negative values. The portions of a winter are compared with the cultivar\'s requirement; the ranges of the scale are those of the fruit-growing zones.'],
    scaleTitle: ['Porciones de frío del invierno', 'Chill portions of the winter'],
    scale: [
      S(null, 20, ['muy poco frío', 'very low chill'], 'bad', ['solo cultivares de bajo requerimiento', 'only low-chill cultivars']),
      S(20, 45, ['frío medio', 'medium chill'], 'warn', ['durazno y ciruelo de requerimiento medio', 'medium-chill peach and plum']),
      S(45, 70, ['frío alto', 'high chill'], 'good', ['manzano, peral, cerezo', 'apple, pear, cherry']),
      S(70, null, ['frío muy alto', 'very high chill'], 'good', ['zonas de invierno largo', 'long-winter areas']),
    ],
    conv: true,
    care: ['Las tres unidades no se convierten unas en otras con un factor fijo; un requerimiento publicado en horas frío no se compara con porciones. Y todos los modelos necesitan temperaturas horarias: la app las estima de la máxima y la mínima con el método de Linvill (1990) cuando no las hay.',
      'The three units do not convert into one another with a fixed factor; a requirement published in chill hours cannot be compared with portions. And every model needs hourly temperatures: the app estimates them from the maximum and minimum with Linvill\'s (1990) method when they are missing.'],
    ref: 'Luedeling 2012 (revisión)',
  });

  E('photoperiod', {
    t: ['Fotoperiodo', 'Photoperiod'],
    what: ['La duración del día, que en muchos cultivos dispara la floración (soya, sorgo tropical, frijol de día corto) o la formación del bulbo (cebolla). Depende solo de la latitud y de la fecha, así que es el único factor del ambiente que se conoce con certeza por adelantado.',
      'The length of the day, which in many crops triggers flowering (soybean, tropical sorghum, short-day bean) or bulb formation (onion). It depends only on latitude and date, so it is the one environmental factor known with certainty in advance.'],
    read: ['Las plantas responden a luz muy tenue: por eso se calcula con el crepúsculo civil (sol a −6°), que da días 40–60 minutos más largos que los del amanecer al ocaso. A 20° de latitud el fotoperiodo civil va de unas 11.7 h en diciembre a 14.2 h en junio; en el ecuador casi no cambia.',
      'Plants respond to very dim light: that is why it is computed with civil twilight (sun at −6°), which gives days 40–60 minutes longer than sunrise to sunset. At 20° latitude the civil photoperiod runs from about 11.7 h in December to 14.2 h in June; at the equator it hardly changes.'],
    care: ['Un requerimiento térmico publicado para un cultivo sensible al fotoperiodo solo vale para la latitud y la época en que se midió. Al cambiar de fecha de siembra cambia la floración aunque el calor sea el mismo.',
      'A thermal requirement published for a photoperiod-sensitive crop holds only for the latitude and season in which it was measured. Changing the sowing date changes flowering even when heat is the same.'],
    ref: 'Forsythe et al. 1995',
  });

  E('climograph', {
    t: ['Climograma de Walter–Lieth', 'Walter–Lieth climograph'],
    what: ['Los doce meses en una sola figura: la temperatura media a la izquierda y la precipitación a la derecha, con la escala fija <b>10 °C = 20 mm</b>. Donde la curva de lluvia va por encima de la de temperatura el periodo es húmedo; donde va por debajo, seco. Por encima de 100 mm la escala se comprime a 1:10 y el área se pinta sólida: periodo perhúmedo.',
      'The twelve months in one figure: mean temperature on the left and rainfall on the right, at the fixed scale <b>10 °C = 20 mm</b>. Where the rain curve runs above the temperature curve the period is humid; where it runs below, dry. Above 100 mm the scale is compressed 1:10 and the area is filled solid: perhumid period.'],
    read: ['La escala 2:1 no es arbitraria: Gaussen observó que P < 2T (mm y °C) coincide con el mes en que la vegetación sufre sequía. Los meses con helada segura se marcan en negro bajo el eje y los de helada probable en rayado. En el encabezado van la altitud, la temperatura y la lluvia media anual.',
      'The 2:1 scale is not arbitrary: Gaussen observed that P < 2T (mm and °C) coincides with the month in which vegetation suffers drought. Months with certain frost are marked black below the axis and those with probable frost hatched. The header gives altitude, mean annual temperature and rainfall.'],
    care: ['Es un diagrama de normales, no de un año: con menos de diez años de datos el periodo seco puede desplazarse un mes.', 'It is a diagram of normals, not of one year: with fewer than ten years of data the dry period may shift by a month.'],
    ref: 'Walter & Lieth 1960–1967',
  });

  E('aridity', {
    t: ['Índice de aridez (P/ETP)', 'Aridity index (P/PET)'],
    what: ['El cociente entre la lluvia anual y la evapotranspiración potencial anual: cuánta de la demanda de la atmósfera alcanza a cubrir la lluvia. El PNUMA lo usa para delimitar las tierras secas del mundo.',
      'The ratio of annual rainfall to annual potential evapotranspiration: how much of the atmosphere\'s demand the rain manages to cover. UNEP uses it to delimit the world\'s drylands.'],
    scaleTitle: ['P/ETP anual', 'Annual P/PET'],
    scale: [
      S(null, 0.05, ['hiperárido', 'hyper-arid'], 'bad'),
      S(0.05, 0.20, ['árido', 'arid'], 'bad'),
      S(0.20, 0.50, ['semiárido', 'semi-arid'], 'warn'),
      S(0.50, 0.65, ['subhúmedo seco', 'dry sub-humid'], 'ok'),
      S(0.65, null, ['húmedo', 'humid'], 'good'),
    ],
    read: ['Los índices de De Martonne (P/(T+10)) y de Lang (P/T) responden a la misma pregunta con la temperatura en lugar de la ETP, y la app los reporta juntos; cuando discrepan, fíate del que usa ETP.',
      'The De Martonne (P/(T+10)) and Lang (P/T) indices answer the same question with temperature instead of PET, and the app reports them together; when they disagree, trust the one that uses PET.'],
    care: ['Un índice anual esconde la estación: un sitio «subhúmedo» con toda la lluvia en verano es árido ocho meses al año. Mira el climograma.', 'An annual index hides the season: a "sub-humid" site with all its rain in summer is arid eight months a year. Look at the climograph.'],
    ref: 'UNEP 1992; De Martonne 1926',
  });

  E('frost', {
    t: ['Helada y riesgo de helada', 'Frost and frost risk'],
    what: ['Helada meteorológica es temperatura del aire a 1.5 m igual o menor que 0 °C; la agronómica ocurre a la temperatura en que el cultivo se daña, que puede ser 2 °C sobre cero en la superficie de una hoja en noche despejada. El <b>riesgo</b> es la probabilidad de que ocurra en una fecha dada, estimada con la serie de años.',
      'A meteorological frost is an air temperature at 1.5 m of 0 °C or lower; an agronomic frost happens at the temperature at which the crop is damaged, which may be 2 °C above zero on a leaf surface on a clear night. The <b>risk</b> is the probability of it occurring on a given date, estimated from the series of years.'],
    scaleTitle: ['Temperatura mínima del aire (°C)', 'Minimum air temperature (°C)'],
    scale: [
      S(2, null, ['sin helada', 'no frost'], 'good'),
      S(0, 2, ['riesgo en superficie', 'risk at the surface'], 'ok', ['hojas por debajo de 0 en noche despejada', 'leaves below 0 on a clear night']),
      S(-2, 0, ['helada ligera', 'light frost'], 'warn'),
      S(-4, -2, ['helada moderada', 'moderate frost'], 'bad'),
      S(null, -4, ['helada severa', 'severe frost'], 'bad'),
    ],
    conv: true,
    read: ['Para planear se usan las fechas con 10, 20 o 50 % de probabilidad de helada: la «última helada de primavera al 20 %» es la fecha después de la cual solo uno de cada cinco años hiela. Sembrar antes es apostar.',
      'For planning, the dates with a 10, 20 or 50 % probability of frost are used: the "last spring frost at 20 %" is the date after which only one year in five freezes. Sowing earlier is a bet.'],
    care: ['La estación mide a 1.5 m en abrigo; un valle con inversión térmica puede tener 3–4 °C menos en la superficie del suelo. La sensibilidad cambia con la etapa: el maíz en V5 rebrota, en floración no.',
      'The station measures at 1.5 m in a screen; a valley with a temperature inversion can be 3–4 °C colder at the soil surface. Sensitivity changes with the stage: maize at V5 regrows, at flowering it does not.'],
    ref: 'Snyder & de Melo-Abreu 2005 (FAO)',
  });

  E('season', {
    t: ['Estación de crecimiento y ventana de siembra', 'Growing season and sowing window'],
    what: ['Los días del año en que el cultivo puede crecer: sin helada, con temperatura por encima de la base y, en temporal, con agua en el suelo. La <b>ventana de siembra</b> es el intervalo de fechas en que la siembra permite madurar antes de que se cierre la estación.',
      'The days of the year in which the crop can grow: no frost, temperature above the base and, under rainfed conditions, water in the soil. The <b>sowing window</b> is the range of dates on which sowing allows maturity before the season closes.'],
    read: ['La app la construye juntando tres cosas: los °C·d que el cultivo necesita, los que el sitio ofrece desde cada fecha de siembra, y el riesgo de helada o de sequía en la etapa sensible. La fecha óptima es la que maduran con margen y con el menor riesgo.',
      'The app builds it by joining three things: the °C·d the crop needs, the ones the site offers from each sowing date, and the frost or drought risk in the sensitive stage. The optimal date is the one that matures with margin and the least risk.'],
    care: ['Una ventana calculada con un año de datos es una anécdota; con diez es una estimación; con treinta es una normal climática.', 'A window computed with one year of data is an anecdote; with ten it is an estimate; with thirty it is a climatic normal.'],
    ref: 'FAO 1978 (Agro-ecological zones)',
  });

  /* ---------- Block 2 · the data ---------- */

  E('coords', {
    t: ['Latitud, altitud y lo que sale de ellas', 'Latitude, elevation and what follows from them'],
    what: ['De la <b>latitud</b> y la fecha se calcula la radiación que llega al tope de la atmósfera (Ra) y la duración del día (N), que entran en toda estimación de radiación y de ETo. De la <b>altitud</b> sale la presión atmosférica y con ella la constante psicrométrica γ de Penman–Monteith.',
      'From the <b>latitude</b> and the date come the radiation reaching the top of the atmosphere (Ra) and the day length (N), which enter every estimate of radiation and ETo. From the <b>elevation</b> comes the atmospheric pressure and with it the psychrometric constant γ of Penman–Monteith.'],
    read: ['Un error de 1° de latitud cambia Ra menos de 1 %; un error de 1 000 m de altitud cambia γ un 11 %. Escribe la latitud en grados decimales (19° 29′ 33″ = 19.4925) y con signo negativo en el hemisferio sur.',
      'A 1° error in latitude changes Ra by less than 1 %; a 1,000 m error in elevation changes γ by 11 %. Write the latitude in decimal degrees (19° 29′ 33″ = 19.4925) and with a negative sign in the southern hemisphere.'],
    care: ['La altitud es la de la estación, no la de la parcela, si la serie viene de una estación lejana; y una estación a 40 km puede tener otro clima. La app no lo puede saber: dilo en las notas.',
      'The elevation is the station\'s, not the field\'s, if the series comes from a distant station; and a station 40 km away may have another climate. The app cannot know: say it in the notes.'],
    ref: 'Allen et al. 1998, ec. 7, 21 y 34',
  });

  E('datasource', {
    t: ['Qué variables trae una estación y qué permite cada una', 'Which variables a station provides and what each allows'],
    what: ['Una estación <b>climatológica ordinaria</b> (las del Servicio Meteorológico Nacional) da Tmax, Tmin, lluvia y a veces evaporación de tanque. Una <b>agrometeorológica automática</b> añade humedad, viento y radiación. La app trabaja con lo que haya y estima lo que falte como manda FAO-56, dejando constancia.',
      'An <b>ordinary climatological</b> station (those of the national weather service) gives Tmax, Tmin, rain and sometimes pan evaporation. An <b>automatic agrometeorological</b> one adds humidity, wind and radiation. The app works with what there is and estimates what is missing as FAO-56 prescribes, leaving a record.'],
    read: ['Con Tmax y Tmin: grados-día, fenología, frío invernal, Hargreaves y un Penman–Monteith con estimaciones. Con lluvia: balance hídrico y riego. Con humedad, viento y radiación o insolación: Penman–Monteith completo, que es el estándar.',
      'With Tmax and Tmin: degree-days, phenology, winter chill, Hargreaves and a Penman–Monteith with estimates. With rain: water balance and irrigation. With humidity, wind and radiation or sunshine: full Penman–Monteith, the standard.'],
    care: ['Los archivos de texto del SMN traen encabezado de estación, fechas en día/mes/año y «Nulo» como faltante: la app los lee tal cual. Los libros de Excel hay que guardarlos como CSV o pegar las celdas.',
      'Text files of Mexico\'s national weather service carry a station header, day/month/year dates and "Nulo" as missing: the app reads them as they are. Excel workbooks have to be saved as CSV or pasted as cells.'],
  });

  E('windheight', {
    t: ['Altura del anemómetro', 'Anemometer height'],
    what: ['Penman–Monteith necesita el viento a 2 m sobre el pasto. Las estaciones sinópticas lo miden a 10 m, donde sopla más fuerte; FAO-56 lo baja con un perfil logarítmico: u₂ = u<sub>z</sub> · 4.87 / ln(67.8 z − 5.42).',
      'Penman–Monteith needs the wind at 2 m above grass. Synoptic stations measure it at 10 m, where it blows harder; FAO-56 brings it down with a logarithmic profile: u₂ = u<sub>z</sub> · 4.87 / ln(67.8 z − 5.42).'],
    read: ['De 10 m a 2 m el viento se reduce a 0.75 de su valor. Olvidar la conversión infla el término aerodinámico y la ETo en climas ventosos hasta 10 %.',
      'From 10 m to 2 m the wind falls to 0.75 of its value. Forgetting the conversion inflates the aerodynamic term and the ETo in windy climates by up to 10 %.'],
    care: ['Las unidades engañan más que la altura: km/día es lo usual en estaciones antiguas, km/h en las automáticas, m/s en la fórmula. La app convierte las tres.',
      'Units deceive more than height: km/day is usual in old stations, km/h in automatic ones, m/s in the formula. The app converts all three.'],
    ref: 'Allen et al. 1998, ec. 47',
  });

  E('qc', {
    t: ['Control de calidad de la serie', 'Quality control of the series'],
    what: ['Cuatro revisiones antes de calcular nada: valores fuera del rango físico (una Tmax de 99.9 es un código, no una temperatura), días con Tmax por debajo de Tmin (columnas intercambiadas al capturar), <b>picos</b> aislados que difieren de ambos vecinos más de 15 °C y <b>tramos planos</b> de una semana con el mismo valor (sensor pegado o relleno a mano).',
      'Four checks before computing anything: values outside the physical range (a Tmax of 99.9 is a code, not a temperature), days with Tmax below Tmin (columns swapped when typing), isolated <b>spikes</b> that differ from both neighbours by more than 15 °C and <b>flat runs</b> of a week with the same value (stuck sensor or hand filling).'],
    read: ['Lo imposible se elimina; lo invertido se intercambia; lo sospechoso se conserva marcado, porque un pico puede ser un frente frío real. La lista de incidencias es parte del informe: quien lea el estudio debe saber qué se tocó.',
      'The impossible is removed; the inverted is swapped; the suspicious is kept and flagged, because a spike may be a real cold front. The list of issues is part of the report: whoever reads the study must know what was touched.'],
    care: ['Ningún filtro automático sustituye mirar la serie completa. Si un año entero tiene la mitad de los días planos, no es un año útil aunque esté «completo».',
      'No automatic filter replaces looking at the whole record. If a whole year has half its days flat, it is not a usable year even if it is "complete".'],
    ref: 'WMO 2018 (Guide to Climatological Practices)',
  });

  E('gapfill', {
    t: ['Huecos y relleno', 'Gaps and filling'],
    what: ['Un hueco corto en una variable continua (temperatura, humedad, viento) se rellena por <b>interpolación lineal</b> entre los días vecinos, y el valor queda marcado. La <b>lluvia nunca se interpola</b>: entre dos días secos pudo caer una tormenta, y entre dos lluviosos no llover nada.',
      'A short gap in a continuous variable (temperature, humidity, wind) is filled by <b>linear interpolation</b> between the neighbouring days, and the value is flagged. <b>Rain is never interpolated</b>: between two dry days a storm may have fallen, and between two rainy ones nothing at all.'],
    scaleTitle: ['Días interpolados por hueco', 'Days interpolated per gap'],
    scale: [
      S(null, 3, ['seguro', 'safe'], 'good', ['la temperatura cambia poco de un día al siguiente', 'temperature changes little from one day to the next']),
      S(3, 6, ['aceptable con cuidado', 'acceptable with care'], 'warn', ['se pierden los frentes fríos', 'cold fronts are lost']),
      S(6, null, ['no interpolar', 'do not interpolate'], 'bad', ['mejor una estación vecina o dejar el hueco', 'better a neighbouring station or leave the gap']),
    ],
    conv: true,
    read: ['Los huecos largos se dejan vacíos y los bloques siguientes los saltan: unos días sin dato en la acumulación de grados-día se notan como un escalón; en el balance diario, como un reinicio. El informe dice cuántos días faltaron en cada cálculo.',
      'Long gaps are left empty and the following blocks skip them: a few days without data show as a step in the degree-day accumulation; in the daily balance, as a restart. The report says how many days were missing in each calculation.'],
    care: ['Rellenar la lluvia con cero es una decisión, no un dato: solo tiene sentido cuando el observador registró temperaturas ese día y dejó en blanco la lluvia porque no llovió. La casilla está apagada por omisión.',
      'Filling rain with zero is a decision, not a datum: it only makes sense when the observer recorded temperatures that day and left the rain blank because it did not rain. The box is off by default.'],
  });

  E('yearcomplete', {
    t: ['Años completos y normales climáticas', 'Complete years and climatic normals'],
    what: ['Una <b>normal</b> es el promedio de 30 años (la OMM fija 1991–2020 como periodo vigente). Un año entra en el cálculo si está lo bastante completo: la app pide al menos 90 % de los días con Tmax, Tmin y lluvia.',
      'A <b>normal</b> is the 30-year average (WMO sets 1991–2020 as the current period). A year enters the calculation if it is complete enough: the app asks for at least 90 % of the days with Tmax, Tmin and rain.'],
    scaleTitle: ['Años completos en la serie', 'Complete years in the series'],
    scale: [
      S(null, 3, ['una anécdota', 'an anecdote'], 'bad', ['solo para practicar', 'for practice only']),
      S(3, 10, ['una estimación', 'an estimate'], 'warn', ['normales y heladas con mucha incertidumbre', 'normals and frosts with much uncertainty']),
      S(10, 30, ['aceptable', 'acceptable'], 'ok', ['lo usual en estaciones agrícolas', 'the usual at agricultural stations']),
      S(30, null, ['normal climática', 'climatic normal'], 'good'),
    ],
    conv: true,
    read: ['El calendario de disponibilidad enseña dónde están los agujeros: un color claro en todos los julios de una década dice que el observador se iba de vacaciones, y esos años sesgan la lluvia de verano hacia abajo.',
      'The availability calendar shows where the holes are: a light colour in every July of a decade says the observer went on holiday, and those years bias the summer rain downwards.'],
    care: ['Menos años pero completos valen más que muchos años a medias: un promedio de lluvia anual con julios faltantes no es una normal, es un número más bajo.',
      'Fewer but complete years are worth more than many half years: an annual rain average with missing Julys is not a normal, it is a lower number.'],
    ref: 'WMO 2017 (Guidelines on the calculation of climate normals)',
  });

  E('capabilities', {
    t: ['Lo que los datos permiten', 'What the data allow'],
    what: ['Cada método necesita ciertas variables. La app revisa cuáles vinieron con más de la mitad de los días y marca en verde lo que se calculará con datos medidos, en ámbar lo que se calculará con estimaciones (y cuáles) y en rojo lo que no se podrá hacer.',
      'Each method needs certain variables. The app checks which came with more than half of the days and marks in green what will be computed from measured data, in amber what will use estimates (and which) and in red what cannot be done.'],
    read: ['Ámbar no es malo: FAO-56 recomienda usar Penman–Monteith con datos estimados antes que cambiar de método. Lo que sí hay que hacer es declararlo, y el informe lo hace.',
      'Amber is not bad: FAO-56 recommends using Penman–Monteith with estimated data rather than switching methods. What must be done is to declare it, and the report does.'],
    ref: 'Allen et al. 1998, cap. 3 («Missing climatic data»)',
  });

  /* ---------- Block 3 · the climate ---------- */

  E('rainonset', {
    t: ['Inicio y fin de la temporada de lluvias', 'Onset and end of the rainy season'],
    what: ['No hay una fecha «oficial»: hay definiciones, y la app usa una agronómica. <b>Inicio</b>: el primer día, contado desde el mes más seco, en que caen 20 mm en tres días y no sigue una racha seca de 10 días en el mes siguiente (una lluvia aislada que deja secar el suelo no cuenta). <b>Fin</b>: el primer día, pasados 60 del inicio, desde el cual los 30 días siguientes suman menos de 10 mm.',
      'There is no "official" date: there are definitions, and the app uses an agronomic one. <b>Onset</b>: the first day, counted from the driest month, on which 20 mm fall in three days with no 10-day dry spell in the following month (an isolated rain that lets the soil dry does not count). <b>End</b>: the first day, 60 after the onset, from which the next 30 days bring less than 10 mm.'],
    read: ['Lo que importa es la dispersión, no la mediana: si el inicio va del 20 de mayo al 5 de julio en el 60 % central de los años, sembrar en seco el 25 de mayo es apostar. La app da P20 y P80 por eso.',
      'What matters is the spread, not the median: if the onset runs from 20 May to 5 July in the central 60 % of years, dry-sowing on 25 May is a bet. That is why the app gives P20 and P80.'],
    scaleTitle: ['Índice de concentración de la lluvia (PCI)', 'Precipitation concentration index (PCI)'],
    scale: [
      S(null, 10, ['uniforme', 'uniform'], 'good', ['llueve todo el año', 'rain all year']),
      S(10, 15, ['moderadamente estacional', 'moderately seasonal'], 'ok'),
      S(15, 20, ['estacional', 'seasonal'], 'warn', ['la mayor parte en unos meses', 'most in a few months']),
      S(20, null, ['fuertemente estacional', 'strongly seasonal'], 'bad', ['temporada corta y concentrada', 'short, concentrated season']),
    ],
    conv: true,
    care: ['Cambia los umbrales si tu cultivo o tu suelo lo piden (un suelo arenoso necesita más de 20 mm para que la siembra prenda) y decláralo: la definición es parte del resultado.',
      'Change the thresholds if your crop or soil asks for it (a sandy soil needs more than 20 mm for sowing to take) and state it: the definition is part of the result.'],
    ref: 'Stern, Dennett & Garbutt 1981; Oliver 1980',
  });

  E('frostdates', {
    t: ['Fechas de helada según el riesgo', 'Frost dates by the risk accepted'],
    what: ['Para cada temporada la app encuentra la <b>última helada</b> antes del mes más cálido y la <b>primera</b> después. Con todas las temporadas arma dos curvas: la probabilidad de que todavía hiele después de una fecha (primavera) y de que ya haya helado antes de una fecha (otoño). La fecha de siembra sale de la primera curva y la de cosecha de la segunda, para el riesgo que se acepte.',
      'For each season the app finds the <b>last frost</b> before the warmest month and the <b>first</b> after it. With all the seasons it builds two curves: the probability that it still freezes after a date (spring) and that it has already frozen before a date (autumn). The sowing date comes from the first curve and the harvest date from the second, for the risk accepted.'],
    read: ['El 20 % es el riesgo habitual en planeación: la fecha después de la cual solo uno de cada cinco años tuvo una helada. El 10 % es para cultivos de alto valor; el 50 % es la fecha media y significa perder uno de cada dos años.',
      'The 20 % is the usual planning risk: the date after which only one year in five had a frost. The 10 % is for high-value crops; the 50 % is the mean date and means losing one year in two.'],
    care: ['Con menos de 10 temporadas las curvas son escalones gruesos. Y el umbral importa: 0 °C en el abrigo a 1.5 m suele ser −2 °C en la superficie de una hoja en noche despejada; por eso se ofrece el umbral de 2 °C.',
      'With fewer than 10 seasons the curves are coarse steps. And the threshold matters: 0 °C in the screen at 1.5 m is often −2 °C on a leaf surface on a clear night; that is why the 2 °C threshold is offered.'],
    ref: 'Snyder & de Melo-Abreu 2005',
  });

  E('koppen', {
    t: ['Clasificación climática: Köppen–Geiger y García', 'Climatic classification: Köppen–Geiger and García'],
    what: ['<b>Köppen–Geiger</b> asigna una clave de dos o tres letras con umbrales fijos de temperatura y lluvia mensuales: A tropical, B seco, C templado, D continental, E polar; la segunda letra dice cuándo llueve (f todo el año, w invierno seco, s verano seco; W desierto, S estepa) y la tercera el calor del verano. La app aplica los criterios de Peel, Finlayson & McMahon (2007). <b>García</b> (2004) adaptó Köppen a México y su clave se cita en toda la literatura nacional; la app da el cociente P/T que usa y sus subtipos de humedad.',
      '<b>Köppen–Geiger</b> assigns a two- or three-letter code with fixed thresholds of monthly temperature and rain: A tropical, B dry, C temperate, D continental, E polar; the second letter says when it rains (f all year, w dry winter, s dry summer; W desert, S steppe) and the third the warmth of the summer. The app applies the criteria of Peel, Finlayson & McMahon (2007). <b>García</b> (2004) adapted Köppen to Mexico and her key is cited throughout the national literature; the app gives the P/T quotient she uses and its humidity subtypes.'],
    read: ['La clave resume, no explica: dos sitios Cwb pueden diferir en 300 mm. Úsala para situar el sitio y compararlo con la literatura, y quédate con las normales y el climograma para decidir.',
      'The code summarises, it does not explain: two Cwb sites can differ by 300 mm. Use it to place the site and compare it with the literature, and keep the normals and the climograph to decide.'],
    care: ['El subtipo térmico de García (a, b, c, semicálido (A)C, etc.) y la separación fina de los climas secos requieren su clave completa, que la app no reproduce; el subtipo de humedad w0/w1/w2 sí, porque depende solo de P/T.',
      'García\'s thermal subtype (a, b, c, semi-warm (A)C, etc.) and the fine split of the dry climates require her full key, which the app does not reproduce; the humidity subtype w0/w1/w2 it does, because it depends on P/T alone.'],
    ref: 'Peel et al. 2007; Kottek et al. 2006; García 2004',
  });

  E('moisture', {
    t: ['Índice de humedad de Thornthwaite y balance climático', 'Thornthwaite moisture index and climatic balance'],
    what: ['Con las normales de temperatura Thornthwaite estima la ETP de cada mes y la compara con la lluvia en una cubeta de suelo (100 mm por omisión): los meses en que P > ETP recargan y luego desaguan (<b>excedente</b>), los meses en que P < ETP gastan el suelo y después dejan sin cubrir parte de la demanda (<b>déficit</b>). El índice de humedad resume el año: Im = 100 (P − ETP)/ETP.',
      'From the temperature normals Thornthwaite estimates each month\'s PET and compares it with the rain in a soil bucket (100 mm by default): months with P > PET recharge and then drain (<b>surplus</b>), months with P < PET spend the soil and then leave part of the demand unmet (<b>deficit</b>). The moisture index summarises the year: Im = 100 (P − PET)/PET.'],
    scaleTitle: ['Índice de humedad Im (1955)', 'Moisture index Im (1955)'],
    scale: [
      S(null, -66.7, ['árido (E)', 'arid (E)'], 'bad'),
      S(-66.7, -33.3, ['semiárido (D)', 'semi-arid (D)'], 'warn'),
      S(-33.3, 0, ['subhúmedo seco (C1)', 'dry sub-humid (C1)'], 'ok'),
      S(0, 20, ['subhúmedo húmedo (C2)', 'moist sub-humid (C2)'], 'ok'),
      S(20, 100, ['húmedo (B1–B4)', 'humid (B1–B4)'], 'good'),
      S(100, null, ['perhúmedo (A)', 'perhumid (A)'], 'good'),
    ],
    read: ['El déficit anual es la lámina que un riego tendría que reponer en un cultivo de ciclo largo; el excedente es lo que escurre o percola. La ETP de Thornthwaite subestima en climas áridos: para calcular riegos usa la ETo de Penman–Monteith del Bloque 5.',
      'The annual deficit is the depth an irrigation would have to replace in a long-cycle crop; the surplus is what runs off or percolates. Thornthwaite\'s PET underestimates in arid climates: to compute irrigation use the Penman–Monteith ETo of Block 5.'],
    ref: 'Thornthwaite 1948; Thornthwaite & Mather 1955',
  });

  /* ---------- Block 4 · thermal time on the series ---------- */

  E('gddvar', {
    t: ['Variabilidad del tiempo térmico entre años', 'Between-year variability of thermal time'],
    what: ['La misma fecha de siembra no da el mismo calor cada año. La app corre la acumulación en todos los años del registro y reporta la mediana y los percentiles 20 y 80: uno de cada cinco años tarda más que el P80 en llegar a la meta, y uno de cada cinco menos que el P20.',
      'The same sowing date does not give the same heat every year. The app runs the accumulation over every year of the record and reports the median and the 20th and 80th percentiles: one year in five takes longer than the P80 to reach the target, and one in five less than the P20.'],
    scaleTitle: ['Coeficiente de variación de los °C·d de la temporada', 'Coefficient of variation of the season\'s °C·d'],
    scale: [
      S(null, 0.05, ['muy estable', 'very stable'], 'good', ['trópico de altura, costa', 'tropical highlands, coast']),
      S(0.05, 0.10, ['estable', 'stable'], 'ok'),
      S(0.10, 0.20, ['variable', 'variable'], 'warn', ['planea con el P20, no con la media', 'plan with the P20, not the mean']),
      S(0.20, null, ['muy variable', 'very variable'], 'bad', ['clima continental o serie corta', 'continental climate or short record']),
    ],
    conv: true,
    read: ['Para planear se usa el P20 de los °C·d disponibles (o el P80 de los días a madurez), no la media: garantiza el ciclo en cuatro de cada cinco años. La media promete lo que la mitad de los años no cumple.',
      'For planning, use the P20 of the available °C·d (or the P80 of the days to maturity), not the mean: it secures the cycle in four years out of five. The mean promises what half of the years do not deliver.'],
    care: ['Un año con muchos días sin dato acumula de menos y parece frío. La tabla por año dice cuántos días faltaron; descarta los que pasen del 10 %.',
      'A year with many missing days accumulates less and looks cold. The table by year says how many days were missing; discard those above 10 %.'],
  });

  E('sowingmap', {
    t: ['El mapa por fecha de siembra', 'The sowing-date map'],
    what: ['El cultivo se siembra, en la computadora, cada cinco días del año y en todos los años del registro. Para cada fecha se obtienen los °C·d que junta en la temporada, los días que tarda en alcanzar su requerimiento y la fracción de años en que lo logra. Es el insumo térmico de la ventana de siembra.',
      'The crop is sown, in the computer, every five days of the year and in every year of the record. For each date one gets the °C·d it gathers in the season, the days it takes to reach its requirement and the share of years in which it does. It is the thermal input of the sowing window.'],
    read: ['La curva de °C·d disponibles tiene forma de campana en climas templados: sembrar antes del pico da más calor por delante pero arriesga helada; después, el ciclo se alarga hasta no cerrar. La marca verde bajo el eje señala las fechas en que el P20 ya supera el requerimiento: seguras en cuatro de cada cinco años. La «mejor» fecha es la que madura más rápido con al menos 80 % de éxito; no es la única buena.',
      'The curve of available °C·d is bell-shaped in temperate climates: sowing before the peak gives more heat ahead but risks frost; after it, the cycle lengthens until it does not close. The green mark under the axis flags the dates on which the P20 already exceeds the requirement: safe in four years out of five. The "best" date is the one that matures fastest with at least 80 % success; it is not the only good one.'],
    care: ['Este mapa solo mira el calor. El agua (temporal) y la helada en la etapa sensible entran en el Bloque 9; una fecha térmicamente óptima puede ser la peor por sequía en floración.',
      'This map looks only at heat. Water (rain-fed) and frost at the sensitive stage enter in Block 9; a thermally optimal date may be the worst for drought at flowering.'],
    ref: 'FAO 1978 (Agro-ecological zones); McMaster & Wilhelm 1997',
  });

  E('chu', {
    t: ['Unidades calor de Ontario (CHU)', 'Ontario crop heat units (CHU)'],
    what: ['Una alternativa a los grados-día para maíz y soya, de Brown (1975): el día y la noche cuentan por separado. La noche aporta 1.8 (Tmin − 4.4); el día, 3.33 (Tmax − 10) − 0.084 (Tmax − 10)², que crece hasta 30 °C y decrece después. El promedio de ambas es la unidad del día.',
      'An alternative to degree-days for maize and soybean, by Brown (1975): day and night count separately. The night contributes 1.8 (Tmin − 4.4); the day, 3.33 (Tmax − 10) − 0.084 (Tmax − 10)², which rises up to 30 °C and falls beyond. The average of both is the day\'s unit.'],
    read: ['Los híbridos de maíz de Canadá y del norte de Estados Unidos se clasifican en CHU (2 300 a 3 500). No se convierten a °C·d con un factor fijo: si tu requerimiento está en CHU, acumula en CHU.',
      'Maize hybrids of Canada and the northern United States are rated in CHU (2,300 to 3,500). They do not convert to °C·d with a fixed factor: if your requirement is in CHU, accumulate in CHU.'],
    ref: 'Brown 1975; Brown & Bootsma 1993',
  });

  /* ---------- Block 5 · evapotranspiration on the series ---------- */

  E('etoestimates', {
    t: ['Lo que se estima cuando la estación no lo mide', 'What is estimated when the station does not measure it'],
    what: ['FAO-56 no abandona Penman–Monteith por falta de datos: prescribe cómo sustituir cada variable. <b>Humedad</b>: el punto de rocío se toma igual a la mínima (ec. 48), menos 2–3 °C en climas áridos donde el aire nocturno no llega a saturarse. <b>Radiación</b>: de las horas de sol con Ångström–Prescott (ec. 35) o, sin ellas, de la amplitud térmica con kRs (ec. 50). <b>Viento</b>: 2 m/s, el promedio mundial de 2 000 estaciones, o el valor regional.',
      'FAO-56 does not abandon Penman–Monteith for lack of data: it prescribes how to substitute each variable. <b>Humidity</b>: the dew point is taken equal to the minimum (eq. 48), minus 2–3 °C in arid climates where the night air does not reach saturation. <b>Radiation</b>: from sunshine hours with Ångström–Prescott (eq. 35) or, without them, from the temperature range with kRs (eq. 50). <b>Wind</b>: 2 m/s, the world average of 2,000 stations, or the regional value.'],
    read: ['El mosaico «datos estimados» dice qué fracción de los días usó cada sustitución; el informe lo repite. Con humedad y radiación estimadas, la ETo tiene una incertidumbre del orden de 10–15 % que no se ve en las cifras.',
      'The "estimated data" tile says what share of the days used each substitution; the report repeats it. With estimated humidity and radiation, the ETo carries an uncertainty of the order of 10–15 % that the figures do not show.'],
    care: ['El viento es la variable que más pesa cuando el aire es seco: en un sitio ventoso, 2 m/s subestima la ETo del término aerodinámico. Si conoces el viento medio regional, escríbelo.',
      'Wind is the variable that weighs most when the air is dry: at a windy site, 2 m/s underestimates the ETo of the aerodynamic term. If you know the regional mean wind, type it.'],
    ref: 'Allen et al. 1998, cap. 3, «Missing climatic data»',
  });

  E('etoterms', {
    t: ['Los dos términos de Penman–Monteith', 'The two terms of Penman–Monteith'],
    what: ['La ETo es la suma de un <b>término de radiación</b> —la energía neta disponible, que domina en climas húmedos y en calma— y un <b>término aerodinámico</b> —el aire seco y el viento que se llevan el vapor—, que domina en climas áridos y ventosos. La figura los apila por mes.',
      'ETo is the sum of a <b>radiation term</b> —the net energy available, which dominates in humid, calm climates— and an <b>aerodynamic term</b> —the dry air and the wind that carry the vapour away—, which dominates in arid, windy climates. The figure stacks them by month.'],
    scaleTitle: ['Parte aerodinámica de la ETo', 'Aerodynamic share of ETo'],
    scale: [
      S(null, 0.25, ['la radiación manda', 'radiation rules'], 'ok', ['húmedo y en calma', 'humid and calm']),
      S(0.25, 0.45, ['equilibrado', 'balanced'], 'good'),
      S(0.45, 0.6, ['advectivo', 'advective'], 'warn', ['aire seco, viento', 'dry air, wind']),
      S(0.6, null, ['fuertemente advectivo', 'strongly advective'], 'bad', ['Priestley–Taylor y Turc subestiman aquí', 'Priestley–Taylor and Turc underestimate here']),
    ],
    conv: true,
    read: ['Cuando el término aerodinámico pasa de la mitad, los métodos que solo miran la radiación (Priestley–Taylor, Turc) se quedan cortos y Hargreaves suele quedarse corto también: es el caso de calibrar.',
      'When the aerodynamic term exceeds half, the methods that look only at radiation (Priestley–Taylor, Turc) fall short and Hargreaves usually falls short too: it is the case for calibrating.'],
    ref: 'Allen et al. 1998, ec. 6',
  });

  E('etocalib', {
    t: ['Calibración local de un método simple', 'Local calibration of a simple method'],
    what: ['Cuando en el sitio hay datos para Penman–Monteith, se puede medir cómo se desvía Hargreaves (o Priestley–Taylor, o Turc) y guardar la corrección para usarla donde solo hay temperatura. Dos formas: el <b>factor k</b> = media de PM / media del método, que corrige el promedio; y la <b>regresión</b> PM = a + b · método, que corrige también la pendiente.',
      'When the site has data for Penman–Monteith, one can measure how Hargreaves (or Priestley–Taylor, or Turc) deviates and keep the correction to use where only temperature exists. Two ways: the <b>factor k</b> = mean PM / mean method, which corrects the mean; and the <b>regression</b> PM = a + b · method, which also corrects the slope.'],
    scaleTitle: ['RMSE diario respecto a Penman–Monteith (mm/día)', 'Daily RMSE against Penman–Monteith (mm/day)'],
    scale: [
      S(null, 0.5, ['muy bueno', 'very good'], 'good'),
      S(0.5, 1.0, ['aceptable', 'acceptable'], 'ok', ['útil a escala semanal', 'useful at the weekly scale']),
      S(1.0, 1.5, ['pobre', 'poor'], 'warn', ['solo para totales mensuales', 'monthly totals only']),
      S(1.5, null, ['malo', 'bad'], 'bad'),
    ],
    conv: true,
    read: ['Mira el factor por mes: si k cambia de 0.8 en invierno a 1.2 en verano, un solo factor anual no basta y conviene la regresión o factores mensuales. El R² dice si el método sigue las variaciones día a día; el sesgo, si las sigue desde arriba o desde abajo.',
      'Look at the factor by month: if k changes from 0.8 in winter to 1.2 in summer, one annual factor is not enough and the regression or monthly factors are better. The R² says whether the method follows the day-to-day variations; the bias, whether from above or below.'],
    care: ['Si Penman–Monteith lleva variables estimadas, la calibración compara dos estimaciones: sirve para ver la estacionalidad del sesgo, no como valor definitivo. La calibración vale para el sitio y climas parecidos, no para el país.',
      'If Penman–Monteith carries estimated variables, the calibration compares two estimates: it shows the seasonality of the bias, it is not a final value. The calibration holds for the site and similar climates, not for the country.'],
    ref: 'Hargreaves & Allen 2003; Allen et al. 1998, anexo 6',
  });

  /* ---------- Block 6 · the water balance of the crop ---------- */

  E('kyield', {
    t: ['Rendimiento relativo y factor Ky (FAO-33)', 'Relative yield and the Ky factor (FAO-33)'],
    what: ['Doorenbos y Kassam (1979) resumieron cientos de ensayos en una recta: la pérdida relativa de rendimiento es proporcional a la pérdida relativa de transpiración, <b>1 − Ya/Ym = Ky (1 − ETa/ETm)</b>. Ky es la sensibilidad del cultivo al agua: mayor que 1 en los sensibles (maíz 1.25, frijol 1.15), menor que 1 en los tolerantes (sorgo 0.9, algodón 0.85).',
      'Doorenbos and Kassam (1979) summarised hundreds of trials in one line: the relative yield loss is proportional to the relative transpiration loss, <b>1 − Ya/Ym = Ky (1 − ETa/ETm)</b>. Ky is the crop\'s sensitivity to water: above 1 in the sensitive ones (maize 1.25, bean 1.15), below 1 in the tolerant (sorghum 0.9, cotton 0.85).'],
    scaleTitle: ['Rendimiento relativo Ya/Ym', 'Relative yield Ya/Ym'],
    scale: [
      S(0.9, null, ['sin pérdida apreciable', 'no appreciable loss'], 'good'),
      S(0.75, 0.9, ['pérdida moderada', 'moderate loss'], 'ok'),
      S(0.5, 0.75, ['pérdida severa', 'severe loss'], 'warn'),
      S(null, 0.5, ['cosecha comprometida', 'harvest compromised'], 'bad'),
    ],
    read: ['La app usa el Ky estacional, que aplica a la temporada completa. La versión por etapas (Ky mayor en floración) es más fina, y por eso el cuadro por etapa muestra dónde cayó el estrés: un mismo déficit total pesa más si cayó en la etapa media.',
      'The app uses the seasonal Ky, which applies to the whole season. The stage version (higher Ky at flowering) is finer, and that is why the stage table shows where the stress fell: the same total deficit weighs more if it fell in the mid-season.'],
    care: ['Es una relación lineal ajustada a déficits moderados (hasta ~50 %); más allá, el rendimiento cae más rápido que la recta. Y describe agua, no plagas ni fertilidad: un rendimiento relativo del 95 % no promete 95 % del rendimiento del catálogo, sino del que ese manejo permitiría con agua suficiente.',
      'It is a linear relation fitted to moderate deficits (up to ~50 %); beyond that, yield falls faster than the line. And it describes water, not pests or fertility: a relative yield of 95 % does not promise 95 % of the catalogue yield, but of what that management would allow with sufficient water.'],
    ref: 'Doorenbos & Kassam 1979 (FAO 33), tabla 24',
  });

  E('runoff', {
    t: ['Escurrimiento y número de curva', 'Runoff and the curve number'],
    what: ['No toda la lluvia entra al suelo: parte escurre. El método del número de curva (NRCS) lo estima de cada lluvia diaria con un solo parámetro, CN, que resume el suelo, la cobertura y el manejo: Q = (P − 0.2 S)² / (P + 0.8 S), con S = 25 400 / CN − 254.',
      'Not all the rain enters the soil: part runs off. The curve-number method (NRCS) estimates it from each daily rain with a single parameter, CN, which summarises the soil, the cover and the management: Q = (P − 0.2 S)² / (P + 0.8 S), with S = 25,400 / CN − 254.'],
    scaleTitle: ['Número de curva CN', 'Curve number CN'],
    scale: [
      S(null, 60, ['poco escurrimiento', 'little runoff'], 'good', ['arenas, buena cobertura', 'sands, good cover']),
      S(60, 75, ['moderado', 'moderate'], 'ok', ['francos cultivados', 'cultivated loams']),
      S(75, 85, ['alto', 'high'], 'warn', ['arcillas, surcos a favor de la pendiente', 'clays, rows down the slope']),
      S(85, null, ['muy alto', 'very high'], 'bad', ['suelo compactado o desnudo', 'compacted or bare soil']),
    ],
    conv: true,
    read: ['Con CN 78 una lluvia de 30 mm pierde unos 3 mm; una de 80 mm pierde 28. Las lluvias chicas entran casi enteras: por eso la fracción efectiva de un mes depende de cómo cayó la lluvia, no solo de cuánta.',
      'With CN 78 a 30 mm rain loses about 3 mm; an 80 mm one loses 28. Small rains enter almost whole: that is why the effective share of a month depends on how the rain fell, not only on how much.'],
    care: ['El CN de las tablas es para la condición de humedad media; con el suelo mojado escurre más. Si el terreno está nivelado y con surcos en contorno, baja el CN 5–10 puntos.',
      'The table CN is for the average moisture condition; with the soil wet more runs off. If the field is levelled and furrowed on the contour, lower the CN by 5–10 points.'],
    ref: 'USDA-NRCS 2004, NEH cap. 10',
  });

  /* ---------- Block 7 · irrigation scheduling ---------- */

  E('irrstrategy', {
    t: ['Reglas de riego', 'Irrigation rules'],
    what: ['<b>Al agotar el AFA</b>: la regla de FAO-56, regar cuando el agotamiento llega al agua fácilmente aprovechable y reponer justo lo que falta; es la que maximiza el rendimiento con el mínimo de agua. <b>Déficit controlado</b>: esperar más (130 % del AFA, por ejemplo) aceptando algo de estrés a cambio de ahorrar agua. <b>Intervalo fijo</b>: regar cada tantos días, como obliga un turno de riego. <b>Lámina fija</b>: aplicar siempre la misma cantidad cuando el suelo la ha gastado, como en un sistema de goteo programado.',
      '<b>At RAW depletion</b>: the FAO-56 rule, irrigate when depletion reaches the readily available water and replace just what is missing; it maximises yield with the least water. <b>Controlled deficit</b>: wait longer (130 % of RAW, say) accepting some stress in exchange for saving water. <b>Fixed interval</b>: irrigate every so many days, as a rotation forces. <b>Fixed depth</b>: always apply the same amount when the soil has spent it, as in a programmed drip system.'],
    read: ['Compara las cuatro por agua bruta contra rendimiento: la mejor regla es la que da el rendimiento que buscas con la menor agua y la menor percolación. El intervalo fijo casi siempre riega de más al inicio y de menos en la media estación.',
      'Compare the four by gross water against yield: the best rule is the one that gives the yield you seek with the least water and the least percolation. The fixed interval almost always irrigates too much at the start and too little at mid-season.'],
    care: ['Las fechas del calendario son las del año elegido; en la práctica se sigue la regla con el balance al día (lluvia y ETo reales), no las fechas. Y el corte antes de la cosecha existe por algo: un grano seca mejor y una fruta concentra azúcares si el riego termina a tiempo.',
      'The calendar dates are those of the chosen year; in practice the rule is followed with the balance kept current (real rain and ETo), not the dates. And the cut-off before harvest exists for a reason: a grain dries better and a fruit concentrates sugars if irrigation ends in time.'],
    ref: 'Allen et al. 1998, cap. 8; Doorenbos & Kassam 1979',
  });

  E('efficiency', {
    t: ['Eficiencia de aplicación', 'Application efficiency'],
    what: ['La fracción del agua que sale del sistema y queda en la zona de raíces. Lo demás se pierde en escurrimiento al pie del surco, percolación por riego desigual, evaporación en el aire y viento. La <b>lámina bruta</b> es la neta dividida entre la eficiencia: con 60 % hay que aplicar 50 mm para que entren 30.',
      'The share of the water leaving the system that stays in the root zone. The rest is lost as runoff at the foot of the furrow, percolation from uneven irrigation, evaporation in the air and wind. The <b>gross depth</b> is the net depth divided by the efficiency: at 60 %, 50 mm must be applied for 30 to enter.'],
    scaleTitle: ['Eficiencia de aplicación', 'Application efficiency'],
    scale: [
      S(null, 0.6, ['gravedad mal nivelada', 'poorly levelled surface'], 'bad'),
      S(0.6, 0.75, ['gravedad bien manejada, aspersión con viento', 'well-managed surface, sprinkler in wind'], 'warn'),
      S(0.75, 0.88, ['aspersión, pivote, microaspersión', 'sprinkler, pivot, micro-sprinkler'], 'ok'),
      S(0.88, null, ['goteo bien mantenido', 'well-maintained drip'], 'good'),
    ],
    conv: true,
    read: ['Los valores del catálogo son típicos de sistemas bien manejados; un surco largo en suelo arenoso puede quedar en 40 % y un goteo con emisores tapados en 70 %. Si mediste la tuya, escríbela.',
      'The catalogue values are typical of well-managed systems; a long furrow on sandy soil may be at 40 % and a drip with clogged emitters at 70 %. If you measured yours, type it.'],
    ref: 'Brouwer et al. 1989 (FAO Irrigation Water Management 4)',
  });

  E('irrdesign', {
    t: ['Capacidad y lámina de diseño', 'Design capacity and depth'],
    what: ['Un sistema se dimensiona para el día exigente, no para el promedio: la ETc máxima de la media estación (el P90 de los días entre años) dividida entre la eficiencia es la lámina bruta que el sistema debe poder aplicar cada día en el pico, en mm/día o m³/ha/día. La lámina de la temporada se planea con el año seco (P80), no con el mediano.',
      'A system is sized for the demanding day, not the average: the peak ETc of the mid-season (the P90 of the days across years) divided by the efficiency is the gross depth the system must be able to apply every day at the peak, in mm/day or m³/ha/day. The seasonal depth is planned with the dry year (P80), not the median.'],
    read: ['1 mm sobre 1 ha son 10 m³. Un sistema que aplica 8 mm/día cubre una ETc de 6 mm/día con 75 % de eficiencia; en un pico de 7 mm/día se queda corto y el suelo se agota aunque riegue todos los días. Las horas de cada riego salen de la lámina bruta entre la capacidad.',
      '1 mm over 1 ha is 10 m³. A system applying 8 mm/day covers an ETc of 6 mm/day at 75 % efficiency; at a 7 mm/day peak it falls short and the soil depletes even irrigating every day. The hours of each irrigation come from the gross depth divided by the capacity.'],
    care: ['La capacidad en mm/día depende de cuántas horas al día pueda funcionar el sistema y de cuántos sectores tenga; un goteo de 2 mm/h funcionando 8 h da 16 mm/día en el sector regado, pero si son cuatro sectores en turno, 4 mm/día en promedio sobre el campo.',
      'Capacity in mm/day depends on how many hours a day the system can run and how many sectors it has; a 2 mm/h drip running 8 h gives 16 mm/day on the sector irrigated, but with four sectors in rotation, 4 mm/day on average over the field.'],
  });

  /* ---------- Block 8 · phenology ---------- */

  E('bbch', {
    t: ['La escala BBCH', 'The BBCH scale'],
    what: ['Un código decimal de dos dígitos, común a todos los cultivos: el primero es la etapa principal (0 germinación, 1 hojas, 2 macollos o brotes, 3 elongación, 4 órganos de cosecha vegetativos, 5 inflorescencia, 6 floración, 7 fruto, 8 maduración, 9 senescencia) y el segundo el avance dentro de ella (65 = plena floración, 89 = madurez de cosecha). Es el idioma en que se registran las observaciones y se publican los requerimientos.',
      'A two-digit decimal code, common to every crop: the first digit is the principal stage (0 germination, 1 leaves, 2 tillers or shoots, 3 elongation, 4 vegetative harvest organs, 5 inflorescence, 6 flowering, 7 fruit, 8 ripening, 9 senescence) and the second the progress within it (65 = full flowering, 89 = harvest ripeness). It is the language in which observations are recorded and requirements published.'],
    read: ['Los cereales usan además la escala de Zadoks (Z65 = BBCH 65) y el maíz la de Ritchie (V6, R1…); el catálogo escribe las dos. Cuando anotes en campo, registra la fecha en que el 50 % de las plantas alcanzó la etapa.',
      'Cereals also use the Zadoks scale (Z65 = BBCH 65) and maize Ritchie\'s (V6, R1…); the catalogue writes both. When recording in the field, note the date on which 50 % of the plants reached the stage.'],
    ref: 'Meier 2018 (BBCH Monograph); Zadoks et al. 1974',
  });

  E('calibration', {
    t: ['Calibrar los requerimientos térmicos', 'Calibrating the thermal requirements'],
    what: ['Con las fechas de siembra y de cada etapa de dos o más años, la app suma los °C·d de cada año hasta cada fecha: la media es el requerimiento del cultivar en el sitio y el <b>coeficiente de variación</b> dice qué tan bien lo explica el tiempo térmico. Si el CV en °C·d es menor que el CV en días, el calor predice mejor que el calendario, que es lo que se espera.',
      'With the sowing and stage dates of two or more years, the app sums each year\'s °C·d to each date: the mean is the cultivar\'s requirement at the site and the <b>coefficient of variation</b> says how well thermal time explains it. If the CV in °C·d is lower than the CV in days, heat predicts better than the calendar, which is what is expected.'],
    scaleTitle: ['CV del tiempo térmico a una etapa entre años', 'CV of thermal time to a stage between years'],
    scale: [
      S(null, 0.05, ['excelente', 'excellent'], 'good'),
      S(0.05, 0.10, ['bueno', 'good'], 'ok'),
      S(0.10, 0.20, ['utilizable', 'usable'], 'warn', ['revisa la base o el fotoperiodo', 'check the base or the photoperiod']),
      S(0.20, null, ['pobre', 'poor'], 'bad', ['otra cosa manda: agua, fotoperiodo, cultivar', 'something else rules: water, photoperiod, cultivar']),
    ],
    conv: true,
    read: ['Con tres o más años de una misma etapa, la <b>base de Arnold</b> es la temperatura base que minimiza ese CV: la curva de CV contra base tiene un mínimo, y ese es el valor a usar. Un mínimo plano (el CV casi no cambia) dice que los datos no distinguen la base; quédate con la publicada.',
      'With three or more years of the same stage, <b>Arnold\'s base</b> is the base temperature that minimises that CV: the curve of CV against base has a minimum, and that is the value to use. A flat minimum (the CV hardly changes) says the data do not resolve the base; keep the published one.'],
    care: ['Dos años dan una media, no una calibración. Y las fechas tienen que ser del mismo cultivar y con la misma definición de etapa (50 % de las plantas); mezclar cultivares infla el CV y culpa al modelo.',
      'Two years give a mean, not a calibration. And the dates must be of the same cultivar and with the same stage definition (50 % of the plants); mixing cultivars inflates the CV and blames the model.'],
    ref: 'Arnold 1959; McMaster & Wilhelm 1997',
  });

  E('chillwindow', {
    t: ['La ventana del invierno', 'The winter window'],
    what: ['El frío se acumula desde que el árbol entra en reposo hasta que lo rompe. Por convención se cuenta de noviembre a febrero en el hemisferio norte (mayo a agosto en el sur); en climas templados fríos empieza en octubre y en subtropicales en diciembre. La ventana cambia el total: por eso se declara.',
      'Chill accumulates from the time the tree enters rest until it breaks it. By convention it is counted from November to February in the northern hemisphere (May to August in the south); in cool temperate climates it starts in October and in subtropical ones in December. The window changes the total: that is why it is stated.'],
    read: ['La fecha en que se completa el requerimiento importa tanto como el total: si se cubre en enero, la floración depende del calor de febrero; si apenas se cubre en febrero, la brotación será tardía y desigual.',
      'The date on which the requirement is met matters as much as the total: if it is met in January, bloom depends on February\'s heat; if barely met in February, budbreak will be late and uneven.'],
    care: ['Con máximas y mínimas diarias, las horas se reconstruyen (Linvill 1990); el error típico es de ±5 % en porciones. Si tienes temperaturas horarias reales, úsalas en el Bloque 2 como una serie horaria promediada… o espera la versión que las lea directamente.',
      'With daily maxima and minima the hours are rebuilt (Linvill 1990); the typical error is ±5 % in portions. If you have real hourly temperatures, use them in Block 2 as an averaged hourly series… or wait for the version that reads them directly.'],
    ref: 'Luedeling 2012; Linvill 1990',
  });

  E('gdh', {
    t: ['Grados-hora de crecimiento (GDH) y la fecha de floración', 'Growing degree hours (GDH) and the date of bloom'],
    what: ['Cumplido el frío, la yema necesita calor para florecer, y ese calor se cuenta en grados-hora con la función de Anderson, Richardson y Kesner (1986): cero por debajo de 4.5 °C, máximo a 25 °C y cero otra vez a 36 °C. La suma desde la fecha en que se completó el frío hasta el requerimiento de GDH del cultivar da la fecha de floración.',
      'Once the chill is met, the bud needs heat to bloom, and that heat is counted in degree hours with the function of Anderson, Richardson and Kesner (1986): zero below 4.5 °C, maximum at 25 °C and zero again at 36 °C. The sum from the date the chill was met to the cultivar\'s GDH requirement gives the date of bloom.'],
    read: ['Los requerimientos publicados van de unos 4 000 GDH (durazno temprano) a 9 000 (manzano tardío); son del cultivar y se calibran igual que los °C·d. Sin un valor de tu cultivar, deja el campo vacío.',
      'Published requirements run from about 4,000 GDH (early peach) to 9,000 (late apple); they belong to the cultivar and are calibrated like the °C·d. Without a value for your cultivar, leave the field empty.'],
    ref: 'Anderson, Richardson & Kesner 1986',
  });

  /* ---------- Block 9 · risks and scenarios ---------- */

  E('heatstress', {
    t: ['Golpe de calor en la etapa sensible', 'Heat shock at the sensitive stage'],
    what: ['Unas horas por encima de un umbral en floración bastan para perder cosecha: el polen del maíz muere y la seda se seca por encima de 35 °C; el trigo aborta flores por encima de 30–32 °C en antesis; el jitomate y el chile no amarran fruto con máximas de 32–33 °C; el frijol pierde flores sobre 32 °C. La app cuenta los días con Tmax por encima del umbral dentro de la etapa sensible.',
      'A few hours above a threshold at flowering are enough to lose harvest: maize pollen dies and silks dry above 35 °C; wheat aborts florets above 30–32 °C at anthesis; tomato and pepper fail to set fruit with maxima of 32–33 °C; bean drops flowers above 32 °C. The app counts the days with Tmax above the threshold inside the sensitive stage.'],
    scaleTitle: ['Años con al menos un día de calor en la etapa sensible', 'Years with at least one heat day at the sensitive stage'],
    scale: [
      S(null, 0.1, ['riesgo bajo', 'low risk'], 'good'),
      S(0.1, 0.25, ['riesgo moderado', 'moderate risk'], 'ok', ['uno de cada cuatro a diez años', 'one year in four to ten']),
      S(0.25, 0.5, ['riesgo alto', 'high risk'], 'warn', ['cambia la fecha o el cultivar', 'change the date or the cultivar']),
      S(0.5, null, ['riesgo muy alto', 'very high risk'], 'bad'),
    ],
    conv: true,
    read: ['Los umbrales del catálogo son convenciones de trabajo, editables; el daño real depende de la duración y de la humedad del aire (el estrés es peor con aire seco). Un día aislado no siempre daña; una racha de tres, casi siempre.',
      'The catalogue thresholds are working conventions, editable; the real damage depends on the duration and the humidity of the air (stress is worse in dry air). One isolated day does not always hurt; a three-day run almost always does.'],
    ref: 'Hatfield & Prueger 2015; Porter & Gawith 1999',
  });

  E('sowingwindow', {
    t: ['La probabilidad de éxito de una fecha de siembra', 'The probability of success of a sowing date'],
    what: ['Para cada fecha, la fracción de los años del registro en que <b>todo salió bien a la vez</b>: el cultivo maduró, la etapa sensible no vio helada, no vio golpe de calor y el agua de temporal alcanzó para el rendimiento mínimo exigido. No es el producto de las probabilidades (los riesgos no son independientes: un año frío es tardío y húmedo), sino la cuenta año por año.',
      'For each date, the share of the years of the record in which <b>everything went right at once</b>: the crop matured, the sensitive stage saw no frost, no heat shock, and rain-fed water sufficed for the minimum yield required. It is not the product of probabilities (the risks are not independent: a cold year is late and wet), but the count year by year.'],
    scaleTitle: ['Éxito (fracción de los años)', 'Success (share of the years)'],
    scale: [
      S(0.8, null, ['ventana recomendable', 'recommended window'], 'good', ['falla uno de cada cinco años o menos', 'fails one year in five or less']),
      S(0.6, 0.8, ['aceptable con riesgo', 'acceptable with risk'], 'warn', ['conviene seguro o riego', 'insurance or irrigation advisable']),
      S(null, 0.6, ['evitar', 'avoid'], 'bad'),
    ],
    conv: true,
    read: ['La figura enseña qué criterio tumba el éxito en cada fecha: si es el agua, el riego lo arregla; si es la helada al final, hace falta sembrar antes o un cultivar más precoz; si es el calor en floración, mover la siembra para que florezca fuera del pico.',
      'The figure shows which criterion pulls the success down at each date: if it is water, irrigation fixes it; if it is frost at the end, sow earlier or use an earlier cultivar; if it is heat at flowering, move the sowing so that it flowers off the peak.'],
    care: ['Con menos de diez años el porcentaje es grueso (con cinco años solo hay 0, 20, 40…); y el registro pasado no contiene el clima futuro: mira los escenarios.',
      'With fewer than ten years the percentage is coarse (with five years there is only 0, 20, 40…); and the past record does not contain the future climate: look at the scenarios.'],
  });

  E('scenarios', {
    t: ['Escenarios de calentamiento', 'Warming scenarios'],
    what: ['La app repite todos los cálculos con las temperaturas de la serie desplazadas +1, +2 o +3 °C (y la lluvia escalada, si se pide): los días a madurez se acortan porque el reloj térmico corre más rápido, la ETo sube porque el aire más cálido y con la misma humedad relativa está más seco, el frío invernal baja y el riesgo de calor en floración sube mientras el de helada baja.',
      'The app repeats every computation with the series\' temperatures shifted by +1, +2 or +3 °C (and the rain scaled, if asked): days to maturity shorten because the thermal clock runs faster, ETo rises because warmer air at the same relative humidity is drier, winter chill falls and the heat risk at flowering rises while the frost risk falls.'],
    read: ['Es un análisis de sensibilidad («delta»), no un pronóstico: mantiene la variabilidad del registro y solo mueve el promedio. Los escenarios del IPCC para México van, según la trayectoria de emisiones, de poco más de 1 °C a más de 3 °C a fin de siglo; +2 °C es un punto de referencia razonable para una plantación que durará 30 años.',
      'It is a sensitivity ("delta") analysis, not a forecast: it keeps the variability of the record and only moves the mean. IPCC scenarios for Mexico range, depending on the emissions pathway, from little more than 1 °C to more than 3 °C by the end of the century; +2 °C is a reasonable reference for a plantation that will last 30 years.'],
    care: ['Un ciclo más corto rinde menos aunque madure: menos días de llenado de grano. El modelo de tiempo térmico fecha las etapas pero no cuantifica esa pérdida; los modelos de cultivo sí, y esa es la razón para no leer el escenario como «el maíz madurará antes y todo bien».',
      'A shorter cycle yields less even if it matures: fewer grain-filling days. The thermal-time model dates the stages but does not quantify that loss; crop models do, and that is why the scenario must not be read as "maize will mature earlier and all is well".'],
    ref: 'IPCC 2021 (AR6, WGI); Hatfield et al. 2011',
  });

  /* =====================================================================
     2 · the scale applied to a value
     ===================================================================== */
  const TONE = { good: 'good', ok: 'ok', warn: 'warn', bad: 'bad' };
  function bandRange(b) {
    const lo = b.from == null ? '' : num(b.from), hi = b.to == null ? '' : num(b.to);
    if (lo && hi) return `${lo} – ${hi}`;
    if (lo) return `≥ ${lo}`;
    return `< ${hi}`;
  }
  function bandWidths(scale) {
    const n = scale.length;
    return scale.map(() => 100 / n);
  }
  function band(key, value) {
    const d = HELP[key];
    if (!d || !d.scale || value == null || !isFinite(value)) return null;
    /* the first band that contains the value; an open end matches anything past it */
    for (const b of d.scale) {
      const okLo = b.from == null || value >= b.from;
      const okHi = b.to == null || value < b.to;
      if (okLo && okHi) return b;
    }
    return null;
  }
  function tag(key, value, opts) {
    const b = band(key, value);
    if (!b) return '';
    const o = opts || {};
    return `<span class="help-tag ${TONE[b.tone] || 'ok'}"${o.title ? ` title="${esc(o.title)}"` : ''}>${two(b.label)}</span>`;
  }
  function verdict(key, value) { const b = band(key, value); return b ? T(b.label) : ''; }
  function scaleHTML(d) {
    if (!d.scale) return '';
    const widths = bandWidths(d.scale);
    return `<div class="help-scale-title">${two(d.scaleTitle || ['Escala', 'Scale'])}${d.conv ? ` <span class="help-conv">${two(['convención', 'convention'])}</span>` : ''}</div>` +
      `<div class="help-scale">${d.scale.map((b, i) => `<div class="help-band ${TONE[b.tone] || 'ok'}" style="width:${widths[i]}%"><b>${two(b.label)}</b><span>${bandRange(b)}</span>${b.txt ? `<small>${two(b.txt)}</small>` : ''}</div>`).join('')}</div>`;
  }
  function entryBody(d) {
    return `<p>${two(d.what)}</p>` +
      (d.read ? `<p><b>${two(['Cómo se lee.', 'How it is read.'])}</b> ${two(d.read)}</p>` : '') +
      scaleHTML(d) +
      (d.care ? `<p class="help-care"><b>${two(['Cuidado.', 'Beware.'])}</b> ${two(d.care)}</p>` : '') +
      (d.ref ? `<p class="help-ref">${d.ref}</p>` : '');
  }

  /* =====================================================================
     3 · the badge and its popover
     ===================================================================== */
  function badge(key) {
    if (!HELP[key]) return '';
    return `<button type="button" class="help-badge" data-help-key="${key}" aria-expanded="false" title="${esc(T('Qué significa y cómo se lee', 'What it means and how it is read'))}">?</button>`;
  }
  let pop = null, openBtn = null;
  function ensurePop() {
    if (pop) return pop;
    pop = mk('div', { class: 'help-pop', role: 'dialog', tabindex: '-1' });
    pop.style.display = 'none';
    document.body.appendChild(pop);
    return pop;
  }
  function fillPop(key) {
    const d = HELP[key];
    ensurePop().innerHTML = `<div class="help-pop-head"><h5>${two(d.t)}</h5><button type="button" class="icon-btn fs-x" data-help-close>✕</button></div>${entryBody(d)}`;
  }
  function placePop() {
    if (!pop || !openBtn) return;
    const r = openBtn.getBoundingClientRect();
    const w = Math.min(420, window.innerWidth - 16);
    pop.style.width = w + 'px';
    let left = r.left + window.scrollX - 8;
    if (left + w > window.innerWidth + window.scrollX - 8) left = window.innerWidth + window.scrollX - w - 8;
    pop.style.left = Math.max(8, left) + 'px';
    pop.style.top = (r.bottom + window.scrollY + 8) + 'px';
  }
  let placeTimer = null;
  const schedulePlace = () => { if (placeTimer) cancelAnimationFrame(placeTimer); placeTimer = requestAnimationFrame(placePop); };
  function openPop(btn) {
    const key = btn.dataset.helpKey;
    if (!HELP[key]) return;
    if (openBtn === btn) { closePop(true); return; }
    closePop(false);
    fillPop(key);
    openBtn = btn;
    btn.setAttribute('aria-expanded', 'true');
    pop.style.display = 'block';
    placePop();
    pop.focus({ preventScroll: true });
  }
  function closePop(refocus) {
    if (!pop || pop.style.display === 'none') { openBtn = null; return; }
    pop.style.display = 'none';
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); if (refocus && openBtn.isConnected) openBtn.focus({ preventScroll: true }); }
    openBtn = null;
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
      const close = e.target.closest && e.target.closest('[data-help-close]');
      if (close) { e.preventDefault(); closePop(true); return; }
      const b = e.target.closest && e.target.closest('.help-badge');
      if (b) { e.preventDefault(); e.stopPropagation(); openPop(b); return; }
      if (pop && pop.style.display !== 'none' && !(e.target.closest && e.target.closest('.help-pop'))) closePop(false);
    }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop && pop.style.display !== 'none') { e.stopPropagation(); closePop(true); } });
    addEventListener('resize', schedulePlace);
    addEventListener('scroll', schedulePlace, true);
    document.addEventListener('langchange', () => { if (openBtn) fillPop(openBtn.dataset.helpKey); });
  }

  /* =====================================================================
     4 · decorating what the blocks already build
     ===================================================================== */
  function candidates(node) {
    const out = [(node.textContent || '').trim()];
    node.querySelectorAll('[data-l]').forEach(s => out.push((s.textContent || '').trim()));
    return out.filter(Boolean).map(s => s.toLowerCase());
  }
  function decorate(nodes, map, prefix) {
    const pairs = Object.keys(map).map(k => [k.trim().toLowerCase(), map[k]]);
    nodes.forEach(n => {
      if (n.dataset.helpDone) return;
      const cand = candidates(n);
      const hit = prefix ? pairs.find(([txt]) => cand.some(c => c.startsWith(txt))) : pairs.find(([txt]) => cand.includes(txt));
      n.dataset.helpDone = '1';
      if (!hit || !HELP[hit[1]]) return;
      n.insertAdjacentHTML('beforeend', badge(hit[1]));
    });
  }
  function markTable(container, map, prefix) {
    if (typeof container === 'string') container = el(container);
    if (container) decorate([...container.querySelectorAll('thead th')], map, prefix);
  }
  function markTiles(container, map, prefix) {
    if (typeof container === 'string') container = el(container);
    if (container) decorate([...container.querySelectorAll('.stat-label, .rd-l')], map, prefix);
  }
  function hydrate(root) {
    (root || document).querySelectorAll('[data-help]:not([data-help-ready])').forEach(n => {
      const key = n.getAttribute('data-help');
      n.setAttribute('data-help-ready', '1');
      if (HELP[key]) n.innerHTML = badge(key);
    });
  }

  /* =====================================================================
     5 · the collapsible guide of a block
     ===================================================================== */
  const GUIDES = {};
  function panel(keys, title) {
    const id = 'helpGuide' + (panel._n = (panel._n || 0) + 1);
    GUIDES[id] = keys.filter(k => HELP[k]);
    return `<details class="acc help-guide" id="${id}">` +
      `<summary>${title ? two(title) : L2('📖 Guía de interpretación de este bloque', '📖 Interpretation guide for this block')}</summary>` +
      `<div class="acc-body"><p class="hint">${L2(
        'Qué mide cada número, en qué escala se lee y cuál es el error más común con él. Las escalas marcadas como convención son costumbres de lectura, no leyes.',
        'What each number measures, on what scale it is read and the commonest mistake made with it. The scales marked as a convention are reading habits, not laws.')}</p><div class="help-guide-grid"></div></div></details>`;
  }
  function fillGuide(det) {
    const box = det.querySelector('.help-guide-grid');
    if (!box || box.dataset.ready) return;
    box.dataset.ready = '1';
    box.innerHTML = (GUIDES[det.id] || []).map(k => `<section class="help-entry"><h5>${two(HELP[k].t)}</h5>${entryBody(HELP[k])}</section>`).join('');
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('toggle', e => {
      if (e.target.classList && e.target.classList.contains('help-guide') && e.target.open) fillGuide(e.target);
    }, true);
  }

  /* =====================================================================
     6 · which entries belong to which block, and installing itself
     ===================================================================== */
  /* ---------- Block 10 · figures, report and package ---------- */

  E('figformat', {
    t: ['PNG, JPG o SVG: cuál pedir', 'PNG, JPG or SVG: which to ask for'],
    what: ['<b>SVG</b> es la figura como dibujo: líneas y textos que se agrandan sin perder nitidez y se editan en Inkscape, Illustrator o PowerPoint. <b>PNG</b> es una imagen de píxeles sin pérdida, con transparencia posible: la opción segura para revistas y tesis. <b>JPG</b> comprime con pérdida y no tiene transparencia; solo pesa menos cuando hay fotografías, que aquí no las hay.',
      '<b>SVG</b> is the figure as a drawing: lines and text that scale without losing sharpness and can be edited in Inkscape, Illustrator or PowerPoint. <b>PNG</b> is a lossless pixel image, transparency possible: the safe choice for journals and theses. <b>JPG</b> compresses with loss and has no transparency; it only weighs less when there are photographs, and there are none here.'],
    scaleTitle: ['Regla práctica', 'Rule of thumb'],
    scale: [
      S(null, null, ['SVG para editar o para la versión final vectorial', 'SVG to edit or for the final vector version'], 'good'),
      S(null, null, ['PNG a 300–600 ppp para enviar a revista o imprimir', 'PNG at 300–600 dpi to submit or print'], 'good'),
      S(null, null, ['JPG solo si el destino lo exige (algunos formularios)', 'JPG only if the destination demands it (some forms)'], 'ok'),
    ],
    conv: true,
    read: ['Las revistas suelen pedir TIFF o EPS: cualquier editor de imágenes convierte el PNG a TIFF sin pérdida, y el SVG a EPS o PDF. Los colores exportados son los del estilo activo, resueltos: la figura ya no depende de la app.',
      'Journals often ask for TIFF or EPS: any image editor converts the PNG to TIFF without loss, and the SVG to EPS or PDF. The exported colours are those of the active style, resolved: the figure no longer depends on the app.'],
  });

  E('dpi', {
    t: ['Resolución (puntos por pulgada)', 'Resolution (dots per inch)'],
    what: ['Cuántos píxeles tendrá la imagen por cada pulgada impresa. Una figura de 700 × 320 unidades sale a 2917 × 1333 píxeles a 300 ppp y a 8750 × 4000 a 900 ppp. Más resolución no añade información al dibujo (que es vectorial): añade nitidez a la impresión y peso al archivo.',
      'How many pixels the image will have per printed inch. A 700 × 320-unit figure comes out at 2917 × 1333 pixels at 300 dpi and 8750 × 4000 at 900 dpi. More resolution adds no information to the drawing (which is vector): it adds sharpness to the print and weight to the file.'],
    scaleTitle: ['Puntos por pulgada', 'Dots per inch'],
    scale: [
      S(null, 150, ['pantalla, diapositivas, borradores', 'screen, slides, drafts'], 'ok'),
      S(150, 300, ['impresión de oficina, tesis', 'office printing, theses'], 'good'),
      S(300, 600, ['lo que piden casi todas las revistas para gráficas de líneas', 'what almost every journal asks for line graphics'], 'good', ['300 ppp para medios tonos, 600–1200 para arte lineal', '300 dpi for halftones, 600–1200 for line art']),
      S(600, null, ['carteles y ampliaciones', 'posters and enlargements'], 'ok', ['archivos de decenas de MB', 'files of tens of MB']),
    ],
    conv: true,
    read: ['Si vas a insertar la figura en Word o LaTeX a media página, 300 ppp basta; si va a un cartel de 90 cm, 600 o 900. El SVG no tiene resolución: es la salida que nunca se pixela.',
      'If the figure goes into Word or LaTeX at half a page, 300 dpi is enough; if it goes on a 90 cm poster, 600 or 900. The SVG has no resolution: it is the output that never pixelates.'],
    care: ['Una imagen chica ampliada en el procesador de textos se ve borrosa aunque tenga muchos ppp: exporta al tamaño final o usa SVG.',
      'A small image enlarged in the word processor looks blurry however many dpi it has: export at the final size or use SVG.'],
  });

  E('reportmethods', {
    t: ['Métodos redactados a partir de lo calculado', 'Methods written from what was computed'],
    what: ['La sección de métodos del informe no es una plantilla: se arma con lo que realmente se corrió. Si estimaste la humedad del punto de rocío en el 40 % de los días, lo dice con ese porcentaje; si el balance usó el número de curva, lo cita; si no calibraste los requerimientos térmicos, los llama orientativos. Un método que no se usó no aparece, y las referencias son solo las de los métodos que sí.',
      'The methods section of the report is not a template: it is assembled from what was actually run. If humidity was estimated from dew point on 40 % of the days, it says so with that percentage; if the balance used the curve number, it cites it; if the thermal requirements were not calibrated, it calls them orientative. A method that was not used does not appear, and the references are only those of the methods that were.'],
    read: ['Léela antes de copiarla al artículo y añade lo que la app no puede saber: la fuente de los datos, el cultivar, el suelo medido, la razón de cada elección. El anexo del informe trae cada parámetro, y el paquete trae el proyecto: con ambos, cualquier revisor repite el estudio.',
      'Read it before pasting it into the paper and add what the app cannot know: the source of the data, the cultivar, the measured soil, the reason behind each choice. The appendix of the report carries every parameter, and the package carries the project: with both, any reviewer repeats the study.'],
    care: ['Si cambias un parámetro en un bloque después de generar el informe, la frase vieja queda desactualizada: genera de nuevo. La app no guarda informes; guarda el estudio.',
      'If you change a parameter in a block after generating the report, the old sentence goes stale: generate again. The app does not store reports; it stores the study.'],
  });

  E('figedit', {
    t: ['El editor de cada figura (✎)', 'The editor of each figure (✎)'],
    what: ['El estudio de figuras de la barra superior cambia todas las figuras a la vez. El botón <b>✎</b> de la esquina de cada figura abre su editor propio, con seis pestañas: <b>General</b> (título, subtítulo y nota al pie dentro de la figura, familia tipográfica, tamaños, grosor, fondo y marco), <b>Ejes y rejilla</b> (títulos de los ejes, números, color y grosor de los ejes, rejilla y recuadro del área de trazado), <b>Series</b> (cada color con el nombre de su entrada de leyenda: color, grosor, trazo, opacidad, ocultar), <b>Leyenda</b> (mostrar, ocho posiciones, en fila o en columna, tamaño, recuadro, rótulos), <b>Textos</b> (cada texto uno por uno) y <b>Anotaciones</b> (notas, flechas, líneas de referencia en un valor del eje, bandas y letra de panel).',
      'The figure studio of the top bar changes every figure at once. The <b>✎</b> button at the corner of each figure opens its own editor, with six tabs: <b>General</b> (title, subtitle and footnote inside the figure, font family, sizes, line weight, background and border), <b>Axes & grid</b> (axis titles, numbers, colour and weight of the axes, grid and the box of the plot area), <b>Series</b> (every colour named after its legend entry: colour, weight, stroke, opacity, hide), <b>Legend</b> (show, eight positions, row or column, size, box, labels), <b>Texts</b> (every text one by one) and <b>Annotations</b> (notes, arrows, reference lines at a value of the axis, bands and a panel letter).'],
    scaleTitle: ['Qué tocar según el destino', 'What to touch by destination'],
    scale: [
      S(null, null, ['artículo: fuente serif o Arial, textos a 1.2–1.4×, sin rejilla o tenue, leyenda dentro del área', 'paper: serif or Arial, texts at 1.2–1.4×, no grid or a faint one, legend inside the plot area'], 'good'),
      S(null, null, ['diapositiva: textos a 1.5× o más, líneas a 1.5×, pocos rótulos y un título dentro de la figura', 'slide: texts at 1.5× or more, lines at 1.5×, few labels and a title inside the figure'], 'good'),
      S(null, null, ['figura compuesta: letra de panel (A, B, C) y la misma tipografía copiada a todas', 'multi-panel figure: a panel letter (A, B, C) and the same type copied to all'], 'ok'),
    ],
    conv: true,
    read: ['La leyenda, las notas, las letras y las flechas <b>se arrastran</b> sobre la figura mientras el editor está abierto, y un clic en cualquier texto de la figura salta a su renglón. Los cambios se guardan por figura y se vuelven a poner cada vez que la figura se redibuja (al cambiar los datos, el idioma o el tema): los textos se reconocen por su redacción original y los colores por su valor original. Lo que ves es lo que sale en la exportación, en el catálogo del Bloque 10, en el informe y en el paquete. «Copiar el estilo a todas las figuras» lleva la tipografía, los tamaños, los ejes, la rejilla y el fondo a las demás, sin tocar sus textos ni sus anotaciones.',
      'The legend, the notes, the letters and the arrows <b>are dragged</b> on the figure while the editor is open, and a click on any text of the figure jumps to its row. The changes are kept per figure and put back every time the figure is redrawn (when the data, the language or the theme change): texts are recognised by their original wording and colours by their original value. What you see is what the export, the catalogue of Block 10, the report and the package take. "Copy the style to every figure" carries the type, the sizes, the axes, the grid and the background to the others, leaving their texts and annotations alone.'],
    care: ['Un texto reescrito deja de traducirse: si cambias de idioma, la figura trae su redacción original en el otro idioma y tu texto se queda con la versión en la que lo escribiste. Y una línea de referencia se coloca en el valor del eje: si los datos cambian la escala y el valor queda fuera, la línea no se dibuja.',
      'A rewritten text is no longer translated: if you switch language the figure brings its original wording in the other language and your text stays with the version you wrote it for. And a reference line sits at the value of the axis: if the data change the scale and the value falls outside, the line is not drawn.'],
  });

  E('reproducible', {
    t: ['Qué hace reproducible un estudio agroclimático', 'What makes an agroclimatic study reproducible'],
    what: ['Tres cosas: los <b>datos</b> tal como entraron al cálculo (la serie limpia, no la cruda), los <b>parámetros</b> de cada paso (base, umbrales, Kc, suelo, regla de riego, fechas) y la <b>versión</b> del programa. El paquete guarda las tres: proyecto.json, parametros.json y el número de versión en el informe. Con ellas, la misma serie da los mismos cuadros en cualquier computadora, sin conexión.',
      'Three things: the <b>data</b> as they entered the computation (the clean series, not the raw one), the <b>parameters</b> of each step (base, thresholds, Kc, soil, irrigation rule, dates) and the <b>version</b> of the program. The package stores all three: proyecto.json, parametros.json and the version number in the report. With them, the same series gives the same tables on any computer, offline.'],
    scaleTitle: ['Estado del estudio', 'State of the study'],
    scale: [
      S(null, null, ['los 8 bloques calculados: informe completo', 'all 8 blocks computed: complete report'], 'good'),
      S(null, null, ['algunos bloques sin calcular: el informe los omite y lo dice', 'some blocks not computed: the report omits them and says so'], 'ok'),
      S(null, null, ['sin serie: no hay nada que exportar', 'no series: nothing to export'], 'bad'),
    ],
    conv: true,
    read: ['Los bloques se calculan al visitarlos; si cambias la serie o un parámetro aguas arriba, los de abajo se vuelven a calcular al abrirlos. Antes de exportar, recorre del Bloque 3 al 9 y comprueba que cada uno muestra lo que quieres.',
      'Blocks compute when visited; if you change the series or an upstream parameter, the downstream ones recompute when opened. Before exporting, walk from Block 3 to 9 and check that each shows what you want.'],
    ref: 'Sandve et al. 2013; Wilkinson et al. 2016',
  });

  const BLOCK_KEYS = {
    1: ['gdd', 'tbase', 'cutoff', 'eto', 'etomethods', 'kc', 'taw', 'ks', 'depletion', 'pe', 'chill', 'photoperiod', 'climograph', 'aridity', 'frost', 'season'],
    2: ['coords', 'datasource', 'windheight', 'qc', 'gapfill', 'yearcomplete', 'capabilities'],
    3: ['climograph', 'yearcomplete', 'rainonset', 'frost', 'frostdates', 'aridity', 'moisture', 'koppen', 'season'],
    4: ['gdd', 'tbase', 'cutoff', 'chu', 'gddvar', 'sowingmap'],
    5: ['eto', 'etomethods', 'etoestimates', 'etoterms', 'etocalib', 'windheight'],
    6: ['kc', 'taw', 'depletion', 'ks', 'pe', 'runoff', 'kyield', 'sowingmap'],
    7: ['irrstrategy', 'efficiency', 'depletion', 'taw', 'irrdesign', 'kyield'],
    8: ['bbch', 'gdd', 'tbase', 'gddvar', 'calibration', 'chill', 'chillwindow', 'gdh', 'photoperiod'],
    9: ['frost', 'frostdates', 'heatstress', 'season', 'sowingwindow', 'kyield', 'scenarios'],
    10: ['figformat', 'dpi', 'figedit', 'reportmethods', 'reproducible'],
  };
  /* labels the app prints, in either language, and the entry each one belongs to (matching by prefix) */
  const LABELS = {
    '°c·d': 'gdd', 'grados-día': 'gdd', 'degree-days': 'gdd', 'gdd': 'gdd', 'tiempo térmico': 'gdd', 'thermal time': 'gdd', 'acumulados': 'gdd', 'accumulated': 'gdd',
    'base': 'tbase', 'temperatura base': 'tbase', 'base temperature': 'tbase', 'umbral': 'tbase', 'threshold': 'tbase',
    'método': 'cutoff', 'method': 'cutoff', 'corte': 'cutoff', 'cut-off': 'cutoff',
    'eto': 'eto', 'et₀': 'eto', 'evapotranspiración de referencia': 'eto', 'reference evapotranspiration': 'eto',
    'kc': 'kc', 'etc': 'kc', 'coeficiente de cultivo': 'kc', 'crop coefficient': 'kc',
    'adt': 'taw', 'taw': 'taw', 'afa': 'taw', 'raw': 'taw', 'agua disponible': 'taw', 'available water': 'taw',
    'ks': 'ks', 'estrés': 'ks', 'stress': 'ks',
    'agotamiento': 'depletion', 'depletion': 'depletion', 'dr': 'depletion',
    'lluvia efectiva': 'pe', 'effective rain': 'pe',
    'porciones': 'chill', 'portions': 'chill', 'unidades utah': 'chill', 'utah': 'chill', 'horas frío': 'chill', 'chill hours': 'chill',
    'fotoperiodo': 'photoperiod', 'photoperiod': 'photoperiod',
    'p/etp': 'aridity', 'p/pet': 'aridity', 'aridez': 'aridity', 'aridity': 'aridity',
    'helada': 'frost', 'frost': 'frost',
    'ventana': 'season', 'window': 'season', 'estación de crecimiento': 'season', 'growing season': 'season',
    'años completos': 'yearcomplete', 'complete years': 'yearcomplete', 'útil para normales': 'yearcomplete', 'usable for normals': 'yearcomplete',
    'rellenados': 'gapfill', 'filled': 'gapfill', 'huecos': 'gapfill', 'gaps': 'gapfill', 'hueco más largo': 'gapfill', 'longest gap': 'gapfill',
    'incidencias': 'qc', 'issues': 'qc', 'marcados': 'qc', 'flagged': 'qc',
    'índice de concentración': 'rainonset', 'concentration index': 'rainonset', 'inicio de la temporada': 'rainonset', 'onset of the season': 'rainonset', 'fin de la temporada': 'rainonset', 'end of the season': 'rainonset', 'temporada de lluvias': 'rainonset', 'rainy season': 'rainonset',
    'última helada': 'frostdates', 'last spring frost': 'frostdates', 'primera helada': 'frostdates', 'first autumn frost': 'frostdates', 'periodo libre de heladas': 'frostdates', 'frost-free period': 'frostdates', 'riesgo aceptado': 'frostdates', 'accepted risk': 'frostdates',
    'días a la meta': 'gddvar', 'days to the target': 'gddvar', 'días a madurez': 'gddvar', 'años que la alcanzan': 'sowingmap', 'years reaching it': 'sowingmap',
    '°c·d en la temporada': 'gddvar', '°c·d in the season': 'gddvar', 'chu': 'chu', 'unidades calor': 'chu', 'crop heat units': 'chu',
    'término aerodinámico': 'etoterms', 'aerodynamic term': 'etoterms', 'datos estimados': 'etoestimates', 'estimated data': 'etoestimates',
    'hargreaves contra pm': 'etocalib', 'hargreaves against pm': 'etocalib', 'factor k': 'etocalib', 'rmse': 'etocalib', 'sesgo': 'etocalib', 'bias': 'etocalib',
    'eto anual': 'eto', 'annual eto': 'eto', 'eto media diaria': 'eto', 'mean daily eto': 'eto',
    'rendimiento relativo': 'kyield', 'relative yield': 'kyield', 'rend. relativo': 'kyield', 'rel. yield': 'kyield', 'ky': 'kyield',
    'déficit': 'ks', 'deficit': 'ks', 'días estrés': 'ks', 'stress days': 'ks', 'días con estrés': 'ks', 'ks medio': 'ks', 'mean ks': 'ks', 'ks mediano': 'ks', 'median ks': 'ks',
    'percolación': 'depletion', 'percolation': 'depletion', 'percol.': 'depletion', 'escurrimiento': 'runoff', 'runoff': 'runoff',
    'efectiva': 'pe', 'effective': 'pe', 'necesidad': 'pe', 'need': 'pe',
    'riegos': 'irrstrategy', 'irrigations': 'irrstrategy', 'estrategia': 'irrstrategy', 'strategy': 'irrstrategy',
    'lámina bruta': 'efficiency', 'gross depth': 'efficiency', 'bruta': 'efficiency', 'gross': 'efficiency', 'lámina neta': 'depletion', 'net depth': 'depletion',
    'capacidad de diseño': 'irrdesign', 'design capacity': 'irrdesign', 'horas de riego': 'irrdesign', 'irrigation hours': 'irrdesign',
    'cv': 'calibration', 'observado': 'calibration', 'observed': 'calibration', 'catálogo': 'bbch', 'catalogue': 'bbch',
    'porciones de frío': 'chill', 'chill portions': 'chill', 'cubre el requerimiento': 'chillwindow', 'meets the requirement': 'chillwindow', 'floración prevista': 'gdh', 'predicted bloom': 'gdh', 'floración (gdh)': 'gdh', 'bloom (gdh)': 'gdh',
    'dispersión de la madurez': 'gddvar', 'spread of maturity': 'gddvar', 'fecha mediana': 'gddvar', 'median date': 'gddvar',
    'golpe de calor': 'heatstress', 'heat shock': 'heatstress', 'años con calor': 'heatstress', 'years with heat': 'heatstress', 'calor en el ciclo': 'heatstress', 'heat in the cycle': 'heatstress',
    'éxito': 'sowingwindow', 'success': 'sowingwindow', 'helada en el ciclo': 'frost', 'frost in the cycle': 'frost', 'helada en': 'frost', 'frost at': 'frost',
    'escenario': 'scenarios', 'scenario': 'scenarios',
    'köppen': 'koppen', 'koppen': 'koppen', 'índice de aridez': 'aridity', 'aridity index': 'aridity', 'índice de humedad': 'moisture', 'moisture index': 'moisture', 'periodo de crecimiento': 'season', 'growing period': 'season',
  };
  function wrapBuilders() {
    if (typeof window === 'undefined') return;
    ['statTiles', 'buildTable'].forEach(name => {
      const orig = window[name];
      if (typeof orig !== 'function' || orig.__helped) return;
      const wrapped = function () {
        const out = orig.apply(this, arguments);
        try {
          const c = typeof arguments[0] === 'string' ? el(arguments[0]) : arguments[0];
          if (c) (name === 'statTiles' ? markTiles : markTable)(c, LABELS, true);
        } catch (e) { /* the help must never break what it decorates */ }
        return out;
      };
      wrapped.__helped = true;
      window[name] = wrapped;
    });
  }
  function install(root) {
    const scope = root || document;
    Object.keys(BLOCK_KEYS).forEach(n => {
      const host = scope.querySelector ? scope.querySelector('#helpGuideHost' + n) || scope.querySelector('#panel-' + n) : null;
      if (!host || host.querySelector(':scope > .help-guide')) return;
      const box = document.createElement('div');
      box.innerHTML = panel(BLOCK_KEYS[n]);
      const node = box.firstElementChild;
      if (node) host.appendChild(node);
    });
    wrapBuilders();
    hydrate(scope);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => install());
    else install();
  }

  Object.assign(Help, {
    HELP, BLOCK_KEYS, LABELS, install, badge, panel, markTable, markTiles, hydrate, band, tag, verdict, entryBody, scaleHTML,
    keys: () => Object.keys(HELP), _S: S, _E: E, _two: two, _num: num, _bandWidths: bandWidths, _bandRange: bandRange,
  });
  if (typeof window !== 'undefined') window.Help = Help;
})();
