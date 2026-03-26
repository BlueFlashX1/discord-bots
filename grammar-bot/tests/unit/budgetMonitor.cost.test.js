'use strict';

// BudgetMonitor uses fs for JSON budget storage and conditionally loads mongoose/MongoDB.
// We don't want real file I/O or database connections in unit tests.
// Mock fs to prevent actual file reads/writes.
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue('{}'),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    renameSync: jest.fn(),
  };
});

// Prevent mongoose from being loaded (it would try to connect)
jest.mock('mongoose', () => ({
  connection: { readyState: 0 },
}));

// Prevent database module from being loaded
jest.mock('../../database/db', () => ({ isUsingJSON: () => true }), { virtual: true });

const BudgetMonitor = require('../../services/budgetMonitor');

describe('calculateCost', () => {
  let monitor;

  beforeEach(() => {
    monitor = new BudgetMonitor();
  });

  test('calculates cost for gpt-4o-mini with known pricing', () => {
    // $0.150 per 1M input, $0.600 per 1M output
    // 1,000,000 input tokens + 1,000,000 output tokens = $0.150 + $0.600 = $0.750
    const cost = monitor.calculateCost(1_000_000, 1_000_000, 'gpt-4o-mini');
    expect(cost).toBeCloseTo(0.75, 6);
  });

  test('calculates cost for gpt-4o with known pricing', () => {
    // $2.50 per 1M input, $10.00 per 1M output
    // 500,000 input + 500,000 output = $1.25 + $5.00 = $6.25
    const cost = monitor.calculateCost(500_000, 500_000, 'gpt-4o');
    expect(cost).toBeCloseTo(6.25, 6);
  });

  test('calculates cost for gpt-4-turbo with known pricing', () => {
    // $10.00 per 1M input, $30.00 per 1M output
    // 100,000 input + 200,000 output = $1.00 + $6.00 = $7.00
    const cost = monitor.calculateCost(100_000, 200_000, 'gpt-4-turbo');
    expect(cost).toBeCloseTo(7.0, 6);
  });

  test('falls back to gpt-4o-mini pricing for unknown model', () => {
    const expectedCost = monitor.calculateCost(1_000, 1_000, 'gpt-4o-mini');
    const actualCost = monitor.calculateCost(1_000, 1_000, 'gpt-unknown-model');
    expect(actualCost).toBeCloseTo(expectedCost, 10);
  });

  test('returns 0 for zero tokens', () => {
    expect(monitor.calculateCost(0, 0, 'gpt-4o-mini')).toBe(0);
    expect(monitor.calculateCost(0, 0, 'gpt-4o')).toBe(0);
  });

  test('handles only input tokens (zero output)', () => {
    // $0.150 per 1M input tokens → 1M input = $0.150
    const cost = monitor.calculateCost(1_000_000, 0, 'gpt-4o-mini');
    expect(cost).toBeCloseTo(0.15, 6);
  });

  test('handles only output tokens (zero input)', () => {
    // $0.600 per 1M output tokens → 1M output = $0.600
    const cost = monitor.calculateCost(0, 1_000_000, 'gpt-4o-mini');
    expect(cost).toBeCloseTo(0.6, 6);
  });

  test('uses default model (gpt-4o-mini) when model is not provided', () => {
    const withDefault = monitor.calculateCost(1_000, 1_000);
    const withExplicit = monitor.calculateCost(1_000, 1_000, 'gpt-4o-mini');
    expect(withDefault).toBeCloseTo(withExplicit, 10);
  });

  test('scales linearly with token count', () => {
    const single = monitor.calculateCost(100, 100, 'gpt-4o-mini');
    const double = monitor.calculateCost(200, 200, 'gpt-4o-mini');
    expect(double).toBeCloseTo(single * 2, 10);
  });
});

describe('formatCost', () => {
  let monitor;

  beforeEach(() => {
    monitor = new BudgetMonitor();
  });

  test('formats sub-cent values in milli-cent notation ($x¢)', () => {
    // cost < 0.01 → `$${(cost * 1000).toFixed(2)}¢`
    const result = monitor.formatCost(0.005);
    expect(result).toBe('$5.00¢');
  });

  test('formats cost of 0.001 correctly', () => {
    expect(monitor.formatCost(0.001)).toBe('$1.00¢');
  });

  test('formats cost of 0.0099 (just under one cent)', () => {
    expect(monitor.formatCost(0.0099)).toBe('$9.90¢');
  });

  test('formats values >= $0.01 as dollar amounts with 4 decimal places', () => {
    expect(monitor.formatCost(0.01)).toBe('$0.0100');
  });

  test('formats cost of exactly $1.00', () => {
    expect(monitor.formatCost(1.0)).toBe('$1.0000');
  });

  test('formats cost of $0.1234', () => {
    expect(monitor.formatCost(0.1234)).toBe('$0.1234');
  });

  test('formats cost of $0.00001 (very small, sub-cent)', () => {
    // 0.00001 * 1000 = 0.01, toFixed(2) = "0.01"
    expect(monitor.formatCost(0.00001)).toBe('$0.01¢');
  });

  test('formats zero cost as sub-cent format', () => {
    // 0 < 0.01, so: (0 * 1000).toFixed(2) = "0.00"
    expect(monitor.formatCost(0)).toBe('$0.00¢');
  });
});
