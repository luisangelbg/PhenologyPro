/* PhenologyPro — Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
   Free software under the GNU General Public License, version 3; see LICENSE. */
/* PhenologyPro — Block 1: the home page.
   Builds the stepper, the block cards, the strip of production systems, the
   method gallery, the comparison of ETo methods and the reference list. The
   content lives here as bilingual data, so the map of the app is one editable
   list. */

(function () {

  /* ---------------- the ten blocks ---------------- */
  const BLOCKS = [
    { n: 2, art: 'climData', tag: ['datos', 'data'],
      t: ['Datos climáticos del sitio', 'Climate data of the site'],
      d: ['Carga la serie diaria de tu estación (pegada o desde .csv), con temperatura máxima y mínima, lluvia y, si las hay, humedad, viento e insolación. La app revisa huecos, valores imposibles y saltos, rellena lo que se puede justificar y guarda la latitud, la longitud y la altitud que todo lo demás necesita.',
        'Load the daily series of your station (pasted or from .csv), with maximum and minimum temperature, rain and, if available, humidity, wind and sunshine. The app checks gaps, impossible values and jumps, fills what can be justified and stores the latitude, longitude and elevation everything else needs.'] },
    { n: 3, art: 'siteClimate', tag: ['clima', 'climate'],
      t: ['El clima del sitio', 'The climate of the site'],
      d: ['Normales mensuales, climograma de Walter–Lieth, régimen de lluvias, periodo libre de heladas con sus fechas al 10, 20 y 50 % de probabilidad, índices de aridez y de humedad, y la clasificación climática del lugar. Lo que un estudio agroclimático pone en su primera página.',
        'Monthly normals, Walter–Lieth climograph, rainfall regime, frost-free period with its dates at 10, 20 and 50 % probability, aridity and moisture indices and the climatic classification of the place. What an agroclimatic study puts on its first page.'] },
    { n: 4, art: 'degreeDays', tag: ['calor', 'heat'],
      t: ['Grados-día y tiempo térmico', 'Degree-days and thermal time'],
      d: ['Acumulación de calor desde cualquier fecha con seis métodos (promedio, acotado, triángulo, seno simple y doble) y tres cortes del umbral superior; unidades calor de Ontario; comparación entre años; y el mapa de °C·d disponibles por fecha de siembra que dice cuánto ciclo cabe en la estación.',
        'Heat accumulation from any date with six methods (average, capped, triangle, single and double sine) and three upper-threshold cut-offs; Ontario crop heat units; comparison between years; and the map of °C·d available by sowing date that says how much cycle fits in the season.'] },
    { n: 5, art: 'eto', tag: ['agua', 'water'],
      t: ['Evapotranspiración de referencia', 'Reference evapotranspiration'],
      d: ['Penman–Monteith FAO-56 con todos los datos o con los que haya (la app estima los que faltan como manda FAO-56 y lo anota), Hargreaves–Samani, Priestley–Taylor, Thornthwaite y Turc, comparados entre sí; la radiación extraterrestre y la duración del día; y la calibración local de Hargreaves contra Penman–Monteith.',
        'FAO-56 Penman–Monteith with all the data or with whatever there is (the app estimates what is missing as FAO-56 prescribes and records it), Hargreaves–Samani, Priestley–Taylor, Thornthwaite and Turc, compared with one another; extraterrestrial radiation and day length; and the local calibration of Hargreaves against Penman–Monteith.'] },
    { n: 6, art: 'balance', tag: ['suelo', 'soil'],
      t: ['Balance hídrico', 'Water balance'],
      d: ['El balance mensual de Thornthwaite–Mather con almacenamiento, déficit y excedente, y el balance diario de la zona radical de FAO-56 con la curva de Kc del cultivo, la lluvia efectiva, el escurrimiento, la percolación y el coeficiente de estrés. Para temporal y para riego.',
        'The monthly Thornthwaite–Mather balance with storage, deficit and surplus, and the FAO-56 daily root-zone balance with the crop\'s Kc curve, effective rain, runoff, deep percolation and the stress coefficient. For rain-fed and for irrigated fields.'] },
    { n: 7, art: 'irrigation', tag: ['riego', 'irrigation'],
      t: ['Calendarización del riego', 'Irrigation scheduling'],
      d: ['Cuándo y cuánto regar: el calendario que agota el agua fácilmente aprovechable y rellena a capacidad de campo, o el de intervalo fijo, o el de lámina fija; láminas netas y brutas según la eficiencia del sistema, el ahorro frente a regar por costumbre, y el calendario listo para el productor.',
        'When and how much to irrigate: the calendar that depletes the readily available water and refills to field capacity, or the fixed-interval one, or the fixed-depth one; net and gross depths by the system\'s efficiency, the saving against irrigating by habit, and the calendar ready for the grower.'] },
    { n: 8, art: 'phenology', tag: ['fenología', 'phenology'],
      t: ['Predicción de etapas fenológicas', 'Prediction of phenological stages'],
      d: ['Las etapas BBCH del cultivo fechadas por su tiempo térmico, con el catálogo de requerimientos editable y calibrable con tus observaciones; el frío invernal de los frutales por horas frío, unidades Utah y porciones de frío; el fotoperiodo del sitio; y las horas de calor tras el reposo hasta la floración.',
        'The crop\'s BBCH stages dated by their thermal time, with the requirement catalogue editable and calibratable with your observations; the winter chill of fruit trees by chill hours, Utah units and chill portions; the site\'s photoperiod; and the heat hours after rest until bloom.'] },
    { n: 9, art: 'risks', tag: ['riesgo', 'risk'],
      t: ['Riesgos y escenarios', 'Risks and scenarios'],
      d: ['Probabilidad de helada y de golpe de calor por fecha y por etapa, sequía en la etapa sensible, la ventana de siembra que maximiza el ciclo y minimiza el riesgo, y escenarios de +1, +2 y +3 °C para ver qué le pasa al calendario del cultivo con un clima más cálido.',
        'Frost and heat-shock probability by date and by stage, drought at the sensitive stage, the sowing window that maximises the cycle and minimises the risk, and +1, +2 and +3 °C scenarios to see what happens to the crop calendar in a warmer climate.'] },
    { n: 10, art: 'report', tag: ['informe', 'report'],
      t: ['Figuras, informe y paquete', 'Figures, report and package'],
      d: ['Todas las figuras del estudio en PNG, JPG o SVG hasta 900 ppp con el estilo que elijas; un informe que se abre en cualquier navegador y se imprime a PDF, con métodos redactados a partir de lo que realmente calculaste; y un .zip con el informe, las figuras, los cuadros y los datos que lo reproducen.',
        'Every figure of the study as PNG, JPG or SVG up to 900 dpi in the style you choose; a report that opens in any browser and prints to PDF, with methods written from what you actually computed; and a .zip with the report, the figures, the tables and the data that reproduce it.'] },
  ];

  /* ---------------- production systems ---------------- */
  const MATERIALS = [
    { art: 'matRainfed', t: ['Agricultura de temporal', 'Rain-fed agriculture'], s: ['¿cabe el ciclo entre la primera lluvia y la primera helada?', 'does the cycle fit between the first rain and the first frost?'], k: ['ventana de siembra', 'sowing window'], kc: '' },
    { art: 'matIrrigated', t: ['Cultivos de riego', 'Irrigated crops'], s: ['cuándo y cuánto regar con la demanda real del cultivo', 'when and how much to irrigate with the crop\'s real demand'], k: ['calendario de riego', 'irrigation calendar'], kc: 'g' },
    { art: 'matVegetables', t: ['Hortalizas y agricultura protegida', 'Vegetables and protected agriculture'], s: ['fechar cosechas y programar trasplantes escalonados', 'dating harvests and scheduling staggered transplants'], k: ['grados-día', 'degree-days'], kc: 'l' },
    { art: 'matDeciduous', t: ['Frutales caducifolios', 'Deciduous fruit trees'], s: ['¿acumula el invierno el frío que el cultivar necesita?', 'does the winter gather the chill the cultivar needs?'], k: ['porciones de frío', 'chill portions'], kc: '' },
    { art: 'matTropical', t: ['Perennes tropicales', 'Tropical perennials'], s: ['café, aguacate, cítricos: balance hídrico y estrés', 'coffee, avocado, citrus: water balance and stress'], k: ['balance hídrico', 'water balance'], kc: 'g' },
    { art: 'matForage', t: ['Forrajes y pastizales', 'Forages and pastures'], s: ['cortes por tiempo térmico y demanda de agua entre cortes', 'cuttings by thermal time and water demand between cuttings'], k: ['tiempo térmico', 'thermal time'], kc: 'l' },
  ];

  /* ---------------- the method gallery ---------------- */
  const FAMS = { all: ['Todos', 'All'], cal: ['Tiempo térmico', 'Thermal time'], agua: ['Evapotranspiración', 'Evapotranspiration'], rie: ['Balance y riego', 'Balance and irrigation'], fen: ['Fenología y frío', 'Phenology and chill'], cli: ['Clima y riesgo', 'Climate and risk'] };
  const METHODS = [
    { f: 'cal', art: 'mAverage', n: ['Grados-día por promedio', 'Average-method degree-days'], s: ['(Tmax + Tmin)/2 − base; el más usado', '(Tmax + Tmin)/2 − base; the most used'], b: 4 },
    { f: 'cal', art: 'mSine', n: ['Seno simple y doble', 'Single and double sine'], s: ['Baskerville & Emin 1969; Allen 1976', 'Baskerville & Emin 1969; Allen 1976'], b: 4 },
    { f: 'cal', art: 'mTriangle', n: ['Triángulo simple y doble', 'Single and double triangle'], s: ['Lindsey & Newman 1956', 'Lindsey & Newman 1956'], b: 4 },
    { f: 'cal', art: 'mCutoffs', n: ['Cortes horizontal, vertical e intermedio', 'Horizontal, vertical and intermediate cut-offs'], s: ['qué pasa arriba del umbral superior', 'what happens above the upper threshold'], b: 4 },
    { f: 'cal', art: 'mChu', n: ['Unidades calor de Ontario (CHU)', 'Ontario crop heat units (CHU)'], s: ['Brown 1975: día y noche por separado', 'Brown 1975: day and night apart'], b: 4 },
    { f: 'agua', art: 'mPM', n: ['Penman–Monteith FAO-56', 'FAO-56 Penman–Monteith'], s: ['el estándar: radiación + aerodinámico', 'the standard: radiation + aerodynamic'], b: 5 },
    { f: 'agua', art: 'mHargreaves', n: ['Hargreaves–Samani', 'Hargreaves–Samani'], s: ['solo temperatura y radiación extraterrestre', 'temperature and extraterrestrial radiation only'], b: 5 },
    { f: 'agua', art: 'mPriestley', n: ['Priestley–Taylor', 'Priestley–Taylor'], s: ['radiación con α = 1.26; sin viento ni humedad', 'radiation with α = 1.26; no wind or humidity'], b: 5 },
    { f: 'agua', art: 'mThornthwaite', n: ['Thornthwaite (mensual)', 'Thornthwaite (monthly)'], s: ['de la temperatura media y la latitud', 'from mean temperature and latitude'], b: 5 },
    { f: 'rie', art: 'mKc', n: ['Coeficiente de cultivo Kc', 'Crop coefficient Kc'], s: ['cuatro etapas, corregido a tu clima', 'four stages, corrected to your climate'], b: 6 },
    { f: 'rie', art: 'mBalanceTM', n: ['Balance de Thornthwaite–Mather', 'Thornthwaite–Mather balance'], s: ['mensual: almacenamiento, déficit y excedente', 'monthly: storage, deficit and surplus'], b: 6 },
    { f: 'rie', art: 'mBalanceDaily', n: ['Balance diario de la zona radical', 'Daily root-zone balance'], s: ['FAO-56 cap. 8: agotamiento, Ks, percolación', 'FAO-56 ch. 8: depletion, Ks, percolation'], b: 6 },
    { f: 'rie', art: 'mIrrigation', n: ['Calendarización del riego', 'Irrigation scheduling'], s: ['al agotar el AFA, a intervalo o a lámina fija', 'at RAW depletion, fixed interval or fixed depth'], b: 7 },
    { f: 'fen', art: 'mPhotoperiod', n: ['Fotoperiodo', 'Photoperiod'], s: ['duración del día con crepúsculo civil', 'day length with civil twilight'], b: 8 },
    { f: 'fen', art: 'mUtah', n: ['Horas frío y unidades Utah', 'Chill hours and Utah units'], s: ['Weinberger 1950; Richardson et al. 1974', 'Weinberger 1950; Richardson et al. 1974'], b: 8 },
    { f: 'fen', art: 'mDynamic', n: ['Modelo dinámico (porciones de frío)', 'Dynamic model (chill portions)'], s: ['Fishman et al. 1987; Erez et al. 1990', 'Fishman et al. 1987; Erez et al. 1990'], b: 8 },
    { f: 'cli', art: 'mClimograph', n: ['Climograma de Walter–Lieth', 'Walter–Lieth climograph'], s: ['10 °C = 20 mm: húmedo, seco y perhúmedo', '10 °C = 20 mm: humid, dry and perhumid'], b: 3 },
    { f: 'cli', art: 'mAridity', n: ['Índices de aridez', 'Aridity indices'], s: ['PNUMA, De Martonne, Lang, Thornthwaite', 'UNEP, De Martonne, Lang, Thornthwaite'], b: 3 },
    { f: 'cli', art: 'mFrost', n: ['Probabilidad de helada', 'Frost probability'], s: ['última y primera helada al 10, 20 y 50 %', 'last and first frost at 10, 20 and 50 %'], b: 9 },
    { f: 'cli', art: 'mWindow', n: ['Ventana de siembra', 'Sowing window'], s: ['calor, agua y helada en una sola fecha', 'heat, water and frost in a single date'], b: 9 },
  ];

  /* ---------------- ETo methods side by side ---------------- */
  const COMPARE = {
    cols: ['Penman–Monteith FAO-56', 'Hargreaves–Samani', 'Priestley–Taylor', 'Thornthwaite', 'Turc'],
    rows: [
      { t: ['Datos que necesita', 'Data required'], v: [['Tmax, Tmin, HR, viento, radiación o insolación', 'Tmax, Tmin, RH, wind, radiation or sunshine'], ['Tmax, Tmin, latitud', 'Tmax, Tmin, latitude'], ['T, radiación neta', 'T, net radiation'], ['T media mensual, latitud', 'monthly mean T, latitude'], ['T, radiación, HR', 'T, radiation, RH']] },
      { t: ['Escala de tiempo', 'Time scale'], v: [['horaria, diaria, mensual', 'hourly, daily, monthly'], ['diaria a mensual (mejor ≥ 5 días)', 'daily to monthly (best ≥ 5 days)'], ['diaria', 'daily'], ['mensual', 'monthly'], ['diaria a decenal', 'daily to ten-day']] },
      { t: ['Base física', 'Physical basis'], v: [['balance de energía + transferencia aerodinámica', 'energy balance + aerodynamic transfer'], ['empírica, calibrada contra lisímetros', 'empirical, calibrated against lysimeters'], ['balance de energía en equilibrio', 'equilibrium energy balance'], ['empírica, índice de calor anual', 'empirical, annual heat index'], ['empírica, radiación y temperatura', 'empirical, radiation and temperature']] },
      { t: ['Dónde falla', 'Where it fails'], v: [['solo si los datos son malos', 'only if the data are bad'], ['sobreestima en húmedo y costa; subestima en árido ventoso', 'overestimates humid and coastal sites; underestimates windy arid ones'], ['subestima con advección (aire seco y viento)', 'underestimates with advection (dry air and wind)'], ['subestima en clima árido y en verano', 'underestimates in arid climates and in summer'], ['climas muy secos (< 50 % HR)', 'very dry climates (< 50 % RH)']] },
      { t: ['Cuándo usarlo', 'When to use it'], v: [['siempre que se pueda; es el estándar', 'whenever possible; it is the standard'], ['solo hay temperatura; calibrar contra PM', 'only temperature is available; calibrate against PM'], ['climas húmedos sin viento; validar', 'humid, calm climates; validate'], ['balances climáticos y clasificación', 'climatic balances and classification'], ['zonas húmedas templadas', 'temperate humid areas']] },
      { t: ['En la app', 'In the app'], v: [['✓ Bloque 5', '✓ Block 5'], ['✓ Bloque 5', '✓ Block 5'], ['✓ Bloque 5', '✓ Block 5'], ['✓ Bloques 3, 5 y 6', '✓ Blocks 3, 5 and 6'], ['✓ Bloque 5', '✓ Block 5']] },
    ],
  };

  /* ---------------- what it brings together ---------------- */
  const BRING = [
    { t: ['Un solo lugar', 'One place'], s: ['clima, calor, agua y fenología encadenados: lo que sale de un bloque entra al siguiente', 'climate, heat, water and phenology chained: what leaves one block enters the next'], ic: '<path d="M4 12h16M12 4v16"/>' },
    { t: ['Ecuaciones citadas', 'Cited equations'], s: ['cada fórmula lleva su fuente y su número en FAO-56 o en el artículo original', 'every formula carries its source and its number in FAO-56 or the original paper'], ic: '<path d="M4 5h16v14H4zM8 9h8M8 13h6"/>' },
    { t: ['Validado', 'Validated'], s: ['los ejemplos resueltos de FAO-56 y las fórmulas cerradas de los métodos, verificados en la página de pruebas', 'the worked examples of FAO-56 and the closed forms of the methods, checked on the test page'], ic: '<path d="M5 12l5 5L20 7"/>' },
    { t: ['Escalas para leer', 'Scales to read by'], s: ['cada número lleva al lado la escala que dice si es bajo o alto, y el error más común', 'every number carries beside it the scale that says whether it is low or high, and the commonest mistake'], ic: '<path d="M4 18h16M6 14v4M10 10v8M14 6v12M18 12v6"/>' },
    { t: ['Figuras editables', 'Editable figures'], s: ['paleta, tipografía, fondo y grosor de toda la app en un solo panel; exportación hasta 900 ppp', 'palette, font, background and line weight of the whole app in one panel; export up to 900 dpi'], ic: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.2"/><circle cx="14" cy="8.5" r="1.2"/><circle cx="15" cy="13" r="1.2"/>' },
    { t: ['Sin instalar nada', 'Nothing to install'], s: ['abre con doble clic, funciona sin internet y los datos no salen de tu equipo', 'opens with a double click, works offline and the data never leave your computer'], ic: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>' },
  ];

  /* ---------------- references ---------------- */
  const RFAM = { all: ['Todas', 'All'], eto: ['Evapotranspiración', 'Evapotranspiration'], gdd: ['Tiempo térmico', 'Thermal time'], chill: ['Frío y fenología', 'Chill and phenology'], water: ['Balance y riego', 'Balance and irrigation'], clima: ['Clima y riesgo', 'Climate and risk'] };
  const REFS = [
    ['eto', 'Allen, R.G., Pereira, L.S., Raes, D. & Smith, M. (1998).', 'Crop evapotranspiration: guidelines for computing crop water requirements. FAO Irrigation and Drainage Paper 56. FAO, Rome.'],
    ['eto', 'Doorenbos, J. & Pruitt, W.O. (1977).', 'Guidelines for predicting crop water requirements. FAO Irrigation and Drainage Paper 24. FAO, Rome.'],
    ['eto', 'Hargreaves, G.H. & Samani, Z.A. (1985).', 'Reference crop evapotranspiration from temperature. Applied Engineering in Agriculture 1(2): 96–99.'],
    ['eto', 'Priestley, C.H.B. & Taylor, R.J. (1972).', 'On the assessment of surface heat flux and evaporation using large-scale parameters. Monthly Weather Review 100: 81–92.'],
    ['eto', 'Thornthwaite, C.W. (1948).', 'An approach toward a rational classification of climate. Geographical Review 38: 55–94.'],
    ['eto', 'Turc, L. (1961).', 'Évaluation des besoins en eau d\'irrigation, évapotranspiration potentielle. Annales Agronomiques 12: 13–49.'],
    ['eto', 'Willmott, C.J., Rowe, C.M. & Mintz, Y. (1985).', 'Climatology of the terrestrial seasonal water cycle. Journal of Climatology 5: 589–606.'],
    ['gdd', 'McMaster, G.S. & Wilhelm, W.W. (1997).', 'Growing degree-days: one equation, two interpretations. Agricultural and Forest Meteorology 87: 291–300.'],
    ['gdd', 'Baskerville, G.L. & Emin, P. (1969).', 'Rapid estimation of heat accumulation from maximum and minimum temperatures. Ecology 50: 514–517.'],
    ['gdd', 'Allen, J.C. (1976).', 'A modified sine wave method for calculating degree days. Environmental Entomology 5: 388–396.'],
    ['gdd', 'Lindsey, A.A. & Newman, J.E. (1956).', 'Use of official weather data in spring time: temperature analysis of an Indiana phenological record. Ecology 37: 812–823.'],
    ['gdd', 'Zalom, F.G., Goodell, P.B., Wilson, L.T., Barnett, W.W. & Bentley, W.J. (1983).', 'Degree-days: the calculation and use of heat units in pest management. University of California, Division of Agriculture and Natural Resources, Leaflet 21373.'],
    ['gdd', 'Brown, D.M. (1975).', 'Heat units for corn in southern Ontario. Ontario Ministry of Agriculture and Food, Factsheet 75-077.'],
    ['gdd', 'Arnold, C.Y. (1959).', 'The determination and significance of the base temperature in a linear heat unit system. Proceedings of the American Society for Horticultural Science 74: 430–445.'],
    ['gdd', 'Neild, R.E. & Newman, J.E. (1990).', 'Growing season characteristics and requirements in the Corn Belt. National Corn Handbook NCH-40. Purdue University Cooperative Extension Service.'],
    ['gdd', 'Abendroth, L.J., Elmore, R.W., Boyer, M.J. & Marlay, S.K. (2011).', 'Corn growth and development. PMR 1009. Iowa State University Extension.'],
    ['gdd', 'Miller, P., Lanier, W. & Brandt, S. (2001).', 'Using growing degree days to predict plant stages. MontGuide MT200103 AG. Montana State University Extension.'],
    ['gdd', 'Ritchie, S.W., Hanway, J.J. & Benson, G.O. (1993).', 'How a corn plant develops. Special Report 48. Iowa State University of Science and Technology, Cooperative Extension Service.'],
    ['chill', 'Weinberger, J.H. (1950).', 'Chilling requirements of peach varieties. Proceedings of the American Society for Horticultural Science 56: 122–128.'],
    ['chill', 'Richardson, E.A., Seeley, S.D. & Walker, D.R. (1974).', 'A model for estimating the completion of rest for \'Redhaven\' and \'Elberta\' peach trees. HortScience 9: 331–332.'],
    ['chill', 'Fishman, S., Erez, A. & Couvillon, G.A. (1987).', 'The temperature dependence of dormancy breaking in plants: mathematical analysis of a two-step model involving a cooperative transition. Journal of Theoretical Biology 124: 473–483.'],
    ['chill', 'Erez, A., Fishman, S., Linsley-Noakes, G.C. & Allan, P. (1990).', 'The dynamic model for rest completion in peach buds. Acta Horticulturae 276: 165–174.'],
    ['chill', 'Anderson, J.L., Richardson, E.A. & Kesner, C.D. (1986).', 'Validation of chill unit and flower bud phenology models for \'Montmorency\' sour cherry. Acta Horticulturae 184: 71–78.'],
    ['chill', 'Linvill, D.E. (1990).', 'Calculating chilling hours and chill units from daily maximum and minimum temperature observations. HortScience 25: 14–16.'],
    ['chill', 'Luedeling, E. (2012).', 'Climate change impacts on winter chill for temperate fruit and nut production: a review. Scientia Horticulturae 144: 218–229.'],
    ['chill', 'Meier, U. (ed.) (2018).', 'Growth stages of mono- and dicotyledonous plants: BBCH Monograph. Julius Kühn-Institut, Quedlinburg.'],
    ['chill', 'Zadoks, J.C., Chang, T.T. & Konzak, C.F. (1974).', 'A decimal code for the growth stages of cereals. Weed Research 14: 415–421.'],
    ['chill', 'Forsythe, W.C., Rykiel, E.J., Stahl, R.S., Wu, H. & Schoolfield, R.M. (1995).', 'A model comparison for daylength as a function of latitude and day of year. Ecological Modelling 80: 87–95.'],
    ['water', 'Thornthwaite, C.W. & Mather, J.R. (1955).', 'The water balance. Publications in Climatology 8(1). Drexel Institute of Technology, Centerton, NJ.'],
    ['water', 'Thornthwaite, C.W. & Mather, J.R. (1957).', 'Instructions and tables for computing potential evapotranspiration and the water balance. Publications in Climatology 10(3): 185–311.'],
    ['water', 'Doorenbos, J. & Kassam, A.H. (1979).', 'Yield response to water. FAO Irrigation and Drainage Paper 33. FAO, Rome.'],
    ['water', 'Smith, M. (1992).', 'CROPWAT: a computer program for irrigation planning and management. FAO Irrigation and Drainage Paper 46. FAO, Rome.'],
    ['water', 'Dastane, N.G. (1974).', 'Effective rainfall in irrigated agriculture. FAO Irrigation and Drainage Paper 25. FAO, Rome.'],
    ['water', 'USDA Natural Resources Conservation Service (2004).', 'Estimation of direct runoff from storm rainfall. National Engineering Handbook, Part 630 Hydrology, Chapter 10. Washington, DC.'],
    ['clima', 'Walter, H. & Lieth, H. (1960–1967).', 'Klimadiagramm-Weltatlas. Gustav Fischer Verlag, Jena.'],
    ['clima', 'De Martonne, E. (1926).', 'Une nouvelle fonction climatologique: l\'indice d\'aridité. La Météorologie 2: 449–458.'],
    ['clima', 'Lang, R. (1920).', 'Verwitterung und Bodenbildung als Einführung in die Bodenkunde. Schweizerbart, Stuttgart.'],
    ['clima', 'UNEP (1992).', 'World atlas of desertification. Middleton, N. & Thomas, D.S.G. (eds.). Edward Arnold, London.'],
    ['clima', 'Snyder, R.L. & de Melo-Abreu, J.P. (2005).', 'Frost protection: fundamentals, practice and economics. FAO Environment and Natural Resources Series 10. FAO, Rome.'],
    ['clima', 'FAO (1978).', 'Report on the agro-ecological zones project. Vol. 1: Methodology and results for Africa. World Soil Resources Report 48. FAO, Rome.'],
  ];

  /* ---------------- rendering ---------------- */
  const two = p => L2(p[0], p[1]);

  function renderStepper() {
    const nav = el('stepper'); if (!nav) return;
    nav.innerHTML = STEPS.map(s => `<button class="step-btn${s.n === 1 ? ' active' : ''}" data-step="${s.n}"${s.ready ? '' : ' disabled'}><span class="step-num">${s.n}</span>${two([s.es, s.en])}</button>`).join('');
  }
  function renderFeatures() {
    const g = el('featureGrid'); if (!g) return;
    g.innerHTML = BLOCKS.map(b => {
      const ready = STEPS.find(s => s.n === b.n).ready;
      return `<div class="feature" data-step="${b.n}"><div class="f-num">${b.n}</div><div class="f-art">${Art[b.art]()}</div>
        <span class="f-tag">${two(b.tag)}${ready ? '' : `<span class="f-soon">${L2('próximamente', 'coming soon')}</span>`}</span><h3>${two(b.t)}</h3><p>${two(b.d)}</p></div>`;
    }).join('');
    g.addEventListener('click', e => {
      const f = e.target.closest('.feature'); if (!f) return;
      const n = f.dataset.step;
      const btn = document.querySelector(`.step-btn[data-step="${n}"]`);
      if (btn && !btn.disabled) goStep(n);
      else { const m = el('homeMessages'); if (m) { clearMessages(m); showMessage(m, 'info', L2(`El Bloque ${n} llega en la siguiente etapa de construcción. Mientras tanto, los laboratorios de esta página ya calculan con el motor completo.`, `Block ${n} arrives in the next stage of construction. Meanwhile, the laboratories on this page already compute with the complete engine.`)); m.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
    });
  }
  function renderMaterials() {
    const g = el('materialStrip'); if (!g) return;
    g.innerHTML = MATERIALS.map(m => `<div class="material">${Art[m.art]()}<div class="mt-t">${two(m.t)}</div><div class="mt-s">${two(m.s)}</div><span class="mt-k ${m.kc}">${two(m.k)}</span></div>`).join('');
  }
  let methodFilter = 'all';
  function renderMethods() {
    const f = el('methodFilter'), g = el('methodGallery'); if (!g) return;
    if (f && !f.dataset.ready) {
      f.dataset.ready = '1';
      f.innerHTML = Object.keys(FAMS).map(k => `<button class="chip${k === 'all' ? ' on' : ''}" data-fam="${k}">${two(FAMS[k])}</button>`).join('');
      f.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; methodFilter = b.dataset.fam; els('.chip', f).forEach(c => c.classList.toggle('on', c === b)); renderMethods(); });
    }
    g.innerHTML = METHODS.filter(m => methodFilter === 'all' || m.f === methodFilter).map(m =>
      `<div class="method-card"><span class="m-fam ${m.f}">${two(FAMS[m.f])}</span>${Art[m.art]()}<div class="m-name">${two(m.n)}</div><div class="m-sub">${two(m.s)} · ${L2('Bloque', 'Block')} ${m.b}</div></div>`).join('');
  }
  function renderCompare() {
    const box = el('methodCompare'); if (!box) return;
    box.innerHTML = `<table><thead><tr><th></th>${COMPARE.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
      COMPARE.rows.map(r => `<tr><td>${two(r.t)}</td>${r.v.map(v => `<td>${two(v)}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
  }
  function renderBring() {
    const g = el('bringGrid'); if (!g) return;
    g.innerHTML = BRING.map(b => `<div class="bring"><div class="b-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b.ic}</svg></div><div><b>${two(b.t)}</b><span>${two(b.s)}</span></div></div>`).join('');
  }
  let refFilter = 'all';
  function renderRefs() {
    const f = el('refFilter'), g = el('refList'); if (!g) return;
    if (f && !f.dataset.ready) {
      f.dataset.ready = '1';
      f.innerHTML = Object.keys(RFAM).map(k => `<button class="chip${k === 'all' ? ' on' : ''}" data-fam="${k}">${two(RFAM[k])}</button>`).join('');
      f.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; refFilter = b.dataset.fam; els('.chip', f).forEach(c => c.classList.toggle('on', c === b)); renderRefs(); });
    }
    g.innerHTML = REFS.filter(r => refFilter === 'all' || r[0] === refFilter).map(r => `<li><b>${r[1]}</b> ${r[2]}</li>`).join('');
  }
  /* illustrations that contain translated labels are redrawn when the language changes */
  function renderArt() {
    const h = el('heroArt'); if (h) h.innerHTML = Art.hero();
    const figs = { theoryGddFig: 'figCutoffs', theoryEtoFig: 'figPM', theoryKcFig: 'figKc', theoryBucketFig: 'figBucket', theoryClimoFig: 'figClimograph', theoryChillFig: 'figChill', theorySeasonFig: 'figSeason' };
    for (const id in figs) {
      const n = el(id);
      if (n) { const cap = n.querySelector('.cap'); n.innerHTML = Art[figs[id]](); if (cap) n.appendChild(cap); }
    }
    const b = el('brandLogo'); if (b) b.innerHTML = Art.logo();
    els('.soon-art').forEach(n => { n.innerHTML = Art.soon(); });
  }

  function wire() {
    const nav = el('stepper');
    if (nav) nav.addEventListener('click', e => { const b = e.target.closest('.step-btn'); if (b && !b.disabled) goStep(b.dataset.step); });
    const brand = el('brand'); if (brand) brand.addEventListener('click', () => goStep(1));
    const scrollTo = id => { const n = el(id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    const on = (id, fn) => { const n = el(id); if (n) n.addEventListener('click', fn); };
    on('startBtn', () => {
      const b = document.querySelector('.step-btn[data-step="2"]');
      if (b && !b.disabled) goStep(2);
      else { const m = el('homeMessages'); if (m) { clearMessages(m); showMessage(m, 'info', L2('La carga de tu propia estación llega con el Bloque 2. Mientras tanto, prueba los laboratorios y la teoría de esta página: ya calculan con el motor completo.', 'Loading your own station arrives with Block 2. Meanwhile, try the labs and the theory on this page: they already compute with the complete engine.')); m.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
    });
    on('simBtn', () => scrollTo('labs'));
    on('theoryBtn', () => { scrollTo('theory'); const first = document.querySelector('#theory .acc'); if (first) first.open = true; });
    on('citeBtn', () => scrollTo('cite'));
    on('copyCite', () => {
      const t = el('citeText'); if (!t || !navigator.clipboard) return;
      const txt = [...t.querySelectorAll('[data-l="' + I18N.lang + '"]')].map(n => n.textContent).join('') || t.textContent;
      navigator.clipboard.writeText(txt.trim()).then(() => { const b = el('copyCite'); if (b) { b.textContent = T('✓ Copiada', '✓ Copied'); setTimeout(() => I18N.apply(b.parentNode), 1800); } });
    });
    els('[data-goto]').forEach(n => n.addEventListener('click', () => { const s = n.dataset.goto; const b = document.querySelector(`.step-btn[data-step="${s}"]`); if (b && !b.disabled) goStep(s); }));
    const redraw = () => { renderArt(); renderFeatures(); renderMaterials(); renderMethods(); renderCompare(); renderBring(); renderRefs(); Fig.decorate(); };
    document.addEventListener('langchange', redraw);
    document.addEventListener('themechange', renderArt);
  }

  function init() {
    renderStepper(); renderArt(); renderFeatures(); renderMaterials(); renderMethods(); renderCompare(); renderBring(); renderRefs(); wire();
    I18N.apply();
    Fig.decorate();
  }
  document.addEventListener('DOMContentLoaded', init);
  window.Home = { BLOCKS, METHODS, REFS, MATERIALS, COMPARE, FAMS };
})();
