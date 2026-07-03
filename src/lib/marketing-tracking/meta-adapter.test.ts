import { describe, expect, it } from 'vitest';
import { mapMarketingEventToMeta } from './meta-adapter';

describe('mapMarketingEventToMeta', () => {
    it('maps event_viewed to the current Meta ViewContent payload', () => {
        expect(
            mapMarketingEventToMeta('event_viewed', {
                providerTargets: { metaPixelId: '123456789012345' },
                publicEventId: 'event_001',
                publicEventTitle: 'Test Event',
                currency: 'GBP',
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'ViewContent',
            params: {
                currency: 'GBP',
                content_type: 'product',
                content_ids: ['event_001'],
                content_name: 'Test Event',
            },
            options: undefined,
        });
    });

    it('maps tickets_added to the current Meta AddToCart payload', () => {
        expect(
            mapMarketingEventToMeta('tickets_added', {
                providerTargets: { metaPixelId: '123456789012345' },
                publicEventId: 'event_001',
                value: 25,
                currency: 'GBP',
                numItems: 1,
                items: [{ ticketTypeId: 'ticket_001', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'AddToCart',
            params: {
                value: 25,
                currency: 'GBP',
                num_items: 1,
                content_ids: ['event_001'],
                content_type: 'product',
                contents: [{ id: 'ticket_001', quantity: 1, item_price: 25 }],
            },
            options: undefined,
        });
    });

    it('maps purchase_completed with Meta eventID', () => {
        expect(
            mapMarketingEventToMeta('purchase_completed', {
                providerTargets: { metaPixelId: '123456789012345' },
                eventId: 'meta_event_123',
                publicEventId: 'event_001',
                value: 29.2,
                currency: 'GBP',
                numItems: 1,
                orderId: 'order_123',
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'Purchase',
            params: {
                value: 29.2,
                currency: 'GBP',
                content_type: 'product',
                num_items: 1,
                content_ids: ['event_001'],
            },
            options: { eventId: 'meta_event_123' },
        });
    });

    it('maps page_viewed to PageView with the current page_path param', () => {
        expect(
            mapMarketingEventToMeta('page_viewed', {
                providerTargets: { metaPixelId: '123456789012345' },
                pagePath: '/events/test-event',
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'PageView',
            params: { page_path: '/events/test-event' },
            options: undefined,
        });
    });

    it('maps checkout_started to the current Meta InitiateCheckout payload', () => {
        expect(
            mapMarketingEventToMeta('checkout_started', {
                providerTargets: { metaPixelId: '123456789012345' },
                publicEventId: 'event_001',
                value: 29.2,
                currency: 'GBP',
                numItems: 1,
                items: [{ ticketTypeId: 'ticket_001', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'InitiateCheckout',
            params: {
                value: 29.2,
                currency: 'GBP',
                num_items: 1,
                content_ids: ['event_001'],
                content_type: 'product',
                contents: [{ id: 'ticket_001', quantity: 1, item_price: 25 }],
            },
            options: undefined,
        });
    });

    it('maps payment_info_submitted to Meta AddPaymentInfo with the InitiateCheckout params shape', () => {
        expect(
            mapMarketingEventToMeta('payment_info_submitted', {
                providerTargets: { metaPixelId: '123456789012345' },
                publicEventId: 'event_001',
                value: 29.2,
                currency: 'GBP',
                numItems: 1,
                items: [{ ticketTypeId: 'ticket_001', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            pixelId: '123456789012345',
            eventName: 'AddPaymentInfo',
            params: {
                value: 29.2,
                currency: 'GBP',
                num_items: 1,
                content_ids: ['event_001'],
                content_type: 'product',
                contents: [{ id: 'ticket_001', quantity: 1, item_price: 25 }],
            },
            options: undefined,
        });
    });

    it('returns null when no Meta Pixel ID is configured', () => {
        expect(mapMarketingEventToMeta('event_viewed', { providerTargets: {}, currency: 'GBP' })).toBeNull();
    });
});
