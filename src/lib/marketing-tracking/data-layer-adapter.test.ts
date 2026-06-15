import { describe, expect, it } from 'vitest';
import { mapMarketingEventToDataLayer } from './data-layer-adapter';

describe('mapMarketingEventToDataLayer', () => {
    it('maps purchase without personal data', () => {
        expect(
            mapMarketingEventToDataLayer('purchase_completed', {
                providerTargets: {},
                eventId: 'dedupe_123',
                orderId: 'order_123',
                publicEventId: 'event_001',
                publicEventTitle: 'Community Dinner',
                value: 29.2,
                currency: 'GBP',
                items: [{ ticketTypeId: 'ticket_001', ticketName: 'Adult', quantity: 1, unitPrice: 25 }],
            }),
        ).toEqual({
            event: 'ht_purchase',
            event_id: 'dedupe_123',
            transaction_id: 'order_123',
            public_event_id: 'event_001',
            public_event_title: 'Community Dinner',
            value: 29.2,
            currency: 'GBP',
            items: [{ item_id: 'ticket_001', item_name: 'Adult', quantity: 1, price: 25 }],
        });
    });

    it('returns null for page_viewed because no public data layer page event is defined', () => {
        expect(mapMarketingEventToDataLayer('page_viewed', { providerTargets: {} })).toBeNull();
    });
});
