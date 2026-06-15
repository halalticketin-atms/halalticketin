import { describe, expect, it } from 'vitest';
import { getTrackingDomainStatus } from './tracking-domain-status';

describe('getTrackingDomainStatus', () => {
    it('warns when events are on the shared Halal Ticketin domain', () => {
        expect(getTrackingDomainStatus({ organizerWebsite: 'https://organizer.test' })).toEqual({
            tone: 'warning',
            label: 'Shared domain',
            summary: 'Tracking runs on Halal Ticketin shared event pages. Some ad-platform domain verification and diagnostics may be limited until organiser custom domains are available.',
        });
    });

    it('reports success when an organiser-owned custom domain is present', () => {
        expect(getTrackingDomainStatus({ customDomain: 'events.organizer.test' })).toEqual({
            tone: 'success',
            label: 'Custom domain ready',
            summary: 'Tracking events can use your organiser-owned event domain.',
        });
    });
});
