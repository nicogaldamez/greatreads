// Titles, authors, and reasons all come from an LLM that processed
// arbitrary user-supplied CSV text. NEVER use innerHTML with anything that
// came from the model or the CSV. Always textContent.

import { t, applyTranslations } from '../i18n/index.js';

/**
 * @typedef {import('../lib/catalog.js').ValidatedRecommendation} ValidatedRecommendation
 */

/**
 * Cover and catalog URLs are not ours: they come from a Google Books /
 * Open Library response, or from a `lastBatch` rehydrated out of
 * localStorage, which anything running on this origin can rewrite. An
 * attacker-controlled `javascript:` href would run on click, so only
 * absolute http(s) is ever assigned to an href or src. No base is passed,
 * so a relative URL fails to parse and is rejected too -- every catalog
 * URL the app deals with is absolute.
 * @param {string|undefined} url
 * @returns {boolean}
 */
export function isHttpUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * @param {ValidatedRecommendation} item
 * @param {{ staleReason: boolean }} opts
 * @returns {DocumentFragment}
 */
export function renderCard(item, opts = { staleReason: false }) {
  const template = /** @type {HTMLTemplateElement} */ (document.getElementById('card-template'));
  const node = /** @type {DocumentFragment} */ (template.content.cloneNode(true));
  applyTranslations(node);
  const article = node.querySelector('.book-card');
  const { recommendation, coverUrl, catalogUrl } = item;

  const cover = node.querySelector('.cover');
  const placeholder = node.querySelector('.cover-placeholder');
  if (isHttpUrl(coverUrl)) {
    cover.src = coverUrl;
    cover.alt = recommendation.title;
    cover.hidden = false;
  } else {
    placeholder.hidden = false;
  }

  const badge = node.querySelector('.badge');
  badge.textContent = t(`results.badge.${recommendation.kind}`);
  badge.classList.add(recommendation.kind);

  node.querySelector('.title').textContent = recommendation.title;
  node.querySelector('.author').textContent = recommendation.author;
  node.querySelector('.reason').textContent = recommendation.reason;

  const staleNote = node.querySelector('.stale-note');
  staleNote.hidden = !opts.staleReason;

  const olLink = node.querySelector('.open-library-link');
  if (isHttpUrl(catalogUrl)) {
    olLink.href = catalogUrl;
    olLink.hidden = false;
  }

  const grLink = node.querySelector('.goodreads-link');
  grLink.href = `https://www.goodreads.com/search?q=${encodeURIComponent(
    `${recommendation.title} ${recommendation.author}`
  )}`;

  article.dataset.kind = recommendation.kind;
  article.dataset.title = recommendation.title;
  article.dataset.author = recommendation.author;

  return node;
}

/**
 * Redraws the whole results grid. No diffing, since it's a single list, and
 * this is more than fast enough.
 * @param {HTMLElement} container
 * @param {ValidatedRecommendation[]} items
 * @param {{ filter: 'all'|'safe'|'stretch', staleReason: boolean }} opts
 */
export function renderResults(container, items, opts) {
  container.textContent = '';
  const fragment = document.createDocumentFragment();

  const filtered =
    opts.filter === 'all' ? items : items.filter((i) => i.recommendation.kind === opts.filter);

  for (const item of filtered) {
    fragment.appendChild(renderCard(item, { staleReason: opts.staleReason }));
  }

  container.appendChild(fragment);
}
