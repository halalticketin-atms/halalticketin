import type { MarketingEventName, MarketingEventPayload } from './events';

export interface HalalTicketinDataLayerEvent {
    event:
        | 'ht_event_viewed'
        | 'ht_tickets_added'
        | 'ht_checkout_started'
        | 'ht_payment_info_submitted'
        | 'ht_purchase';
    event_id?: string;
    transaction_id?: string;
    value?: number;
    currency?: string;
    organizer_id?: string;
    public_event_id?: string;
    public_event_title?: string;
    items?: Array<{
        item_id: string;
        item_name?: string;
        quantity: number;
        price?: number;
    }>;
}

const DATA_LAYER_EVENT_NAMES: Partial<Record<MarketingEventName, HalalTicketinDataLayerEvent['event']>> = {
    event_viewed: 'ht_event_viewed',
    tickets_added: 'ht_tickets_added',
    checkout_started: 'ht_checkout_started',
    payment_info_submitted: 'ht_payment_info_submitted',
    purchase_completed: 'ht_purchase',
};

const mapItems = (payload: MarketingEventPayload): HalalTicketinDataLayerEvent['items'] | undefined => {
    if (!payload.items?.length) {
        return undefined;
    }

    return payload.items.map((item) => ({
        item_id: item.ticketTypeId,
        ...(item.ticketName ? { item_name: item.ticketName } : {}),
        quantity: item.quantity,
        ...(typeof item.unitPrice === 'number' ? { price: item.unitPrice } : {}),
    }));
};

export const mapMarketingEventToDataLayer = (
    eventName: MarketingEventName,
    payload: MarketingEventPayload,
): HalalTicketinDataLayerEvent | null => {
    const mappedEventName = DATA_LAYER_EVENT_NAMES[eventName];
    if (!mappedEventName) {
        return null;
    }

    return {
        event: mappedEventName,
        ...(payload.eventId ? { event_id: payload.eventId } : {}),
        ...(payload.orderId ? { transaction_id: payload.orderId } : {}),
        ...(typeof payload.value === 'number' ? { value: payload.value } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.organizerId ? { organizer_id: payload.organizerId } : {}),
        ...(payload.publicEventId ? { public_event_id: payload.publicEventId } : {}),
        ...(payload.publicEventTitle ? { public_event_title: payload.publicEventTitle } : {}),
        ...(mapItems(payload) ? { items: mapItems(payload) } : {}),
    };
};
