# Changelog

## 1.1.0 — 2026-09-30

The editor of each figure.

- **`js/figedit.js`**: every figure of every block gets a ✎ button next to the export button. It opens a
  six-tab editor for that one figure: **General** (title, subtitle and footnote inside the figure, which
  enlarges its box; font family; size and colour of every text; line weight; point size; background;
  border), **Axes & grid** (axis titles, tick numbers, axis colour and weight, plot-area box, grid on/off,
  dash, strength and colour), **Series** (every colour named after its legend entry: colour, weight, dash,
  opacity, hide), **Legend** (show, eight positions, row or column, box, size, entry labels), **Texts**
  (every text one by one: wording, size, bold, italics, colour, hide) and **Annotations** (notes, arrows,
  horizontal and vertical reference lines at an axis value, shaded bands, panel letter).
- The legend, the notes, the letters and the arrows are dragged on the figure; a click on a text of the
  figure jumps to its row; the panel itself is moved by its header.
- The edits are stored per figure and reapplied on every redraw (data, parameters, language, theme); they go
  into the export menu, the catalogue of Block 10, the report and the package, and the calculation record
  lists the edited figures. "Copy the style to every figure" and "Undo everything on this figure".
- The plotting kit tags the legend, the axis titles, the ticks, the plot area and the axis ranges; the export
  honours a figure whose box was enlarged upwards and strips the editor's bookkeeping from the SVG.
- Help entry `figedit`; 33 new tests (424 in all); the manual's chapter 10 describes the editor.


## 1.0.1 — 2026-09-27

Two small fixes found while writing the Spanish manual, and the manual itself.

Published on GitHub (luisangelbg/PhenologyPro, GitHub Pages) and archived on Zenodo: concept DOI
10.5281/zenodo.23004710, version DOI 10.5281/zenodo.23004711.

- Block 7: when the controlled-deficit strategy applies *more* water than irrigating at RAW depletion (it can,
  with summer rains: it irrigates later and refills an emptier bucket), the comparison sentence says so instead
  of reporting a negative saving.
- The two-column panes no longer squeeze a figure next to a wide table (Block 7 calendar).
- `manual/`: the user's manual in Spanish, in HTML parts (cover, introduction, one chapter per block, appendices),
  with its capture recipes and tools. The PDF is produced at the end.


## 1.0.0 — 2026-09-26

Block 10: figures, report and package. The application is complete.

- **ZIP writer** (`js/zip.js`): local headers, central directory and end record as in the PKWARE
  specification, UTF-8 names, CRC-32 shared with the figure export, entries deflated with the browser's
  own CompressionStream (deflate-raw) or stored when that is not available; `list` and `extract` read
  the archive back for the tests.
- **Report** (`js/report.js`): one self-contained HTML file with the executive summary, a numbered
  section per computed block (site and data quality, climate, degree-days, ETo, water balance,
  irrigation, phenology, risks and scenarios) with its tables and its figures inlined as SVG with the
  colours resolved, the methods written from what was actually run (the substitutes used for missing
  data with their share of days, the degree-day method and cut-off, whether the thermal requirements
  were calibrated, the irrigation rule…), the references of those methods only, how to cite and the
  calculation record as an appendix; the tables of the study as `.csv`; the parameter record.
- **Block 10 page** (`js/block10.js`): the state of the study, the catalogue of every figure drawn with
  thumbnails, selection by block, export one by one or in batch (PNG, JPG, SVG; 150–900 dpi; light or
  dark; background), the report preview, download and print-to-PDF, and the reproducible package.
- Four help entries (formats, resolution, methods written from the computation, reproducibility).
- 391 tests.


## 0.9.0 — 2026-09-26

Block 9: risks and scenarios.

- **Risk module** (`js/risk9.js`): the stage windows of a season; frost and heat days inside each stage in every
  year with the probabilities by stage and over the cycle; the daily probability of frost and heat through the
  year; the sowing window that judges every date by four criteria in the same year (maturity, frost, heat shock,
  rain-fed water) and finds the recommended windows and the best date; and the delta scenarios that shift the
  temperatures and scale the rain and rerun phenology, risk, Penman–Monteith ETo, the water balance and the chill.
- **Five figures** (`js/plots9.js`): risk by stage, risk by date with the stages, the sowing window with each
  criterion and their conjunction, the scenario indicators relative to the current climate, and the crop calendar
  in each scenario.
- **Block 9 page** that inherits the crop and stages of Block 8, the sowing of Block 6, the frost threshold of
  Block 3 and the soil of Block 6, with tiles, tables, verdicts and a .csv of the window. Three new interpretation
  entries (heat shock, the success of a date, scenarios). 13 new tests (364 in total).

## 0.8.0 — 2026-09-26

Block 8: phenology on the series.

- **Phenology module** (`js/pheno8.js`): the stages of a crop dated by thermal time in every year with their
  spread across years; the calibration of requirements from observed dates (mean, CV in °C·d and in days) and
  Arnold's (1959) search of the base temperature that minimises the CV; a parser of pasted observations; the
  chill of every winter with hourly temperatures rebuilt by Linvill (1990) and the three units accumulated day
  by day, the summary across winters, the probability and date of meeting a requirement, and the bloom date by
  growing degree hours after the chill; the photoperiod of the site; and a teaching set of example observations
  generated from the model with noise, labelled as such.
- **Seven figures** (`js/plots8.js`): the phenological calendar with P20–P80 whiskers, the stages of every year,
  the observed °C·d by stage, Arnold's CV curve, the chill accumulation of every winter, the total chill by
  winter against the requirement, and the day length.
- **Block 8 page** with the editable stage table, tiles, tables, the calibration workflow with apply buttons,
  the chill settings inherited from the deciduous crops of the catalogue and .csv exports. Four new
  interpretation entries (BBCH, calibration, the winter window, GDH). 19 new tests (351 in total).

## 0.7.0 — 2026-09-25

Block 7: irrigation scheduling.

- **Engine**: the daily balance now takes four irrigation rules (at a fraction of RAW, at a fixed net depth, every
  N days, on given dates), refill or fixed applications, a start-after and a stop-before window and the
  minimum interval of the system.
- **Irrigation module** (`js/irrig7.js`): the usual systems with their application efficiency; the balance of
  Block 6 run with a rule in every year; the calendar of a season with date, stage, depletion, net and gross
  depths, m³/ha and hours; the four strategies side by side with rain-fed; the gross depth by calendar month;
  the design figures (peak ETc P90 ÷ efficiency, seasonal P80, largest application); and the savings against
  a customary interval-and-depth practice.
- **Four figures** (`js/plots7.js`): the calendar of a year with rain and depletion, gross irrigation and yield
  by year, the strategies, and the gross depth by month.
- **Block 7 page** with the context inherited from Block 6, tiles, a verdict, the year picker, the calendar
  table, the strategies table, the design list and the savings paragraph. Three new interpretation entries
  (rules, efficiency, design). 19 new tests (332 in total).

## 0.6.0 — 2026-09-25

Block 6: the water balance of the crop on the series.

- **Catalogue**: the seasonal yield-response factor Ky of FAO-33 (Doorenbos & Kassam 1979, Table 24) for every
  crop, 1.0 where the paper gives no value.
- **Water module** (`js/water6.js`): the Kc curve corrected to the season's wind and minimum humidity; the
  FAO-56 daily balance of one season with the few missing ETo days filled by the monthly mean and the missing
  rain by zero, both counted; the totals and the Ks by stage; the relative yield 1 − Ky (1 − ETa/ETm); every
  year with the medians and percentiles and the median year; the relative yield of every sowing date with the
  date of the highest P20; the climatic irrigation need by month (ETo − effective rain).
- **Seven figures** (`js/plots6.js`): demand and depletion of one season with the stages, the years compared,
  the relative yield by year, the balance by stage, the yield by sowing date and the monthly need.
- **Block 6 page** with crop and soil loaded from the catalogues and editable, tiles, a verdict, the year
  picker, tables and .csv exports. Two new interpretation entries (Ky and the curve number). 18 new tests
  (313 in total).

## 0.5.0 — 2026-09-25

Block 5: reference evapotranspiration on the series.

- **ETo module** (`js/eto5.js`): the FAO-56 Penman–Monteith pipeline on every day of the record with the humidity,
  radiation and wind that the station measured and the FAO-56 substitutes for what it did not, counting how many
  days used each; Hargreaves–Samani with editable coefficient and exponent, Priestley–Taylor, Turc (with the
  relative humidity derived from ea/es when it was not measured) and Thornthwaite from the normals of Block 3;
  monthly means with the between-year percentiles, the daily P90 and maximum of each month, annual totals; the
  calibration of any alternative against the reference (factor k, regression, bias, RMSE before and after each
  correction, R², monthly factors); the two terms of Penman–Monteith and the radiation budget by month; and the
  daily ETo the later blocks use, by the chosen method and correction.
- **Six figures** (`js/plots5.js`): the methods by month with the P20–P80 band, the record, the two terms
  stacked, Ra/Rso/Rs/Rn, the day-by-day scatter with the 1:1, regression and factor lines, and the annual totals.
- **Block 5 page** with the estimation settings, tiles, the sentence the report will repeat, tables, calibration
  and the choice for Blocks 6 and 7. Three new interpretation entries (estimates, the two terms, calibration).
  22 new tests (295 in total).

## 0.4.0 — 2026-09-25

Block 4: degree-days and thermal time on the series.

- **Thermal module** (`js/thermal4.js`): the °C·d of every day of the record by any method; the accumulation from a
  start day with the fractional day of the target, marks at 30/60/90/120 days, missing days counted and an optional
  stop at the first frost; the same date in every year with the median, P20 and P80 of the days to the target and
  of the season's °C·d; the median curve across years; the sowing-date map every five days with the best date; the
  thermal calendar by month; the °C·d of each year; the six methods and four cut-offs on one season with the CHU.
- **Six figures** (`js/plots4.js`): the accumulation of every year with the median band and the stages of the crop,
  the thermal calendar, the °C·d of each year, the °C·d available and the days to the target by sowing date, and
  the methods compared.
- **Block 4 page** with the crop loaded from the catalogue, tiles, a written verdict, tables by year, by month, by
  sowing date and by method, and .csv exports. Three new interpretation entries (between-year variability, the
  sowing-date map, Ontario heat units). 23 new tests (273 in total).

## 0.3.0 — 2026-09-25

Block 3: the climate of the site.

- **Climate module** (`js/climate3.js`): monthly normals with the 80 % rule per month-year and the spread between
  years; the Walter–Lieth data (humid, dry and perhumid months, certain and probable frost); the rain regime with
  Oliver's concentration index, the warm-half share and the agronomic onset and end of the rainy season (Stern,
  Dennett & Garbutt 1981) counted from the driest month; frost by season split at the warmest month, with the
  frost-free period, empirical probability curves and the dates for a 50, 20 and 10 % risk; Thornthwaite PET, the
  Thornthwaite–Mather balance, the UNEP, De Martonne and Lang indices, the 1955 moisture index and its classes,
  the FAO growing period; Köppen–Geiger by the criteria of Peel, Finlayson & McMahon (2007) with the hemisphere
  handled, and García's P/T humidity subtype.
- **Six figures** (`js/plots3.js`): normals with the P20–P80 whiskers, the full Walter–Lieth climograph, the
  calendar of every year (frost-free period, frost dates, rainy season), the frost probability curves, the
  Thornthwaite–Mather balance and the soil storage.
- The cold-plateau example now has a wetter April and a drier October, so that Peel's summer-dry test no
  longer turns a Cwb site into Csb by a few millimetres.
- **Block 3 page**: criteria (years, frost threshold, soil, onset thresholds), a written paragraph of the climate,
  eight tiles, tables of normals, seasons, frost dates by risk, frost by month, indices and balance; normals as
  .csv. Four new interpretation entries. 37 new tests (250 in total), including nine known Köppen cases.

## 0.2.0 — 2026-09-25

Block 2: the site and its daily series.

- **Reading** (`js/wxio.js`): delimiter detection (tab, semicolon, comma, spaces), header and preamble detection, the
  missing-value tokens of the usual sources (blank, NA, Nulo, −99, −999, 9999, trace), decimal commas, dates in
  ISO, day/month/year, month/day/year or as year + month + day or year + day of year, column roles from names in
  Spanish and English and from content, wind and radiation unit conversions with the anemometer height brought
  to 2 m, one row per calendar day with the absent dates inserted as gaps.
- **Quality control**: physical ranges, Tmax below Tmin swapped or removed, isolated spikes and flat runs flagged
  and kept, short gaps interpolated in the continuous variables with the rain never interpolated, mean
  temperature derived, statistics by variable and by year, availability calendar, what the data allow.
- **Block 2 page**: site with its derived constants, four ways to bring a series in (paste, file, template,
  six teaching examples with optional seeded errors), roles table, QC options, tables, two figures, clean .csv,
  project .json, and the series kept in the browser between sessions.
- Seven new interpretation entries (coordinates, data sources, anemometer height, quality control, gap filling,
  complete years, capabilities). 38 new tests (213 in total).

## 0.1.0 — 2026-09-25

Block 1: the home page and the complete engine.

- **Engine** (`js/agromet.js`): radiation and astronomy, the atmosphere, five ETo methods with the FAO-56
  procedures for missing data, six degree-day methods with three cut-offs, Ontario heat units, hourly temperatures
  (Linvill 1990), three chill models and growing degree hours, the Kc curve with its climatic correction,
  effective rain, curve-number runoff, the Thornthwaite–Mather monthly balance, the FAO-56 daily root-zone
  balance with irrigation, and four climate indices. 175 tests against the worked examples of FAO-56 and the
  closed forms of the methods.
- **Crop catalogue** (19 crops, FAO-56 tables, orientative thermal-time requirements) and **soil catalogue**
  (FAO-56 Table 19).
- **Six synthetic climates** for the laboratories, fictional and seeded.
- **Home page**: hero, workflow, two laboratories (thermal time and water) that compute with the real engine,
  block cards, production systems, 20 methods, the ETo methods side by side, seven theory sections, decision
  guide, citation and 40 references.
- **Interpretation help** with 16 entries and their reading scales (ETo, Kc, TAW, Ks, chill portions, aridity,
  frost…), applied to the numbers on screen as coloured chips.
- **Figure studio** (nine palettes, seven fonts, background, text and line scales, grid) and **figure export**
  (PNG/JPG/SVG, 150–900 dpi, light or dark, title and footnote) available from the first block.
- Fixed while testing: the daily balance now applies the irrigation of the day before evaluating the stress
  coefficient, so a soil refilled in the morning does not register a stress day.
