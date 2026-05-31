import { describe, expect, it } from 'vitest';

import { getCreditAccounting, getCreditStatus } from './credit-accounting';

describe('getCreditAccounting', () => {
  it('surfaces only available and used credits, excluding internal held credits', () => {
    const result = getCreditAccounting({
      balance: 96,
      availableBalance: 96,
      usedCredits: 25,
      totalPurchased: 125,
    });

    expect(result).toEqual(
      expect.objectContaining({
        available: 96,
        used: 25,
        total: 121,
      }),
    );
    expect(result).not.toHaveProperty('held');
  });

  it('falls back to legacy total minus balance usage when explicit usage is missing', () => {
    const result = getCreditAccounting({
      balance: 75,
      totalPurchased: 100,
    });

    expect(result.used).toBe(25);
    expect(result.available).toBe(75);
  });
});

describe('getCreditStatus', () => {
  it('reports empty when no credits are available, even after heavy usage', () => {
    expect(getCreditStatus(0, 100)).toBe('empty');
    // A negative balance from upstream rounding must never read as healthy.
    expect(getCreditStatus(-5, 100)).toBe('empty');
  });

  it('reports low when available credits fall below the minimum', () => {
    expect(getCreditStatus(1, 100)).toBe('low');
    expect(getCreditStatus(99, 100)).toBe('low');
  });

  it('reports healthy when available credits meet or exceed the minimum', () => {
    expect(getCreditStatus(100, 100)).toBe('healthy');
    expect(getCreditStatus(5000, 100)).toBe('healthy');
  });
});
