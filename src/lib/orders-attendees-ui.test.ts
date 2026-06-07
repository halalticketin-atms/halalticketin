import { describe, expect, it } from 'vitest';

import {
    ORDER_DETAIL_TABS,
    ORDER_PAGE_TABS,
    buildAttendeesQueryParams,
    clearAnswerFiltersForEventSelection,
    getAttendeeAnswerDisplayMode,
} from './orders-attendees-ui';

describe('orders attendees UI contracts', () => {
    it('shows Orders, Tickets, and Attendees as top-level tabs', () => {
        expect(ORDER_PAGE_TABS.map((tab) => tab.label)).toEqual(['Orders', 'Tickets', 'Attendees']);
    });

    it('shows Details, Answers, and Refund in the order detail modal', () => {
        expect(ORDER_DETAIL_TABS.map((tab) => tab.label)).toEqual(['Details', 'Answers', 'Refund']);
    });

    it('uses visible answer fields only when exactly one event is selected', () => {
        expect(getAttendeeAnswerDisplayMode([])).toBe('details');
        expect(getAttendeeAnswerDisplayMode(['event-1'])).toBe('visible');
        expect(getAttendeeAnswerDisplayMode(['event-1', 'event-2'])).toBe('details');
    });

    it('builds server-side attendee event filters for single and multiple events', () => {
        expect(buildAttendeesQueryParams({
            organizerId: 'organizer-1',
            eventIds: ['event-1'],
            status: 'all',
            search: '',
        })).toMatchObject({
            organizerId: 'organizer-1',
            eventId: 'event-1',
            limit: '500',
            offset: '0',
        });

        expect(buildAttendeesQueryParams({
            organizerId: 'organizer-1',
            eventIds: ['event-1', 'event-2'],
            status: 'completed',
            search: '  buyer@example.com  ',
            limit: 100,
            offset: 500,
        })).toEqual({
            organizerId: 'organizer-1',
            eventIds: 'event-1,event-2',
            status: 'completed',
            search: 'buyer@example.com',
            limit: '100',
            offset: '500',
        });
    });

    it('encodes answer filters only when exactly one event is selected', () => {
        const answerFilters = {
            attendance: ['Yes', 'No'],
            meals: ['Halal'],
        };
        const params = buildAttendeesQueryParams({
            organizerId: 'organizer-1',
            eventIds: ['event-1'],
            status: 'all',
            search: '',
            answerFilters,
            offset: 500,
        });

        expect(params.offset).toBe('500');
        expect(JSON.parse(params.answerFilters)).toEqual(answerFilters);
        expect(buildAttendeesQueryParams({
            organizerId: 'organizer-1',
            eventIds: ['event-1', 'event-2'],
            status: 'all',
            search: '',
            answerFilters,
        })).not.toHaveProperty('answerFilters');
    });

    it('clears incompatible answer filters when event selection is not exactly one event', () => {
        const answerFilters = { attendance: ['Yes'] };

        expect(clearAnswerFiltersForEventSelection(['event-1'], answerFilters)).toEqual(answerFilters);
        expect(clearAnswerFiltersForEventSelection([], answerFilters)).toEqual({});
        expect(clearAnswerFiltersForEventSelection(['event-1', 'event-2'], answerFilters)).toEqual({});
    });
});
