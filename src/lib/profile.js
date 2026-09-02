/**
 * @typedef {import('./goodreads.js').Book} Book
 */

/**
 * @typedef {Object} BookRef
 * @property {string} title
 * @property {string} author
 * @property {number|null} myRating
 * @property {number} avgRating
 */

/**
 * @typedef {Object} TasteProfile
 * @property {BookRef[]} loved      - rating 5, hasta 30, mas recientes primero
 * @property {BookRef[]} liked      - rating 4, hasta 15
 * @property {BookRef[]} disliked   - rating 1-2, hasta 15
 * @property {BookRef[]} recent     - ultimos 20 por dateRead, con su rating
 * @property {[string, number][]} topShelves - top 15 del histograma
 * @property {{totalRead: number, avgRating: number, contrarianIndex: number}} stats
 */

const LOVED_LIMIT = 30;
const LIKED_LIMIT = 15;
const DISLIKED_LIMIT = 15;
const RECENT_LIMIT = 20;
const SHELVES_LIMIT = 15;

/** @param {Book} b @returns {BookRef} */
function toRef(b) {
  return {
    title: b.title,
    author: b.author,
    myRating: b.myRating,
    avgRating: b.avgRating,
  };
}

/** @param {Book} b @returns {number} */
function sortKey(b) {
  return b.dateRead ? b.dateRead.getTime() : 0;
}

/**
 * Compresses a full Goodreads export into a small, high-signal TasteProfile
 * suitable for sending to an LLM.
 * @param {Book[]} books
 * @returns {TasteProfile}
 */
export function buildProfile(books) {
  const read = books.filter((b) => b.exclusiveShelf === 'read');
  const byRecency = [...read].sort((a, b) => sortKey(b) - sortKey(a));

  const loved = byRecency.filter((b) => b.myRating === 5).slice(0, LOVED_LIMIT).map(toRef);
  const liked = byRecency.filter((b) => b.myRating === 4).slice(0, LIKED_LIMIT).map(toRef);
  const disliked = byRecency
    .filter((b) => b.myRating === 1 || b.myRating === 2)
    .slice(0, DISLIKED_LIMIT)
    .map(toRef);

  const recent = byRecency.slice(0, RECENT_LIMIT).map(toRef);

  const shelfCounts = new Map();
  for (const b of read) {
    for (const shelf of b.shelves) {
      shelfCounts.set(shelf, (shelfCounts.get(shelf) ?? 0) + 1);
    }
  }
  const topShelves = [...shelfCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, SHELVES_LIMIT);

  const rated = read.filter((b) => b.myRating !== null);
  const totalRead = read.length;
  const avgRating = rated.length
    ? rated.reduce((sum, b) => sum + /** @type {number} */ (b.myRating), 0) / rated.length
    : 0;
  const contrarianIndex = rated.length
    ? rated.reduce((sum, b) => sum + (/** @type {number} */ (b.myRating) - b.avgRating), 0) /
      rated.length
    : 0;

  return {
    loved,
    liked,
    disliked,
    recent,
    topShelves,
    stats: { totalRead, avgRating, contrarianIndex },
  };
}
