import { describe, expect, it } from 'vitest';

import { calculateStripeProcessingFee, getStripeFeeConfig } from './stripe-fees';

const assertGrossUp = (baseAmount: number, currency: string) => {
  const fee = calculateStripeProcessingFee(baseAmount, currency);
  const { percent, fixed } = getStripeFeeConfig(currency);
  const net = baseAmount + fee - ((baseAmount + fee) * percent + fixed);
  expect(net).toBeGreaterThanOrEqual(baseAmount - 0.01);
};

describe('calculateStripeProcessingFee', () => {
  it('returns 0 for non-positive amounts', () => {
    expect(calculateStripeProcessingFee(0, 'EUR')).toBe(0);
    expect(calculateStripeProcessingFee(-10, 'EUR')).toBe(0);
  });

  it('grosses up for USD default fee config', () => {
    assertGrossUp(10, 'USD');
  });

  it('grosses up for GBP fee config', () => {
    assertGrossUp(10, 'GBP');
  });
});
