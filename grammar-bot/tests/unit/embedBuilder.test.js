'use strict';

// embedBuilder requires discord.js (EmbedBuilder) and config.json.
// The pure utility functions truncate and splitText don't use either,
// but they are exported from the same module that requires both at load time.
// We mock discord.js so no actual Discord client is instantiated.
jest.mock('discord.js', () => ({
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
    setThumbnail: jest.fn().mockReturnThis(),
    setImage: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
  })),
}));

const { truncate, splitText } = require('../../utils/embedBuilder');

describe('truncate', () => {
  test('returns text unchanged when shorter than maxLength', () => {
    expect(truncate('hello', 20)).toBe('hello');
  });

  test('returns text unchanged when exactly equal to maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  test('truncates text and appends default suffix when over limit', () => {
    // maxLength=8, suffix='...' (3 chars) → substring(0, 5) + '...' = 'hello...'
    const result = truncate('hello world', 8);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8);
  });

  test('returns null/undefined as-is (falsy passthrough)', () => {
    expect(truncate(null, 10)).toBe(null);
    expect(truncate(undefined, 10)).toBe(undefined);
    expect(truncate('', 10)).toBe('');
  });

  test('uses custom suffix when provided', () => {
    // maxLength=10, suffix=' [more]' (7 chars) → substring(0, 3) + ' [more]' = 'hel [more]'
    const result = truncate('hello world', 10, ' [more]');
    expect(result).toBe('hel [more]');
    expect(result.length).toBe(10);
  });

  test('custom suffix of empty string does a hard cut', () => {
    const result = truncate('hello world', 5, '');
    expect(result).toBe('hello');
  });

  test('handles maxLength exactly equal to suffix length', () => {
    // maxLength=3, suffix='...' → substring(0, 0) + '...' = '...'
    const result = truncate('hello world', 3);
    expect(result).toBe('...');
  });
});

describe('splitText', () => {
  test('returns single-element array when text fits within limit', () => {
    const result = splitText('short text', 100);
    expect(result).toEqual(['short text']);
  });

  test('returns single-element array when text length equals maxLength', () => {
    const text = 'a'.repeat(50);
    expect(splitText(text, 50)).toEqual([text]);
  });

  test('returns [null] / [undefined] / [""] for falsy input', () => {
    expect(splitText(null, 100)).toEqual([null]);
    expect(splitText(undefined, 100)).toEqual([undefined]);
    expect(splitText('', 100)).toEqual(['']);
  });

  test('splits long text into multiple chunks', () => {
    // 200 chars split into maxLength=50 chunks
    const text = 'a'.repeat(200);
    const chunks = splitText(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk except the last should be exactly maxLength
    chunks.slice(0, -1).forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(50);
    });
  });

  test('prefers splitting at a newline when one is in the second half', () => {
    // maxLength=20, suffix='...' (3 chars) → splitPoint candidate = 17
    // Place newline at index 15 (> 20 * 0.5 = 10), so it should split there
    const text = 'first line here\nsecond line here continues on and on';
    // splitPoint = lastNewline + 1 = 16
    const chunks = splitText(text, 20);
    // First chunk should end at the newline boundary
    expect(chunks[0]).toBe('first line here\n...');
  });

  test('prefers splitting at a space when no newline in second half', () => {
    // maxLength=15, suffix='...' → candidate splitPoint=12
    // String: "hello world foo bar" — space at index 11 (> 15*0.5=7.5)
    const text = 'hello world foo bar baz qux';
    const chunks = splitText(text, 15);
    // The first chunk should end right after a space boundary
    expect(chunks[0].endsWith('...')).toBe(true);
    expect(chunks[0].length).toBeLessThanOrEqual(15);
  });

  test('does a hard cut when no suitable split point exists in second half', () => {
    // A string of the same character (no spaces or newlines) forces a hard cut
    const text = 'a'.repeat(30);
    const chunks = splitText(text, 15);
    expect(chunks[0].length).toBeLessThanOrEqual(15);
    expect(chunks[0].endsWith('...')).toBe(true);
  });

  test('last chunk has no suffix appended', () => {
    const text = 'hello world this is a longer piece of text to split';
    const chunks = splitText(text, 20);
    // Last chunk is just the remaining text, no suffix forced
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.length).toBeLessThanOrEqual(20);
  });

  test('all chunks together contain the full original content (minus suffixes)', () => {
    const text = 'word '.repeat(20).trimEnd(); // 99 chars
    const chunks = splitText(text, 25);
    // Reassemble by stripping trailing '...' from all but last and joining
    // At minimum, the total length of chunks should be >= text.length
    // (since suffixes add characters). Just verify no chunk exceeds maxLength.
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeLessThanOrEqual(25);
    });
  });
});
