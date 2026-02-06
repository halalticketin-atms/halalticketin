'use client';

const META_PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

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

    if (typeof document !== 'undefined') {
        const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${META_PIXEL_SRC}"]`);
        if (!existingScript) {
            const script = document.createElement('script');
            script.async = true;
            script.src = META_PIXEL_SRC;
            const firstScript = document.getElementsByTagName('script')[0];

            if (firstScript?.parentNode) {
                firstScript.parentNode.insertBefore(script, firstScript);
            } else if (document.head) {
                document.head.appendChild(script);
            } else if (document.body) {
                document.body.appendChild(script);
            }
        }
    }
};

export const ensureMetaPixel = () => {
    ensureBaseSnippet();
};

export const initMetaPixel = (pixelId: string) => {
    if (!pixelId || typeof window === 'undefined') {
        return;
    }

    ensureBaseSnippet();

    if (initializedPixels.has(pixelId)) {
        return;
    }

    initializedPixels.add(pixelId);
    window.fbq?.('init', pixelId);
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

    if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll<HTMLScriptElement>(`script[src="${META_PIXEL_SRC}"]`);
        scripts.forEach((script) => script.parentNode?.removeChild(script));
    }

    try {
        window.fbq?.('consent', 'revoke');
    } catch {
        // Ignore fbq errors during teardown.
    }

    if (typeof document !== 'undefined') {
        const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
        const deleteCookie = (name: string) => {
            try {
                document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${secureAttribute}`;
            } catch {
                // Ignore cookie deletion errors.
            }
        };

        // Best-effort cleanup for Meta Pixel cookies on our domain when marketing is turned off.
        deleteCookie('_fbp');
        deleteCookie('_fbc');
    }

    delete window.fbq;
    delete window._fbq;
};
