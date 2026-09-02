import { parseGoodreadsExport } from './lib/goodreads.js';
import { buildProfile } from './lib/profile.js';
import { getRecommendations, validateApiKey } from './lib/gemini.js';
import { validateRecommendations, normalize } from './lib/catalog.js';
import * as storage from './lib/storage.js';
import { t, getLocale, applyTranslations } from './i18n/index.js';
import { renderResults } from './ui/render.js';

const state = {
  books: /** @type {import('./lib/goodreads.js').Book[]} */ ([]),
  profile: /** @type {import('./lib/profile.js').TasteProfile|null} */ (null),
  apiKey: storage.getApiKey(),
  results: /** @type {import('./lib/catalog.js').ValidatedRecommendation[]} */ ([]),
  discardedCount: 0,
  filter: /** @type {'all'|'safe'|'stretch'} */ ('all'),
  resultsLocale: /** @type {'en'|'es'|null} */ (null),
  editingKey: false,
  generating: false,
  shelfTitles: /** @type {{read: string[], toRead: string[]}} */ ({ read: [], toRead: [] }),
  librarySavedAt: /** @type {string|null} */ (null),
};

const el = {
  csvInput: document.getElementById('csv-input'),
  uploadStatus: document.getElementById('upload-status'),
  uploadError: document.getElementById('upload-error'),
  keySetup: document.getElementById('key-setup'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  changeKeyBtn: document.getElementById('change-key-btn'),
  forgetKeyBtn: document.getElementById('forget-key-btn'),
  keySavedNote: document.getElementById('key-saved-note'),
  keySavedActions: document.getElementById('key-saved-actions'),
  keyStatus: document.getElementById('key-status'),
  keyError: document.getElementById('key-error'),
  generateBtn: document.getElementById('generate-btn'),
  generateError: document.getElementById('generate-error'),
  loadingScreen: document.getElementById('loading-screen'),
  loadingText: document.getElementById('loading-text'),
  resultsScreen: document.getElementById('results-screen'),
  resultsGrid: document.getElementById('results-grid'),
  resultsEmpty: document.getElementById('results-empty'),
  discardedNote: document.getElementById('discarded-note'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  regenerateNote: document.getElementById('regenerate-note'),
  clearDataBtn: document.getElementById('clear-data-btn'),
  filterBtns: document.querySelectorAll('.filter-btn'),
};

// The setup form is never replaced: results are appended below it, so this
// only toggles the loading indicator and the results grid.
function showScreen(name) {
  el.loadingScreen.hidden = name !== 'loading';
  el.resultsScreen.hidden = name !== 'results';
}

// Both entry points lock while a batch runs, so a second click can't fire a
// concurrent Gemini call.
function setGenerating(busy) {
  state.generating = busy;
  el.generateBtn.disabled = busy || !canGenerate();
  el.regenerateBtn.disabled = busy || !canGenerate();
  el.regenerateBtn.textContent = busy ? t('generate.regenerating') : t('generate.regenerate');
  el.loadingScreen.hidden = !busy;
  el.resultsScreen.classList.toggle('is-busy', busy);
  el.resultsScreen.setAttribute('aria-busy', String(busy));
}

/** @param {string} key @param {Record<string, string|number>} [vars] */
function setLoadingPhase(key, vars) {
  el.loadingText.textContent = t(key, vars);
}

// A cached batch is restored on load, but the CSV behind it is not kept,
// so after a reload there is a results grid with no profile to regenerate
// from. Rather than let the button no-op, it goes inert and says why.
function canGenerate() {
  return !!(state.profile && state.apiKey);
}

function maybeEnableGenerate() {
  el.generateBtn.disabled = state.generating || !canGenerate();
  el.regenerateBtn.disabled = state.generating || !canGenerate();
  updateLibraryNote();
}

// Two messages share one slot: no profile at all means upload a CSV, and a
// restored snapshot means saying how old the library behind it is.
function updateLibraryNote() {
  if (!state.profile) {
    el.regenerateNote.textContent = t('generate.needsCsv');
    el.regenerateNote.hidden = state.results.length === 0;
    return;
  }
  const usingSnapshot = state.books.length === 0 && state.librarySavedAt;
  if (usingSnapshot) {
    el.regenerateNote.textContent = t('generate.usingSavedLibrary', {
      date: formatSavedAt(state.librarySavedAt),
    });
    el.regenerateNote.hidden = false;
    return;
  }
  el.regenerateNote.hidden = true;
}

/** @param {string} iso @returns {string} */
function formatSavedAt(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' }).format(date);
}

// "Change" reopens the form with the old key still valid until a new one is
// saved; "forget" clears it outright.
function updateKeyUI() {
  const hasKey = !!state.apiKey;
  const showForm = !hasKey || state.editingKey;
  el.keySetup.hidden = !showForm;
  el.keySavedNote.hidden = !hasKey || showForm;
  el.keySavedActions.hidden = !hasKey || showForm;
}

function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

async function handleCsvSelected(file) {
  el.uploadError.hidden = true;
  try {
    const text = await readCsvFile(file);
    const books = parseGoodreadsExport(text);
    if (books.length === 0) throw new Error('empty parse');

    state.books = books;
    state.profile = buildProfile(books);
    state.shelfTitles = shelfTitlesFrom(books);
    state.librarySavedAt = new Date().toISOString();
    // A private window or a full quota makes this a silent no-op, which reads
    // as the library having been saved when it wasn't. Say so instead.
    const saved = storage.setLibrary({
      profile: state.profile,
      shelfTitles: state.shelfTitles,
      savedAt: state.librarySavedAt,
    });

    el.uploadStatus.textContent = t(saved ? 'upload.fileSelected' : 'upload.notSaved', {
      filename: file.name,
    });
    el.uploadStatus.hidden = false;
  } catch {
    state.books = [];
    state.profile = null;
    el.uploadError.hidden = false;
  }
  maybeEnableGenerate();
}

async function handleSaveKey() {
  const key = el.apiKeyInput.value.trim();
  if (!key) return;

  el.keyError.hidden = true;
  el.keyStatus.textContent = t('key.validating');
  el.keyStatus.hidden = false;
  el.saveKeyBtn.disabled = true;

  const result = await validateApiKey(key);

  el.saveKeyBtn.disabled = false;
  el.keyStatus.hidden = true;

  if (!result.ok) {
    const messageKey = { invalid: 'key.invalid', billing: 'key.billingError', transient: 'key.transientError' }[
      result.reason
    ];
    el.keyError.textContent = t(messageKey);
    el.keyError.hidden = false;
    return;
  }

  state.apiKey = key;
  storage.setApiKey(key);
  el.apiKeyInput.value = '';
  state.editingKey = false;
  updateKeyUI();
  maybeEnableGenerate();
}

function handleChangeKey() {
  state.editingKey = true;
  updateKeyUI();
  el.apiKeyInput.focus();
}

function handleForgetKey() {
  state.apiKey = null;
  state.editingKey = false;
  storage.forgetApiKey();
  updateKeyUI();
  maybeEnableGenerate();
}

/**
 * @param {import('./lib/goodreads.js').Book[]} books
 * @returns {{read: string[], toRead: string[]}}
 */
function shelfTitlesFrom(books) {
  const onShelf = (shelf) =>
    books.filter((b) => b.exclusiveShelf === shelf).map((b) => `${b.title} — ${b.author}`);
  return { read: onShelf('read'), toRead: onShelf('to-read') };
}

function handleClearData() {
  if (!window.confirm(t('privacy.clearConfirm'))) return;
  storage.clearAll();
  state.apiKey = null;
  state.editingKey = false;
  state.books = [];
  state.profile = null;
  state.shelfTitles = { read: [], toRead: [] };
  state.librarySavedAt = null;
  state.results = [];
  state.discardedCount = 0;
  state.resultsLocale = null;
  el.uploadStatus.hidden = true;
  el.csvInput.value = '';
  updateKeyUI();
  maybeEnableGenerate();
  showScreen('idle');
}

function buildExclusionTitles() {
  const { notInterested } = storage.getExclusions();
  return [...state.shelfTitles.read, ...state.shelfTitles.toRead, ...notInterested];
}

function parseTitleAuthor(entry) {
  const [title, author] = entry.split(' — ');
  return { title: title ?? entry, author: author ?? '' };
}

function readBooksForDedupe() {
  const fromLibrary = state.shelfTitles.read.map(parseTitleAuthor);
  const { read, notInterested } = storage.getExclusions();
  return [...fromLibrary, ...read.map(parseTitleAuthor), ...notInterested.map(parseTitleAuthor)];
}

async function handleGenerate() {
  if (!state.profile || !state.apiKey || state.generating) return;

  el.generateError.hidden = true;
  setLoadingPhase('generate.loading');
  setGenerating(true);
  el.loadingScreen.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  try {
    const locale = getLocale();
    const exclusions = buildExclusionTitles();
    const recs = await getRecommendations(state.profile, exclusions, state.apiKey, locale);
    setLoadingPhase('generate.loadingCatalog', { done: 0, total: recs.length });
    const { validated, discardedCount } = await validateRecommendations(
      recs,
      readBooksForDedupe(),
      (done, total) => setLoadingPhase('generate.loadingCatalog', { done, total })
    );

    state.results = validated;
    state.discardedCount = discardedCount;
    state.resultsLocale = locale;

    storage.setLastBatch({
      recommendations: validated,
      locale,
      generatedAt: new Date().toISOString(),
    });

    renderCurrentResults();
    setGenerating(false);
    showScreen('results');
  } catch (err) {
    setGenerating(false);
    showScreen(state.results.length ? 'results' : 'idle');
    const code = /** @type {any} */ (err)?.code;
    if (code === 'quota') {
      el.generateError.textContent = t('generate.error.quota');
    } else if (code === 'unparsable') {
      el.generateError.textContent = t('generate.error.unparsable');
    } else {
      el.generateError.textContent = t('generate.error.generic');
    }
    el.generateError.hidden = false;
  }
}

function renderCurrentResults() {
  const staleReason = state.resultsLocale !== null && state.resultsLocale !== getLocale();
  renderResults(el.resultsGrid, state.results, { filter: state.filter, staleReason });

  const filtered =
    state.filter === 'all'
      ? state.results
      : state.results.filter((i) => i.recommendation.kind === state.filter);
  el.resultsEmpty.hidden = filtered.length > 0;

  if (state.discardedCount > 0) {
    el.discardedNote.textContent = t('results.discarded', { count: state.discardedCount });
    el.discardedNote.hidden = false;
  } else {
    el.discardedNote.hidden = true;
  }
}

function handleFilterClick(btn) {
  state.filter = /** @type {'all'|'safe'|'stretch'} */ (btn.dataset.filter);
  for (const b of el.filterBtns) b.classList.toggle('active', b === btn);
  renderCurrentResults();
}

// Marking the same book twice used to append a duplicate every time, and the
// list is both persisted and sent to Gemini on every generate, so it grew
// without bound in two places at once.
function addExclusion(listName, entry) {
  const exclusions = storage.getExclusions();
  const list = exclusions[listName];
  if (!list.includes(entry)) {
    list.push(entry);
    storage.setExclusions(exclusions);
  }
}

function handleCardAction(evt) {
  const card = evt.target.closest('.book-card');
  if (!card) return;
  const title = card.dataset.title;
  const author = card.dataset.author;
  const entry = `${title} — ${author}`;

  if (evt.target.classList.contains('mark-read-btn')) {
    addExclusion('read', entry);
    removeCardFromResults(title, author);
  } else if (evt.target.classList.contains('mark-not-interested-btn')) {
    addExclusion('notInterested', entry);
    removeCardFromResults(title, author);
  }
}

function removeCardFromResults(title, author) {
  state.results = state.results.filter(
    (i) => !(i.recommendation.title === title && i.recommendation.author === author)
  );
  renderCurrentResults();
}

function loadLibrarySnapshot() {
  const snapshot = storage.getLibrary();
  if (!snapshot?.profile) return;
  state.profile = snapshot.profile;
  state.shelfTitles = snapshot.shelfTitles ?? { read: [], toRead: [] };
  state.librarySavedAt = snapshot.savedAt ?? null;
}

function loadCachedBatch() {
  const cached = storage.getLastBatch();
  if (!cached) return;
  state.results = cached.recommendations;
  state.resultsLocale = cached.locale;
  renderCurrentResults();
  maybeEnableGenerate();
  showScreen('results');
}

function wireEvents() {
  el.csvInput.addEventListener('change', () => {
    const file = el.csvInput.files?.[0];
    if (file) handleCsvSelected(file);
  });

  el.saveKeyBtn.addEventListener('click', handleSaveKey);
  el.changeKeyBtn.addEventListener('click', handleChangeKey);
  el.forgetKeyBtn.addEventListener('click', handleForgetKey);
  el.clearDataBtn.addEventListener('click', handleClearData);
  el.generateBtn.addEventListener('click', handleGenerate);
  el.regenerateBtn.addEventListener('click', handleGenerate);

  for (const btn of el.filterBtns) {
    btn.addEventListener('click', () => handleFilterClick(btn));
  }

  el.resultsGrid.addEventListener('click', handleCardAction);
}

function init() {
  applyTranslations(document);
  updateKeyUI();
  loadLibrarySnapshot();
  maybeEnableGenerate();
  wireEvents();
  loadCachedBatch();
}

init();
