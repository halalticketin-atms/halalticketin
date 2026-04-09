import { describe, expect, it } from 'vitest';

import {
    clearStripeConnectCallbackParams,
    readStripeConnectCallbackBanner,
} from './stripe-connect-callback';

describe('readStripeConnectCallbackBanner', () => {
    it('ignores callback params for a different organizer', () => {
        const searchParams = new URLSearchParams({
            organizerId: 'org-target',
            stripe: 'connected',
        });

        expect(readStripeConnectCallbackBanner(searchParams, 'org-other')).toBeNull();
    });

    it('returns a connected banner for the active organizer', () => {
        const searchParams = new URLSearchParams({
            organizerId: 'org-target',
            stripe: 'connected',
        });

        expect(readStripeConnectCallbackBanner(searchParams, 'org-target')).toEqual({
            organizerId: 'org-target',
            type: 'connected',
            message: undefined,
        });
    });

    it('assigns organizer-scoped errors to the current organizer when none is supplied', () => {
        const searchParams = new URLSearchParams({
            stripe: 'error',
            stripe_error: 'Unable to connect Stripe account.',
        });

        expect(readStripeConnectCallbackBanner(searchParams, 'org-current')).toEqual({
            organizerId: 'org-current',
            type: 'error',
            message: 'Unable to connect Stripe account.',
        });
    });
});

describe('clearStripeConnectCallbackParams', () => {
    it('removes callback-only query params and keeps unrelated state', () => {
        const searchParams = new URLSearchParams({
            organizerId: 'org-target',
            stripe: 'connected',
            stripe_error: 'ignored',
            tab: 'payments',
            focus: 'billing',
        });

        expect(clearStripeConnectCallbackParams(searchParams).toString()).toBe(
            'tab=payments&focus=billing'
        );
    });
});
