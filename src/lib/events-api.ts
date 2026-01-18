import api from './api';

export type BackendLocationType = 'in_person' | 'online' | 'hybrid';
export type BackendFeeTier = 'payg' | 'token' | 'charity';
export type EventVisibility = 'public' | 'private';

// UUID validation regex - matches standard UUID v1-5 format
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

const assertValidEventId = (eventId: string): void => {
    if (!eventId || !isValidUuid(eventId)) {
        console.error('[events-api] Invalid eventId received:', eventId, new Error().stack);
        throw new Error(`Invalid event ID: "${eventId}". Expected a valid UUID.`);
    }
};

const assertValidOrganizerId = (organizerId: string): void => {
    if (!organizerId || !isValidUuid(organizerId)) {
        throw new Error(`Invalid organizer ID: "${organizerId}". Expected a valid UUID.`);
    }
};

export interface EventRecord {
    id: string;
    organizerId: string;
    title: string | null;
    description: string | null;
    bannerImageUrl: string | null;
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    cancelledAt: string | null;
    cancellationReason: string | null;
    cancellationNotes: string | null;
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
    latitude: number | null;
    longitude: number | null;
    currency: string;
    refundPolicy: string | null;
    isListedPublicly: boolean;
    isPubliclyAccessible: boolean;
    hasAccessPassword: boolean;
    slug: string | null;
    category: string | null;
    feeTier: BackendFeeTier;
    customBookingFee: number | null;
    absorbFee: boolean;
    attendeeInfoMode: 'per_ticket' | 'buyer_choice';
    customQuestions: CustomQuestionPayload[] | null;
    ticketsSold?: number; // Aggregate from ticket_types
    totalTickets?: number; // Aggregate from ticket_types (sum of maxQuantity)
    revenue?: number; // Net revenue from completed orders (organizer currency)
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
    minPerOrder: number | null;
    maxPerOrder: number | null;
    type: 'free' | 'paid' | 'donation';
    visibility: 'public' | 'hidden';
    salesStart: string | null;
    salesEnd: string | null;
    absorbFee: boolean | null;
    customFee?: number | null;
    earlyBirdPrice: string | null;
    earlyBirdEndDate: string | null;
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
    latitude?: number | null;
    longitude?: number | null;
    currency?: string;
    refundPolicy?: string | null;
    isListedPublicly?: boolean;
    isPubliclyAccessible?: boolean;
    accessPassword?: string;
    clearAccessPassword?: boolean;
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
    type?: 'free' | 'paid' | 'donation';
    currency?: string;
    maxQuantity?: number;
    minPerOrder?: number;
    maxPerOrder?: number;
    visibility?: 'public' | 'hidden';
    salesStart?: string | null;
    salesEnd?: string | null;
    absorbFee?: boolean | null;
    customFee?: number | null;
    earlyBirdPrice?: number | null;
    earlyBirdEndDate?: string | null;
}

export const createEventDraft = async (organizerId: string, payload: UpsertEventPayload) => {
    assertValidOrganizerId(organizerId);
    return api.post<{ event: EventRecord }>(`/api/v1/organizers/${organizerId}/events`, payload);
};

export const updateEventDraft = async (eventId: string, payload: UpsertEventPayload) => {
    assertValidEventId(eventId);
    return api.patch<{ event: EventRecord }>(`/api/v1/events/${eventId}`, payload);
};

export const saveEventTickets = async (eventId: string, tickets: TicketInputPayload[]) => {
    assertValidEventId(eventId);
    return api.put<{ tickets: TicketRecord[] }>(`/api/v1/events/${eventId}/tickets`, { tickets });
};

export const publishEvent = async (eventId: string, visibility: EventVisibility) => {
    assertValidEventId(eventId);
    return api.post<{ event: EventRecord }>(`/api/v1/events/${eventId}/publish`, {
        visibility,
    });
};

export const archiveEvent = async (eventId: string) => {
    assertValidEventId(eventId);
    return api.post<{ event: EventRecord }>(`/api/v1/events/${eventId}/archive`);
};

export const unarchiveEvent = async (eventId: string) => {
    assertValidEventId(eventId);
    return api.post<{ event: EventRecord }>(`/api/v1/events/${eventId}/unarchive`);
};

export const cancelEvent = async (
    eventId: string,
    data: { reason: string; notes?: string | null },
) => {
    assertValidEventId(eventId);
    return api.post<{ event: EventRecord; refunds?: unknown }>(`/api/v1/events/${eventId}/cancel`, data);
};

export const fetchEventDetails = async (eventId: string) => {
    assertValidEventId(eventId);
    return api.get<{ event: EventRecord; tickets: TicketRecord[] }>(`/api/v1/events/${eventId}`);
};

export const listOrganizerEvents = async (
    organizerId: string,
    options?: { status?: 'draft' | 'published' | 'cancelled' | 'archived' },
) => {
    assertValidOrganizerId(organizerId);
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
    revealsHiddenTickets: boolean;
    applicableTicketTypeIds: string[] | null;
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
    revealsHiddenTickets?: boolean;
    applicableTicketTypeIds?: string[] | null;
}

export const fetchEventPromoCodes = async (eventId: string) => {
    assertValidEventId(eventId);
    return api.get<{ promoCodes: PromoCodeRecord[] }>(`/api/v1/events/${eventId}/promo-codes`);
};

export const createPromoCode = async (eventId: string, data: PromoCodeInput) => {
    assertValidEventId(eventId);
    return api.post<{ promoCode: PromoCodeRecord }>(`/api/v1/events/${eventId}/promo-codes`, data);
};

export const updatePromoCode = async (
    eventId: string,
    promoId: string,
    data: Partial<PromoCodeInput>
) => {
    assertValidEventId(eventId);
    return api.patch<{ promoCode: PromoCodeRecord }>(
        `/api/v1/events/${eventId}/promo-codes/${promoId}`,
        data
    );
};

export const deletePromoCode = async (eventId: string, promoId: string) => {
    assertValidEventId(eventId);
    return api.delete(`/api/v1/events/${eventId}/promo-codes/${promoId}`);
};

// ============================================================================
// Public Event API (no authentication required)
// ============================================================================

export interface PublicEventRecord {
    id: string;
    organizerId: string;
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
    latitude: number | null;
    longitude: number | null;
    currency: string;
    refundPolicy?: string | null;
    organizerName: string | null;
    organizerAvatarUrl: string | null;
    category: string | null;
    absorbFee: boolean;
    feeTier: BackendFeeTier | null;
    customBookingFee: string | null;
    metaPixelId: string | null;
    status?: 'draft' | 'published' | 'cancelled' | 'archived';
    attendeeInfoMode: 'per_ticket' | 'buyer_choice' | null;
    customQuestions: CustomQuestionPayload[] | null;
    // Favorite status (only present when authenticated)
    isFavorited?: boolean | null;
}

export interface PublicTicketRecord {
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    currency: string;
    maxQuantity: number | null;
    minPerOrder: number | null;
    maxPerOrder: number | null;
    type: 'free' | 'paid' | 'donation';
    visibility?: 'public' | 'hidden';
    salesStart: string | null;
    salesEnd: string | null;
    customFee?: number | null;
    absorbFee?: boolean | null;
    earlyBirdPrice: string | null;
    earlyBirdEndDate: string | null;
}

export const fetchPublicEvents = async (options?: { limit?: number; offset?: number; organizerId?: string }) => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.organizerId) params.organizerId = options.organizerId;

    // Note: total is no longer returned (limit+1 pagination optimization)
    return api.get<{ events: PublicEventRecord[]; total?: number; hasMore: boolean }>('/api/v1/public/events', {
        params: Object.keys(params).length > 0 ? params : undefined,
    });
};


export const fetchPublicEventBySlug = async (
    slug: string,
    options?: { accessCode?: string; preview?: boolean },
) => {
    const headers: Record<string, string> = {};
    const params: Record<string, string> = {};
    if (options?.accessCode) {
        headers['x-event-access-code'] = options.accessCode;
    }
    if (options?.preview) {
        params.preview = '1';
    }
    return api.get<{ event: PublicEventRecord; tickets: PublicTicketRecord[] }>(
        `/api/v1/public/events/${slug}`,
        Object.keys(headers).length > 0 || Object.keys(params).length > 0
            ? { headers: Object.keys(headers).length > 0 ? headers : undefined, params: Object.keys(params).length > 0 ? params : undefined }
            : undefined,
    );
};
