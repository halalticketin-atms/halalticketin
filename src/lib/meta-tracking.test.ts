import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMetaTrackingContext } from './meta-tracking';

const stubBrowserContext = (cookie: string, href: string) => {
    const url = new URL(href);
    vi.stubGlobal('document', { cookie });
    vi.stubGlobal('window', {
        location: {
            href: url.href,
            search: url.search,
        },
    });
};

describe('getMetaTrackingContext', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns only consent state when marketing consent is missing', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(false)).toEqual({ marketingConsent: false });
    });

    it('captures Meta and TikTok browser context when marketing consent is present', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(true)).toEqual({
            marketingConsent: true,
            fbp: 'fbp_cookie_123',
            fbc: 'fbc_cookie_123',
            fbclid: 'fbclid_123',
            eventSourceUrl: 'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
            ttclid: 'ttclid_123',
            ttp: 'ttp_cookie_123',
        });
    });
});
