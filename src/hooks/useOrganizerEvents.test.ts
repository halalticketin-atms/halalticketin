import { describe, expect, it } from 'vitest';

import type { EventRecord } from '@/lib/events-api';

import { canEmailAttendeesForEvent } from './useOrganizerEvents';

const makeEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
    id: '550e8400-e29b-41d4-a716-446655440001',
    organizerId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Community Meetup',
    description: null,
    bannerImageUrl: null,
    status: 'published',
    cancelledAt: null,
    cancellationReason: null,
    cancellationNotes: null,
    startDatetime: '2026-03-08T09:00:00.000Z',
    endDatetime: '2026-03-08T12:00:00.000Z',
    timezone: 'Europe/London',
    isMultiDay: false,
    locationType: 'in_person',
    venue: 'Hall',
    address: null,
    city: 'London',
    country: 'GB',
    onlineUrl: null,
    latitude: null,
    longitude: null,
    currency: 'GBP',
    refundPolicy: null,
    isListedPublicly: true,
    isPubliclyAccessible: true,
    hasAccessPassword: false,
    slug: 'community-meetup',
    category: null,
    feeTier: 'payg',
    customBookingFee: null,
    absorbFee: false,
    attendeeInfoMode: 'per_ticket',
    customQuestions: null,
    createdAt: '2026-02-01T12:00:00.000Z',
    updatedAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
});

describe('canEmailAttendeesForEvent', () => {
    it('allows published active events', () => {
        const event = makeEvent({
            startDatetime: '2026-03-11T15:00:00.000Z',
            endDatetime: '2026-03-11T18:00:00.000Z',
        });

        expect(canEmailAttendeesForEvent(event, new Date('2026-03-11T12:00:00.000Z'))).toBe(true);
    });

    it('allows published events within 7 days after ending', () => {
        const event = makeEvent({
            endDatetime: '2026-03-05T12:00:00.000Z',
        });

        expect(canEmailAttendeesForEvent(event, new Date('2026-03-11T11:59:59.000Z'))).toBe(true);
    });

    it('blocks published events after the 7 day grace window', () => {
        const event = makeEvent({
            endDatetime: '2026-03-04T12:00:00.000Z',
        });

        expect(canEmailAttendeesForEvent(event, new Date('2026-03-11T12:00:01.000Z'))).toBe(false);
    });

    it('blocks draft, cancelled, and archived events', () => {
        const now = new Date('2026-03-11T12:00:00.000Z');

        expect(canEmailAttendeesForEvent(makeEvent({ status: 'draft' }), now)).toBe(false);
        expect(canEmailAttendeesForEvent(makeEvent({ status: 'cancelled' }), now)).toBe(false);
        expect(canEmailAttendeesForEvent(makeEvent({ status: 'archived' }), now)).toBe(false);
    });
});
