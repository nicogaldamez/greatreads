import { getCatalogCache, setCatalogCache } from './storage.js';

/**
 * @typedef {import('./gemini.js').Recommendation} Recommendation
 */

/**
 * @typedef {Object} ValidatedRecommendation
 * @property {Recommendation} recommendation
 * @property {string|undefined} coverUrl
 * @property {string|undefined} catalogUrl
 * @property {number|undefined} firstPublishYear
 */

const OPEN_LIBRARY_CONCURRENCY = 3;
const OPEN_LIBRARY_DELAY_MS = 250;

/**
 * Normalizes a title or author for comparison: lowercase, strip
 * punctuation, drop a leading article, cut a subtitle after ":", and drop
 * a trailing parenthetical (Goodreads commonly stores series info in the
 * title itself, e.g. "... (Harry Potter, #1)").
 * @param {string} raw
 * @returns {string}
 */
export function normalize(raw) {
  let s = (raw || '').toLowerCase();
  s = s.split(':')[0];
  s = s.split('(')[0];
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  s = s.trim();
  s = s.replace(/^(the|a|an|el|la|los|las|un|una)\s+/, '');
  s = s.replace(/\s+/g, ' ');
  return s.trim();
}

/**
 * @param {string} author
 * @returns {string}
 */
function lastName(author) {
  const parts = normalize(author).split(' ');
  return parts[parts.length - 1] || '';
}

/**
 * @param {string} key
 * @returns {string}
 */
function cacheKey(title, author) {
  return `${normalize(title)}|${normalize(author)}`;
}

/**
 * @param {string} title
 * @param {string} author
 * @returns {Promise<object|null>} raw Open Library doc or null
 */
async function searchOpenLibrary(title, author) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    title
  )}&author=${encodeURIComponent(author)}&limit=3`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return findMatch(data.docs ?? [], title, author, (doc) => doc.title, (doc) => doc.author_name ?? []);
}

/**
 * @param {string} title
 * @param {string} author
 * @returns {Promise<object|null>} raw Google Books item or null
 */
async function searchGoogleBooks(title, author) {
  const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.items ?? [];
  return findMatch(
    items,
    title,
    author,
    (item) => item.volumeInfo?.title ?? '',
    (item) => item.volumeInfo?.authors ?? []
  );
}

/**
 * @template T
 * @param {T[]} docs
 * @param {string} title
 * @param {string} author
 * @param {(doc: T) => string} getTitle
 * @param {(doc: T) => string[]} getAuthors
 * @returns {T|null}
 */
function findMatch(docs, title, author, getTitle, getAuthors) {
  const wantTitle = normalize(title);
  const wantLastName = lastName(author);
  for (const doc of docs) {
    const docTitle = normalize(getTitle(doc));
    if (docTitle !== wantTitle) continue;
    const authors = getAuthors(doc).map((a) => lastName(a));
    if (wantLastName && authors.includes(wantLastName)) {
      return doc;
    }
  }
  return null;
}

/**
 * Validates one recommendation against Open Library, falling back to
 * Google Books. Returns null if no catalog match is found.
 * @param {Recommendation} rec
 * @returns {Promise<ValidatedRecommendation|null>}
 */
async function validateOne(rec) {
  const key = cacheKey(rec.title, rec.author);
  const cache = getCatalogCache();

  if (key in cache) {
    const cached = cache[key];
    return cached === null ? null : { recommendation: rec, ...cached };
  }

  let result = null;

  const olDoc = await searchOpenLibrary(rec.title, rec.author);
  if (olDoc) {
    result = {
      coverUrl: olDoc.cover_i ? `https://covers.openlibrary.org/b/id/${olDoc.cover_i}-M.jpg` : undefined,
      catalogUrl: olDoc.key ? `https://openlibrary.org${olDoc.key}` : undefined,
      firstPublishYear: olDoc.first_publish_year,
    };
  } else {
    const gbDoc = await searchGoogleBooks(rec.title, rec.author);
    if (gbDoc) {
      result = {
        coverUrl: gbDoc.volumeInfo?.imageLinks?.thumbnail,
        catalogUrl: gbDoc.volumeInfo?.infoLink,
        firstPublishYear: gbDoc.volumeInfo?.publishedDate
          ? Number(String(gbDoc.volumeInfo.publishedDate).slice(0, 4))
          : undefined,
      };
    }
  }

  cache[key] = result;
  setCatalogCache(cache);

  return result ? { recommendation: rec, ...result } : null;
}

/**
 * Runs `tasks` (functions returning promises) with bounded concurrency.
 * @template T
 * @param {(() => Promise<T>)[]} tasks
 * @param {number} concurrency
 * @param {number} delayMs
 * @param {(done: number, total: number) => void} [onProgress] called after each task settles
 * @returns {Promise<T[]>}
 */
async function runPooled(tasks, concurrency, delayMs, onProgress) {
  const results = new Array(tasks.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
      done++;
      onProgress?.(done, tasks.length);
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Validates a batch of recommendations against Open Library / Google
 * Books, discarding any that don't match a real catalog entry, and
 * de-duplicating against the reader's already-read books.
 * @param {Recommendation[]} recommendations
 * @param {{title: string, author: string}[]} readBooks
 * @param {(done: number, total: number) => void} [onProgress] called as each
 *   recommendation finishes its catalog lookup, for UI progress reporting
 * @returns {Promise<{validated: ValidatedRecommendation[], discardedCount: number}>}
 */
export async function validateRecommendations(recommendations, readBooks = [], onProgress) {
  const readKeys = new Set(readBooks.map((b) => cacheKey(b.title, b.author)));

  const tasks = recommendations.map((rec) => () => validateOne(rec));
  const results = await runPooled(
    tasks,
    OPEN_LIBRARY_CONCURRENCY,
    OPEN_LIBRARY_DELAY_MS,
    onProgress
  );

  const validated = [];
  let discardedCount = 0;

  for (const result of results) {
    if (!result) {
      discardedCount++;
      continue;
    }
    const key = cacheKey(result.recommendation.title, result.recommendation.author);
    if (readKeys.has(key)) {
      continue;
    }
    validated.push(result);
  }

  return { validated, discardedCount };
}
