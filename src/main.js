import { parseGoodreadsExport } from './lib/goodreads.js';
import { buildProfile } from './lib/profile.js';
import { getRecommendations, validateApiKey } from './lib/gemini.js';
import { validateRecommendations, normalize } from './lib/catalog.js';
import * as storage from './lib/storage.js';
import { t, getLocale, setLocale, applyTranslations } from './i18n/index.js';
import { renderResults } from './ui/render.js';

const state = {
  books: /** @type {import('./lib/goodreads.js').Book[]} */ ([]),
  profile: /** @type {import('./lib/profile.js').TasteProfile|null} */ (null),
  apiKey: storage.getApiKey(),
  results: /** @type {import('./lib/catalog.js').ValidatedRecommendation[]} */ ([]),
  discardedCount: 0,
  filter: /** @type {'all'|'safe'|'stretch'} */ ('all'),
  resultsLocale: /** @type {'en'|'es'|null} */ (null),
};

const el = {
  langToggle: document.getElementById('lang-toggle'),
  langToggleLabel: document.getElementById('lang-toggle-label'),
  csvInput: document.getElementById('csv-input'),
  uploadStatus: document.getElementById('upload-status'),
  uploadError: document.getElementById('upload-error'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  forgetKeyBtn: document.getElementById('forget-key-btn'),
  keyStatus: document.getElementById('key-status'),
  keyError: document.getElementById('key-error'),
  generateBtn: document.getElementById('generate-btn'),
  generateError: document.getElementById('generate-error'),
  setupScreen: document.getElementById('setup-screen'),
  loadingScreen: document.getElementById('loading-screen'),
  resultsScreen: document.getElementById('results-screen'),
  resultsGrid: document.getElementById('results-grid'),
  resultsEmpty: document.getElementById('results-empty'),
  discardedNote: document.getElementById('discarded-note'),
  regenerateBtn: document.getElementById('regenerate-btn'),
  filterBtns: document.querySelectorAll('.filter-btn'),
};

function showScreen(name) {
  el.setupScreen.hidden = name !== 'setup';
  el.loadingScreen.hidden = name !== 'loading';
  el.resultsScreen.hidden = name !== 'results';
}

function updateLangToggleLabel() {
  el.langToggleLabel.textContent = getLocale() === 'es' ? t('app.langToggle.en') : t('app.langToggle.es');
}

function maybeEnableGenerate() {
  el.generateBtn.disabled = !(state.profile && state.apiKey);
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

    el.uploadStatus.textContent = t('upload.fileSelected', { filename: file.name });
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
  el.forgetKeyBtn.hidden = false;
  maybeEnableGenerate();
}

function handleForgetKey() {
  state.apiKey = null;
  storage.forgetApiKey();
  el.forgetKeyBtn.hidden = true;
  maybeEnableGenerate();
}

function buildExclusionTitles() {
  const toReadTitles = state.books
    .filter((b) => b.exclusiveShelf === 'to-read')
    .map((b) => `${b.title} — ${b.author}`);
  const readTitles = state.books
    .filter((b) => b.exclusiveShelf === 'read')
    .map((b) => `${b.title} — ${b.author}`);
  const { notInterested } = storage.getExclusions();
  return [...readTitles, ...toReadTitles, ...notInterested];
}

function parseTitleAuthor(entry) {
  const [title, author] = entry.split(' — ');
  return { title: title ?? entry, author: author ?? '' };
}

function readBooksForDedupe() {
  const fromCsv = state.books
    .filter((b) => b.exclusiveShelf === 'read')
    .map((b) => ({ title: b.title, author: b.author }));
  const { read, notInterested } = storage.getExclusions();
  return [...fromCsv, ...read.map(parseTitleAuthor), ...notInterested.map(parseTitleAuthor)];
}

async function handleGenerate() {
  if (!state.profile || !state.apiKey) return;

  el.generateError.hidden = true;
  showScreen('loading');

  try {
    const locale = getLocale();
    const exclusions = buildExclusionTitles();
    const recs = await getRecommendations(state.profile, exclusions, state.apiKey, locale);
    const { validated, discardedCount } = await validateRecommendations(recs, readBooksForDedupe());

    state.results = validated;
    state.discardedCount = discardedCount;
    state.resultsLocale = locale;

    storage.setLastBatch({
      recommendations: validated,
      locale,
      generatedAt: new Date().toISOString(),
    });

    renderCurrentResults();
    showScreen('results');
  } catch (err) {
    showScreen('setup');
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

function handleCardAction(evt) {
  const card = evt.target.closest('.book-card');
  if (!card) return;
  const title = card.dataset.title;
  const author = card.dataset.author;

  if (evt.target.classList.contains('mark-read-btn')) {
    const exclusions = storage.getExclusions();
    exclusions.read.push(`${title} — ${author}`);
    storage.setExclusions(exclusions);
    removeCardFromResults(title, author);
  } else if (evt.target.classList.contains('mark-not-interested-btn')) {
    const exclusions = storage.getExclusions();
    exclusions.notInterested.push(`${title} — ${author}`);
    storage.setExclusions(exclusions);
    removeCardFromResults(title, author);
  }
}

function removeCardFromResults(title, author) {
  state.results = state.results.filter(
    (i) => !(i.recommendation.title === title && i.recommendation.author === author)
  );
  renderCurrentResults();
}

function loadCachedBatch() {
  const cached = storage.getLastBatch();
  if (!cached) return;
  state.results = cached.recommendations;
  state.resultsLocale = cached.locale;
  renderCurrentResults();
  showScreen('results');
}

function wireEvents() {
  el.langToggle.addEventListener('click', () => {
    const next = getLocale() === 'es' ? 'en' : 'es';
    setLocale(next);
    applyTranslations(document);
    updateLangToggleLabel();
    renderCurrentResults();
  });

  el.csvInput.addEventListener('change', () => {
    const file = el.csvInput.files?.[0];
    if (file) handleCsvSelected(file);
  });

  el.saveKeyBtn.addEventListener('click', handleSaveKey);
  el.forgetKeyBtn.addEventListener('click', handleForgetKey);
  el.generateBtn.addEventListener('click', handleGenerate);
  el.regenerateBtn.addEventListener('click', handleGenerate);

  for (const btn of el.filterBtns) {
    btn.addEventListener('click', () => handleFilterClick(btn));
  }

  el.resultsGrid.addEventListener('click', handleCardAction);
}

function init() {
  applyTranslations(document);
  updateLangToggleLabel();
  if (state.apiKey) el.forgetKeyBtn.hidden = false;
  maybeEnableGenerate();
  wireEvents();
  loadCachedBatch();
}

init();
