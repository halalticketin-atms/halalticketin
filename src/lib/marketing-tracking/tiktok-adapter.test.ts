import { describe, expect, it } from 'vitest';
import { mapMarketingEventToTikTok } from './tiktok-adapter';

describe('mapMarketingEventToTikTok', () => {
    it('maps event_viewed to ViewContent', () => {
        expect(
            mapMarketingEventToTikTok('event_viewed', {
                providerTargets: { tiktokPixelId: 'CABC12345' },
                publicEventId: 'event_001',
                publicEventTitle: 'Community Dinner',
                currency: 'GBP',
            }),
        ).toEqual({
            pixelId: 'CABC12345',
            eventName: 'ViewContent',
            params: {
                contents: [{ content_id: 'event_001', content_name: 'Community Dinner' }],
                content_type: 'product',
                currency: 'GBP',
            },
        });
    });

    it('maps checkout_started to InitiateCheckout with value and contents', () => {
        expect(
            mapMarketingEventToTikTok('checkout_started', {
                providerTargets: { tiktokPixelId: 'CABC12345' },
                value: 29.2,
                currency: 'GBP',
                items: [{ ticketTypeId: 'ticket_001', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            pixelId: 'CABC12345',
            eventName: 'InitiateCheckout',
            params: {
                value: 29.2,
                currency: 'GBP',
                contents: [{ content_id: 'ticket_001', content_name: 'Adult', quantity: 1, price: 25 }],
                content_type: 'product',
            },
        });
    });

    it('maps purchase_completed to Purchase with event_id as tracking options', () => {
        expect(
            mapMarketingEventToTikTok('purchase_completed', {
                providerTargets: { tiktokPixelId: 'CABC12345' },
                eventId: 'tiktok_event_123',
                orderId: 'order_123',
                value: 29.2,
                currency: 'GBP',
            }),
        ).toEqual({
            pixelId: 'CABC12345',
            eventName: 'Purchase',
            params: {
                order_id: 'order_123',
                value: 29.2,
                currency: 'GBP',
                content_type: 'product',
            },
            options: {
                event_id: 'tiktok_event_123',
            },
        });
    });

    it('returns null when no TikTok Pixel ID is configured', () => {
        expect(mapMarketingEventToTikTok('event_viewed', { providerTargets: {} })).toBeNull();
    });
});
