'use client';

import { CONSENT_COOKIE_MAX_AGE_DAYS, CONSENT_COOKIE_NAME } from '@/lib/consent-inventory';

export interface ConsentPreferences {
    analytics: boolean;
    marketing: boolean;
    updatedAt?: string;
    version: 2;
}

const CONSENT_MAX_AGE_SECONDS = CONSENT_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
export const CONSENT_SCHEMA_VERSION = 2;

const shouldUseSecureAttribute = () => typeof window !== 'undefined' && window.location.protocol === 'https:';

const parseCookieValue = (cookie: string): ConsentPreferences | null => {
    try {
        const decoded = decodeURIComponent(cookie);
        const parsed = JSON.parse(decoded) as Partial<ConsentPreferences> & { version?: number };
        if (
            parsed.version === CONSENT_SCHEMA_VERSION &&
            typeof parsed.analytics === 'boolean' &&
            typeof parsed.marketing === 'boolean'
        ) {
            return {
                analytics: parsed.analytics,
                marketing: parsed.marketing,
                updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
                version: CONSENT_SCHEMA_VERSION
            };
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

    const normalizedPreferences: ConsentPreferences = {
        analytics: preferences.analytics,
        marketing: preferences.marketing,
        updatedAt: preferences.updatedAt ?? new Date().toISOString(),
        version: CONSENT_SCHEMA_VERSION
    };

    const value = encodeURIComponent(JSON.stringify(normalizedPreferences));
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
