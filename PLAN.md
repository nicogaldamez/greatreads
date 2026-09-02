# Book recommender desde export de Goodreads: plan de build

App estática: JS puro con módulos ES nativos, CSS puro, sin build step, sin
dependencias, sin backend, sin cuentas, sin base de datos. El usuario sube su
`goodreads_library_export.csv`, pega su propia API key de Gemini, y recibe
recomendaciones validadas contra un catálogo real.

---

## Decisiones ya tomadas

| Tema | Decisión | Por qué |
|---|---|---|
| Stack | JS puro + módulos ES nativos + CSS puro | Sin build, sin `node_modules`, sin lockfile que envejezca. |
| Tipos | JSDoc `@typedef` | Autocompletado en el editor sin compilar nada. |
| Tests | `node --test` sobre los mismos `.js` | Los módulos ES corren igual en Node y en el browser. |
| API key | BYOK, el usuario pone la suya, va a localStorage | Único camino a costo 0 con usuarios reales. |
| LLM | Gemini Flash (free tier, sin tarjeta) | Llamado directo desde el browser, tiene CORS. |
| Catálogo | Open Library, fallback Google Books | Sin key, sin cuota, con CORS. |
| CSV | Parseado 100% en el browser | Nunca sube nada. Es la historia de privacidad. |
| Hosting | Cloudflare Pages o GitHub Pages, sin build command | Servir el repo tal cual. |
| Idioma UI | Bilingüe ES/EN desde el día uno | Agregarlo después es un refactor de toda la UI; hacerlo de entrada es un módulo. |

**No construir en v1:** backend, cuentas, base de datos, modo demo con key
compartida, soporte multi-proveedor de LLM, PWA, dark mode toggle.

---

## Fase 0: Scaffold

Sin `npm create` nada. Carpeta vacía y estos archivos:

```
index.html
styles.css
src/
  lib/goodreads.js     # parseo del CSV -> Book[]
  lib/profile.js       # Book[] -> TasteProfile
  lib/gemini.js        # llamada al LLM
  lib/catalog.js       # validación contra Open Library / Google Books
  lib/storage.js       # wrapper de localStorage
  ui/render.js
  i18n/index.js       # t(), detección de locale, aplicar al DOM
  i18n/en.js
  i18n/es.js
  main.js
test/
  goodreads.test.js
  profile.test.js
  i18n.test.js
  fixtures/sample_export.csv
package.json           # solo { "type": "module" }, sin dependencias
README.md
LICENSE
```

`package.json` existe únicamente para que `node --test` trate los `.js` como
módulos ES. No tiene dependencias y no hay `npm install`.

En `index.html`: `<script type="module" src="src/main.js"></script>`.

Dev server: hace falta HTTP, `file://` rompe los módulos por CORS.
`python3 -m http.server 8000` y listo.

**Criterio de aceptación:** abrís localhost:8000 y ves la pantalla inicial;
`node --test test/` corre.

---

## Fase 1: Parseo del CSV (sin red, todo testeable)

Acá está el único costo real de ir sin dependencias: hay que escribir el parser.
Son ~40 líneas de máquina de estados RFC 4180, y **no se puede resolver con
`split(',')`** porque el campo `My Review` trae comas, comillas escapadas
(`""`) y saltos de línea adentro del campo. Un `split` te destruye el archivo en
el primer usuario que haya escrito una reseña.

La máquina de estados es simple: recorrés carácter por carácter con un flag
`inQuotes`; adentro de comillas, una comilla doble seguida de otra es una
comilla literal, y una sola cierra el campo. Fuera de comillas, coma corta campo
y newline corta fila.

Si preferís no escribirlo, vendorizá `papaparse.min.js` en `vendor/` y cargalo
con un `<script>` normal. Es un archivo, sigue sin haber build. Pero el parser
propio es testeable y no te ata a nada.

Columnas reales del export de Goodreads:

```
Book Id, Title, Author, Author l-f, Additional Authors, ISBN, ISBN13,
My Rating, Average Rating, Publisher, Binding, Number of Pages,
Year Published, Original Publication Year, Date Read, Date Added,
Bookshelves, Bookshelves with positions, Exclusive Shelf, My Review,
Spoiler, Private Notes, Read Count, Owned Copies
```

Trampas concretas, todas con test:

- **ISBN viene envuelto en fórmula de Excel**: `="0439023483"` y a veces `=""`.
  Strippear `="` y `"`. El vacío es vacío, no la string `""`.
- **`My Rating` en 0 significa sin calificar**, no "le puso cero".
- **`Exclusive Shelf`** vale `read`, `currently-reading` o `to-read`. Filtrar a
  `read` para el perfil; guardar los `to-read` aparte como lista de exclusión.
- **`Date Read` puede estar vacío** en libros marcados como leídos. Caer a
  `Date Added` para ordenar, y marcar el registro como fecha estimada.
- **`Bookshelves`** es CSV dentro del CSV, separado por coma-espacio.
- **BOM al inicio del archivo**: el primer header te viene como `\uFEFFBook Id`.
  Strippear `\uFEFF` antes de parsear headers.

```js
/**
 * @typedef {Object} Book
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {string} [isbn13]
 * @property {number|null} myRating
 * @property {number} avgRating
 * @property {Date|null} dateRead
 * @property {boolean} dateEstimated
 * @property {string[]} shelves
 * @property {'read'|'currently-reading'|'to-read'} exclusiveShelf
 * @property {number} [originalYear]
 */
```

**Criterio de aceptación:** un fixture con reseña multilínea, comillas escapadas,
ISBN con fórmula, rating 0 y Date Read vacío parsea correcto.

---

## Fase 2: Compresión del perfil

No mandarle 800 libros al modelo. Objetivo: ~60 libros bien elegidos, que dan
mejores recomendaciones que el CSV entero y bajan los tokens un orden de
magnitud.

```js
/**
 * @typedef {Object} TasteProfile
 * @property {BookRef[]} loved      - rating 5, hasta 30, más recientes primero
 * @property {BookRef[]} liked      - rating 4, hasta 15
 * @property {BookRef[]} disliked   - rating 1-2, hasta 15
 * @property {BookRef[]} recent     - últimos 20 por dateRead, con su rating
 * @property {[string, number][]} topShelves - top 15 del histograma
 * @property {{totalRead:number, avgRating:number, contrarianIndex:number}} stats
 */
```

Dos notas de diseño:

- **Los `disliked` importan tanto como los `loved`.** Un usuario que puso 1★ a
  todo el realismo mágico necesita que el modelo lo sepa. La mayoría de los
  recomendadores tira esta señal a la basura.
- **`contrarianIndex`** es la media de tu rating menos el promedio de Goodreads.
  Si es fuertemente negativo, sos exigente y el modelo debería evitar
  bestsellers de consenso. Metelo en el prompt como una línea de contexto.

Funciones puras, sin red, sin DOM. Todo testeado con `node --test`.

**Criterio de aceptación:** con un export de 500+ libros, `buildProfile()`
devuelve ≤60 refs y el JSON serializado pesa menos de 6 KB.

---

## Fase 3: Gestión de la key

- Pantalla inicial con dos pasos: subir CSV, pegar key.
- Link directo a AI Studio para sacar la key gratis, sin tarjeta.
- Guardar en `localStorage`, con un aviso explícito y honesto: la key vive en
  este browser, la app no tiene servidor, si compartís la máquina borrala.
- Botón de "olvidar mi key" bien visible.
- Validar la key con un ping mínimo al modelo antes de dejar avanzar, así el
  error aparece ahí y no después de parsear todo.

El nombre del modelo va en **una sola constante** en `gemini.js`. Google renombra
y deprecia modelos seguido; que cambiarlo sea una línea.

---

## Fase 4: La llamada al LLM

Endpoint: `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...`

Reglas del prompt:

1. Pedir **solo JSON**, sin backticks ni preámbulo. Igual parsear defensivo:
   strippear ` ```json ` si aparece.
2. Pasar la lista de exclusión (leídos + to-read, normalizados) y pedir
   explícitamente que no recomiende nada de ahí. Igual filtrar del lado del
   cliente, porque el modelo va a fallar en esto.
3. Pedir **mezcla deliberada**: ~60% apuestas seguras, ~40% laterales, y que
   marque cuál es cuál. Si no lo pedís, te devuelve doce variantes del último 5★.
4. Cada recomendación tiene que justificarse **contra libros específicos del
   perfil**, no con generalidades. "Porque te gustó la ciencia ficción" no sirve;
   "porque le pusiste 5★ a X y 1★ a Y" sí.
5. **Solo `reason` se traduce.** El idioma activo entra al prompt y define en qué
   idioma viene la justificación. `title` y `author` vienen siempre en la forma
   con la que el libro está catalogado, nunca traducidos. Ver la sección
   bilingüe más abajo, es la trampa principal.

```js
/**
 * @typedef {Object} Recommendation
 * @property {string} title
 * @property {string} author
 * @property {number} year
 * @property {string} reason        - debe nombrar libros concretos del perfil
 * @property {'safe'|'stretch'} kind
 * @property {number} confidence    - 0-1, autoreportada
 */
```

Pedir ~20 para quedarte con ~12 después de validar.

---

## Fase 5: Validación contra catálogo (la fase que define si la app sirve)

El modelo **va a inventar títulos** y va a atribuir libros al autor equivocado
con total seguridad. Sin este paso la app se prueba una vez y no se vuelve.

Para cada recomendación:

1. `https://openlibrary.org/search.json?title={t}&author={a}&limit=3`
2. Normalizar antes de comparar: minúsculas, sin puntuación, sin artículo
   inicial, cortar subtítulo después de `:`.
3. Match si el título normalizado coincide y el apellido del autor aparece en
   algún autor del resultado.
4. Si no matchea, probar Google Books como fallback.
5. Si no matchea en ninguno, **descartar** y contar. Mostrar el contador en un
   detalle chico, pero es información honesta y además te sirve a vos para comparar
   modelos y versiones del prompt.
6. Al que matchea, adjuntarle `cover_i` (portada), `key` (link a Open Library) y
   `first_publish_year`.

Detalles operativos:

- Open Library pide User-Agent identificable, pero **desde el browser no podés
  setear User-Agent**. Compensá con concurrencia baja: máximo 3 en paralelo, con
  un delay chico. Sin librería: un pool de 3 promesas que van tomando de una cola.
- Cachear resultados por `title|author` normalizado en `localStorage`. Entre
  usuarios distintos hay muchísima superposición en lo que el modelo recomienda.
- Dedupe final contra el set de leídos, comparando normalizado. El modelo va a
  recomendarte un libro que ya leíste con el título ligeramente distinto.

**Criterio de aceptación:** meterle a mano 5 títulos inventados y verificar que
los 5 se descartan.

---

## Fase 6: UI sin framework

Un objeto `state` y una función `render()` que redibuja el contenedor de
resultados. Es una sola lista; redibujar todo el contenedor es más que
suficiente y no necesitás diffing.

Las cards se hacen con `<template>` en el `index.html` y
`template.content.cloneNode(true)`. Rellenás los slots por `querySelector` y
appendeás a un `DocumentFragment`.

**El punto que en React te salía gratis y acá no: XSS.** Los títulos, autores y
justificaciones vienen de un LLM, que a su vez procesó texto arbitrario del CSV
del usuario. **Nunca `innerHTML` con nada que venga del modelo o del CSV.
Siempre `textContent`.** Escribilo como comentario arriba de `render.js` para
que no se cuele en un refactor.

Contenido:

- Grilla de cards: portada, título, autor, año, badge safe/stretch, el "por qué".
- Filtro por safe/stretch.
- Por card: "ya lo leí" y "no me interesa", persistidos en localStorage y
  alimentados como exclusión en la próxima corrida.
- Link a Open Library y búsqueda en Goodreads.
- Guardar la última tanda para que refrescar no queme una request.
- Estados de error concretos, no un spinner genérico: key inválida, cuota
  agotada (429), CSV con formato raro, respuesta no parseable.

### CSS puro

Un solo `styles.css`. Custom properties arriba para colores, espaciados y
tipografía; `@media (prefers-color-scheme: dark)` redefine las variables y ya
tenés dark mode sin toggle ni JS. Grid con `repeat(auto-fill, minmax(200px, 1fr))`
para la grilla de cards. Nesting nativo si querés agrupar, ya está en todos los
browsers. No hace falta nada más.

---

## Bilingüe ES/EN

### El mecanismo

`en.js` y `es.js` exportan un objeto plano de strings. `i18n/index.js` expone
`t(key, vars)` con interpolación simple de `{placeholders}`.

Detección: `localStorage` primero, si no `navigator.language`, si no inglés.
Toggle ES/EN en el header que persiste la elección.

Para el HTML estático, marcá los nodos con atributos y hacé una sola pasada:

```html
<h1 data-i18n="app.title"></h1>
<input data-i18n-attr="placeholder:key.paste">
```

`applyTranslations(root)` recorre `[data-i18n]` y setea `textContent`, y recorre
`[data-i18n-attr]` para placeholders, `aria-label` y `title`. Se llama al cargar
y en cada cambio de idioma. Así el `index.html` queda legible y no tenés `t()`
desparramado por todos lados. Actualizá también `document.documentElement.lang`
Importa para lectores de pantalla y para el corrector ortográfico.

Números y fechas con `Intl.NumberFormat` e `Intl.DateTimeFormat` pasándoles el
locale activo. Plurales con `Intl.PluralRules`, no a mano: "1 book / 2 books" y
la concordancia en español ya están resueltos por el browser.

### La trampa principal: los títulos no se traducen

`title` y `author` de cada recomendación **van directo al matcher de Open
Library**. Si el modelo te devuelve "Cien años de soledad" en una corrida y "One
Hundred Years of Solitude" en la otra, estás validando contra dos strings
distintas, el cache por `title|author` se parte en dos, y el dedupe contra tus
leídos falla porque el CSV de Goodreads los tiene con un solo título.

Regla en el prompt, explícita: título y autor siempre en la forma catalogada
(típicamente el idioma original de publicación, que es lo que indexa Open
Library). Solo `reason` sale en el idioma activo. Poné un test con un libro en
castellano que verifique que el título sobrevive el ida y vuelta.

### Cambiar de idioma con resultados en pantalla

Las recomendaciones cacheadas tienen el `reason` en el idioma en que se
generaron. Guardá el locale junto con la tanda en `localStorage`.

Al cambiar de idioma, **no dispares una llamada nueva automáticamente**, le
quemás cuota al usuario sin que la pida. La UI se traduce entera, las
justificaciones viejas quedan en su idioma con un aviso chico, y hay un botón
para regenerar si le importa. La próxima tanda ya sale en el idioma nuevo.

### Que no se desincronicen

Sin build no tenés herramientas de extracción, así que el test hace el trabajo:

```js
// test/i18n.test.js
// falla si en.js y es.js no tienen exactamente las mismas claves
```

Es el test más barato del proyecto y es el que evita el `undefined` en producción
cuando alguien manda un PR agregando un string en un solo idioma.

### Layout

El español corre entre 20% y 25% más largo que el inglés. Probá el layout con
las strings castellanas más largas, no con las inglesas: los botones y los badges
`safe`/`stretch` son donde primero se rompe.

---

## Fase 7: Open source y deploy

- `README` con: qué hace, el paso a paso para sacar la key gratis, cómo bajar el
  export de Goodreads (My Books → Import/Export → Export Library), y una sección
  de privacidad que diga clarito que no hay servidor.
- Destacá en el README que **no hay build, no hay dependencias**: cloná y abrí.
  Para mucha gente eso solo ya es razón para usarla y para contribuir.
- `README.md` en inglés y `README.es.md`, con el link cruzado en la primera
  línea de cada uno.
- Licencia MIT.
- Screenshot en el README. Es la mitad de las stars.
- Deploy: Cloudflare Pages o GitHub Pages apuntando al repo, **sin build
  command**, output = raíz.
- En el README, avisar que la API de Goodreads está muerta desde diciembre de
  2020 y por eso el flujo es por CSV. Te vas a ahorrar el issue.

---

## Orden de trabajo sugerido

Fases 1 y 2 primero y completas, con tests, antes de tocar nada de red. Son
funciones puras y son el corazón de la calidad del resultado. Si el perfil está
bien comprimido, hasta un modelo mediocre recomienda bien; si está mal, no hay
modelo que lo salve.

Después 4 y 5 juntas, contra tu propio export, iterando el prompt hasta que la
tasa de descarte por alucinación baje de 20%. Recién ahí la UI.
