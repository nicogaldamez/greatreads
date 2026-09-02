# GreatReads

Recomendaciones de libros a partir de tu historial de lectura en
Goodreads, sin cuenta, sin servidor y sin base de datos. Subís tu
biblioteca, pegás tu propia API key gratuita de Gemini, y recibís
recomendaciones validadas contra un catálogo real.

<p align="center">
  <img width="49%" src="https://github.com/user-attachments/assets/02ba823e-a062-4c34-8ce2-6f6d95356bfe" />
  <img width="49%" alt="image" src="https://github.com/user-attachments/assets/1c90aba4-001f-4ecb-a512-56846c93ce82" />
</p>
   
## Por qué

El motor de recomendaciones propio de Goodreads es limitado, y su API está
muerta desde diciembre de 2020, y por eso esta app trabaja enteramente a
partir de la exportación en CSV.

## Sin build, sin dependencias

Clonalo y abrilo. No hay `npm install`, no hay bundler, no hay
`node_modules`. Es JS puro con módulos ES nativos, CSS puro, y un
`package.json` que existe únicamente para que `node --test` trate los
archivos como módulos. Si querés contribuir, no necesitás aprender ningún
toolchain primero.

## Correrlo localmente

Los browsers bloquean módulos ES cargados desde `file://`, así que hace
falta un servidor HTTP local. Cualquiera sirve:

```
python3 -m http.server 8000
```

Después abrí `http://localhost:8000`.

## Cómo bajar tu biblioteca de Goodreads

Goodreads → **My Books** → **Import/Export** → **Export Library**. Genera
un archivo `goodreads_library_export.csv`. Subí ese archivo.

## Cómo conseguir una API key gratis de Gemini

GreatReads es BYOK (traé tu propia key): no hay una key compartida de demo
ni un backend que la guarde por vos. Conseguir una lleva un minuto:

1. Entrá a [Google AI Studio](https://aistudio.google.com/app/apikey) e
   iniciá sesión con cualquier cuenta de Google.
2. Andá a la sección de API keys y hacé clic en **Create API key**.
3. Elegí un proyecto de Google Cloud que ya tengas, o dejá que AI Studio te
   cree uno. Cualquiera de las dos sirve.
4. Copiá la key que te muestra y pegala en el paso 2 de GreatReads.

El nivel gratuito no pide tarjeta de crédito. Tiene límites por minuto y
por día, de sobra para unas cuantas tandas de recomendaciones.

Tratá la key como una contraseña: no la compartas ni la subas a ningún
repo. Podés borrarla desde AI Studio cuando quieras, y el botón "olvidar mi
key" de GreatReads la elimina de este navegador.

## Preguntas frecuentes

**¿Se sube mi biblioteca a algún lado?**
No. El CSV se parsea en tu navegador y nunca sale de ahí. Los únicos
llamados de red que hace GreatReads son a la API de Gemini de Google (tu
perfil de gustos, no el archivo crudo), y a Open Library y Google Books
para validar los resultados.

**¿Qué guarda GreatReads en mi máquina?**
Cinco entradas de `localStorage`: tu API key (`greatreads.apiKey`), tu última
tanda de recomendaciones (`greatreads.lastBatch`), un resumen comprimido de tu
biblioteca (`greatreads.library`), los libros que marcaste como leídos o sin
interés (`greatreads.exclusions`), y un cache de las búsquedas en catálogos
(`greatreads.catalogCache`). Nada más, y nada en ningún servidor.

El resumen de la biblioteca es la porción mínima de la exportación que hace
falta para regenerar: el perfil de gustos más los títulos de tus estantes
"read" y "to-read". No se guardan las puntuaciones libro por libro, ni las
fechas de lectura, ni los estantes, ni los ISBN. Es lo que permite que
"Regenerar" funcione después de recargar sin volver a adjuntar el CSV, y
por eso la pantalla de resultados te dice de qué carga está trabajando.

**¿Por qué desaparecieron algunas recomendaciones?**
Cada recomendación se valida contra Open Library, y contra Google Books si
Open Library no la encuentra. Si en ninguno aparece un libro cuyo título y
apellido de autor coincidan, se descarta y el total aparece arriba de los
resultados. Eso es lo que mantiene los libros inventados fuera de tu lista.

**¿Qué diferencia hay entre una apuesta segura y una elección lateral?**
Las apuestas seguras caen de lleno dentro del gusto que ya muestra tu
biblioteca. Las elecciones laterales se corren de eso a propósito
(géneros vecinos, autores desconocidos, otras épocas), pero siempre
conectando con algo que disfrutaste.

**¿Recuerda los libros que marqué?**
Sí. "Ya lo leí" y "No me interesa" se guardan localmente y se le pasan a
Gemini como exclusiones en la tanda siguiente, así esos libros no vuelven
a aparecer.

**¿Por qué cambian las recomendaciones cada vez que regenero?**
El modelo corre con su configuración de sampling por defecto, así que el
mismo perfil produce una tanda distinta cada vez. Regenerar es una forma
barata de pedir una segunda opinión.

**¿Cuánto cuesta?**
Nada. El nivel gratuito de Gemini alcanza y no pide tarjeta de crédito. Si
llegás al límite por minuto, esperá un momento y probá de nuevo.

**¿Cómo borro todo?**
Usá "Borrar todos mis datos" al pie de la página: elimina las cinco
entradas de una, con una confirmación previa. "Olvidar mi key" es más
acotado y borra solo la key.

**¿Necesito una cuenta de Goodreads?**
Necesitás tu biblioteca de Goodreads exportada (My Books → Import/Export →
Export Library). GreatReads nunca habla con Goodreads directamente; su API
está dada de baja desde diciembre de 2020.

## Privacidad

Todo pasa en tu navegador. El CSV se parsea localmente y nunca se sube a
ningún lado. Tu API key se guarda en el `localStorage` de tu máquina y se
usa solo para llamados directos a la API de Gemini de Google. No hay
ningún servidor de GreatReads en el medio. Si estás en una máquina
compartida, usá el botón "olvidar mi key" cuando termines.

## Correr los tests

```
node --test test/
```

## Licencia

MIT. Ver [LICENSE](LICENSE).
