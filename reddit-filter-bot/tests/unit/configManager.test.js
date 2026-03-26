'use strict';

// configManager reads/writes a config.json file on disk. We mock 'fs' so that
// no real I/O occurs. Each test resets the module registry so the module-level
// `currentConfig` variable starts fresh.

jest.mock('fs');

const fs = require('fs');
const path = require('path');

// Absolute path that configManager uses internally.
const CONFIG_PATH = path.join(__dirname, '../../services/../config.json');

// Minimal valid config returned by the mocked fs.readFileSync.
function makeBaseConfig(subreddits = {}) {
  return JSON.stringify({
    subreddits,
    default_channel_id: '111111111111111111',
    check_interval: 300,
    post_limit: 25,
  });
}

function loadFreshManager(configJson) {
  // Reset module registry so currentConfig is null and loadConfig() re-runs.
  jest.resetModules();

  // Re-apply the fs mock after resetModules clears the registry.
  jest.mock('fs');
  const freshFs = require('fs');

  freshFs.existsSync.mockReturnValue(true);
  freshFs.readFileSync.mockReturnValue(configJson);
  freshFs.writeFileSync.mockImplementation(() => {});

  return require('../../services/configManager');
}

// ---------------------------------------------------------------------------
describe('addSubreddit', () => {
  test('adds new subreddit with defaults', () => {
    const mgr = loadFreshManager(makeBaseConfig());
    const result = mgr.addSubreddit('programming');

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/r\/programming/);

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg).not.toBeNull();
    expect(cfg.keywords).toEqual([]);
    expect(cfg.excludeKeywords).toEqual([]);
    expect(cfg.min_score).toBe(0);
    expect(cfg.enabled).toBe(true);
  });

  test('strips r/ prefix when adding', () => {
    const mgr = loadFreshManager(makeBaseConfig());
    mgr.addSubreddit('r/programming');

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg).not.toBeNull();
  });

  test('returns failure when subreddit already exists (same case)', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.addSubreddit('programming');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already being monitored/);
  });

  test('returns failure when subreddit already exists (case-insensitive)', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ Programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.addSubreddit('programming');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already being monitored/);
  });
});

// ---------------------------------------------------------------------------
describe('removeSubreddit', () => {
  test('removes existing subreddit', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.removeSubreddit('programming');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/r\/programming/);

    expect(mgr.getSubredditConfig('programming')).toBeNull();
  });

  test('returns failure for unknown subreddit', () => {
    const mgr = loadFreshManager(makeBaseConfig());

    const result = mgr.removeSubreddit('doesnotexist');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not being monitored/);
  });
});

// ---------------------------------------------------------------------------
describe('addKeyword', () => {
  test('adds a keyword to the subreddit', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.addKeyword('programming', 'rust');
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/"rust"/);

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg.keywords).toContain('rust');
  });

  test('prevents duplicate keywords (same case)', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['rust'], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.addKeyword('programming', 'rust');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already in/);
  });

  test('prevents duplicate keywords (case-insensitive)', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['Rust'], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.addKeyword('programming', 'rust');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/already in/);
  });
});

// ---------------------------------------------------------------------------
describe('removeKeyword', () => {
  test('removes a keyword by exact case match', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['rust', 'go'], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.removeKeyword('programming', 'rust');
    expect(result.success).toBe(true);

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg.keywords).not.toContain('rust');
    expect(cfg.keywords).toContain('go');
  });

  test('removes a keyword by case-insensitive match', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['Rust'], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    // removeKeyword uses findIndex with toLowerCase comparison
    const result = mgr.removeKeyword('programming', 'rust');
    expect(result.success).toBe(true);

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg.keywords).toHaveLength(0);
  });

  test('returns failure when keyword not found', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['go'], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const result = mgr.removeKeyword('programming', 'rust');
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not in/);
  });
});

// ---------------------------------------------------------------------------
describe('getSubredditConfig', () => {
  test('resolves r/-prefixed input correctly', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: ['rust'], excludeKeywords: [], channel_id: '999', min_score: 5, enabled: true } })
    );

    const cfg = mgr.getSubredditConfig('r/programming');
    expect(cfg).not.toBeNull();
    expect(cfg.name).toBe('programming');
  });

  test('case-insensitive key lookup', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ Programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const cfg = mgr.getSubredditConfig('programming');
    expect(cfg).not.toBeNull();
    expect(cfg.name).toBe('Programming');
  });

  test('returns null for unknown subreddit', () => {
    const mgr = loadFreshManager(makeBaseConfig());
    expect(mgr.getSubredditConfig('unknown')).toBeNull();
  });

  test('falls back to default_channel_id when subreddit has no channel_id', () => {
    const mgr = loadFreshManager(
      makeBaseConfig({ programming: { keywords: [], excludeKeywords: [], channel_id: '', min_score: 0, enabled: true } })
    );

    const cfg = mgr.getSubredditConfig('programming');
    // channel_id is empty string (falsy), so it should fall back to default
    expect(cfg.channel_id).toBe('111111111111111111');
  });
});
