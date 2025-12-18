'use client';

import { CONSENT_COOKIE_MAX_AGE_DAYS, CONSENT_COOKIE_NAME } from '@/lib/consent-inventory';

export interface ConsentPreferences {
    marketing: boolean;
}

const CONSENT_MAX_AGE_SECONDS = CONSENT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

const shouldUseSecureAttribute = () => typeof window !== 'undefined' && window.location.protocol === 'https:';

const parseCookieValue = (cookie: string): ConsentPreferences | null => {
    try {
        const decoded = decodeURIComponent(cookie);
        const parsed = JSON.parse(decoded) as ConsentPreferences;
        if (typeof parsed.marketing === 'boolean') {
            return parsed;
        }
    } catch {
        // ignore malformed cookie
    }
    return null;
};

export const readConsentPreferences = (): ConsentPreferences | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        if (cookie.startsWith(`${CONSENT_COOKIE_NAME}=`)) {
            const value = cookie.substring(CONSENT_COOKIE_NAME.length + 1);
            return parseCookieValue(value);
        }
    }

    return null;
};

export const writeConsentPreferences = (preferences: ConsentPreferences) => {
    if (typeof document === 'undefined') {
        return;
    }

    const value = encodeURIComponent(JSON.stringify(preferences));
    const secureAttribute = shouldUseSecureAttribute() ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secureAttribute}`;
};

export const clearConsentPreferences = () => {
    if (typeof document === 'undefined') {
        return;
    }

    const secureAttribute = shouldUseSecureAttribute() ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secureAttribute}`;
};
