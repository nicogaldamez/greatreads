import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCatalogCache,
  setCatalogCache,
  getApiKey,
  setApiKey,
  forgetApiKey,
  clearAll,
} from '../src/lib/storage.js';

const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
});

afterEach(() => {
  globalThis.localStorage = originalLocalStorage;
});

/** @param {number} n */
function cacheOf(n) {
  return Object.fromEntries(Array.from({ length: n }, (_, i) => [`book-${i}|author`, { firstPublishYear: i }]));
}

test('setCatalogCache stores a small cache untouched', () => {
  setCatalogCache(cacheOf(3));
  assert.equal(Object.keys(getCatalogCache()).length, 3);
});

// An unbounded cache eventually exhausts the localStorage quota, at which
// point every other write in this module starts failing silently.
test('setCatalogCache caps the cache, dropping the oldest entries first', () => {
  setCatalogCache(cacheOf(600));
  const stored = getCatalogCache();
  const keys = Object.keys(stored);

  assert.equal(keys.length, 500);
  assert.equal(keys[0], 'book-100|author');
  assert.equal(keys[keys.length - 1], 'book-599|author');
  assert.equal('book-99|author' in stored, false);
});

test('clearAll wipes the API key', () => {
  setApiKey('secret-key');
  assert.equal(getApiKey(), 'secret-key');
  clearAll();
  assert.equal(getApiKey(), null);
});

test('forgetApiKey removes only the key', () => {
  setApiKey('secret-key');
  setCatalogCache(cacheOf(2));
  forgetApiKey();
  assert.equal(getApiKey(), null);
  assert.equal(Object.keys(getCatalogCache()).length, 2);
});

test('storage degrades to a no-op when localStorage throws', () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error('disabled'); },
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('disabled'); },
  };
  assert.equal(setApiKey('secret-key'), false);
  assert.equal(getApiKey(), null);
  assert.doesNotThrow(() => clearAll());
});
