import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CookieBanner } from './cookie-banner';

const consentMock = vi.hoisted(() => ({
    value: {
        isBannerVisible: true,
        showDetailedPreferences: false,
        consentSource: 'checkout',
        marketingAllowed: false,
        acceptAll: vi.fn(),
        rejectMarketing: vi.fn(),
        savePreferences: vi.fn(),
        openPreferences: vi.fn(),
        closeBanner: vi.fn()
    }
}));

vi.mock('next/navigation', () => ({
    usePathname: () => '/events/test'
}));

vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) =>
        React.createElement('a', { href }, children)
}));

vi.mock('@/context/cookie-consent-context', () => ({
    useCookieConsent: () => consentMock.value
}));

describe('CookieBanner', () => {
    it('uses checkout-specific consent copy at checkout time', () => {
        consentMock.value.consentSource = 'checkout';

        const html = renderToStaticMarkup(<CookieBanner />);

        expect(html).toContain('checkout starts and purchases');
    });

    it('uses discovery consent copy on event pages', () => {
        consentMock.value.consentSource = 'event_page';

        const html = renderToStaticMarkup(<CookieBanner />);

        expect(html).toContain('understand how people find their events');
    });
});
