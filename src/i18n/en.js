export default {
  'app.title': 'Bookito',
  'app.tagline': 'Book recommendations from your Goodreads history',
  'app.langToggle.es': 'ES',
  'app.langToggle.en': 'EN',

  'upload.title': '1. Upload your Goodreads export',
  'upload.instructions': 'Goodreads → My Books → Import/Export → Export Library',
  'upload.button': 'Choose CSV file',
  'upload.fileSelected': 'Selected: {filename}',
  'upload.parseError': "Couldn't read that file. Make sure it's a Goodreads library export CSV.",

  'key.title': '2. Paste your Gemini API key',
  'key.instructions':
    'The key is stored only in this browser (localStorage). Bookito has no server — nothing you paste here ever leaves your machine except direct calls to Google.',
  'key.getKeyLink': 'Get a free API key from Google AI Studio',
  'key.placeholder': 'Paste your API key',
  'key.forget': 'Forget my key',
  'key.validating': 'Checking your key…',
  'key.invalid': 'That key was rejected by Google. Double-check it and try again.',
  'key.transientError':
    "Google's API is temporarily overloaded or unreachable — this isn't about your key. Wait a moment and try again.",
  'key.billingError':
    "This key's project is out of prepaid credits — waiting won't fix it. Add billing at ai.studio/projects, or use a different key on the free tier.",
  'key.save': 'Save & continue',

  'generate.button': 'Get recommendations',
  'generate.regenerate': 'Regenerate',
  'generate.loading': 'Reading your taste in books…',
  'generate.error.quota': "You've hit Gemini's free-tier rate limit. Wait a bit and try again.",
  'generate.error.generic': 'Something went wrong talking to Gemini. Try again in a moment.',
  'generate.error.unparsable': "Gemini's response couldn't be parsed. Try regenerating.",

  'results.title': 'Recommendations',
  'results.filter.all': 'All',
  'results.filter.safe': 'Safe bets',
  'results.filter.stretch': 'Stretch picks',
  'results.badge.safe': 'Safe bet',
  'results.badge.stretch': 'Stretch pick',
  'results.discarded': '{count, plural, one {# recommendation} other {# recommendations}} discarded — not found in any catalog.',
  'results.staleReason': 'This explanation is from a previous language — regenerate to update it.',
  'results.markRead': "I've read this",
  'results.markNotInterested': 'Not interested',
  'results.openLibraryLink': 'View on Open Library',
  'results.goodreadsSearchLink': 'Search on Goodreads',
  'results.empty': 'Upload your library and add your API key to get started.',

  'privacy.note': 'Everything happens in your browser. No account, no server, no database.',

  'footer.sourceLink': 'View source on GitHub',
};
