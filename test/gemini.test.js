import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getRecommendations, validateApiKey, classifyFailure } from '../src/lib/gemini.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function mockGeminiResponse(text) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    { status: 200 }
  );
}

const profile = {
  loved: [],
  liked: [],
  disliked: [],
  recent: [],
  topShelves: [],
  stats: { totalRead: 0, avgRating: 0, contrarianIndex: 0 },
};

test('getRecommendations parses a plain JSON array response', async () => {
  globalThis.fetch = async () =>
    mockGeminiResponse(
      JSON.stringify([{ title: 'Dune', author: 'Frank Herbert', year: 1965, reason: 'x', kind: 'safe', confidence: 0.9 }])
    );

  const recs = await getRecommendations(profile, [], 'fake-key', 'en');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].title, 'Dune');
});

test('getRecommendations strips a ```json code fence if present', async () => {
  const body = '```json\n' + JSON.stringify([{ title: 'Dune', author: 'Frank Herbert' }]) + '\n```';
  globalThis.fetch = async () => mockGeminiResponse(body);

  const recs = await getRecommendations(profile, [], 'fake-key', 'en');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].title, 'Dune');
});

test('getRecommendations throws with code "quota" on HTTP 429', async () => {
  globalThis.fetch = async () => new Response('rate limited', { status: 429 });

  await assert.rejects(
    () => getRecommendations(profile, [], 'fake-key', 'en'),
    (err) => err.code === 'quota'
  );
});

test('getRecommendations throws with code "unparsable" on garbage JSON', async () => {
  globalThis.fetch = async () => mockGeminiResponse('not json at all');

  await assert.rejects(
    () => getRecommendations(profile, [], 'fake-key', 'en'),
    (err) => err.code === 'unparsable'
  );
});

test('a Spanish title is not translated by the prompt-building logic', async () => {
  globalThis.fetch = async (url, opts) => {
    const body = JSON.parse(opts.body);
    const prompt = body.contents[0].parts[0].text;
    assert.match(prompt, /never translated/);
    return mockGeminiResponse(JSON.stringify([{ title: 'Cien años de soledad', author: 'Gabriel García Márquez' }]));
  };

  const recs = await getRecommendations(profile, [], 'fake-key', 'es');
  assert.equal(recs[0].title, 'Cien años de soledad');
});

test('classifyFailure treats a plain 429 as transient', () => {
  assert.equal(classifyFailure(429, 'Resource has been exhausted, please try again later.'), 'transient');
});

test('classifyFailure treats a 429 mentioning prepay credits as a billing issue', () => {
  assert.equal(
    classifyFailure(429, 'Your prepayment credits are depleted. Please go to AI Studio to manage billing.'),
    'billing'
  );
});

test('classifyFailure treats 5xx as transient', () => {
  assert.equal(classifyFailure(503, 'This model is currently experiencing high demand.'), 'transient');
});

test('classifyFailure treats 400/401/403 as an invalid key', () => {
  assert.equal(classifyFailure(400, 'API key not valid.'), 'invalid');
  assert.equal(classifyFailure(403, 'PERMISSION_DENIED'), 'invalid');
});

test('validateApiKey reports reason "billing" for a depleted-credits 429', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: { code: 429, message: 'Your prepayment credits are depleted.', status: 'RESOURCE_EXHAUSTED' },
      }),
      { status: 429 }
    );

  const result = await validateApiKey('fake-key');
  assert.deepEqual(result, { ok: false, reason: 'billing' });
});

test('validateApiKey reports ok:true on a 200', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ candidates: [] }), { status: 200 });

  const result = await validateApiKey('fake-key');
  assert.deepEqual(result, { ok: true });
});
