'use strict';

// AnalysisEngine requires AIGrammarService, which tries to load OpenAI.
// We mock the entire aiGrammar service to avoid that dependency at test time.
jest.mock('../../services/aiGrammar', () => {
  return jest.fn().mockImplementation(() => ({}));
});

// Prevent database model loading from causing errors
jest.mock('../../database/models/DailyStats', () => null, { virtual: true });

const AnalysisEngine = require('../../services/analysisEngine');

describe('shouldCheck', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
    // Use deterministic limits regardless of env vars
    engine.minLength = 10;
    engine.maxLength = 1000;
  });

  test('rejects text below minLength', () => {
    expect(engine.shouldCheck('Hi there')).toBe(false); // 8 chars
  });

  test('rejects text that is exactly minLength - 1', () => {
    const text = 'a'.repeat(engine.minLength - 1);
    expect(engine.shouldCheck(text)).toBe(false);
  });

  test('accepts text at exactly minLength if it contains whitespace', () => {
    // "hello wor" is 9 chars, "hello worl" is 10 — use a real two-word phrase
    const text = 'hello worl'; // 10 chars, has a space
    expect(engine.shouldCheck(text)).toBe(true);
  });

  test('rejects text above maxLength', () => {
    const text = ('hello world ').repeat(100); // well over 1000
    expect(engine.shouldCheck(text)).toBe(false);
  });

  test('rejects URLs containing http://', () => {
    expect(engine.shouldCheck('check out http://example.com for more')).toBe(false);
  });

  test('rejects URLs containing https://', () => {
    expect(engine.shouldCheck('see https://example.com for details')).toBe(false);
  });

  test('rejects code blocks', () => {
    expect(engine.shouldCheck('here is some ```code``` to review')).toBe(false);
  });

  test('rejects single-word text', () => {
    // Must be >= minLength and no whitespace
    expect(engine.shouldCheck('superlongword')).toBe(false);
  });

  test('rejects emoji-dominant text (>50% emojis)', () => {
    // The emoji regex /[\p{Emoji}]/gu matches Unicode Emoji property, which includes
    // ASCII digits 0-9 (they have the Emoji property as single codepoints).
    // Multi-char surrogate-pair emojis (😀) count as 1 match but 2 chars,
    // so they can never exceed the 0.5 ratio threshold on their own.
    // A string like "111111111 x" has 9 digit/emoji matches in 11 chars = 81% > 50%.
    const text = '111111111 x'; // 9 single-codepoint "emoji" digits, 2 non-emoji chars
    expect(engine.shouldCheck(text)).toBe(false);
  });

  test('rejects number-dominant text (>70% digits)', () => {
    // 10 digits + space + "ab" = 13 chars, 10 digits = 77% digits
    expect(engine.shouldCheck('1234567890 ab')).toBe(false);
  });

  test('accepts valid multi-word text with no special patterns', () => {
    expect(engine.shouldCheck('This is a perfectly normal sentence.')).toBe(true);
  });

  test('accepts text at exactly minLength with a space', () => {
    // "hello worl" = 10 chars, 1 space
    const text = 'hello worl';
    expect(engine.shouldCheck(text)).toBe(true);
  });
});

describe('containsSensitiveInfo', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('detects credit card numbers (16 digits)', () => {
    expect(engine.containsSensitiveInfo('my card is 4111111111111111 please charge it')).toBe(true);
  });

  test('detects credit card numbers with spaces', () => {
    expect(engine.containsSensitiveInfo('card: 4111 1111 1111 1111')).toBe(true);
  });

  test('detects SSN format XXX-XX-XXXX', () => {
    expect(engine.containsSensitiveInfo('ssn is 123-45-6789')).toBe(true);
  });

  test('detects SSN format without dashes', () => {
    expect(engine.containsSensitiveInfo('ssn 123456789')).toBe(true);
  });

  test('detects Stripe live API key (sk_live_)', () => {
    expect(engine.containsSensitiveInfo('key sk_live_abcdefghijklmnopqrstuv here')).toBe(true);
  });

  test('detects AWS access key (AKIA prefix)', () => {
    expect(engine.containsSensitiveInfo('AKIAIOSFODNN7EXAMPLE is my key')).toBe(true);
  });

  test('detects GitHub personal access token (ghp_)', () => {
    const token = 'ghp_' + 'a'.repeat(36);
    expect(engine.containsSensitiveInfo(`token: ${token}`)).toBe(true);
  });

  test('detects JWT tokens (eyJ...eyJ... format)', () => {
    // Minimal valid-looking JWT structure
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.' +
      'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    expect(engine.containsSensitiveInfo(`my token is ${jwt}`)).toBe(true);
  });

  test('detects PEM private keys', () => {
    expect(
      engine.containsSensitiveInfo('-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----')
    ).toBe(true);
  });

  test('detects PEM PRIVATE KEY (generic header)', () => {
    expect(
      engine.containsSensitiveInfo('-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----')
    ).toBe(true);
  });

  test('detects MongoDB connection strings', () => {
    expect(
      engine.containsSensitiveInfo('connect with mongodb+srv://user:pass@cluster.mongodb.net/db')
    ).toBe(true);
  });

  test('allows normal text without sensitive info', () => {
    expect(engine.containsSensitiveInfo('Hello, how are you doing today?')).toBe(false);
  });

  test('allows a single email address (not flagged unless more than 2)', () => {
    expect(engine.containsSensitiveInfo('reach me at user@example.com for details')).toBe(false);
  });
});
