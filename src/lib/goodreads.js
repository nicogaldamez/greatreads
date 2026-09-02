/**
 * @typedef {Object} Book
 * @property {string} id
 * @property {string} title
 * @property {string} author
 * @property {string} [isbn13]
 * @property {number|null} myRating
 * @property {number} avgRating
 * @property {Date|null} dateRead
 * @property {boolean} dateEstimated
 * @property {string[]} shelves
 * @property {'read'|'currently-reading'|'to-read'} exclusiveShelf
 * @property {number} [originalYear]
 */

/**
 * Parses raw CSV text into rows of fields, per RFC 4180: comma-separated,
 * fields optionally quoted with `"`, a doubled `""` inside quotes is a
 * literal quote, and newlines (and commas) inside quotes are part of the
 * field rather than row/field separators.
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let atFieldStart = true;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"' && atFieldStart) {
      inQuotes = true;
      atFieldStart = false;
      i += 1;
      continue;
    }

    if (c === ',') {
      row.push(field);
      field = '';
      atFieldStart = true;
      i += 1;
      continue;
    }

    if (c === '\r') {
      // Skip; the following \n (if any) ends the row.
      i += 1;
      continue;
    }

    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      atFieldStart = true;
      i += 1;
      continue;
    }

    field += c;
    atFieldStart = false;
    i += 1;
  }

  // Flush the last field/row if the file doesn't end with a newline.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop fully-empty trailing rows (e.g. a trailing blank line).
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

/**
 * Strips the Excel formula wrapper Goodreads uses for ISBN columns, e.g.
 * `="0439023483"` -> `0439023483`, and `=""` -> ``.
 * @param {string} raw
 * @returns {string}
 */
function stripIsbnFormula(raw) {
  const trimmed = raw.trim();
  const match = trimmed.match(/^="(.*)"$/);
  const inner = match ? match[1] : trimmed;
  return inner.trim();
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function parseShelves(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} raw
 * @returns {number|null}
 */
function parseRating(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  return n;
}

/**
 * @param {string} raw
 * @returns {Date|null}
 */
function parseDate(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parses a full Goodreads library export CSV into an array of Book objects.
 * @param {string} text
 * @returns {Book[]}
 */
export function parseGoodreadsExport(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);

  const iId = idx('Book Id');
  const iTitle = idx('Title');
  const iAuthor = idx('Author');
  const iIsbn13 = idx('ISBN13');
  const iMyRating = idx('My Rating');
  const iAvgRating = idx('Average Rating');
  const iDateRead = idx('Date Read');
  const iDateAdded = idx('Date Added');
  const iBookshelves = idx('Bookshelves');
  const iExclusiveShelf = idx('Exclusive Shelf');
  const iOriginalYear = idx('Original Publication Year');

  const books = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (cols.length === 1 && cols[0] === '') continue;

    const isbn13Raw = iIsbn13 >= 0 ? stripIsbnFormula(cols[iIsbn13] ?? '') : '';
    const dateRead = iDateRead >= 0 ? parseDate(cols[iDateRead]) : null;
    const dateAdded = iDateAdded >= 0 ? parseDate(cols[iDateAdded]) : null;
    const originalYearRaw = iOriginalYear >= 0 ? cols[iOriginalYear]?.trim() : '';
    const originalYear = originalYearRaw ? Number(originalYearRaw) : undefined;

    /** @type {Book} */
    const book = {
      id: iId >= 0 ? (cols[iId] ?? '').trim() : '',
      title: iTitle >= 0 ? (cols[iTitle] ?? '').trim() : '',
      author: iAuthor >= 0 ? (cols[iAuthor] ?? '').trim() : '',
      isbn13: isbn13Raw || undefined,
      myRating: iMyRating >= 0 ? parseRating(cols[iMyRating] ?? '') : null,
      avgRating: iAvgRating >= 0 ? Number(cols[iAvgRating]) || 0 : 0,
      dateRead: dateRead ?? dateAdded ?? null,
      dateEstimated: !dateRead && !!dateAdded,
      shelves: iBookshelves >= 0 ? parseShelves(cols[iBookshelves] ?? '') : [],
      exclusiveShelf:
        iExclusiveShelf >= 0 ? /** @type {any} */ ((cols[iExclusiveShelf] ?? '').trim()) : 'read',
      ...(originalYear !== undefined && !Number.isNaN(originalYear) ? { originalYear } : {}),
    };

    books.push(book);
  }

  return books;
}
