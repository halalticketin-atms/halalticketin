import { describe, expect, it } from 'vitest';

import { ApiError } from './api';
import { isStripeBalanceTopUpRequiredError } from './refunds';

describe('isStripeBalanceTopUpRequiredError', () => {
    it('detects connected Stripe balance top-up errors from standardized API details', () => {
        const error = new ApiError('Top-up required', 409, {
            error: {
                code: 'CONFLICT',
                message: 'The organizer absorbed fees for this order.',
                details: {
                    code: 'STRIPE_BALANCE_TOP_UP_REQUIRED',
                },
            },
        });

        expect(isStripeBalanceTopUpRequiredError(error)).toBe(true);
    });

    it('keeps detecting legacy refund top-up errors without opening the legacy URL', () => {
        const error = new ApiError('Top-up required', 409, {
            code: 'REFUND_TOP_UP_REQUIRED',
            topUpUrl: 'https://checkout.stripe.com/c/pay/cs_live_legacy',
        });

        expect(isStripeBalanceTopUpRequiredError(error)).toBe(true);
    });

    it('ignores unrelated API errors', () => {
        const error = new ApiError('Validation failed', 400, {
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid refund amount',
            },
        });

        expect(isStripeBalanceTopUpRequiredError(error)).toBe(false);
    });
});
