import type { MarketingEventName, MarketingEventPayload } from './events';

type GoogleAdsParams = Record<string, unknown>;

export interface GoogleAdsEvent {
    eventName: 'conversion';
    params: GoogleAdsParams;
}

export const mapMarketingEventToGoogleAds = (
    eventName: MarketingEventName,
    payload: MarketingEventPayload,
): GoogleAdsEvent | null => {
    if (eventName !== 'purchase_completed') {
        return null;
    }

    const conversionId = payload.providerTargets.googleAds?.conversionId?.trim();
    const purchaseConversionLabel = payload.providerTargets.googleAds?.purchaseConversionLabel?.trim();
    const orderId = payload.orderId?.trim();

    if (!conversionId || !purchaseConversionLabel || !orderId) {
        return null;
    }

    const params: GoogleAdsParams = {
        send_to: `${conversionId}/${purchaseConversionLabel}`,
        transaction_id: orderId,
    };

    if (typeof payload.value === 'number') {
        params.value = payload.value;
    }

    if (payload.currency) {
        params.currency = payload.currency;
    }

    return {
        eventName: 'conversion',
        params,
    };
};
