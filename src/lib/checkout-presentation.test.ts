import { describe, expect, it } from 'vitest';

import { getCheckoutPresentation } from './checkout-presentation';

describe('getCheckoutPresentation', () => {
  it('uses review language when the quoted order is free', () => {
    expect(
      getCheckoutPresentation({
        isFreeOrder: true,
        currencySymbol: '€',
        total: 0,
      }),
    ).toEqual({
      stepLabels: ['Information', 'Review', 'Complete'],
      confirmTitle: 'Review your order',
      confirmDescription: 'No payment is required.',
      submitLabel: 'Confirm free order',
    });
  });

  it('preserves payment language when the quoted order is paid', () => {
    expect(
      getCheckoutPresentation({
        isFreeOrder: false,
        currencySymbol: '€',
        total: 12.5,
      }),
    ).toEqual({
      stepLabels: ['Information', 'Payment', 'Complete'],
      confirmTitle: 'Payment Details',
      confirmDescription: 'Select your preferred payment method',
      submitLabel: 'Pay €12.50 Now',
    });
  });
});
