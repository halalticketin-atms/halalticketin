export type PurchaseTrackingProvider = 'meta' | 'ga4' | 'tiktok' | 'google_ads';

const buildPurchaseKey = (provider: PurchaseTrackingProvider, orderId: string) =>
    `ht_purchase_tracked:${provider}:${orderId}`;

export const hasTrackedProviderPurchase = (provider: PurchaseTrackingProvider, orderId?: string | null) => {
    if (!orderId || typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(buildPurchaseKey(provider, orderId)) === '1';
    } catch {
        return false;
    }
};

export const markProviderPurchaseTracked = (provider: PurchaseTrackingProvider, orderId?: string | null) => {
    if (!orderId || typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(buildPurchaseKey(provider, orderId), '1');
    } catch {
        // Ignore storage errors.
    }
};
