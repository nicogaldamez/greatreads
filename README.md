# Bookito

*[Leer en español](README.es.md)*

Book recommendations from your Goodreads reading history. No account, no
server, no database. Upload your export, paste your own free Gemini API
key, and get recommendations validated against a real book catalog.

## Why

Goodreads' own recommendation engine is thin, and its API has been dead
since December 2020, so this app works entirely from the CSV export instead.

## No build, no dependencies

Clone it and open it. There's no `npm install`, no bundler, no
`node_modules`. It's plain JS with native ES modules, plain CSS, and a
`package.json` that exists only so `node --test` treats the files as
modules. If you want to contribute, you don't need to learn a toolchain
first.

## Running it locally

Browsers block ES modules loaded from `file://`, so you need a local HTTP
server. Any will do:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Getting your Goodreads export

Goodreads → **My Books** → **Import/Export** → **Export Library**. It
generates a `goodreads_library_export.csv` file. Upload that.

## Getting a free Gemini API key

Bookito is BYOK (bring your own key): there's no shared demo key and no
backend to hold one for you. Getting one takes about a minute:

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) and sign
   in with any Google account.
2. Go to the API keys section and click **Create API key**.
3. Pick an existing Google Cloud project, or let AI Studio create one for
   you. Either works.
4. Copy the key it shows you and paste it into Bookito's step 2.

The free tier needs no credit card. It has per-minute and per-day rate
limits, which is plenty for a handful of recommendation runs.

Treat the key like a password: don't share it or commit it anywhere. You
can delete it from AI Studio at any time, and Bookito's "forget my key"
button clears it from this browser.

## FAQ

**Does my library get uploaded anywhere?**
No. The CSV is parsed in your browser and never leaves it. The only network
calls Bookito makes are to Google's Gemini API (your taste profile, not the
raw file), and to Open Library and Google Books to validate the results.

**What does Bookito store on my machine?**
Five `localStorage` entries: your API key (`bookito.apiKey`), your last
batch of recommendations (`bookito.lastBatch`), a compressed summary of
your library (`bookito.library`), the books you marked as read or not
interested (`bookito.exclusions`), and a cache of catalog lookups
(`bookito.catalogCache`). Nothing else, and nothing on any server.

The library summary is the smallest slice of the export that regenerating
needs: the taste profile plus the titles on your read and to-read shelves.
Per-book ratings, dates read, shelves and ISBNs are not kept. It is what
lets "Regenerate" work after a reload without re-attaching the CSV, and it
is why the results screen tells you which upload it is working from.

**Why did some recommendations disappear?**
Every recommendation is checked against Open Library, and against Google
Books if Open Library has no match. If neither has a book whose title and
author surname match, it is dropped and the count shows up above the
results. This is what keeps invented books out of your list.

**What's the difference between a safe bet and a stretch pick?**
Safe bets sit squarely inside the taste your library already shows.
Stretch picks deliberately step outside it (adjacent genres, unfamiliar
authors, different eras) while still connecting to something you've
enjoyed.

**Does it remember the books I marked?**
Yes. "I've read this" and "Not interested" are saved locally and passed to
Gemini as exclusions on the next run, so those books won't come back.

**Why are the recommendations different each time I regenerate?**
The model runs at its default sampling settings, so the same profile
produces a different batch each time. Regenerating is a cheap way to get a
second opinion.

**What does this cost?**
Nothing. Gemini's free tier covers it and needs no credit card. If you hit
the per-minute rate limit, wait a moment and try again.

**How do I erase everything?**
Use "Erase all my data" at the bottom of the page: it removes all five
entries at once, after a confirmation. "Forget my key" is narrower and
removes only the key.

**Do I need a Goodreads account?**
You need a Goodreads library export (My Books → Import/Export → Export
Library). Bookito never talks to Goodreads itself; its API has been shut
down since December 2020.

## Privacy

Everything happens in your browser. The CSV is parsed locally and never
uploaded anywhere. Your API key is stored in `localStorage` on your machine
and used only for direct calls to Google's Gemini API. There is no
Bookito server in between. If you're on a shared machine, use the "forget
my key" button when you're done.

## Running the tests

```
node --test test/
```

## License

MIT. See [LICENSE](LICENSE).
