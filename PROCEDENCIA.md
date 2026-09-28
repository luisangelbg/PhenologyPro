# Procedencia de PhenologyPro

Este documento dice, elemento por elemento, qué partes de PhenologyPro son obra
propia y cuáles no lo son, de dónde salen estas últimas y en qué situación
quedan. Se escribió para acompañar el registro de la obra ante el INDAUTOR y
para que cualquiera pueda comprobar lo que aquí se afirma sin tener que creerlo.

Última revisión: 25 de septiembre de 2026 (Bloque 1).

---

## 1. En una frase

PhenologyPro no contiene código de nadie más. Contiene ecuaciones y tablas de
constantes científicas publicadas —las de la FAO (Riego y Drenaje 56), las de
los métodos de grados-día, las del modelo dinámico de frío y las de los índices
climáticos—, todas citadas a su publicación original en el propio código y en
la portada de la app, y todas verificadas contra los ejemplos resueltos de sus
autores en la página de pruebas.

---

## 2. Lo que el programa no tiene

- **No usa ninguna biblioteca de terceros.** Ni jQuery, ni D3, ni Plotly, ni
  un motor de gráficas. Las figuras son SVG dibujado a mano en `js/plotkit.js`
  y `js/art.js`; el PNG exportado lo arma el propio navegador y `js/figure.js`
  le escribe la resolución con un CRC-32 propio. El paquete `.zip` del
  Bloque 10 lo escribe `js/zip.js` byte a byte según la especificación pública
  del formato (cabeceras locales, directorio central y registro final); la
  compresión la hace el propio navegador con `CompressionStream`, y el mismo
  CRC-32 de las figuras firma cada entrada. El informe (`js/report.js`) es
  texto HTML generado por el programa, sin plantillas ajenas.
- **No carga nada de la red.** `index.html` no tiene una sola etiqueta que
  apunte fuera de la carpeta: el ícono es un SVG incrustado en el atributo, la
  hoja de estilo y los archivos de JavaScript son locales. Por eso el programa
  abre con doble clic, sin servidor y sin conexión.
- **No hay código minificado, empaquetado ni pegado.** Ni carpeta `vendor/`,
  ni `node_modules/`, ni dependencia de compilación.
- **No hay datos de terceros.** Los seis climas de los laboratorios
  (`js/climate.js`) son ficticios, generados por el programa a partir de
  parámetros inventados con los órdenes de magnitud de regiones reales; no
  reproducen ninguna serie observada.

---

## 3. Las ecuaciones de FAO-56

**Dónde:** `js/agromet.js`, secciones 1, 2, 3 y 7. **Qué son:** las
ecuaciones de radiación, presión de vapor, Penman–Monteith, coeficiente de
cultivo y balance de la zona radical del documento *Crop evapotranspiration:
guidelines for computing crop water requirements* (Allen, Pereira, Raes &
Smith, 1998, FAO Irrigation and Drainage Paper 56), numeradas en el código
con el número que llevan en el documento.

**Por qué se pueden incluir:** son fórmulas científicas de dominio público
(una ecuación no es objeto de derecho de autor) y el documento de la FAO es de
libre reproducción con cita. La escritura en JavaScript es propia.

**Cómo se comprobó:** `tests/index.html` reproduce los ejemplos resueltos 2, 3,
4, 8, 9, 10, 11, 15, 17, 18 y 20 del documento con la precisión con que están
impresos.

## 4. Las tablas de FAO-56 (cultivos y suelos)

**Dónde:** `js/crops.js`. **Qué son:** los coeficientes de cultivo (Tabla 12),
las longitudes de etapa (Tabla 11), la profundidad de raíces y la fracción de
agotamiento (Tabla 22) y los rangos de agua disponible por textura (Tabla 19),
tomados en el punto medio de los rangos publicados para 19 cultivos y 7
texturas. Son valores numéricos de una publicación de acceso libre, citados.

Los **requerimientos térmicos por etapa** de los cultivos anuales son valores
orientativos redondeados a partir de boletines de extensión y de la
bibliografía fisiológica citada en la portada (Neild & Newman 1990; Abendroth
et al. 2011; Miller et al. 2001; McMaster & Wilhelm 1997), convertidos a °C
cuando estaban en °F. No se copió ninguna tabla: se escribieron intervalos
propios, marcados como orientativos y editables.

## 5. Constantes de modelos publicados

| Modelo | Constantes | Publicación |
|---|---|---|
| Modelo dinámico de frío | e0, e1, a0, a1, slp, tetmlt | Fishman, Erez & Couvillon (1987) *J. Theor. Biol.* 124: 473–483; Erez et al. (1990) *Acta Hortic.* 276: 165–174 |
| Modelo Utah | pesos por intervalo de temperatura | Richardson, Seeley & Walker (1974) *HortScience* 9: 331–332 |
| Grados-hora de crecimiento | 4.5, 25 y 36 °C | Anderson, Richardson & Kesner (1986) *Acta Hortic.* 184: 71–78 |
| Unidades calor de Ontario | 3.33, 0.084, 1.8, 4.4 | Brown (1975) OMAF Factsheet 75-077 |
| Thornthwaite | coeficientes del exponente *a* | Thornthwaite (1948) *Geogr. Rev.* 38: 55–94 |
| Índices de aridez | umbrales de clase | UNEP (1992); De Martonne (1926); Lang (1920) |

Son parámetros numéricos de modelos científicos, no expresión creativa de
nadie; se distribuyen con los mismos valores en programas independientes entre
sí y se citan aquí a su fuente.

## 6. Lo que sí es obra propia

Todo lo demás: la arquitectura por bloques, la interfaz bilingüe, la hoja de
estilo, las ilustraciones SVG, el kit de gráficas, el estudio de figuras, la
exportación, la ayuda de interpretación y sus escalas de lectura, el catálogo
de cultivos en la forma en que está escrito, el generador de clima sintético,
los laboratorios, los textos de teoría y las pruebas.

---

## 7. Cómo marcar la obra en el registro

Obra **primigenia**, sin marcar «adaptación» ni «derivada»: no se adaptó código
de nadie y las ecuaciones y constantes son material científico citado.
