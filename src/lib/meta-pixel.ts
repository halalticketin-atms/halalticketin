'use client';

type FbqFunction = {
    (...args: unknown[]): void;
    queue?: unknown[];
    push?: (...args: unknown[]) => void;
    loaded?: boolean;
    version?: string;
    callMethod?: (...args: unknown[]) => void;
};

declare global {
    interface Window {
        fbq?: FbqFunction;
        _fbq?: FbqFunction;
    }
}

const initializedPixels = new Set<string>();
const pixelsInitializedWithUserData = new Set<string>();
const META_PIXEL_COOKIE_NAMES = ['_fbp', '_fbc'];

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

const ensureBaseSnippet = () => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!window.fbq) {
        const fbq: FbqFunction = function (...args: unknown[]) {
            if (fbq.callMethod) {
                fbq.callMethod(...args);
            } else {
                (fbq.queue = fbq.queue || []).push(args);
            }
        };
        fbq.queue = [];
        fbq.version = '2.0';
        fbq.push = fbq;
        window.fbq = fbq;
    }

    if (!window._fbq) {
        window._fbq = window.fbq;
    }

};

export const ensureMetaPixel = () => {
    ensureBaseSnippet();
};

export interface MetaAdvancedMatching {
    em?: string;
}

export const initMetaPixel = (pixelId: string, advancedMatching?: MetaAdvancedMatching) => {
    if (!pixelId || typeof window === 'undefined') {
        return;
    }

    ensureBaseSnippet();

    // The pixel accepts a plain email and SHA-256 hashes it client-side before sending.
    const normalizedEmail = advancedMatching?.em?.trim().toLowerCase();
    const userData = normalizedEmail ? { em: normalizedEmail } : null;
    const alreadyInitialized = initializedPixels.has(pixelId);
    const shouldUpgradeWithUserData =
        alreadyInitialized && Boolean(userData) && !pixelsInitializedWithUserData.has(pixelId);

    if (alreadyInitialized && !shouldUpgradeWithUserData) {
        return;
    }

    if (!alreadyInitialized) {
        try {
            window.fbq?.('consent', 'grant');
        } catch {
            // Ignore consent command errors.
        }
    }

    initializedPixels.add(pixelId);
    if (userData) {
        pixelsInitializedWithUserData.add(pixelId);
        window.fbq?.('init', pixelId, userData);
    } else {
        window.fbq?.('init', pixelId);
    }
};

export interface PixelEventOptions {
    eventId?: string;
}

export const trackPixelEvent = (
    pixelId: string,
    eventName: string,
    params?: Record<string, unknown>,
    options?: PixelEventOptions
) => {
    if (!pixelId || typeof window === 'undefined') {
        return;
    }

    const fbq = window.fbq;
    if (!fbq) {
        return;
    }

    if (options?.eventId) {
        fbq('trackSingle', pixelId, eventName, params ?? {}, { eventID: options.eventId });
    } else if (params) {
        fbq('trackSingle', pixelId, eventName, params);
    } else {
        fbq('trackSingle', pixelId, eventName);
    }
};

export const teardownMetaPixel = () => {
    if (typeof window === 'undefined') {
        return;
    }

    initializedPixels.clear();
    pixelsInitializedWithUserData.clear();

    try {
        window.fbq?.('consent', 'revoke');
    } catch {
        // Ignore fbq errors during teardown.
    }

    if (typeof document !== 'undefined') {
        const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
        const deleteCookie = (name: string) => {
            try {
                for (const domain of getCookieDomains()) {
                    const domainAttribute = domain ? `; Domain=${domain}` : '';
                    document.cookie =
                        `${name}=; Max-Age=0; Path=/; SameSite=Lax${domainAttribute}${secureAttribute}`;
                }
            } catch {
                // Ignore cookie deletion errors.
            }
        };

        // Best-effort cleanup for Meta Pixel cookies on our domain when marketing is turned off.
        META_PIXEL_COOKIE_NAMES.forEach(deleteCookie);
    }

};
