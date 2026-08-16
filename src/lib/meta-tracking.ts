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

export interface CheckoutTrackingTargets {
    meta: boolean;
    tiktok: boolean;
}

const readCookieValue = (name: string): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined;
    }

    try {
        const cookieValue = document.cookie;
        const cookies = cookieValue ? cookieValue.split('; ') : [];
        for (const cookie of cookies) {
            if (cookie.startsWith(`${name}=`)) {
                return cookie.substring(name.length + 1);
            }
        }
    } catch {
        return undefined;
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

export const getMetaTrackingContext = (
    marketingConsent: boolean,
    targets: CheckoutTrackingTargets,
): MetaTrackingContext => {
    const metaAllowed = marketingConsent && targets.meta;
    const tiktokAllowed = marketingConsent && targets.tiktok;

    if (!metaAllowed && !tiktokAllowed) {
        return { marketingConsent: false };
    }

    return {
        marketingConsent: true,
        ...(metaAllowed
            ? {
                  fbp: readCookieValue('_fbp'),
                  fbc: readCookieValue('_fbc'),
                  fbclid: readUrlParam('fbclid'),
              }
            : {}),
        ...(tiktokAllowed
            ? {
                  ttclid: readUrlParam('ttclid'),
                  ttp: readCookieValue('_ttp'),
              }
            : {}),
        eventSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    };
};
