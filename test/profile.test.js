import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProfile } from '../src/lib/profile.js';

/**
 * @param {Partial<import('../src/lib/goodreads.js').Book>} overrides
 * @returns {import('../src/lib/goodreads.js').Book}
 */
function makeBook(overrides) {
  return {
    id: String(Math.random()),
    title: 'Untitled',
    author: 'Unknown',
    isbn13: undefined,
    myRating: null,
    avgRating: 4.0,
    dateRead: null,
    dateEstimated: false,
    shelves: [],
    exclusiveShelf: 'read',
    ...overrides,
  };
}

function makeLargeLibrary(count) {
  const books = [];
  for (let i = 0; i < count; i++) {
    const rating = [1, 2, 3, 4, 5][i % 5];
    books.push(
      makeBook({
        id: String(i),
        title: `Book ${i}`,
        author: `Author ${i}`,
        myRating: rating,
        avgRating: 3.8,
        dateRead: new Date(2020, 0, 1 + i),
        shelves: ['fiction', i % 2 === 0 ? 'scifi' : 'fantasy'],
      })
    );
  }
  return books;
}

test('buildProfile caps loved at 30, most recent first', () => {
  const books = [];
  for (let i = 0; i < 40; i++) {
    books.push(makeBook({ myRating: 5, dateRead: new Date(2020, 0, 1 + i), title: `L${i}` }));
  }
  const profile = buildProfile(books);
  assert.equal(profile.loved.length, 30);
  assert.equal(profile.loved[0].title, 'L39');
});

test('buildProfile caps liked at 15 and disliked at 15', () => {
  const books = [];
  for (let i = 0; i < 20; i++) {
    books.push(makeBook({ myRating: 4, title: `Liked${i}` }));
    books.push(makeBook({ myRating: 1, title: `Disliked${i}` }));
  }
  const profile = buildProfile(books);
  assert.equal(profile.liked.length, 15);
  assert.equal(profile.disliked.length, 15);
});

test('buildProfile includes rating 1 and rating 2 in disliked', () => {
  const books = [makeBook({ myRating: 1, title: 'One' }), makeBook({ myRating: 2, title: 'Two' })];
  const profile = buildProfile(books);
  assert.equal(profile.disliked.length, 2);
});

test('buildProfile recent is limited to 20 and ordered by dateRead descending', () => {
  const books = [];
  for (let i = 0; i < 30; i++) {
    books.push(makeBook({ dateRead: new Date(2020, 0, 1 + i), title: `R${i}`, myRating: 3 }));
  }
  const profile = buildProfile(books);
  assert.equal(profile.recent.length, 20);
  assert.equal(profile.recent[0].title, 'R29');
});

test('buildProfile computes topShelves as a sorted histogram capped at 15', () => {
  const books = [
    makeBook({ shelves: ['scifi', 'favorites'] }),
    makeBook({ shelves: ['scifi'] }),
    makeBook({ shelves: ['fantasy'] }),
  ];
  const profile = buildProfile(books);
  assert.deepEqual(profile.topShelves[0], ['scifi', 2]);
});

test('buildProfile excludes to-read books from stats and refs', () => {
  const books = [
    makeBook({ exclusiveShelf: 'to-read', myRating: null, title: 'Unread' }),
    makeBook({ exclusiveShelf: 'read', myRating: 5, title: 'Read1' }),
  ];
  const profile = buildProfile(books);
  assert.equal(profile.stats.totalRead, 1);
  assert.equal(profile.loved.length, 1);
  assert.equal(profile.loved[0].title, 'Read1');
});

test('buildProfile computes contrarianIndex as mean(myRating - avgRating)', () => {
  const books = [
    makeBook({ myRating: 5, avgRating: 3, exclusiveShelf: 'read' }),
    makeBook({ myRating: 1, avgRating: 4, exclusiveShelf: 'read' }),
  ];
  const profile = buildProfile(books);
  // (5-3 + 1-4) / 2 = (2 - 3) / 2 = -0.5
  assert.equal(profile.stats.contrarianIndex, -0.5);
});

test('buildProfile handles a large library: <=60 total refs and small JSON footprint', () => {
  const books = makeLargeLibrary(500);
  const profile = buildProfile(books);
  const totalRefs = profile.loved.length + profile.liked.length + profile.disliked.length;
  assert.ok(totalRefs <= 60, `expected <=60 refs, got ${totalRefs}`);
  const json = JSON.stringify(profile);
  assert.ok(json.length < 6 * 1024, `expected <6KB, got ${json.length} bytes`);
});
