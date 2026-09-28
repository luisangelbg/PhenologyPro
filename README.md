# PhenologyPro

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

**Agroclimatology and crop phenology — without writing code.** Degree-days, reference evapotranspiration
(FAO-56 Penman–Monteith, Hargreaves–Samani, Priestley–Taylor, Thornthwaite, Turc), crop coefficients, the daily
root-zone water balance, irrigation scheduling, phenological stages, winter chill, photoperiod, climographs and
frost risk, in the browser.

A web platform (HTML + JavaScript, no installation, no third-party libraries; it also runs offline from a local
copy) for the study that an agronomy thesis, an irrigation plan or a crop calendar has to hand in: what the climate
of the site is, how much heat it gathers from a sowing date, how much water the atmosphere and the crop demand,
how much stays in the soil, when to irrigate, when each stage arrives, whether the winter provides the chill an
orchard needs, and when to sow to lose neither to frost nor to drought.

The interface, the figures and the report are available in Spanish and English, with a light or dark theme.

## How to open it

1. Double-click **`index.html`**. It opens in the default browser, on the home page of Block 1. Everything is
   computed in the browser, so it works from the local copy, without a server and without an internet connection.
2. If your institution blocks pages opened as local files, double-click **`Open PhenologyPro.bat`** (or run
   `server.ps1` with PowerShell): it starts a small server on your own computer and opens `http://localhost:9450`.
   Run it as administrator to reach it from a tablet on the same Wi-Fi network; it prints the address.
3. The tests open the same way: double-click **`tests/index.html`**; all of them should come out green.

## The ten blocks

| Block | Content | Status |
|---|---|---|
| 1 | Home: thermal time laboratory (a crop of the catalogue sown in one of six synthetic climates, six degree-day methods and three cut-offs, the stages dated, the season checked against frost) and water laboratory (ETo by Hargreaves or Penman–Monteith, the FAO-56 Kc curve corrected to the climate, the daily root-zone balance with automatic irrigation), the theory in plain language, 20 methods, the ETo methods side by side, 40 references, the interpretation guide with 16 entries and their scales, the figure studio and the export of every figure | ✅ done |
| 2 | Climate data of the site: the site with what follows from it (Ra, N, pressure), the daily series pasted, dropped as .csv or .txt (including the space-separated text of Mexico's weather service) or loaded as a teaching example, column roles detected by name and content with date order and unit conversions, the series built one row per calendar day with absent dates inserted as gaps, quality control (physical ranges, Tmax < Tmin, spikes, flat runs, short-gap interpolation, rain never interpolated), statistics by variable and year, the whole record and the availability calendar as figures, what the data allow, the clean series as .csv and the project as .json, kept in the browser between sessions | ✅ done |
| 3 | The climate of the site: monthly normals with their between-year spread (P20/P80, absolute extremes, rain and frost days) computed on complete years, the last 30 or all months; the Walter–Lieth climograph with the conventions of the atlas; the rain regime (concentration index, warm-half share, agronomic onset and end of the rainy season year by year); frost by season with the last spring and first autumn frost, the frost-free period, the probability curves and the dates for a 50, 20 and 10 % risk; Thornthwaite PET and the Thornthwaite–Mather climatic balance, UNEP, De Martonne and Lang aridity, the moisture index, the FAO growing period, the Köppen–Geiger class by Peel et al. (2007) and García's P/T humidity subtype; a written paragraph and normals as .csv | ✅ done |
| 4 | Degree-days on the series: the crop's base, threshold, method and requirement loaded from the catalogue and editable; the accumulation from a sowing date in every year of the record with the median and P20–P80 curve, the days to the target and its date, the years that reach it, an optional stop at the first frost; the thermal calendar (°C·d per day by month with the between-year spread) and the °C·d of each year; the sowing-date map (every five days of the year: °C·d in the season, days to the target and the share of years that reach it, with the best date); the six methods and four cut-offs on the same season; tables and .csv exports | ✅ done |
| 5 | Reference evapotranspiration on the series: FAO-56 Penman–Monteith day by day with the prescribed substitutes for missing humidity, radiation and wind (kRs, Tdew ≈ Tmin − Δ, Ångström coefficients, a default wind) and a sentence that states what share of the days used each; Hargreaves–Samani, Priestley–Taylor, Turc and Thornthwaite compared by month and by year; the daily P90 and maximum as design values; the two terms of Penman–Monteith and the radiation budget by month; the calibration of Hargreaves (and of the other two) against Penman–Monteith with the factor k, the regression, bias, RMSE, R² and monthly factors; the choice of the ETo the water blocks will use; daily and monthly .csv | ✅ done |
| 6 | Water balance of the crop: the FAO-56 daily root-zone balance run in every year of the record with the ETo chosen in Block 5, the crop's stage lengths, Kc (corrected to the season's wind and humidity), root growth, depletion fraction and the FAO-33 yield-response factor, the soil's available water and curve-number runoff; the season of any year (demand and depletion), the years compared, the relative yield of each year, the balance by stage, the rain-fed relative yield of every sowing date with the best date, and the climatic irrigation need by month; tables and .csv exports | ✅ done |
| 7 | Irrigation scheduling: the balance of Block 6 irrigated in every year of the record with the system and its application efficiency; four rules (at RAW depletion, controlled deficit, fixed interval, fixed depth), refill or fixed applications, cut-offs after sowing and before harvest, the minimum interval of the system and a pre-sowing irrigation; the calendar of any year (dates, stage, depletion, net and gross depths, m³/ha, hours if the capacity is given), the years compared, the four strategies against rain-fed, the gross depth by month, the design capacity (peak ETc P90 ÷ efficiency) and the seasonal depth to plan for (P80), and the savings against the customary practice; .csv exports | ✅ done |
| 8 | Phenology on the series: the stages of the crop (an editable BBCH table with the thermal requirement of each) dated by thermal time in every year of the record, with the median, P20 and P80 date of each stage and the years that reach it; calibration with observed dates (year, stage, date pasted) giving the mean requirement, its coefficient of variation in °C·d against days, and Arnold's search of the base temperature that minimises the variation, applicable with one click; winter chill of every winter (chill hours, Utah units and chill portions from hourly temperatures rebuilt with Linvill's method), the probability of meeting a cultivar's requirement and the date it is met, and the bloom date from growing degree hours; the photoperiod of the site with civil twilight; tables and .csv exports | ✅ done |
| 9 | Risks and scenarios: frost and heat-shock days inside each stage of the crop in every year (with the sensitive stage flagged, editable thresholds and the crop's heat threshold), the probability of frost and heat on each day of the year with the stages laid over; the sowing window that, for every sowing date and every year, checks maturity, frost at the sensitive stage or in the cycle, heat shock at the sensitive stage and enough rain-fed water, and reports the share of years in which all held at once, with the recommended windows and the best date; and warming scenarios (+1, +2, +3 °C, optional rain change) that rerun the phenology, the frost and heat risk, Penman–Monteith ETo, the rain-fed balance and the winter chill, as a sensitivity analysis | ✅ done |
| 10 | Figures, report and package: the state of the study; the catalogue of every figure drawn (42 in a full study) with export one by one or all at once in PNG, JPG or SVG at 150–900 dpi, light or dark, in the style of the figure studio; the self-contained HTML report (summary, one section per computed block with its tables and figures inlined, methods written from what was actually run, the references of those methods only, how to cite, and the calculation record) that opens anywhere and prints to PDF; and the reproducible .zip package (report, project file, parameter record, tables as .csv, figures) written by the app's own ZIP writer | ✅ done |

## What it computes

The engine (`js/agromet.js`) is complete and checked by 175 unit tests against the worked examples of FAO
Irrigation and Drainage Paper 56 (examples 2, 3, 4, 8, 9, 10, 11, 15, 17, 18 and 20) and the closed forms of the
methods:

- astronomy and radiation: extraterrestrial radiation, day length, photoperiod with a twilight threshold, solar
  radiation from sunshine (Ångström–Prescott) or from the temperature range (Hargreaves), clear-sky, net shortwave
  and net longwave radiation;
- the atmosphere: pressure, psychrometric constant, saturation and actual vapour pressure from dew point, relative
  humidity or the minimum temperature, wind at 2 m, soil heat flux;
- reference evapotranspiration: FAO-56 Penman–Monteith with the complete pipeline that estimates what is missing
  and records how; Hargreaves–Samani; Priestley–Taylor; Thornthwaite (monthly); Turc;
- thermal time: average, capped average (the maize convention), single and double triangle, single and double
  sine, with horizontal, vertical and intermediate cut-offs; Ontario crop heat units; accumulation with the
  fractional day on which a target is reached;
- hourly temperatures from the daily extremes (Linvill 1990); chill hours, Utah units, chill portions of the
  Dynamic model, growing degree hours;
- crops: the four-segment Kc curve, the climatic correction of Kc mid and end, root growth, the adjusted depletion
  fraction, effective rainfall (USDA-SCS and FAO/AGLW), NRCS curve-number runoff, the Thornthwaite–Mather monthly
  balance and the FAO-56 daily root-zone balance with automatic, dated or no irrigation;
- climate indices: UNEP aridity, De Martonne, Lang, Thornthwaite's moisture index.

The crop catalogue (`js/crops.js`) carries 19 crops with the Kc, stage lengths, root depths and depletion fractions
of FAO-56 Tables 11, 12 and 22, the base and upper temperatures and, for the annuals, orientative thermal-time
requirements per BBCH stage that Block 8 will let you calibrate. The six climates of the laboratories
(`js/climate.js`) are fictional and seeded, so a result can be reproduced.

## Figures

Every figure is an SVG drawn from CSS tokens. The **figure studio** (palette button in the top bar) restyles all of
them at once: nine palettes (including Okabe–Ito and greyscale), seven fonts, background, text size, line weight
and grid. The ⤓ button of every panel exports that figure as PNG, JPG or SVG at 150 to 900 dpi, light or dark,
with a title and a footnote, and with the resolution written into the file.

## Manual

The user's manual in Spanish (120 letter-size pages) is in `manual/`: the parts in HTML (`manual/es/`, one chapter per
block, with the same figures and numbers as the app) and the printed **`PhenologyPro User's Manual.pdf`**. It opens
online at the address below.

## Repository, online version and citation

- Source: <https://github.com/luisangelbg/PhenologyPro>
- Online, with no installation: <https://luisangelbg.github.io/PhenologyPro/> (the same files; the data never leave
  your browser)
- Archived versions with DOI on Zenodo: the concept DOI is added to `CITATION.cff`, `codemeta.json` and the app as
  soon as the first release is archived.

If you use PhenologyPro, please cite it (the app copies the citation from the **How to cite** section of its home
page, and every report of Block 10 ends with it):

> Barrera-Guzmán, L.Á. (2026). *PhenologyPro: a browser-based platform for agroclimatology and crop phenology*
> (Version 1.0) [Computer software]. https://github.com/luisangelbg/PhenologyPro

## Provenance

PhenologyPro contains no code by anyone else and loads nothing from the network. The scientific constants it
carries (the equations and tables of FAO-56, the constants of the Dynamic chill model, the Utah weights) are cited
to their original publications in the source and on the home page. See `PROCEDENCIA.md`.

## License

GNU General Public License v3.0 or later. Copyright (C) 2026 Luis Ángel Barrera-Guzmán.
