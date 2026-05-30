import { describe, expect, it } from 'vitest';

import { getCreditAccounting } from './credit-accounting';

describe('getCreditAccounting', () => {
  it('uses explicit available, held, and used credit totals when provided', () => {
    const result = getCreditAccounting({
      balance: 96,
      availableBalance: 96,
      heldCredits: 4,
      usedCredits: 25,
      totalPurchased: 125,
    });

    expect(result).toEqual(
      expect.objectContaining({
        available: 96,
        held: 4,
        used: 25,
        total: 125,
      }),
    );
  });

  it('falls back to legacy total minus balance usage when explicit usage is missing', () => {
    const result = getCreditAccounting({
      balance: 75,
      totalPurchased: 100,
    });

    expect(result.used).toBe(25);
    expect(result.held).toBe(0);
    expect(result.available).toBe(75);
  });
});
