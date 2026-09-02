import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseCsv, parseGoodreadsExport } from '../src/lib/goodreads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, 'fixtures', 'sample_export.csv');
const fixtureText = readFileSync(fixturePath, 'utf8');

test('parseCsv handles quoted fields with embedded commas and newlines', () => {
  const rows = parseCsv('a,"b, c",d\ne,"f\ng",h');
  assert.deepEqual(rows, [
    ['a', 'b, c', 'd'],
    ['e', 'f\ng', 'h'],
  ]);
});

test('parseCsv handles escaped double quotes', () => {
  const rows = parseCsv('a,"he said ""hi""",b');
  assert.deepEqual(rows, [['a', 'he said "hi"', 'b']]);
});

test('parseCsv strips a leading BOM', () => {
  const rows = parseCsv('﻿a,b\nc,d');
  assert.equal(rows[0][0], 'a');
});

test('parseGoodreadsExport strips the Excel formula wrapper from ISBNs', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[0].isbn13, '9780345339683');
});

test('parseGoodreadsExport treats an empty formula ISBN as undefined, not ""', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[1].isbn13, undefined);
});

test('parseGoodreadsExport treats My Rating of 0 as unrated (null)', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[1].myRating, null);
});

test('parseGoodreadsExport preserves a nonzero rating', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[0].myRating, 5);
});

test('parseGoodreadsExport parses a multiline quoted review without breaking row boundaries', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books.length, 3);
  assert.equal(books[0].title, 'The Hobbit');
  assert.equal(books[1].title, 'A Book Never Read');
  assert.equal(books[2].title, 'No Date Read Book');
});

test('parseGoodreadsExport falls back to Date Added when Date Read is empty, and marks it estimated', () => {
  const books = parseGoodreadsExport(fixtureText);
  const book = books[2];
  assert.equal(book.dateEstimated, true);
  assert.ok(book.dateRead instanceof Date);
  assert.equal(book.dateRead.getUTCFullYear(), 2021);
});

test('parseGoodreadsExport does not mark an actual Date Read as estimated', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[0].dateEstimated, false);
});

test('parseGoodreadsExport parses Bookshelves as a list', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.deepEqual(books[0].shelves, ['fantasy', 'favorites']);
});

test('parseGoodreadsExport reads Exclusive Shelf correctly', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[0].exclusiveShelf, 'read');
  assert.equal(books[1].exclusiveShelf, 'to-read');
});

test('parseGoodreadsExport strips the BOM from the first header', () => {
  const books = parseGoodreadsExport(fixtureText);
  assert.equal(books[0].id, '1');
});
