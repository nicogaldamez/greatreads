# Bookito

*[Leer en español](README.es.md)*

Book recommendations from your Goodreads reading history — no account, no
server, no database. Upload your export, paste your own free Gemini API
key, and get recommendations validated against a real book catalog.

## Why

Goodreads' own recommendation engine is thin, and its API has been dead
since December 2020 — this app works entirely from the CSV export instead.

## No build, no dependencies

Clone it and open it. There's no `npm install`, no bundler, no
`node_modules`. It's plain JS with native ES modules, plain CSS, and a
`package.json` that exists only so `node --test` treats the files as
modules. If you want to contribute, you don't need to learn a toolchain
first.

## Running it locally

Browsers block ES modules loaded from `file://`, so you need a local HTTP
server — any will do:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Getting your Goodreads export

Goodreads → **My Books** → **Import/Export** → **Export Library**. It
generates a `goodreads_library_export.csv` file. Upload that.

## Getting a free Gemini API key

Bookito is BYOK (bring your own key) — there's no shared demo key and no
backend to hold one for you. Get a free key, no credit card required, from
[Google AI Studio](https://aistudio.google.com/app/apikey).

## Privacy

Everything happens in your browser. The CSV is parsed locally and never
uploaded anywhere. Your API key is stored in `localStorage` on your machine
and used only for direct calls to Google's Gemini API — there is no
Bookito server in between. If you're on a shared machine, use the "forget
my key" button when you're done.

## Running the tests

```
node --test test/
```

## License

MIT — see [LICENSE](LICENSE).
