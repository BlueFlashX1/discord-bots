'use strict';

// RedditMonitor requires Discord/Reddit clients and node-cron at construction
// time. We only need to test the two pure filtering methods, so we instantiate
// the class with the minimal stubs needed to survive the constructor without
// hitting the filesystem or external modules.

jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../services/redditClient', () => ({
  RedditClient: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../services/discordPoster', () => ({
  DiscordPoster: jest.fn().mockImplementation(() => ({})),
}));
jest.mock('../../services/configManager', () => ({}));

// Stub fs so loadPostedIds() does not touch the real filesystem.
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const { RedditMonitor } = require('../../services/redditMonitor');

function makeMonitor() {
  // Pass a minimal config and null discord client; constructor only reads
  // config properties via this.config, so an empty object is sufficient.
  return new RedditMonitor({}, null);
}

// ---------------------------------------------------------------------------
describe('matchesKeywords', () => {
  let monitor;

  beforeEach(() => {
    monitor = makeMonitor();
  });

  test('returns true when keywords array is empty (match-all)', () => {
    expect(monitor.matchesKeywords('some text', [])).toBe(true);
  });

  test('returns true when keywords is null (match-all)', () => {
    expect(monitor.matchesKeywords('some text', null)).toBe(true);
  });

  test('returns false when text is null and keywords exist', () => {
    expect(monitor.matchesKeywords(null, ['bitcoin'])).toBe(false);
  });

  test('returns false when text is empty string and keywords exist', () => {
    expect(monitor.matchesKeywords('', ['bitcoin'])).toBe(false);
  });

  test('matches case-insensitively', () => {
    expect(monitor.matchesKeywords('Bitcoin price rises', ['bitcoin'])).toBe(true);
    expect(monitor.matchesKeywords('bitcoin price rises', ['BITCOIN'])).toBe(true);
    expect(monitor.matchesKeywords('BITCOIN PRICE RISES', ['Bitcoin'])).toBe(true);
  });

  test('returns true on partial word match (documents includes() behavior)', () => {
    // 'includes' matches substrings, not whole words
    expect(monitor.matchesKeywords('bitcointalk forum', ['bitcoin'])).toBe(true);
    expect(monitor.matchesKeywords('cryptocurrency', ['crypto'])).toBe(true);
  });

  test('returns true when at least one keyword matches', () => {
    expect(monitor.matchesKeywords('ethereum news', ['bitcoin', 'ethereum'])).toBe(true);
  });

  test('returns false when no keyword is present in the text', () => {
    expect(monitor.matchesKeywords('ethereum price update', ['bitcoin', 'dogecoin'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('matchesExcludeKeywords', () => {
  let monitor;

  beforeEach(() => {
    monitor = makeMonitor();
  });

  test('returns false when excludeKeywords is empty (exclude nothing)', () => {
    expect(monitor.matchesExcludeKeywords('buy bitcoin now', [])).toBe(false);
  });

  test('returns false when excludeKeywords is null (exclude nothing)', () => {
    expect(monitor.matchesExcludeKeywords('buy bitcoin now', null)).toBe(false);
  });

  test('returns true when a keyword matches (case-insensitive)', () => {
    expect(monitor.matchesExcludeKeywords('SCAM alert', ['scam'])).toBe(true);
    expect(monitor.matchesExcludeKeywords('scam alert', ['SCAM'])).toBe(true);
  });

  test('returns false when text is null and excludeKeywords exist', () => {
    expect(monitor.matchesExcludeKeywords(null, ['scam'])).toBe(false);
  });

  test('returns false when text is empty string and excludeKeywords exist', () => {
    expect(monitor.matchesExcludeKeywords('', ['scam'])).toBe(false);
  });

  test('returns false when no exclude keyword matches the text', () => {
    expect(monitor.matchesExcludeKeywords('legitimate investment opportunity', ['scam', 'fraud'])).toBe(false);
  });

  test('returns true when at least one exclude keyword matches', () => {
    expect(monitor.matchesExcludeKeywords('this is a fraud scheme', ['scam', 'fraud'])).toBe(true);
  });
});
