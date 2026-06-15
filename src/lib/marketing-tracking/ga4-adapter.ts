import type { MarketingEventName, MarketingEventPayload, MarketingTicketItem } from './events';

type Ga4Params = Record<string, unknown>;

export interface Ga4Event {
    eventName: string;
    params: Ga4Params;
}

const GA4_EVENT_NAMES: Partial<Record<MarketingEventName, string>> = {
    event_viewed: 'view_item',
    tickets_added: 'add_to_cart',
    checkout_started: 'begin_checkout',
    payment_info_submitted: 'add_payment_info',
    purchase_completed: 'purchase',
};

const mapItems = (items?: MarketingTicketItem[]) =>
    items?.map((item) => ({
        item_id: item.ticketTypeId,
        ...(item.ticketName ? { item_name: item.ticketName } : {}),
        quantity: item.quantity,
        price: item.unitPrice,
    }));

export const mapMarketingEventToGa4 = (
    eventName: MarketingEventName,
    payload: MarketingEventPayload,
): Ga4Event | null => {
    const measurementId = payload.providerTargets.googleAnalyticsMeasurementId?.trim();
    const mappedName = GA4_EVENT_NAMES[eventName];

    if (!measurementId || !mappedName) {
        return null;
    }

    const params: Ga4Params = { send_to: measurementId };

    if (payload.currency) {
        params.currency = payload.currency;
    }

    if (typeof payload.value === 'number') {
        params.value = payload.value;
    }

    if (eventName === 'event_viewed') {
        params.items = [
            {
                item_id: payload.publicEventId ?? undefined,
                item_name: payload.publicEventTitle ?? undefined,
            },
        ].map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined)));
    } else {
        const items = mapItems(payload.items);
        if (items && items.length > 0) {
            params.items = items;
        }
    }

    if (eventName === 'purchase_completed' && payload.orderId) {
        params.transaction_id = payload.orderId;
    }

    return {
        eventName: mappedName,
        params,
    };
};
