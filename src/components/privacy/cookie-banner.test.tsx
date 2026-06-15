import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieBanner } from './cookie-banner';

const consentMock = vi.hoisted(() => ({
    value: {
        isBannerVisible: true,
        showDetailedPreferences: false,
        consentSource: 'checkout',
        analyticsAllowed: false,
        marketingAllowed: false,
        acceptAll: vi.fn(),
        rejectOptional: vi.fn(),
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

vi.mock('@/components/ui/dialog', async () => {
    const React = await import('react');
    return {
        Dialog: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
        DialogContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
        DialogDescription: ({ children }: { children: React.ReactNode }) => React.createElement('p', null, children),
        DialogHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
        DialogTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', null, children),
    };
});

vi.mock('@/context/cookie-consent-context', () => ({
    useCookieConsent: () => consentMock.value
}));

describe('CookieBanner', () => {
    beforeEach(() => {
        consentMock.value.isBannerVisible = true;
        consentMock.value.showDetailedPreferences = false;
        consentMock.value.consentSource = 'checkout';
        consentMock.value.analyticsAllowed = false;
        consentMock.value.marketingAllowed = false;
    });

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

    it('shows separate analytics and marketing preferences in detailed mode', () => {
        consentMock.value.showDetailedPreferences = true;
        consentMock.value.analyticsAllowed = false;
        consentMock.value.marketingAllowed = false;

        const html = renderToStaticMarkup(<CookieBanner />);

        expect(html).toContain('Analytics storage');
        expect(html).toContain('Marketing storage');
    });
});
