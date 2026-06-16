export type MarketingEventName =
    | 'page_viewed'
    | 'event_viewed'
    | 'tickets_added'
    | 'checkout_started'
    | 'payment_info_submitted'
    | 'purchase_completed';

export interface MarketingTicketItem {
    ticketTypeId: string;
    quantity: number;
    unitPrice: number;
    ticketName?: string | null;
}

export interface MarketingEventPayload {
    providerTargets: {
        metaPixelId?: string | null;
        googleAnalyticsMeasurementId?: string | null;
        tiktokPixelId?: string | null;
        googleAds?: {
            conversionId?: string | null;
            purchaseConversionLabel?: string | null;
        } | null;
    };
    eventId?: string | null;
    organizerId?: string | null;
    publicEventId?: string | null;
    publicEventTitle?: string | null;
    orderId?: string | null;
    userEmail?: string | null;
    value?: number | null;
    currency?: string | null;
    numItems?: number | null;
    pagePath?: string | null;
    items?: MarketingTicketItem[];
}
