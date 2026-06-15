'use client';

import { teardownMetaPixel } from '@/lib/meta-pixel';

export interface TrackingConsentState {
    analytics: boolean;
    marketing: boolean;
}

type TrackingConsentWindow = Window & {
    gtag?: (...args: unknown[]) => void;
    ttq?: {
        enableCookie?: () => void;
        disableCookie?: () => void;
        revokeConsent?: () => void;
        grantConsent?: () => void;
    };
};

const GOOGLE_ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat'];
const GOOGLE_ADS_COOKIE_PREFIXES = ['_gcl'];
const TIKTOK_COOKIE_PREFIXES = ['_ttp', '_tt_enable_cookie'];

const getCookieNames = () => {
    if (typeof document === 'undefined' || !document.cookie) {
        return [];
    }

    return document.cookie
        .split(';')
        .map((cookie) => cookie.trim().split('=')[0])
        .filter((name): name is string => Boolean(name));
};

const getCookieDomains = () => {
    if (typeof window === 'undefined') {
        return [null];
    }

    const hostname = window.location.hostname;
    const labels = hostname.split('.').filter(Boolean);
    const registrableDomain = labels.length >= 2 ? labels.slice(-2).join('.') : hostname;

    return Array.from(new Set([
        null,
        hostname,
        `.${hostname}`,
        registrableDomain,
        `.${registrableDomain}`,
    ]));
};

const deleteCookiesByPrefix = (prefixes: string[]) => {
    if (typeof document === 'undefined') {
        return;
    }

    const secureAttribute =
        typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
    const names = getCookieNames().filter((name) =>
        prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}_`)),
    );

    for (const name of names) {
        for (const domain of getCookieDomains()) {
            const domainAttribute = domain ? `; Domain=${domain}` : '';
            document.cookie =
                `${name}=; Max-Age=0; Path=/; SameSite=Lax${domainAttribute}${secureAttribute}`;
        }
    }
};

export const applyTrackingConsent = ({ analytics, marketing }: TrackingConsentState) => {
    if (typeof window === 'undefined') {
        return;
    }

    const trackingWindow = window as TrackingConsentWindow;
    trackingWindow.gtag?.('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: marketing ? 'granted' : 'denied',
        ad_user_data: marketing ? 'granted' : 'denied',
        ad_personalization: marketing ? 'granted' : 'denied',
    });

    if (marketing) {
        trackingWindow.ttq?.grantConsent?.();
        trackingWindow.ttq?.enableCookie?.();
    } else {
        teardownMetaPixel();
        trackingWindow.ttq?.revokeConsent?.();
        trackingWindow.ttq?.disableCookie?.();
        deleteCookiesByPrefix(TIKTOK_COOKIE_PREFIXES);
        deleteCookiesByPrefix(GOOGLE_ADS_COOKIE_PREFIXES);
    }

    if (!analytics) {
        deleteCookiesByPrefix(GOOGLE_ANALYTICS_COOKIE_PREFIXES);
    }
};
