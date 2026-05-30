import { describe, expect, it } from 'vitest';

import { getCreditAccounting } from './credit-accounting';

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
