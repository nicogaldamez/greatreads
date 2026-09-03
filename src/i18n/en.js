export default {
  'app.wordmark': 'Great Reads',
  'app.tagline': 'Your taste in books, turned into your next recommendation.',

  'upload.title': '1. Upload your Goodreads export',
  'upload.instructions': 'Goodreads → My Books → Import/Export → Export Library',
  'upload.importLink': 'Open',
  'upload.importLinkFull': "Open Goodreads' import/export page",
  'upload.button': 'Choose CSV file',
  'upload.fileSelected': 'Selected: {filename}',
  'upload.notSaved':
    "Selected: {filename}. This browser wouldn't store the library, so you'll need to upload it again after a reload.",
  'upload.parseError': "Couldn't read that file. Make sure it's a Goodreads library export CSV.",

  'key.title': '2. Paste your Gemini API key',
  'key.instructions':
    "An API key is like a password that lets GreatReads ask Gemini, Google's AI model, for recommendations on your behalf. It's stored only in this browser, on your own computer. GreatReads has no server, so nothing you paste here ever leaves your machine except direct calls to Google.",
  'key.getKeyLink': 'Get a free API key from Google AI Studio',
  'key.help.summary': 'How do I get one?',
  'key.help.step1': 'Open Google AI Studio (link above) and sign in with any Google account.',
  'key.help.step2': 'Go to the API keys section and click "Create API key".',
  'key.help.step3': 'Pick an existing Google Cloud project, or let AI Studio create one for you. Either works.',
  'key.help.step4': 'Copy the key it shows you and paste it in the field below.',
  'key.help.freeNote':
    'The free tier needs no credit card. It has per-minute and per-day rate limits, which is plenty for a handful of recommendation runs.',
  'key.help.secretNote':
    "Treat the key like a password: don't share it or commit it anywhere. You can delete it from AI Studio at any time.",
  'key.placeholder': 'Paste your API key',
  'key.alreadySaved': "You already have a key saved for this browser.",
  'key.change': 'Change key',
  'key.forget': 'Forget my key',
  'key.validating': 'Checking your key…',
  'key.invalid': 'That key was rejected by Google. Double-check it and try again.',
  'key.transientError':
    "Google's API is temporarily overloaded or unreachable. This isn't about your key. Wait a moment and try again.",
  'key.billingError':
    "This key's project is out of prepaid credits, and waiting won't fix it. Add billing at ai.studio/projects, or use a different key on the free tier.",
  'key.save': 'Save & continue',

  'generate.button': 'Get recommendations',
  'generate.regenerate': 'Regenerate',
  'generate.loading': 'Reading your taste in books…',
  'generate.loadingCatalog': 'Checking {done} of {total} books against catalogs…',
  'generate.regenerating': 'Regenerating…',
  'generate.needsCsv':
    'These are your last saved recommendations. Upload your Goodreads export again to regenerate.',
  'generate.usingSavedLibrary':
    'Regenerating will use the library you uploaded on {date}. Upload a fresh export to bring it up to date.',
  'generate.error.quota': "You've hit Gemini's free-tier rate limit. Wait a bit and try again.",
  'generate.error.generic': 'Something went wrong talking to Gemini. Try again in a moment.',
  'generate.error.unparsable': "Gemini's response couldn't be parsed. Try regenerating.",

  'results.title': 'Recommendations',
  'results.filter.all': 'All',
  'results.filter.safe': 'Safe bets',
  'results.filter.stretch': 'Stretch picks',
  'results.badge.safe': 'Safe bet',
  'results.badge.stretch': 'Stretch pick',
  'results.discarded': '{count, plural, one {# recommendation} other {# recommendations}} discarded: not found in any catalog.',
  'results.staleReason': 'This explanation is from a previous language. Regenerate to update it.',
  'results.markRead': "I've read this",
  'results.markNotInterested': 'Not interested',
  'results.openLibraryLink': 'View on Open Library',
  'results.goodreadsSearchLink': 'Search on Goodreads',
  'results.empty': 'Upload your library and add your API key to get started.',

  'privacy.note': 'Everything happens in your browser. No account, no server, no database.',
  'privacy.clearAll': 'Erase all my data',
  'privacy.clearConfirm':
    'This erases your API key, your saved recommendations, your library summary and your read/not-interested marks from this browser. Continue?',

  'faq.title': 'Frequently asked questions',
  'faq.q.stored': 'What does GreatReads store on my machine?',
  'faq.a.stored':
    "Five things, all saved in your own browser: your API key, your last batch of recommendations, a summary of your library, the books you marked as read or not interested, and a copy of the catalog searches we've already done (so we don't repeat them next time). Nothing else, and nothing on any server.",
  'faq.q.discarded': 'Why did some recommendations disappear?',
  'faq.a.discarded':
    "Before showing you a book, we check that it actually exists by searching two real catalogs: Open Library and Google Books. If we can't find it in either one, we drop it from the list. That's how we keep the AI's made-up books out of your results.",
  'faq.q.cost': 'What does this cost?',
  'faq.a.cost':
    "Nothing. Gemini's free tier covers it and needs no credit card. If you hit its per-minute usage limit, wait a moment and try again.",
  'faq.q.reset': 'How do I erase everything?',
  'faq.a.reset':
    'Tap "Erase all my data" at the bottom of the page: it erases everything we saved, all at once. "Forget my key" does less: it only erases the key.',
  'faq.q.kinds': "What's the difference between a safe bet and a stretch pick?",
  'faq.a.kinds':
    "Safe bets land squarely within the taste your library already shows. Stretch picks deliberately move away from that (neighboring genres, authors you haven't tried, other eras), but always connecting back to something you enjoyed.",
  'faq.q.remembers': 'Does it remember the books I marked?',
  'faq.a.remembers':
    'Yes. "I\'ve read this" and "Not interested" are saved locally and passed to Gemini as exclusions in the next batch, so those books don\'t come back.',

  'footer.sourceLink': 'View source',
  'footer.xLink': '@nicogaldamez',
};
