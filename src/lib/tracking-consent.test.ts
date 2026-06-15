import { beforeEach, describe, expect, it, vi } from 'vitest';

const teardownMetaPixelMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/meta-pixel', () => ({
    teardownMetaPixel: teardownMetaPixelMock,
}));

import { applyTrackingConsent } from './tracking-consent';

describe('applyTrackingConsent', () => {
    let gtagMock: ReturnType<typeof vi.fn>;
    let revokeConsentMock: ReturnType<typeof vi.fn>;
    let grantConsentMock: ReturnType<typeof vi.fn>;
    let disableCookieMock: ReturnType<typeof vi.fn>;
    let enableCookieMock: ReturnType<typeof vi.fn>;
    const cookieWrites: string[] = [];

    beforeEach(() => {
        vi.clearAllMocks();
        cookieWrites.length = 0;
        gtagMock = vi.fn();
        revokeConsentMock = vi.fn();
        grantConsentMock = vi.fn();
        disableCookieMock = vi.fn();
        enableCookieMock = vi.fn();

        vi.stubGlobal('window', {
            location: {
                hostname: 'tickets.example.com',
                protocol: 'https:',
            },
            gtag: gtagMock,
            ttq: {
                revokeConsent: revokeConsentMock,
                grantConsent: grantConsentMock,
                disableCookie: disableCookieMock,
                enableCookie: enableCookieMock,
            },
        });

        const cookieValue = '_fbp=fbp_123; _fbc=fbc_123; _ttp=ttp_123; _tt_enable_cookie=1; _ga=ga_123; _ga_TEST=ga_test; _gcl_aw=gcl_123';
        vi.stubGlobal('document', {
            get cookie() {
                return cookieValue;
            },
            set cookie(value: string) {
                cookieWrites.push(value);
            },
        });
    });

    it('revokes loaded marketing vendors and clears their first-party identifiers', () => {
        applyTrackingConsent({ analytics: true, marketing: false });

        expect(teardownMetaPixelMock).toHaveBeenCalledTimes(1);
        expect(revokeConsentMock).toHaveBeenCalledTimes(1);
        expect(disableCookieMock).toHaveBeenCalledTimes(1);
        expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        expect(cookieWrites.some((value) => value.startsWith('_ttp='))).toBe(true);
        expect(cookieWrites.some((value) => value.startsWith('_tt_enable_cookie='))).toBe(true);
        expect(cookieWrites.some((value) => value.startsWith('_gcl_aw='))).toBe(true);
    });

    it('revokes analytics storage and clears Google Analytics identifiers', () => {
        applyTrackingConsent({ analytics: false, marketing: true });

        expect(gtagMock).toHaveBeenCalledWith('consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        });
        expect(cookieWrites.some((value) => value.startsWith('_ga='))).toBe(true);
        expect(cookieWrites.some((value) => value.startsWith('_ga_TEST='))).toBe(true);
        expect(grantConsentMock).toHaveBeenCalledTimes(1);
        expect(enableCookieMock).toHaveBeenCalledTimes(1);
    });
});
