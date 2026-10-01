# Manual de usuario de PhenologyPro

El manual se escribe por partes, en HTML, con el mismo estilo que los manuales de EconomicsPro, PhylogenyPro,
BreedingPro, PopGeneticsPro y las demás apps LABG. Primero se hace en español; la versión en inglés se decide al
final. Cuando todas las partes estén listas se unen en un solo documento y se imprime a PDF **una sola vez**.

```
manual/
  manual.css           hoja común: tamaño carta y marco de la portada
  interior.css         páginas interiores: hojas blancas, vivos en azul profundo y negro, un color por bloque
  paginar.js           reparte el contenido en hojas tamaño carta (encabezados, números de página, índice)
  img/                 capturas de pantalla de la app
  herramientas/
    captura.ps1        abre la app, ejecuta una receta y guarda la captura en img/ al doble de resolución
    recetas/           una receta por captura (JS): inicio, bN-…
    evaluar.ps1        abre una página sin ventana, ejecuta un guion y escribe el resultado (recortes, marcas, valores)
    huecos.js          guion para evaluar.ps1: el hueco al pie de cada hoja de una parte del manual
    unir-manual.ps1    une la portada y las partes en es/manual-completo.html para imprimir el manual completo
                       (no hay Perl en esta máquina, así que se usa la versión en PowerShell)
  es/
    00a-portada.html   portada blanca: título en español e inglés; al centro, el año agroclimático de un sitio
                       —la temperatura y la lluvia mes a mes como en un climograma, y sobre ellas la curva del
                       tiempo térmico de un cultivo con sus etapas fechadas—; a los lados, maíz, trigo, frijol,
                       jitomate, manzano y café con su nombre científico; abajo, cuatro viñetas: los grados-día de
                       un día por el método del seno, los dos términos de Penman–Monteith, el agua de la zona
                       radical con sus riegos y la ventana de siembra (todo dibujado con gráficos vectoriales
                       originales, con semilla fija)
```

Las capturas se toman con la app abierta desde `file://`, en español, tema claro, 1400 × 900, al doble de
resolución, con el ejemplo **«Valle templado (2 250 m)», 20 años, sin errores sembrados**, salvo donde el
texto diga otra cosa (el Bloque 2 enseña también la variante con errores). Todos los números del manual salen
de esa corrida.

## Plan de partes

| Parte | Archivo | Contenido |
|---|---|---|
| 1 | `00a-portada.html` | portada (**lista**) |
| 2 | `00b-introduccion.html` | créditos, índice general, cómo leer el manual e introducción I.1–I.9 (**lista**) |
| 3 | `01-bloque1.html` | Bloque 1 · Inicio: el motor agroclimático, los dos laboratorios, los 20 métodos, los seis usos, la teoría y las referencias (**lista**) |
| 4 | `02-bloque2.html` | Bloque 2 · Datos climáticos: el sitio, la serie diaria (pegar, archivo, plantilla, ejemplos), los papeles de las columnas, el control de calidad, lo que los datos permiten y el proyecto (**lista**) |
| 5 | `03-bloque3.html` | Bloque 3 · El clima del sitio: años y criterios, climograma, normales, régimen de lluvias, heladas, índices, balance climático y Köppen–Geiger (**lista**) |
| 6 | `04-bloque4.html` | Bloque 4 · Grados-día: métodos y cortes, acumulación por año, calendario térmico, mapa por fecha de siembra y cuánto importa el método (**lista**) |
| 7 | `05-bloque5.html` | Bloque 5 · ETo: lo que se estima cuando falta, Penman–Monteith y los métodos simples, los dos términos, la radiación, la calibración y qué ETo usan los bloques siguientes (**lista**) |
| 8 | `06-bloque6.html` | Bloque 6 · Balance hídrico: cultivo, suelo y siembra, el balance en temporal año por año, por etapa, por fecha de siembra y la necesidad climática de riego (**lista**) |
| 9 | `07-bloque7.html` | Bloque 7 · Riego: sistema y regla, el calendario año por año, cuatro estrategias, riego por mes, diseño y ahorro (**lista**) |
| 10 | `08-bloque8.html` | Bloque 8 · Fenología: etapas BBCH por tiempo térmico, calibración con fechas observadas y base de Arnold, frío invernal y fotoperiodo (**lista**) |
| 11 | `09-bloque9.html` | Bloque 9 · Riesgos y escenarios: helada y calor por etapa, la ventana de siembra y los escenarios de calentamiento (**lista**) |
| 12 | `10-bloque10.html` | Bloque 10 · Figuras, informe y paquete: el estado del estudio, el catálogo de figuras, el informe y el paquete reproducible (**lista**) |
| 13 | `11-apendices.html` | apéndices A–F: archivos, reglas de decisión reunidas, glosario, cuando algo no sale, referencias, licencia y cita (**lista**) |

## Colores por bloque

Los de la franja de la portada, en el mismo orden; son los de la app.

| Bloque | Color | Variable |
|---|---|---|
| Preliminares e introducción | azul profundo `#16557a` | `--b0` |
| 1 Inicio | azul `#1f6f9f` | `--b1` |
| 2 Datos climáticos | pizarra `#5f6b86` | `--b2` |
| 3 Clima del sitio | turquesa `#3aa39a` | `--b3` |
| 4 Grados-día | calor `#d9552c` | `--b4` |
| 5 ETo | ámbar `#d8901c` | `--b5` |
| 6 Balance hídrico | lluvia `#2f5fc4` | `--b6` |
| 7 Riego | hoja `#4f8f3a` | `--b7` |
| 8 Fenología | violeta `#7b5ea7` | `--b8` |
| 9 Riesgos | rosa `#c0406a` | `--b9` |
| 10 Informe | tierra `#8a6a4a` | `--b10` |
| Apéndices | negro `#111111` | `--bx` |

## Cómo se trabaja

1. Cada parte se abre con doble clic y se ve ya paginada (paginar.js). Se revisa el hueco al pie de cada hoja con
   `evaluar.ps1 -ScriptFile herramientas\huecos.js -Page manual/es/NN-….html`.
2. Las capturas se toman con `captura.ps1 -Receta <nombre>`; cada receta deja en `window.__recorte` el recorte que
   la figura necesita, y la captura se recorta con `-Recorte`.
3. Al terminar todas las partes: `powershell -ExecutionPolicy Bypass -File herramientas\unir-manual.ps1 es` desde
   `manual/`, y se imprime `es/manual-completo.html` a PDF con `tools\local\shot.ps1 -Pdf` (hecho el 27 sep 2026:
   `PhenologyPro User's Manual.pdf`, 121 hojas tamaño carta, 14 MB; reimpreso el 30 sep 2026 con el editor de figuras). Las capturas más altas que la ventana de 900 px
   se toman con `-Alto 1400` o `-Alto 1800`; una figura que no cabe en la hoja se reduce con `figure.media` o un ancho fijo.
