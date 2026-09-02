import en from './en.js';
import es from './es.js';

const STORAGE_KEY = 'bookito.locale';

const dictionaries = { en, es };

let currentLocale = detectLocale();

/** @returns {'en'|'es'} */
function detectLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {
    // localStorage unavailable (e.g. tests) — fall through.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav && nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** @returns {'en'|'es'} */
export function getLocale() {
  return currentLocale;
}

/** @param {'en'|'es'} locale */
export function setLocale(locale) {
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage failures — locale still applies for this session.
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

const PLURAL_RE = /\{(\w+), plural, one \{([^{}]*)\} other \{([^{}]*)\}\}/;

/**
 * Resolves an ICU-lite plural block embedded anywhere in `template`, of the
 * form "{count, plural, one {# thing} other {# things}}", using `vars` to
 * look up the count variable.
 * @param {string} template
 * @param {Record<string, string|number>} vars
 * @param {'en'|'es'} locale
 * @returns {string}
 */
function resolvePlural(template, vars, locale) {
  const match = template.match(PLURAL_RE);
  if (!match) return template;
  const [full, countKey, onePattern, otherPattern] = match;
  const count = Number(vars[countKey] ?? 0);
  const rules = new Intl.PluralRules(locale);
  const category = rules.select(count);
  const chosen = (category === 'one' ? onePattern : otherPattern).replace(/#/g, String(count));
  return template.replace(full, chosen);
}

/**
 * Translates `key`, interpolating `{placeholder}` variables. Supports a
 * single top-level ICU-lite plural block per string.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  const dict = dictionaries[currentLocale];
  let template = dict[key];
  if (template === undefined) {
    template = dictionaries.en[key];
  }
  if (template === undefined) {
    return key;
  }

  if (PLURAL_RE.test(template)) {
    template = resolvePlural(template, vars, currentLocale);
  }

  return template.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

/**
 * Applies translations to every `[data-i18n]` (textContent) and
 * `[data-i18n-attr]` (comma-separated `attr:key` pairs) node under `root`.
 * @param {ParentNode} [root]
 */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  }

  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    const spec = el.getAttribute('data-i18n-attr');
    if (!spec) continue;
    for (const pair of spec.split(',')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = currentLocale;
  }
}

export { dictionaries as _dictionaries };
