import { test } from 'node:test';
import assert from 'node:assert/strict';
import en from '../src/i18n/en.js';
import es from '../src/i18n/es.js';
import { t, setLocale } from '../src/i18n/index.js';

test('en.js and es.js have exactly the same keys', () => {
  const enKeys = Object.keys(en).sort();
  const esKeys = Object.keys(es).sort();

  const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
  const missingInEn = esKeys.filter((k) => !enKeys.includes(k));

  assert.deepEqual(missingInEs, [], `keys missing in es.js: ${missingInEs.join(', ')}`);
  assert.deepEqual(missingInEn, [], `keys missing in en.js: ${missingInEn.join(', ')}`);
});

test('no dictionary value is empty', () => {
  for (const [dictName, dict] of [
    ['en', en],
    ['es', es],
  ]) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(value && value.length > 0, `${dictName}.${key} is empty`);
    }
  }
});

test('t() interpolates simple placeholders', () => {
  setLocale('en');
  assert.equal(t('upload.fileSelected', { filename: 'export.csv' }), 'Selected: export.csv');
});

test('t() resolves plural blocks per locale, singular and plural', () => {
  setLocale('en');
  assert.match(t('results.discarded', { count: 1 }), /^1 recommendation discarded/);
  assert.match(t('results.discarded', { count: 3 }), /^3 recommendations discarded/);

  setLocale('es');
  assert.match(t('results.discarded', { count: 1 }), /^1 recomendación descartada/);
  assert.match(t('results.discarded', { count: 5 }), /^5 recomendaciones descartadas/);
});

test('a book title in Spanish survives a round trip untranslated (titles are never localized)', () => {
  setLocale('es');
  const title = 'Cien años de soledad';
  const rendered = t('upload.fileSelected', { filename: title });
  assert.ok(rendered.includes(title));
});
