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

    it('returns only denied consent when neither provider is allowed by consent', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(false, { meta: true, tiktok: true })).toEqual({
            marketingConsent: false,
        });
    });

    it('returns only denied consent when no provider is configured', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(true, { meta: false, tiktok: false })).toEqual({
            marketingConsent: false,
        });
    });

    it('captures only Meta browser context when only Meta is configured', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(true, { meta: true, tiktok: false })).toEqual({
            marketingConsent: true,
            fbp: 'fbp_cookie_123',
            fbc: 'fbc_cookie_123',
            fbclid: 'fbclid_123',
            eventSourceUrl: 'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        });
    });

    it('captures only TikTok browser context when only TikTok is configured', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(true, { meta: false, tiktok: true })).toEqual({
            marketingConsent: true,
            ttclid: 'ttclid_123',
            ttp: 'ttp_cookie_123',
            eventSourceUrl: 'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        });
    });

    it('captures Meta and TikTok browser context when consent is granted and both are configured', () => {
        stubBrowserContext(
            '_fbp=fbp_cookie_123; _fbc=fbc_cookie_123; _ttp=ttp_cookie_123',
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
        );

        expect(getMetaTrackingContext(true, { meta: true, tiktok: true })).toEqual({
            marketingConsent: true,
            fbp: 'fbp_cookie_123',
            fbc: 'fbc_cookie_123',
            fbclid: 'fbclid_123',
            eventSourceUrl: 'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123',
            ttclid: 'ttclid_123',
            ttp: 'ttp_cookie_123',
        });
    });

    it('preserves available URL context when browser cookie access is denied', () => {
        const href =
            'http://localhost:3000/events/test-event?fbclid=fbclid_123&ttclid=ttclid_123';
        const url = new URL(href);

        vi.stubGlobal('document', {
            get cookie() {
                throw new DOMException('Cookie access denied', 'SecurityError');
            },
        });
        vi.stubGlobal('window', {
            location: {
                href: url.href,
                search: url.search,
            },
        });

        expect(getMetaTrackingContext(true, { meta: true, tiktok: true })).toEqual({
            marketingConsent: true,
            fbclid: 'fbclid_123',
            ttclid: 'ttclid_123',
            eventSourceUrl: href,
        });
    });
});
