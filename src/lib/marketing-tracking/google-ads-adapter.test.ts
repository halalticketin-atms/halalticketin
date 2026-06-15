import { describe, expect, it } from 'vitest';
import { mapMarketingEventToGoogleAds } from './google-ads-adapter';

describe('mapMarketingEventToGoogleAds', () => {
    it('maps purchase_completed to a Google Ads conversion payload', () => {
        expect(
            mapMarketingEventToGoogleAds('purchase_completed', {
                providerTargets: {
                    googleAds: {
                        conversionId: 'AW-123456789',
                        purchaseConversionLabel: 'abcDEFghiJKL',
                    },
                },
                orderId: 'order_123',
                value: 29.2,
                currency: 'GBP',
            }),
        ).toEqual({
            eventName: 'conversion',
            params: {
                send_to: 'AW-123456789/abcDEFghiJKL',
                value: 29.2,
                currency: 'GBP',
                transaction_id: 'order_123',
            },
        });
    });

    it('does not map non-purchase events', () => {
        expect(
            mapMarketingEventToGoogleAds('checkout_started', {
                providerTargets: {
                    googleAds: { conversionId: 'AW-123456789', purchaseConversionLabel: 'abc' },
                },
            }),
        ).toBeNull();
    });

    it('returns null when conversion config is incomplete', () => {
        expect(
            mapMarketingEventToGoogleAds('purchase_completed', {
                providerTargets: {
                    googleAds: { conversionId: 'AW-123456789', purchaseConversionLabel: null },
                },
                orderId: 'order_123',
            }),
        ).toBeNull();
    });
});
