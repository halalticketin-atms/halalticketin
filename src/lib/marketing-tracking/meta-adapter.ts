import type { PixelEventOptions } from '@/lib/meta-pixel';
import type { MarketingEventName, MarketingEventPayload, MarketingTicketItem } from './events';

interface MetaMarketingEvent {
    pixelId: string;
    eventName: string;
    params?: Record<string, unknown>;
    options?: PixelEventOptions;
}

const normalizePixelId = (pixelId?: string | null) => {
    const normalized = pixelId?.trim();
    return normalized ? normalized : null;
};

const roundedNumber = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    return Number(value.toFixed(2));
};

const mapItemsToContents = (items?: MarketingTicketItem[]) => {
    if (!items || items.length === 0) {
        return undefined;
    }

    return [...items]
        .map((item) => ({
            id: item.ticketTypeId,
            quantity: item.quantity,
            item_price: roundedNumber(item.unitPrice) ?? item.unitPrice,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
};

const addPublicEventContentId = (params: Record<string, unknown>, publicEventId?: string | null) => {
    if (publicEventId) {
        params.content_ids = [publicEventId];
    }
};

export const mapMarketingEventToMeta = (
    eventName: MarketingEventName,
    payload: MarketingEventPayload,
): MetaMarketingEvent | null => {
    const pixelId = normalizePixelId(payload.providerTargets.metaPixelId);
    if (!pixelId) {
        return null;
    }

    if (eventName === 'page_viewed') {
        return {
            pixelId,
            eventName: 'PageView',
            params: payload.pagePath ? { page_path: payload.pagePath } : undefined,
            options: undefined,
        };
    }

    if (eventName === 'event_viewed') {
        const params: Record<string, unknown> = {
            currency: payload.currency,
            content_type: 'product',
        };
        addPublicEventContentId(params, payload.publicEventId);
        if (payload.publicEventTitle) {
            params.content_name = payload.publicEventTitle;
        }

        return {
            pixelId,
            eventName: 'ViewContent',
            params,
            options: undefined,
        };
    }

    if (eventName === 'tickets_added' || eventName === 'checkout_started') {
        const params: Record<string, unknown> = {
            value: roundedNumber(payload.value),
            currency: payload.currency,
            num_items: payload.numItems ?? undefined,
            content_type: 'product',
        };
        addPublicEventContentId(params, payload.publicEventId);
        const contents = mapItemsToContents(payload.items);
        if (contents) {
            params.contents = contents;
        }

        return {
            pixelId,
            eventName: eventName === 'tickets_added' ? 'AddToCart' : 'InitiateCheckout',
            params,
            options: undefined,
        };
    }

    if (eventName === 'purchase_completed') {
        const params: Record<string, unknown> = {
            value: roundedNumber(payload.value),
            currency: payload.currency,
            content_type: 'product',
            num_items: payload.numItems ?? undefined,
        };
        addPublicEventContentId(params, payload.publicEventId);

        return {
            pixelId,
            eventName: 'Purchase',
            params,
            options: payload.eventId ? { eventId: payload.eventId } : undefined,
        };
    }

    return null;
};
