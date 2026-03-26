'use strict';

jest.mock('../../services/aiGrammar', () => {
  return jest.fn().mockImplementation(() => ({}));
});

jest.mock('../../database/models/DailyStats', () => null, { virtual: true });

const AnalysisEngine = require('../../services/analysisEngine');

describe('calculateGrade', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('returns A+ for accuracy >= 95', () => {
    expect(engine.calculateGrade(95)).toBe('A+');
    expect(engine.calculateGrade(100)).toBe('A+');
  });

  test('returns A for accuracy >= 90 and < 95', () => {
    expect(engine.calculateGrade(90)).toBe('A');
    expect(engine.calculateGrade(94.9)).toBe('A');
  });

  test('returns B+ for accuracy >= 85 and < 90', () => {
    expect(engine.calculateGrade(85)).toBe('B+');
    expect(engine.calculateGrade(89.9)).toBe('B+');
  });

  test('returns B for accuracy >= 80 and < 85', () => {
    expect(engine.calculateGrade(80)).toBe('B');
    expect(engine.calculateGrade(84.9)).toBe('B');
  });

  test('returns C+ for accuracy >= 75 and < 80', () => {
    expect(engine.calculateGrade(75)).toBe('C+');
    expect(engine.calculateGrade(79.9)).toBe('C+');
  });

  test('returns C for accuracy >= 70 and < 75', () => {
    expect(engine.calculateGrade(70)).toBe('C');
    expect(engine.calculateGrade(74.9)).toBe('C');
  });

  test('returns D for accuracy >= 60 and < 70', () => {
    expect(engine.calculateGrade(60)).toBe('D');
    expect(engine.calculateGrade(69.9)).toBe('D');
  });

  test('returns F for accuracy below 60', () => {
    expect(engine.calculateGrade(59.9)).toBe('F');
    expect(engine.calculateGrade(0)).toBe('F');
  });

  test('boundary: exactly 95 returns A+ not A', () => {
    expect(engine.calculateGrade(95)).toBe('A+');
  });

  test('boundary: exactly 90 returns A not B+', () => {
    expect(engine.calculateGrade(90)).toBe('A');
  });
});

describe('getQualityFeedback', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('returns Excellent! for score >= 95', () => {
    expect(engine.getQualityFeedback(95)).toBe('Excellent!');
    expect(engine.getQualityFeedback(100)).toBe('Excellent!');
  });

  test('returns Good! for score >= 85 and < 95', () => {
    expect(engine.getQualityFeedback(85)).toBe('Good!');
    expect(engine.getQualityFeedback(94)).toBe('Good!');
  });

  test('returns Decent for score >= 70 and < 85', () => {
    expect(engine.getQualityFeedback(70)).toBe('Decent');
    expect(engine.getQualityFeedback(84)).toBe('Decent');
  });

  test('returns Needs work for score >= 50 and < 70', () => {
    expect(engine.getQualityFeedback(50)).toBe('Needs work');
    expect(engine.getQualityFeedback(69)).toBe('Needs work');
  });

  test('returns Poor quality for score below 50', () => {
    expect(engine.getQualityFeedback(49)).toBe('Poor quality');
    expect(engine.getQualityFeedback(0)).toBe('Poor quality');
  });

  test('boundary: exactly 95 returns Excellent! not Good!', () => {
    expect(engine.getQualityFeedback(95)).toBe('Excellent!');
  });

  test('boundary: exactly 85 returns Good! not Decent', () => {
    expect(engine.getQualityFeedback(85)).toBe('Good!');
  });

  test('boundary: exactly 70 returns Decent not Needs work', () => {
    expect(engine.getQualityFeedback(70)).toBe('Decent');
  });

  test('boundary: exactly 50 returns Needs work not Poor quality', () => {
    expect(engine.getQualityFeedback(50)).toBe('Needs work');
  });
});

describe('calculateImprovement', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('returns Not enough data when qualityHistory is null', () => {
    expect(engine.calculateImprovement({ qualityHistory: null })).toBe('Not enough data');
  });

  test('returns Not enough data when qualityHistory is not an array', () => {
    expect(engine.calculateImprovement({ qualityHistory: 'bad' })).toBe('Not enough data');
  });

  test('returns Not enough data when qualityHistory has fewer than 5 entries', () => {
    const user = { qualityHistory: [{ bonusPoints: 10 }, { bonusPoints: 20 }] };
    expect(engine.calculateImprovement(user)).toBe('Not enough data');
  });

  test('returns Not enough data when qualityHistory has exactly 4 entries', () => {
    const user = {
      qualityHistory: [1, 2, 3, 4].map((n) => ({ bonusPoints: n })),
    };
    expect(engine.calculateImprovement(user)).toBe('Not enough data');
  });

  test('returns Not enough data when older window is empty (5-10 entries, no older slice)', () => {
    // With 5 entries: recent = slice(-10) = all 5, older = slice(-20, -10) = []
    const user = {
      qualityHistory: [1, 2, 3, 4, 5].map((n) => ({ bonusPoints: n })),
    };
    expect(engine.calculateImprovement(user)).toBe('Not enough data');
  });

  test('returns Improving! when recent average is >20% higher than older average', () => {
    // olderAvg = 10, recentAvg must be > 12 (10 * 1.2)
    const older = new Array(10).fill({ bonusPoints: 10 });
    const recent = new Array(10).fill({ bonusPoints: 15 }); // 15 > 12
    const user = { qualityHistory: [...older, ...recent] };
    expect(engine.calculateImprovement(user)).toBe('Improving!');
  });

  test('returns Declining when recent average is >20% lower than older average', () => {
    // olderAvg = 10, recentAvg must be < 8 (10 * 0.8)
    const older = new Array(10).fill({ bonusPoints: 10 });
    const recent = new Array(10).fill({ bonusPoints: 5 }); // 5 < 8
    const user = { qualityHistory: [...older, ...recent] };
    expect(engine.calculateImprovement(user)).toBe('Declining');
  });

  test('returns Stable when recent average is within 20% of older average', () => {
    // olderAvg = 10, recentAvg = 10 (exactly equal = stable)
    const older = new Array(10).fill({ bonusPoints: 10 });
    const recent = new Array(10).fill({ bonusPoints: 10 });
    const user = { qualityHistory: [...older, ...recent] };
    expect(engine.calculateImprovement(user)).toBe('Stable');
  });

  test('returns Stable when recent is slightly above older but within 20%', () => {
    // olderAvg = 10, recentAvg = 11 (11 is not > 12)
    const older = new Array(10).fill({ bonusPoints: 10 });
    const recent = new Array(10).fill({ bonusPoints: 11 });
    const user = { qualityHistory: [...older, ...recent] };
    expect(engine.calculateImprovement(user)).toBe('Stable');
  });

  test('handles missing bonusPoints (treats as 0)', () => {
    const older = new Array(10).fill({});
    const recent = new Array(10).fill({});
    const user = { qualityHistory: [...older, ...recent] };
    // both averages = 0, 0 is not > 0 * 1.2, 0 is not < 0 * 0.8
    expect(engine.calculateImprovement(user)).toBe('Stable');
  });
});

describe('getErrorTypeStats', () => {
  let engine;

  beforeEach(() => {
    engine = new AnalysisEngine();
  });

  test('returns empty array when errorsByType is missing', () => {
    expect(engine.getErrorTypeStats({})).toEqual([]);
  });

  test('returns empty array when errorsByType is not an object', () => {
    expect(engine.getErrorTypeStats({ errorsByType: 'bad' })).toEqual([]);
  });

  test('returns empty array when all counts are zero', () => {
    const user = { errorsByType: { grammar: 0, spelling: 0 } };
    expect(engine.getErrorTypeStats(user)).toEqual([]);
  });

  test('returns empty array when errorsByType is an empty object', () => {
    expect(engine.getErrorTypeStats({ errorsByType: {} })).toEqual([]);
  });

  test('computes correct percentage for a single error type', () => {
    const user = { errorsByType: { grammar: 5 } };
    const stats = engine.getErrorTypeStats(user);
    expect(stats).toHaveLength(1);
    expect(stats[0].type).toBe('Grammar');
    expect(stats[0].count).toBe(5);
    expect(stats[0].percentage).toBe('100.0');
  });

  test('computes correct percentages for multiple error types', () => {
    const user = { errorsByType: { grammar: 3, spelling: 1 } };
    const stats = engine.getErrorTypeStats(user);
    expect(stats).toHaveLength(2);
    const grammarStat = stats.find((s) => s.type === 'Grammar');
    const spellingStat = stats.find((s) => s.type === 'Spelling');
    expect(grammarStat.percentage).toBe('75.0');
    expect(spellingStat.percentage).toBe('25.0');
  });

  test('sets isDominant true when a type has more than 40% of errors', () => {
    // grammar = 5, spelling = 3 → total = 8 → grammar = 62.5% (dominant)
    const user = { errorsByType: { grammar: 5, spelling: 3 } };
    const stats = engine.getErrorTypeStats(user);
    const grammarStat = stats.find((s) => s.type === 'Grammar');
    expect(grammarStat.isDominant).toBe(true);
  });

  test('sets isDominant false when a type has <= 40% of errors', () => {
    // grammar = 2, spelling = 3, punct = 5 → total = 10 → grammar = 20% (not dominant)
    const user = { errorsByType: { grammar: 2, spelling: 3, punctuation: 5 } };
    const stats = engine.getErrorTypeStats(user);
    const grammarStat = stats.find((s) => s.type === 'Grammar');
    expect(grammarStat.isDominant).toBe(false);
  });

  test('sorts results by count descending', () => {
    const user = { errorsByType: { grammar: 1, spelling: 5, punctuation: 3 } };
    const stats = engine.getErrorTypeStats(user);
    expect(stats[0].count).toBeGreaterThanOrEqual(stats[1].count);
    expect(stats[1].count).toBeGreaterThanOrEqual(stats[2].count);
  });

  test('capitalizes type names', () => {
    const user = { errorsByType: { grammar: 2 } };
    const stats = engine.getErrorTypeStats(user);
    expect(stats[0].type).toBe('Grammar');
  });

  test('filters out types with count of 0', () => {
    const user = { errorsByType: { grammar: 3, spelling: 0 } };
    const stats = engine.getErrorTypeStats(user);
    expect(stats).toHaveLength(1);
    expect(stats[0].type).toBe('Grammar');
  });
});
