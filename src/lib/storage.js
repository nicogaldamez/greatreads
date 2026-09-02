/**
 * Thin wrapper around localStorage: JSON-encodes/decodes values and never
 * throws (private browsing, quota exceeded, disabled storage all degrade to
 * no-ops returning the fallback).
 */

const KEYS = {
  apiKey: 'bookito.apiKey',
  lastBatch: 'bookito.lastBatch',
  exclusions: 'bookito.exclusions',
  catalogCache: 'bookito.catalogCache',
  library: 'bookito.library',
};

/**
 * @param {string} key
 * @param {*} fallback
 * @returns {*}
 */
function get(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {*} value
 * @returns {boolean} whether the write succeeded
 */
function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** @param {string} key */
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function getApiKey() {
  return get(KEYS.apiKey, null);
}

/** @param {string} key */
export function setApiKey(key) {
  return set(KEYS.apiKey, key);
}

export function forgetApiKey() {
  remove(KEYS.apiKey);
}

/**
 * @returns {{recommendations: object[], locale: 'en'|'es', generatedAt: string}|null}
 */
export function getLastBatch() {
  return get(KEYS.lastBatch, null);
}

/** @param {{recommendations: object[], locale: 'en'|'es', generatedAt: string}} batch */
export function setLastBatch(batch) {
  return set(KEYS.lastBatch, batch);
}

/**
 * @returns {{read: string[], notInterested: string[]}}
 */
export function getExclusions() {
  return get(KEYS.exclusions, { read: [], notInterested: [] });
}

/** @param {{read: string[], notInterested: string[]}} exclusions */
export function setExclusions(exclusions) {
  return set(KEYS.exclusions, exclusions);
}

/**
 * The library snapshot is the smallest slice of a Goodreads export that
 * regenerating needs: the compressed taste profile plus the shelf titles
 * used for exclusions and de-duplication. Per-book ratings, dates read,
 * shelves and ISBNs are deliberately left out, and unlike a raw parsed
 * export it is plain JSON (no Date objects to survive a round-trip).
 * @typedef {Object} LibrarySnapshot
 * @property {import('./profile.js').TasteProfile} profile
 * @property {{read: string[], toRead: string[]}} shelfTitles
 * @property {string} savedAt ISO timestamp of the upload it came from
 */

/** @returns {LibrarySnapshot|null} */
export function getLibrary() {
  return get(KEYS.library, null);
}

/** @param {LibrarySnapshot} snapshot */
export function setLibrary(snapshot) {
  return set(KEYS.library, snapshot);
}

/**
 * @returns {Record<string, object>}
 */
export function getCatalogCache() {
  return get(KEYS.catalogCache, {});
}

/** @param {Record<string, object>} cache */
export function setCatalogCache(cache) {
  return set(KEYS.catalogCache, cache);
}

/**
 * Wipes every trace of the user from this browser. Backs the "erase
 * everything" button, which is the counterpart to storing a library
 * snapshot: whatever we keep, the user can remove in one click.
 */
export function clearAll() {
  for (const key of Object.values(KEYS)) {
    remove(key);
  }
}
