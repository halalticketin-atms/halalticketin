'use client';

export interface MetaTrackingContext {
    marketingConsent: boolean;
    fbp?: string;
    fbc?: string;
    fbclid?: string;
    ttclid?: string;
    ttp?: string;
    eventSourceUrl?: string;
}

const readCookieValue = (name: string): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined;
    }
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const cookie of cookies) {
        if (cookie.startsWith(`${name}=`)) {
            return cookie.substring(name.length + 1);
        }
    }
    return undefined;
};

const readUrlParam = (name: string): string | undefined => {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        const params = new URLSearchParams(window.location.search);
        const value = params.get(name);
        return value || undefined;
    } catch {
        return undefined;
    }
};

export const getMetaTrackingContext = (marketingConsent: boolean): MetaTrackingContext => {
    if (!marketingConsent) {
        return { marketingConsent: false };
    }

    return {
        marketingConsent: true,
        fbp: readCookieValue('_fbp'),
        fbc: readCookieValue('_fbc'),
        fbclid: readUrlParam('fbclid'),
        ttclid: readUrlParam('ttclid'),
        ttp: readCookieValue('_ttp'),
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    };
};
