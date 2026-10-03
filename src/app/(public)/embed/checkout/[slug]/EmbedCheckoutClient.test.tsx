import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventData } from '@/lib/public-event-server';

let query = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => query }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/context/auth-context', () => ({
    useAuth: () => ({ user: null, isLoading: false }),
    useOptionalAuth: () => ({ user: null, isLoading: false }),
}));
vi.mock('@/context/cookie-consent-context', () => ({
    useCookieConsent: () => ({ analyticsAllowed: false, marketingAllowed: false, setConsentNeeded: vi.fn() }),
}));

import { EmbedCheckoutClient } from './EmbedCheckoutClient';

const initialData: PublicEventData = {
    event: {
        id: 'event-embed', organizerId: 'org-embed', slug: 'public-gathering', title: 'Public gathering', status: 'published',
        description: null, bannerImageUrl: null, startDatetime: '2099-11-01T18:00:00Z', endDatetime: null,
        timezone: 'Europe/Dublin', isMultiDay: false, locationType: 'online', venue: null, address: null, city: null, country: null,
        onlineUrl: null, latitude: null, longitude: null, currency: 'GBP', organizerName: 'Community',
        organizerAvatarUrl: null, category: null, absorbFee: false, feeTier: 'payg', customBookingFee: null,
        metaPixelId: null, attendeeInfoMode: 'per_ticket', customQuestions: null,
    },
    tickets: [{
        id: 'ticket-embed', name: 'General admission', description: null, price: '10.00', currency: 'GBP',
        maxQuantity: 50, minPerOrder: 1, maxPerOrder: 4, type: 'paid', visibility: 'public',
        salesStart: null, salesEnd: null, earlyBirdPrice: null, earlyBirdEndDate: null,
    }],
};
beforeEach(() => { query = new URLSearchParams(); });
afterEach(() => { vi.useRealTimers(); });

describe('initial embed HTML', () => {
    it('renders the real tickets with appearance and stable shell geometry before browser validation', () => {
        query = new URLSearchParams('theme=dark&accent=%23ffcc00&font=serif&radius=0');
        const html = renderToStaticMarkup(<EmbedCheckoutClient slug="old-slug" initialData={initialData} initialRenderTime={0} />);
        expect(html).toContain('Public gathering');
        expect(html).toContain('General admission');
        expect(html).not.toContain('Loading tickets');
        expect(html).toContain('inert=""');
        expect(html).toContain('data-ht-embed-shell="dark"');
        expect(html).toContain('--nav-safe-offset: 0px;');
        expect(html).toContain('--primary:#ffcc00');
        expect(html).toContain('--radius:0px');
        expect(html).toContain('font-family:var(--embed-font)');
        expect(html).toContain('width="1186" height="448"');
        expect(html).toContain('href="/events/public-gathering" target="_top"');
        expect(html).not.toMatch(/style="[^"]*opacity:0/);
    });

    it('does not seed anonymous content into the preview flow', () => {
        query = new URLSearchParams('preview=true');
        const html = renderToStaticMarkup(<EmbedCheckoutClient slug="public-gathering" initialData={initialData} initialRenderTime={0} />);
        expect(html).toContain('Loading tickets');
        expect(html).not.toContain('General admission');
        expect(html).not.toContain('inert=""');
    });

    it('keeps configurator previews and their hosted-link behaviour', () => {
        query = new URLSearchParams('configure=1&showDetails=0');
        const html = renderToStaticMarkup(<EmbedCheckoutClient slug="public-gathering" initialData={initialData} initialRenderTime={0} />);
        expect(html).toContain('General admission');
        expect(html).not.toContain('Public gathering');
        expect(html).not.toContain('Open event page');
    });

    it('passes the server clock through the widget for early bird prices', () => {
        vi.useFakeTimers();
        vi.setSystemTime('2099-11-01T18:01:00Z');
        const cutoffData: PublicEventData = {
            ...initialData,
            tickets: initialData.tickets.map(ticket => ({
                ...ticket, earlyBirdPrice: '5.00', earlyBirdEndDate: '2099-11-01T18:00:00Z',
            })),
        };
        const html = renderToStaticMarkup(<EmbedCheckoutClient slug="public-gathering" initialData={cutoffData}
            initialRenderTime={Date.parse('2099-11-01T17:59:00Z')} />);
        expect(html).toContain('Early Bird');
        expect(html).toContain('£5.00');
    });
});
