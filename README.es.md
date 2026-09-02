# Bookito

*[Read in English](README.md)*

Recomendaciones de libros a partir de tu historial de lectura en
Goodreads — sin cuenta, sin servidor, sin base de datos. Subís tu export,
pegás tu propia API key gratuita de Gemini, y recibís recomendaciones
validadas contra un catálogo real.

## Por qué

El motor de recomendaciones propio de Goodreads es limitado, y su API está
muerta desde diciembre de 2020 — por eso esta app trabaja enteramente a
partir del export en CSV.

## Sin build, sin dependencias

Clonalo y abrilo. No hay `npm install`, no hay bundler, no hay
`node_modules`. Es JS puro con módulos ES nativos, CSS puro, y un
`package.json` que existe únicamente para que `node --test` trate los
archivos como módulos. Si querés contribuir, no necesitás aprender ningún
toolchain primero.

## Correrlo localmente

Los browsers bloquean módulos ES cargados desde `file://`, así que hace
falta un servidor HTTP local — cualquiera sirve:

```
python3 -m http.server 8000
```

Después abrí `http://localhost:8000`.

## Cómo bajar tu export de Goodreads

Goodreads → **My Books** → **Import/Export** → **Export Library**. Genera
un archivo `goodreads_library_export.csv`. Subí ese archivo.

## Cómo conseguir una API key gratis de Gemini

Bookito es BYOK (traé tu propia key) — no hay una key compartida de demo
ni un backend que la guarde por vos. Conseguí una key gratis, sin tarjeta,
en [Google AI Studio](https://aistudio.google.com/app/apikey).

## Privacidad

Todo pasa en tu navegador. El CSV se parsea localmente y nunca se sube a
ningún lado. Tu API key se guarda en el `localStorage` de tu máquina y se
usa solo para llamados directos a la API de Gemini de Google — no hay
ningún servidor de Bookito en el medio. Si estás en una máquina
compartida, usá el botón "olvidar mi key" cuando termines.

## Correr los tests

```
node --test test/
```

## Licencia

MIT — ver [LICENSE](LICENSE).
