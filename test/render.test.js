import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHttpUrl } from '../src/ui/render.js';

test('isHttpUrl accepts the absolute http(s) URLs the catalogs return', () => {
  assert.equal(isHttpUrl('https://covers.openlibrary.org/b/id/123-M.jpg'), true);
  assert.equal(isHttpUrl('http://books.google.com/books/content?id=abc'), true);
});

// A `lastBatch` rehydrated from localStorage lands straight on an href, so a
// javascript: URL there would run on click.
test('isHttpUrl rejects script-bearing schemes', () => {
  assert.equal(isHttpUrl('javascript:alert(document.cookie)'), false);
  assert.equal(isHttpUrl('  javascript:alert(1)'), false);
  assert.equal(isHttpUrl('JaVaScRiPt:alert(1)'), false);
  assert.equal(isHttpUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isHttpUrl('vbscript:msgbox(1)'), false);
});

test('isHttpUrl rejects relative URLs and non-strings', () => {
  assert.equal(isHttpUrl('/relative/path.jpg'), false);
  assert.equal(isHttpUrl(''), false);
  assert.equal(isHttpUrl(undefined), false);
  assert.equal(isHttpUrl(null), false);
  assert.equal(isHttpUrl({ toString: () => 'https://example.com' }), false);
});
