import api from './api';

export type WaitlistEntryStatus = 'active' | 'offered' | 'converted' | 'withdrawn';
export type WaitlistOfferStatus = 'offered' | 'claimed' | 'expired' | 'cancelled';
export type WaitlistHandoffMode = 'manual' | 'automatic';

export interface WaitlistEntryRecord {
    id: string;
    eventId: string;
    ticketTypeId: string;
    email: string;
    name: string | null;
    requestedQuantity: number;
    status: WaitlistEntryStatus;
    manualPriority: number;
    offerCount: number;
    lastOfferedAt: string | null;
    joinedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface WaitlistOfferRecord {
    id: string;
    waitlistEntryId: string;
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    tokenHash: string;
    status: WaitlistOfferStatus;
    offeredAt: string;
    expiresAt: string;
    claimedAt: string | null;
    claimedOrderId: string | null;
    roundId: string;
    createdAt: string;
    updatedAt: string;
}

export interface WaitlistQueueItem extends WaitlistEntryRecord {
    activeOffer: WaitlistOfferRecord | null;
}

export interface EventWaitlistSettings {
    waitlistEnabled: boolean;
    waitlistHandoffMode: WaitlistHandoffMode;
    waitlistClaimWindowMinutes: number;
}

export interface EventWaitlistResponse {
    settings: EventWaitlistSettings;
    sweep: {
        expiredCount: number;
        autoIssued: number;
    };
    summary: {
        total: number;
        activeCount: number;
        offeredCount: number;
        convertedCount: number;
        withdrawnCount: number;
    };
    entries: WaitlistQueueItem[];
}

export interface WaitlistAvailabilityResponse {
    ticket: {
        id: string;
        name: string;
        type: 'paid' | 'free' | 'donation';
        maxQuantity: number | null;
        ticketsSold: number;
        eventId: string;
    };
    available: number;
    lockedForTicket: number;
    soldOut: boolean;
    eventRemaining: number;
}

export interface WaitlistOfferRoundResponse {
    roundId: string;
    offersCreated: number;
    seatsLocked: number;
    remainingQueue: number;
    claimWindowMinutes: number;
}

export const fetchEventWaitlist = async (
    eventId: string,
    options?: {
        ticketTypeId?: string;
        status?: WaitlistEntryStatus;
        search?: string;
    }
) => {
    const params: Record<string, string> = {};
    if (options?.ticketTypeId) params.ticketTypeId = options.ticketTypeId;
    if (options?.status) params.status = options.status;
    if (options?.search) params.search = options.search;

    return api.get<EventWaitlistResponse>(
        `/api/v1/events/${eventId}/waitlist`,
        { params: Object.keys(params).length > 0 ? params : undefined }
    );
};

export const createWaitlistOfferRound = async (
    eventId: string,
    payload: {
        ticketTypeId: string;
        seatsToRelease: number;
        claimWindowMinutes?: number;
        prioritizeEntryIds?: string[];
    }
) => {
    return api.post<WaitlistOfferRoundResponse>(`/api/v1/events/${eventId}/waitlist/offers`, payload);
};

export const updateEventWaitlistSettings = async (eventId: string, payload: EventWaitlistSettings) => {
    return api.patch<{ settings: EventWaitlistSettings }>(`/api/v1/events/${eventId}/waitlist/settings`, payload);
};

export const fetchWaitlistAvailability = async (eventId: string, ticketTypeId: string) => {
    return api.get<WaitlistAvailabilityResponse>(`/api/v1/events/${eventId}/waitlist/${ticketTypeId}/availability`);
};
