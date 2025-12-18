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
let snippetInserted = false;

const ensureBaseSnippet = () => {
    if (typeof window === 'undefined' || snippetInserted) {
        return;
    }

    snippetInserted = true;

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

        const script = document.createElement('script');
        script.async = true;
        script.src = META_PIXEL_SRC;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);
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
