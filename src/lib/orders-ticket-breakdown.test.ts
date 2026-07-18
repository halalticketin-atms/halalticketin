import { describe, expect, it } from 'vitest';

import {
    buildTicketBreakdownEventOptions,
    isCurrentRequestVersion,
} from './orders-ticket-breakdown';

describe('buildTicketBreakdownEventOptions', () => {
    it('uses canonical organiser events for zero-order additions and renamed events', () => {
        expect(buildTicketBreakdownEventOptions({
            orders: [{ id: 'event-1', name: 'Old event name' }],
            attendeeEvents: [],
            breakdownEvents: [{ eventId: 'event-1', eventName: 'Breakdown event name' }],
            organizerEvents: [
                { id: 'event-1', title: 'Renamed event' },
                { id: 'event-2', title: 'New zero-order event' },
            ],
        })).toEqual([
            { id: 'event-1', name: 'Renamed event' },
            { id: 'event-2', name: 'New zero-order event' },
        ]);
    });
});

describe('isCurrentRequestVersion', () => {
    it('rejects an older foreground response after a newer request starts', () => {
        expect(isCurrentRequestVersion(2, 3)).toBe(false);
        expect(isCurrentRequestVersion(3, 3)).toBe(true);
    });
});
