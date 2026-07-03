import type { MarketingEventName, MarketingEventPayload, MarketingTicketItem } from './events';

type TikTokParams = Record<string, unknown>;

export interface TikTokEvent {
    pixelId: string;
    eventName: string;
    params: TikTokParams;
    options?: {
        event_id: string;
    };
}

const TIKTOK_EVENT_NAMES: Partial<Record<MarketingEventName, string>> = {
    // Pageview is dispatched via ttq.instance(pixelId).page(), not track().
    page_viewed: 'Pageview',
    event_viewed: 'ViewContent',
    tickets_added: 'AddToCart',
    checkout_started: 'InitiateCheckout',
    payment_info_submitted: 'AddPaymentInfo',
    // TikTok's current standard web purchase event is Purchase. TicketTailor's help copy uses CompletePayment, which TikTok treats as a reserved alias for Purchase.
    purchase_completed: 'Purchase',
};

const mapItems = (items?: MarketingTicketItem[]) =>
    items?.map((item) => ({
        content_id: item.ticketTypeId,
        ...(item.ticketName ? { content_name: item.ticketName } : {}),
        quantity: item.quantity,
        price: item.unitPrice,
    }));

export const mapMarketingEventToTikTok = (
    eventName: MarketingEventName,
    payload: MarketingEventPayload,
): TikTokEvent | null => {
    const pixelId = payload.providerTargets.tiktokPixelId?.trim();
    const mappedName = TIKTOK_EVENT_NAMES[eventName];

    if (!pixelId || !mappedName) {
        return null;
    }

    if (eventName === 'page_viewed') {
        return {
            pixelId,
            eventName: mappedName,
            params: {},
        };
    }

    const params: TikTokParams = { content_type: 'product' };

    if (payload.currency) {
        params.currency = payload.currency;
    }

    if (typeof payload.value === 'number') {
        params.value = payload.value;
    }

    if (eventName === 'event_viewed') {
        params.contents = [
            {
                content_id: payload.publicEventId ?? undefined,
                content_name: payload.publicEventTitle ?? undefined,
            },
        ].map((item) => Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined)));
    } else {
        const contents = mapItems(payload.items);
        if (contents && contents.length > 0) {
            params.contents = contents;
        }
    }

    if (eventName === 'purchase_completed') {
        if (payload.orderId) {
            params.order_id = payload.orderId;
        }
    }

    return {
        pixelId,
        eventName: mappedName,
        params,
        ...(eventName === 'purchase_completed' && payload.eventId
            ? { options: { event_id: payload.eventId } }
            : {}),
    };
};
