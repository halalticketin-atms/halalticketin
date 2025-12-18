'use client';

export interface ConsentPreferences {
    marketing: boolean;
}

const CONSENT_COOKIE_NAME = 'ht_consent';
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // 180 days

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
    document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
};

export const clearConsentPreferences = () => {
    if (typeof document === 'undefined') {
        return;
    }

    document.cookie = `${CONSENT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
};
