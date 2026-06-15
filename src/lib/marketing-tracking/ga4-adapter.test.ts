import { describe, expect, it } from 'vitest';
import { mapMarketingEventToGa4 } from './ga4-adapter';

describe('mapMarketingEventToGa4', () => {
    it('maps event_viewed to view_item with send_to', () => {
        expect(
            mapMarketingEventToGa4('event_viewed', {
                providerTargets: { googleAnalyticsMeasurementId: 'G-ABC123' },
                publicEventId: 'event_001',
                publicEventTitle: 'Community Dinner',
                currency: 'GBP',
            }),
        ).toEqual({
            eventName: 'view_item',
            params: {
                send_to: 'G-ABC123',
                currency: 'GBP',
                items: [{ item_id: 'event_001', item_name: 'Community Dinner' }],
            },
        });
    });

    it('maps tickets_added to add_to_cart ecommerce items', () => {
        expect(
            mapMarketingEventToGa4('tickets_added', {
                providerTargets: { googleAnalyticsMeasurementId: 'G-ABC123' },
                value: 50,
                currency: 'GBP',
                items: [{ ticketTypeId: 'ticket_a', ticketName: 'Adult', quantity: 2, unitPrice: 25 }],
            }),
        ).toEqual({
            eventName: 'add_to_cart',
            params: {
                send_to: 'G-ABC123',
                value: 50,
                currency: 'GBP',
                items: [{ item_id: 'ticket_a', item_name: 'Adult', quantity: 2, price: 25 }],
            },
        });
    });

    it('maps purchase_completed with transaction_id and dedupe-safe order id', () => {
        expect(
            mapMarketingEventToGa4('purchase_completed', {
                providerTargets: { googleAnalyticsMeasurementId: 'G-ABC123' },
                orderId: 'order_123',
                value: 29.2,
                currency: 'GBP',
                items: [{ ticketTypeId: 'ticket_a', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            eventName: 'purchase',
            params: {
                send_to: 'G-ABC123',
                transaction_id: 'order_123',
                value: 29.2,
                currency: 'GBP',
                items: [{ item_id: 'ticket_a', item_name: 'Adult', quantity: 1, price: 25 }],
            },
        });
    });

    it('returns null without a Measurement ID', () => {
        expect(mapMarketingEventToGa4('event_viewed', { providerTargets: {}, currency: 'GBP' })).toBeNull();
    });
});
