'use client';

export interface MetaTrackingContext {
    marketingConsent: boolean;
    fbp?: string;
    fbc?: string;
    fbclid?: string;
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

const readFbclid = (): string | undefined => {
    if (typeof window === 'undefined') {
        return undefined;
    }
    try {
        const params = new URLSearchParams(window.location.search);
        const fbclid = params.get('fbclid');
        return fbclid || undefined;
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
        fbclid: readFbclid(),
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    };
};
