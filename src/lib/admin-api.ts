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
    country: string | null;
    city: string | null;
    createdAt: string;
    eventsCount: number;
    ordersCount: number;
    ticketsSold: number;
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

export interface AdminEvent {
    id: string;
    title: string;
    status: 'draft' | 'published' | 'cancelled' | 'archived';
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
    type?: 'individual' | 'organization' | 'charity' | 'all';
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
