import { describe, expect, it } from 'vitest';

import {
    hasEligibleWaitlistTicket,
    shouldStageTicketsBeforePublishedWaitlistEnable,
} from './event-waitlist-validation';

describe('hasEligibleWaitlistTicket', () => {
    it('accepts a public, non-donation ticket that allows waitlist signups', () => {
        expect(hasEligibleWaitlistTicket([
            { type: 'paid', visibility: 'public', waitlistEnabled: true },
        ])).toBe(true);
    });

    it('rejects hidden, donation, and waitlist-excluded ticket sets', () => {
        expect(hasEligibleWaitlistTicket([
            { type: 'donation', visibility: 'public', waitlistEnabled: true },
            { type: 'free', visibility: 'hidden', waitlistEnabled: true },
            { type: 'paid', visibility: 'public', waitlistEnabled: false },
        ])).toBe(false);
    });
});

describe('shouldStageTicketsBeforePublishedWaitlistEnable', () => {
    it('stages changed tickets before the event for the first live waitlist enable', () => {
        expect(shouldStageTicketsBeforePublishedWaitlistEnable({
            eventStatus: 'published',
            previousWaitlistEnabled: false,
            nextWaitlistEnabled: true,
            ticketsNeedSave: true,
        })).toBe(true);
    });

    it.each([
        { eventStatus: 'draft' as const, previousWaitlistEnabled: false, nextWaitlistEnabled: true, ticketsNeedSave: true },
        { eventStatus: 'published' as const, previousWaitlistEnabled: true, nextWaitlistEnabled: true, ticketsNeedSave: true },
        { eventStatus: 'published' as const, previousWaitlistEnabled: false, nextWaitlistEnabled: false, ticketsNeedSave: true },
        { eventStatus: 'published' as const, previousWaitlistEnabled: false, nextWaitlistEnabled: true, ticketsNeedSave: false },
    ])('does not reorder unrelated saves: %o', (input) => {
        expect(shouldStageTicketsBeforePublishedWaitlistEnable(input)).toBe(false);
    });
});
