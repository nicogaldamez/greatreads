/**
 * @typedef {import('./profile.js').TasteProfile} TasteProfile
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} title
 * @property {string} author
 * @property {number} year
 * @property {string} reason
 * @property {'safe'|'stretch'} kind
 * @property {number} confidence
 */

// Google renames and deprecates dated model versions. gemini-flash-latest
// kept returning "high demand" 503s, so this is pinned to a stable,
// non-preview, lightweight model that tends to have more headroom.
const MODEL = 'gemini-3.5-flash-lite';

const RECOMMENDATION_COUNT = 20;

/**
 * @param {string} apiKey
 * @returns {string}
 */
function endpointFor(apiKey) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
}

/**
 * A 429 from Gemini can mean two very different things: a plain rate
 * limit (retry shortly) or depleted prepay credits/quota (retrying won't
 * help — the user needs to add billing). Google encodes both as HTTP 429
 * with no distinct status code, so the only signal is the error message
 * text.
 * @param {string} message
 * @returns {boolean}
 */
function looksLikeBillingIssue(message) {
  return /credit|billing|prepay/i.test(message ?? '');
}

/**
 * Classifies a failed validation response into a reason the UI can show
 * a specific, actionable message for.
 * @param {number} status
 * @param {string} [message]
 * @returns {'invalid'|'billing'|'transient'}
 */
function classifyFailure(status, message) {
  if (status === 429 && looksLikeBillingIssue(message)) return 'billing';
  if (status === 429 || status >= 500) return 'transient';
  return 'invalid';
}

/**
 * Sends a minimal request to confirm the API key is valid. Distinguishes
 * an actually-bad key (401/403/400) from a transient failure on Google's
 * end (plain rate limiting, 5xx, or a network error) from depleted
 * billing/quota — each needs a different message, since only the first
 * one is actually about the key being wrong.
 * @param {string} apiKey
 * @returns {Promise<{ok: true} | {ok: false, reason: 'invalid'|'billing'|'transient'}>}
 */
export async function validateApiKey(apiKey) {
  try {
    const res = await fetch(endpointFor(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "ok".' }] }],
      }),
    });
    if (res.ok) return { ok: true };

    let message;
    try {
      const body = await res.json();
      message = body?.error?.message;
    } catch {
      // No JSON body to read — classify on status alone.
    }

    return { ok: false, reason: classifyFailure(res.status, message) };
  } catch {
    return { ok: false, reason: 'transient' };
  }
}

export { classifyFailure };

/**
 * @param {TasteProfile} profile
 * @param {string[]} exclusionTitles - normalized "title|author" strings to exclude
 * @param {'en'|'es'} locale
 * @returns {string}
 */
function buildPrompt(profile, exclusionTitles, locale) {
  const langName = locale === 'es' ? 'Spanish' : 'English';

  return `You are a book recommendation engine. Below is a reader's taste profile,
compressed from their full reading history.

Loved (rated 5 stars): ${JSON.stringify(profile.loved)}
Liked (rated 4 stars): ${JSON.stringify(profile.liked)}
Disliked (rated 1-2 stars): ${JSON.stringify(profile.disliked)}
Recently read: ${JSON.stringify(profile.recent)}
Top shelves/genres: ${JSON.stringify(profile.topShelves)}
Stats: total books read = ${profile.stats.totalRead}, average rating = ${profile.stats.avgRating.toFixed(
    2
  )}, contrarian index (mean of my rating minus Goodreads average; strongly
negative means this reader is picky and dislikes consensus bestsellers) = ${profile.stats.contrarianIndex.toFixed(
    2
  )}

Do NOT recommend any book in this exclusion list (already read or already on
their to-read shelf): ${JSON.stringify(exclusionTitles)}

Recommend exactly ${RECOMMENDATION_COUNT} books. Deliberately mix roughly 60%
"safe" bets (very close to what they already love) and roughly 40% "stretch"
picks (adjacent genres, different eras, or authors they haven't tried, but
still plausibly a fit). Mark each with "kind": "safe" or "stretch".

Every recommendation's "reason" must cite specific books from the profile
above by title (e.g. "because you rated X 5 stars and Y only 1 star"), never
a vague generality like "because you like science fiction".

Write the "reason" field in ${langName}. However, "title" and "author" must
ALWAYS be in their original catalogued form (the form used by library
catalogs like Open Library, typically the original publication language),
never translated — this is critical, do not translate titles or author
names even though the reason is in ${langName}.

Respond with ONLY a JSON array, no markdown code fences, no preamble, no
explanation. Each element must have exactly this shape:
{"title": string, "author": string, "year": number, "reason": string, "kind": "safe"|"stretch", "confidence": number between 0 and 1}`;
}

/**
 * Strips a ```json ... ``` fence if the model added one despite instructions.
 * @param {string} text
 * @returns {string}
 */
function stripCodeFence(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/**
 * @param {TasteProfile} profile
 * @param {string[]} exclusionTitles
 * @param {string} apiKey
 * @param {'en'|'es'} locale
 * @returns {Promise<Recommendation[]>}
 */
export async function getRecommendations(profile, exclusionTitles, apiKey, locale) {
  const prompt = buildPrompt(profile, exclusionTitles, locale);

  const res = await fetch(endpointFor(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (res.status === 429) {
    throw Object.assign(new Error('quota exceeded'), { code: 'quota' });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Gemini request failed: ${res.status}`), { code: 'generic' });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw Object.assign(new Error('empty response from Gemini'), { code: 'unparsable' });
  }

  const cleaned = stripCodeFence(text);

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw Object.assign(new Error('could not parse Gemini response as JSON'), {
      code: 'unparsable',
    });
  }

  if (!Array.isArray(parsed)) {
    throw Object.assign(new Error('Gemini response was not a JSON array'), {
      code: 'unparsable',
    });
  }

  return /** @type {Recommendation[]} */ (parsed).filter(
    (r) => r && typeof r.title === 'string' && typeof r.author === 'string'
  );
}

export { MODEL };
