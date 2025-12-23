import api from './api';

export type BackendLocationType = 'in_person' | 'online' | 'hybrid';
export type BackendFeeTier = 'payg' | 'token' | 'charity';
export type EventVisibility = 'public' | 'private';

export interface EventRecord {
    id: string;
    organizerId: string;
    title: string | null;
    description: string | null;
    bannerImageUrl: string | null;
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    startDatetime: string | null;
    endDatetime: string | null;
    timezone: string;
    isMultiDay: boolean;
    locationType: BackendLocationType;
    venue: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    onlineUrl: string | null;
    currency: string;
    refundPolicy: string | null;
    isListedPublicly: boolean;
    slug: string | null;
    category: string | null;
    feeTier: BackendFeeTier;
    customBookingFee: number | null;
    absorbFee: boolean;
    attendeeInfoMode: 'per_ticket' | 'buyer_choice';
    customQuestions: CustomQuestionPayload[] | null;
    createdAt: string;
    updatedAt: string;
}

export interface TicketRecord {
    id: string;
    eventId: string;
    name: string;
    description: string | null;
    price: string | null;
    currency: string;
    maxQuantity: number | null;
    maxPerOrder: number | null;
    type: 'free' | 'paid' | 'donation';
    visibility: 'public' | 'hidden';
    salesStart: string | null;
    salesEnd: string | null;
}

export interface CustomQuestionPayload {
    id: string;
    label: string;
    type: 'text' | 'select' | 'checkbox';
    required: boolean;
    options?: string[];
}

export interface UpsertEventPayload {
    title: string;
    description?: string | null;
    bannerImageUrl?: string | null;
    startDatetime?: string | null;
    endDatetime?: string | null;
    timezone?: string;
    isMultiDay?: boolean;
    locationType?: BackendLocationType;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    onlineUrl?: string | null;
    currency?: string;
    refundPolicy?: string | null;
    isListedPublicly?: boolean;
    category?: string | null;
    absorbFee?: boolean;
    attendeeInfoMode?: 'per_ticket' | 'buyer_choice';
    customQuestions?: CustomQuestionPayload[] | null;
}

export interface TicketInputPayload {
    id?: string;
    name: string;
    description?: string | null;
    price?: number;
    isFree?: boolean;
    currency?: string;
    maxQuantity?: number;
    maxPerOrder?: number;
    visibility?: 'public' | 'hidden';
    salesStart?: string | null;
    salesEnd?: string | null;
}

export const createEventDraft = async (organizerId: string, payload: UpsertEventPayload) => {
    return api.post<{ event: EventRecord }>(`/api/v1/organizers/${organizerId}/events`, payload);
};

export const updateEventDraft = async (eventId: string, payload: UpsertEventPayload) => {
    return api.patch<{ event: EventRecord }>(`/api/v1/events/${eventId}`, payload);
};

export const saveEventTickets = async (eventId: string, tickets: TicketInputPayload[]) => {
    return api.put<{ tickets: TicketRecord[] }>(`/api/v1/events/${eventId}/tickets`, { tickets });
};

export const publishEvent = async (eventId: string, visibility: EventVisibility) => {
    return api.post<{ event: EventRecord }>(`/api/v1/events/${eventId}/publish`, {
        visibility,
    });
};

export const fetchEventDetails = async (eventId: string) => {
    return api.get<{ event: EventRecord; tickets: TicketRecord[] }>(`/api/v1/events/${eventId}`);
};

export const listOrganizerEvents = async (
    organizerId: string,
    options?: { status?: 'draft' | 'published' | 'cancelled' | 'archived' },
) => {
    const params = options?.status ? { status: options.status } : undefined;
    return api.get<{ events: EventRecord[] }>(`/api/v1/organizers/${organizerId}/events`, {
        params,
    });
};

// ============================================================================
// Promo Code API
// ============================================================================

export interface PromoCodeRecord {
    id: string;
    eventId: string;
    code: string;
    discountType: 'percentage' | 'amount';
    discountValue: string;
    usageLimit: number | null;
    usageCount: number;
    validFrom: string | null;
    validUntil: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PromoCodeInput {
    code: string;
    discountType: 'percentage' | 'amount';
    discountValue: number;
    usageLimit?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
}

export const fetchEventPromoCodes = async (eventId: string) => {
    return api.get<{ promoCodes: PromoCodeRecord[] }>(`/api/v1/events/${eventId}/promo-codes`);
};

export const createPromoCode = async (eventId: string, data: PromoCodeInput) => {
    return api.post<{ promoCode: PromoCodeRecord }>(`/api/v1/events/${eventId}/promo-codes`, data);
};

export const updatePromoCode = async (
    eventId: string,
    promoId: string,
    data: Partial<PromoCodeInput>
) => {
    return api.patch<{ promoCode: PromoCodeRecord }>(
        `/api/v1/events/${eventId}/promo-codes/${promoId}`,
        data
    );
};

export const deletePromoCode = async (eventId: string, promoId: string) => {
    return api.delete(`/api/v1/events/${eventId}/promo-codes/${promoId}`);
};

// ============================================================================
// Public Event API (no authentication required)
// ============================================================================

export interface PublicEventRecord {
    id: string;
    slug: string | null;
    title: string | null;
    description: string | null;
    bannerImageUrl: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    timezone: string;
    isMultiDay: boolean;
    locationType: BackendLocationType;
    venue: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    onlineUrl: string | null;
    currency: string;
    organizerName: string | null;
    category: string | null;
    absorbFee: boolean;
    feeTier: BackendFeeTier | null;
    customBookingFee: string | null;
    metaPixelId: string | null;
    attendeeInfoMode: 'per_ticket' | 'buyer_choice' | null;
    customQuestions: CustomQuestionPayload[] | null;
}

export interface PublicTicketRecord {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    currency: string;
    maxQuantity: number | null;
    maxPerOrder: number | null;
    type: 'free' | 'paid' | 'donation';
    salesStart: string | null;
    salesEnd: string | null;
}

export const fetchPublicEvents = async (options?: { limit?: number; offset?: number; organizerId?: string }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.organizerId) params.organizerId = options.organizerId;

    return api.get<{ events: PublicEventRecord[]; total: number; hasMore: boolean }>('/api/v1/public/events', {
        params: Object.keys(params).length > 0 ? params : undefined,
    });
};


export const fetchPublicEventBySlug = async (slug: string) => {
    return api.get<{ event: PublicEventRecord; tickets: PublicTicketRecord[] }>(
        `/api/v1/public/events/${slug}`,
    );
};
