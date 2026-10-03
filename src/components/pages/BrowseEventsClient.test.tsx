import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicEventRecord } from '@/lib/events-api';

const query = vi.hoisted(() => ({ value: '' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query.value) }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: null, isLoading: false }) }));

import BrowseEventsClient, { formatEventForDisplay } from './BrowseEventsClient';

const event = {
    id: 'catalogue-test', slug: 'community-gathering', title: 'Community Gathering',
    startDatetime: '2099-11-01T00:30:00Z', city: 'Dublin', category: 'Community',
    organizerName: 'Community', bannerImageUrl: '/logos/ht-favicon-512.png',
} as PublicEventRecord;

afterEach(() => { query.value = ''; vi.unstubAllEnvs(); });

describe('initial catalogue rendering', () => {
    it('renders catalogue content and eager posters before browser fetching', () => {
        const html = renderToStaticMarkup(<BrowseEventsClient initialData={{ events: [event], hasMore: true }} />);
        expect(html).toContain('Community Gathering');
        expect(html).toContain('loading="eager"');
        expect(html).toContain('fetchPriority="high"');
        expect(html).not.toContain('Loading events...');
    });

    it('applies URL filters to the initial server catalogue', () => {
        query.value = 'q=no-match&location=London';
        const html = renderToStaticMarkup(<BrowseEventsClient initialData={{ events: [event], hasMore: false }} />);
        expect(html).toContain('No events found');
        expect(html).not.toContain('Community Gathering');
        expect(html).toContain('value="no-match"');
    });

    it('uses stable UTC through first hydration and preserves the browser-local date afterwards', () => {
        vi.stubEnv('TZ', 'UTC');
        const server = formatEventForDisplay(event, false);
        vi.stubEnv('TZ', 'America/Los_Angeles');
        const firstClient = formatEventForDisplay(event, false);
        const hydrated = formatEventForDisplay(event);
        expect(firstClient.date).toBe(server.date);
        expect(firstClient.time).toBe(server.time);
        expect(hydrated.date).not.toBe(server.date);
        expect(hydrated.time).not.toBe(server.time);
    });
});
