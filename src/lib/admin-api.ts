'use client';

import api from '@/lib/api';

// =====================
// Types
// =====================

export type TimeSeriesPeriod = '7d' | '30d' | '90d' | '1y';

export interface TimeSeriesBucket {
    date: string;
    users: number;
    events: number;
    tickets: number;
    orders: number;
}

export interface TimeSeriesResponse {
    period: TimeSeriesPeriod;
    granularity: 'daily' | 'weekly' | 'monthly';
    data: TimeSeriesBucket[];
}

export interface AdminUser {
    id: string;
    name: string | null;
    email: string;
    isOrganizer: boolean;
    createdAt: string;
    organizer: {
        id: string;
        name: string;
        type: string;
    } | null;
}

export interface UsersListResponse {
    data: AdminUser[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

export interface AdminOrganizer {
    id: string;
    name: string;
    organizerType: 'individual' | 'organization' | 'charity';
    isCharityVerified: boolean;
    charityNumber: string | null;
    heightsprReferredAt: string | null;
    referralTag: 'heightsPR' | null;
    country: string | null;
    city: string | null;
    createdAt: string;
    eventsCount: number;
    ordersCount: number;
    ticketsSold: number;
    creditBalance: number;
}

export interface OrganizersListResponse {
    data: AdminOrganizer[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

export interface AdminEventTicketType {
    id: string;
    name: string;
    price: number;
    currency: string;
    available: number;
    sold: number;
    total: number;
}

export type AdminEventVisibility = 'public' | 'private' | 'draft' | 'cancelled' | 'archived';

export type AdminEventSalesState =
    | 'live'
    | 'previous'
    | 'private'
    | 'not_on_sale'
    | 'sold_out'
    | 'draft'
    | 'cancelled'
    | 'archived';

export interface AdminEvent {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'cancelled' | 'archived';
    visibility: AdminEventVisibility;
    salesState: AdminEventSalesState;
    isListedPublicly: boolean;
    isPubliclyAccessible: boolean;
    publishedAt: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    venue: string | null;
    city: string | null;
    currency: string;
    createdAt: string;
    organizer: {
        id: string;
        name: string;
        type: string;
    };
    ticketTypes: AdminEventTicketType[];
    totalCapacity: number;
    totalSold: number;
    donationCount: number;
    ticketsAvailable: number;
    priceRange: { min: number; max: number };
    ordersCount: number;
}

export interface EventsListResponse {
    data: AdminEvent[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
}

export interface GrantOrganizerCreditsResponse {
    success: true;
    organizerId: string;
    grantedCredits: number;
    reason: string;
    balance: {
        creditBalance: number;
        totalCreditsPurchased: number;
        lastPurchaseAt: string | null;
        updatedAt: string;
    };
    adjustment: {
        id: string;
        type: 'manual_grant';
        createdAt: string;
        createdByUserId: string;
    };
}

export interface CheckoutSweeperAuditRun {
    id: string;
    source: string;
    scanned: number;
    expired: number;
    finalized: number;
    skipped: number;
    failed: number;
    runStartedAt: string;
    runFinishedAt: string;
    createdAt: string;
}

export interface CheckoutSweeperAuditFailure {
    runId: string;
    runFinishedAt: string;
    orderId: string;
    sessionId: string | null;
    error: string;
}

export interface CheckoutSweeperAuditChange {
    runId: string;
    runFinishedAt: string;
    orderId: string;
    sessionId: string | null;
    action: 'expired' | 'finalized';
}

export interface CheckoutSweeperAuditResponse {
    windowHours: number;
    lastRun: CheckoutSweeperAuditRun | null;
    totals: {
        scanned: number;
        expired: number;
        finalized: number;
        skipped: number;
        failed: number;
    };
    recentFailures: CheckoutSweeperAuditFailure[];
    recentChanges: CheckoutSweeperAuditChange[];
}

// =====================
// API Functions
// =====================

export async function getTimeSeries(period: TimeSeriesPeriod = '30d'): Promise<TimeSeriesResponse> {
    return api.get<TimeSeriesResponse>('/api/v1/admin/stats/time-series', {
        params: { period },
    });
}

export async function getUsersList(params: {
    limit?: number;
    offset?: number;
    search?: string;
    isOrganizer?: 'true' | 'false' | 'all';
} = {}): Promise<UsersListResponse> {
    return api.get<UsersListResponse>('/api/v1/admin/users/list', {
        params: {
            limit: String(params.limit ?? 25),
            offset: String(params.offset ?? 0),
            ...(params.search && { search: params.search }),
            ...(params.isOrganizer && { isOrganizer: params.isOrganizer }),
        },
    });
}

export async function getOrganizersList(params: {
    limit?: number;
    offset?: number;
    search?: string;
    type?: 'individual' | 'organization' | 'charity' | 'heightspr' | 'all';
} = {}): Promise<OrganizersListResponse> {
    return api.get<OrganizersListResponse>('/api/v1/admin/organizers/list', {
        params: {
            limit: String(params.limit ?? 25),
            offset: String(params.offset ?? 0),
            ...(params.search && { search: params.search }),
            ...(params.type && { type: params.type }),
        },
    });
}

export async function getEventsList(params: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: 'draft' | 'published' | 'cancelled' | 'archived' | 'all';
} = {}): Promise<EventsListResponse> {
    return api.get<EventsListResponse>('/api/v1/admin/events/list', {
        params: {
            limit: String(params.limit ?? 25),
            offset: String(params.offset ?? 0),
            ...(params.search && { search: params.search }),
            ...(params.status && { status: params.status }),
        },
    });
}

export async function grantOrganizerCredits(
    organizerId: string,
    payload: { credits: number; reason: string }
): Promise<GrantOrganizerCreditsResponse> {
    return api.post<GrantOrganizerCreditsResponse>(
        `/api/v1/admin/organizers/${organizerId}/credits/grant`,
        payload
    );
}

export async function getCheckoutSweeperAudit(params: {
    hours?: number;
    limit?: number;
} = {}): Promise<CheckoutSweeperAuditResponse> {
    return api.get<CheckoutSweeperAuditResponse>('/api/v1/admin/checkout-sweeper/audit', {
        params: {
            hours: String(params.hours ?? 24),
            limit: String(params.limit ?? 10),
        },
    });
}
