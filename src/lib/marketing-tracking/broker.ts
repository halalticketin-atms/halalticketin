import { initMetaPixel, trackPixelEvent } from '@/lib/meta-pixel';
import { mapMarketingEventToDataLayer } from './data-layer-adapter';
import { mapMarketingEventToGa4 } from './ga4-adapter';
import { mapMarketingEventToGoogleAds } from './google-ads-adapter';
import { configureGoogleTagDestination } from './google-tag';
import { mapMarketingEventToMeta } from './meta-adapter';
import { mapMarketingEventToTikTok } from './tiktok-adapter';
import type { MarketingEventName, MarketingEventPayload } from './events';

declare global {
    interface Window {
        dataLayer?: unknown[];
        ttq?: TikTokPixelQueue;
    }
}

interface TikTokPixelInstance {
    track?: (
        eventName: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
    ) => void;
    page?: () => void;
}

interface TikTokPixelQueue {
    track?: (...args: unknown[]) => void;
    load?: (pixelId: string) => void;
    enableCookie?: () => void;
    disableCookie?: () => void;
    holdConsent?: () => void;
    revokeConsent?: () => void;
    grantConsent?: () => void;
    instance?: (pixelId: string) => TikTokPixelInstance;
    __htTikTokReady?: boolean;
    _i?: Record<string, TikTokPixelInstance & unknown[]>;
    _loaded?: Record<string, boolean>;
}

const buildDataLayerPurchaseKey = (orderId: string) => `ht_data_layer_purchase_tracked:${orderId}`;

export interface MarketingTracker {
    canTrack: boolean;
    trackMarketingEvent: (eventName: MarketingEventName, payload: MarketingEventPayload) => void;
}

export interface MarketingTrackerConsent {
    analyticsAllowed: boolean;
    marketingAllowed: boolean;
}

const createTikTokQueue = (): TikTokPixelQueue => {
    const queue = [] as unknown[] & TikTokPixelQueue;
    const methods = [
        'track',
        'enableCookie',
        'disableCookie',
        'holdConsent',
        'revokeConsent',
        'grantConsent',
    ] as const;
    queue._i = {};
    queue._loaded = {};
    for (const method of methods) {
        queue[method] = (...args: unknown[]) => {
            queue.push([method, ...args]);
        };
    }
    queue.instance = (pixelId: string) => {
        const instance = queue._i?.[pixelId] ?? ([] as unknown[] & TikTokPixelInstance);
        if (typeof instance.track !== 'function') {
            instance.track = (...args: unknown[]) => {
                instance.push(['track', ...args]);
            };
        }
        if (typeof instance.page !== 'function') {
            instance.page = (...args: unknown[]) => {
                instance.push(['page', ...args]);
            };
        }
        queue._i = queue._i ?? {};
        queue._i[pixelId] = instance;
        return instance;
    };
    queue.load = (pixelId: string) => {
        queue._loaded = queue._loaded ?? {};
        if (queue._loaded[pixelId]) {
            return;
        }
        queue._loaded[pixelId] = true;
        if (typeof document === 'undefined') {
            return;
        }
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`;
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);
    };
    queue.__htTikTokReady = true;
    return queue;
};

const getOrCreateTikTokQueue = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    if (typeof window.ttq?.load === 'function' && typeof window.ttq.instance === 'function') {
        return window.ttq;
    }

    window.ttq = createTikTokQueue();
    return window.ttq;
};

const trackTikTokPixelEvent = (
    pixelId: string,
    eventName: string,
    params: Record<string, unknown>,
    options?: Record<string, unknown>,
) => {
    const ttq = getOrCreateTikTokQueue();
    if (typeof ttq?.load !== 'function' || typeof ttq.instance !== 'function') {
        return;
    }

    ttq.grantConsent?.();
    ttq.enableCookie?.();
    ttq.load(pixelId);
    const pixelInstance = ttq.instance(pixelId);
    if (eventName === 'Pageview') {
        pixelInstance?.page?.();
        return;
    }
    if (typeof pixelInstance?.track === 'function') {
        if (options) {
            pixelInstance.track(eventName, params, options);
        } else {
            pixelInstance.track(eventName, params);
        }
    }
};

const hasTrackedDataLayerPurchase = (orderId?: string | null) => {
    if (!orderId || typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage?.getItem(buildDataLayerPurchaseKey(orderId)) === '1';
    } catch {
        return false;
    }
};

const markDataLayerPurchaseTracked = (orderId?: string | null) => {
    if (!orderId || typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage?.setItem(buildDataLayerPurchaseKey(orderId), '1');
    } catch {
        // Ignore storage errors.
    }
};

const pushDataLayerEvent = (eventName: MarketingEventName, payload: MarketingEventPayload) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (eventName === 'purchase_completed' && hasTrackedDataLayerPurchase(payload.orderId)) {
        return;
    }

    const dataLayerEvent = mapMarketingEventToDataLayer(eventName, payload);
    if (!dataLayerEvent) {
        return;
    }

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(dataLayerEvent);

    if (eventName === 'purchase_completed') {
        markDataLayerPurchaseTracked(payload.orderId);
    }
};

export const createMarketingTracker = ({
    analyticsAllowed,
    marketingAllowed,
}: MarketingTrackerConsent): MarketingTracker => ({
    canTrack: analyticsAllowed || marketingAllowed,
    trackMarketingEvent: (eventName, payload) => {
        if (analyticsAllowed || marketingAllowed) {
            pushDataLayerEvent(eventName, payload);
        }

        // Google destinations run in Consent Mode v2 advanced mode: the tag is
        // always configured and events always fire, while the consent state
        // decides whether gtag uses cookies or falls back to cookieless pings.
        const googleConsent = { analyticsAllowed, marketingAllowed };

        const ga4MeasurementId = payload.providerTargets.googleAnalyticsMeasurementId?.trim();
        if (ga4MeasurementId) {
            const gtag = configureGoogleTagDestination(ga4MeasurementId, googleConsent);
            const ga4Event = mapMarketingEventToGa4(eventName, payload);
            if (ga4Event && gtag) {
                gtag('event', ga4Event.eventName, ga4Event.params);
            }
        }

        const googleAdsConversionId = payload.providerTargets.googleAds?.conversionId?.trim();
        if (googleAdsConversionId) {
            // Configuring the AW- destination on landing lets gtag pick up gclid
            // for later purchase attribution, even before any conversion fires.
            const googleAdsGtag = configureGoogleTagDestination(googleAdsConversionId, googleConsent);
            const googleAdsEvent = mapMarketingEventToGoogleAds(eventName, payload);
            if (googleAdsEvent && googleAdsGtag) {
                const userEmail = payload.userEmail?.trim().toLowerCase();
                if (marketingAllowed && userEmail) {
                    googleAdsGtag('set', 'user_data', { email: userEmail });
                }
                googleAdsGtag('event', googleAdsEvent.eventName, googleAdsEvent.params);
            }
        }

        if (!marketingAllowed) {
            return;
        }

        const metaEvent = mapMarketingEventToMeta(eventName, payload);
        if (metaEvent) {
            if (payload.userEmail) {
                initMetaPixel(metaEvent.pixelId, { em: payload.userEmail });
            } else {
                initMetaPixel(metaEvent.pixelId);
            }
            trackPixelEvent(metaEvent.pixelId, metaEvent.eventName, metaEvent.params, metaEvent.options);
        }

        const tiktokEvent = mapMarketingEventToTikTok(eventName, payload);
        if (tiktokEvent) {
            trackTikTokPixelEvent(
                tiktokEvent.pixelId,
                tiktokEvent.eventName,
                tiktokEvent.params,
                tiktokEvent.options,
            );
        }
    },
});
