import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, validateRecommendations } from '../src/lib/catalog.js';

test('normalize lowercases, strips punctuation, drops leading article, cuts subtitle', () => {
  assert.equal(normalize('The Hobbit'), 'hobbit');
  assert.equal(normalize('El Aleph'), 'aleph');
  assert.equal(normalize('Dune: Book One'), 'dune');
  assert.equal(normalize("Ender's Game!"), 'ender s game');
});

test('normalize drops a trailing series annotation in parentheses, matching the Goodreads-stored form to the clean form', () => {
  const goodreadsStyle = normalize("Harry Potter and the Sorcerer's Stone (Harry Potter, #1)");
  const cleanForm = normalize("Harry Potter and the Sorcerer's Stone");
  assert.equal(goodreadsStyle, cleanForm);
});

const originalFetch = globalThis.fetch;
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
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

test('validateRecommendations discards recommendations with no catalog match (hallucinations)', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ docs: [] }), { status: 200 });

  const invented = Array.from({ length: 5 }, (_, i) => ({
    title: `Totally Invented Book ${i}`,
    author: `Fictional Author ${i}`,
    year: 2020,
    reason: 'made up',
    kind: 'safe',
    confidence: 0.5,
  }));

  const { validated, discardedCount } = await validateRecommendations(invented, []);

  assert.equal(validated.length, 0);
  assert.equal(discardedCount, 5);
});

test('validateRecommendations keeps a recommendation that matches on title and author last name', async () => {
  globalThis.fetch = async (url) => {
    if (String(url).includes('openlibrary.org')) {
      return new Response(
        JSON.stringify({
          docs: [
            {
              title: 'Dune',
              author_name: ['Frank Herbert'],
              cover_i: 123,
              key: '/works/OL123W',
              first_publish_year: 1965,
            },
          ],
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ items: [] }), { status: 200 });
  };

  const recs = [{ title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'x', kind: 'safe', confidence: 0.9 }];
  const { validated, discardedCount } = await validateRecommendations(recs, []);

  assert.equal(discardedCount, 0);
  assert.equal(validated.length, 1);
  assert.equal(validated[0].catalogUrl, 'https://openlibrary.org/works/OL123W');
});

test('validateRecommendations dedupes against already-read books', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        docs: [{ title: 'Dune', author_name: ['Frank Herbert'], key: '/works/OL123W' }],
      }),
      { status: 200 }
    );

  const recs = [{ title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'x', kind: 'safe', confidence: 0.9 }];
  const { validated } = await validateRecommendations(recs, [{ title: 'Dune', author: 'Frank Herbert' }]);

  assert.equal(validated.length, 0);
});

test('validateRecommendations dedupes against a read book whose CSV title carries a Goodreads series annotation', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        docs: [{ title: "Harry Potter and the Sorcerer's Stone", author_name: ['J.K. Rowling'], key: '/works/OL1W' }],
      }),
      { status: 200 }
    );

  const recs = [
    {
      title: "Harry Potter and the Sorcerer's Stone",
      author: 'J.K. Rowling',
      year: 1997,
      reason: 'x',
      kind: 'safe',
      confidence: 0.9,
    },
  ];
  const readBooks = [
    { title: "Harry Potter and the Sorcerer's Stone (Harry Potter, #1)", author: 'J.K. Rowling' },
  ];

  const { validated } = await validateRecommendations(recs, readBooks);
  assert.equal(validated.length, 0);
});

test('validateRecommendations dedupes within the same batch when the model returns the same book twice', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        docs: [{ title: 'Dune', author_name: ['Frank Herbert'], key: '/works/OL123W' }],
      }),
      { status: 200 }
    );

  const recs = [
    { title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'x', kind: 'safe', confidence: 0.9 },
    { title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'y', kind: 'stretch', confidence: 0.7 },
  ];

  const { validated } = await validateRecommendations(recs, []);
  assert.equal(validated.length, 1);
  assert.equal(validated[0].recommendation.reason, 'x');
});
