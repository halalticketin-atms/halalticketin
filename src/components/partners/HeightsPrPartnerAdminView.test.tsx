import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HeightsPrPartnerAdminView } from './HeightsPrPartnerAdminView';

describe('HeightsPrPartnerAdminView', () => {
    it('renders referred organisation signup rows without revenue data', () => {
        const html = renderToStaticMarkup(
            <HeightsPrPartnerAdminView
                state="loaded"
                organizers={[
                    {
                        id: 'org-1',
                        name: 'Green Crescent Events',
                        organizerType: 'organization',
                        country: 'GB',
                        city: 'London',
                        replyToEmail: 'events@example.com',
                        website: 'https://example.com',
                        heightsprReferredAt: '2026-06-10T12:00:00.000Z',
                        createdAt: '2026-06-10T12:00:00.000Z',
                    },
                ]}
            />,
        );

        expect(html).toContain('Green Crescent Events');
        expect(html).toContain('events@example.com');
        expect(html).toContain('London');
        expect(html).toContain('alt="HeightsPR"');
        expect(html).toContain('HeightsPR signups');
        expect(html).toContain('Total signups');
        expect(html).not.toContain('commission');
        expect(html).not.toContain('orders');
        expect(html).not.toContain('attendees');
    });

    it('renders a clear empty state', () => {
        const html = renderToStaticMarkup(
            <HeightsPrPartnerAdminView state="loaded" organizers={[]} />,
        );

        expect(html).toContain('No HeightsPR signups yet');
    });

    it('renders forbidden access messaging', () => {
        const html = renderToStaticMarkup(
            <HeightsPrPartnerAdminView state="forbidden" organizers={[]} />,
        );

        expect(html).toContain('This account does not have HeightsPR dashboard access');
    });
});
