import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventData } from '@/lib/public-event-server';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/context/auth-context', () => ({
    useAuth: () => ({ user: null, isLoading: false }),
    useOptionalAuth: () => ({ user: null, isLoading: false }),
}));
vi.mock('@/context/cookie-consent-context', () => ({
    useCookieConsent: () => ({ analyticsAllowed: false, marketingAllowed: false, setConsentNeeded: vi.fn() }),
}));

import { EventDetailsClient } from './EventDetailsClient';

const initialData: PublicEventData = {
    event: {
        id: 'event-ssr', organizerId: 'org-ssr', slug: 'public-gathering', title: 'Public gathering',
        description: 'An evening together.', bannerImageUrl: '/logos/ht-favicon-512.png',
        startDatetime: '2099-11-01T18:00:00Z', endDatetime: null, timezone: 'Europe/Dublin',
        isMultiDay: false, locationType: 'online', venue: null, address: null, city: null, country: null,
        onlineUrl: null, latitude: null, longitude: null, currency: 'GBP', organizerName: 'Community',
        organizerAvatarUrl: null, category: null, absorbFee: false, feeTier: 'payg', customBookingFee: null,
        metaPixelId: null, attendeeInfoMode: 'per_ticket', customQuestions: null,
    },
    tickets: [{
        id: 'ticket-ssr', name: 'General admission', description: null, price: '10.00', currency: 'GBP',
        maxQuantity: 50, minPerOrder: 1, maxPerOrder: 4, type: 'paid', visibility: 'public',
        salesStart: null, salesEnd: null, earlyBirdPrice: null, earlyBirdEndDate: null,
    }],
};
afterEach(() => vi.useRealTimers());

describe('initial public event HTML', () => {
    it('includes the real event, tickets and priority poster before browser fetching', () => {
        const html = renderToStaticMarkup(<EventDetailsClient slug="public-gathering" initialData={initialData} />);
        expect(html).toContain('Public gathering');
        expect(html).toContain('An evening together.');
        expect(html).toContain('General admission');
        expect(html).toContain('rel="preload" as="image"');
        expect(html).toContain('fetchPriority="high"');
        expect(html).not.toContain('Loading event details');
        expect(html).toContain('inert=""');
        expect(html).not.toMatch(/style="[^"]*opacity:0/);
    });

    it('keeps the existing browser fallback when anonymous server access fails', () => {
        const html = renderToStaticMarkup(<EventDetailsClient slug="private-event" initialData={null} />);
        expect(html).toContain('Loading event details');
        expect(html).not.toContain('General admission');
    });

    it('keeps the server price stable if an early bird cutoff passes before hydration', () => {
        vi.useFakeTimers();
        vi.setSystemTime('2099-11-01T18:01:00Z');
        const cutoffData: PublicEventData = {
            ...initialData,
            tickets: initialData.tickets.map(ticket => ({
                ...ticket, earlyBirdPrice: '5.00', earlyBirdEndDate: '2099-11-01T18:00:00Z',
            })),
        };
        const html = renderToStaticMarkup(<EventDetailsClient
            slug="public-gathering"
            initialData={cutoffData}
            initialRenderTime={Date.parse('2099-11-01T17:59:00Z')}
        />);
        expect(html).toContain('Early Bird');
        expect(html).toContain('£5.00');

        const currentHtml = renderToStaticMarkup(<EventDetailsClient slug="public-gathering" initialData={cutoffData} />);
        expect(currentHtml).not.toContain('Early Bird');
    });
});
