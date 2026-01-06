import api from './api';

// =============================================================================
// Check-In API Types
// =============================================================================

export interface CheckInTicketRecord {
    id: string;
    ticketCode: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
    ticketType: string;
    orderNumber: string;
    status: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
    checkedInAt: string | null;
    checkedInBy: string | null;
    checkedInByName: string | null;
    createdAt: string;
}

export interface CheckInStatsRecord {
    totalTickets: number;
    checkedIn: number;
    notCheckedIn: number;
    percentage: number;
}

export interface ScanResult {
    valid: boolean;
    alreadyCheckedIn?: boolean;
    message: string;
    ticket?: CheckInTicketRecord;
}

export interface ScanAndCheckInResponse {
    status: 'success' | 'already_checked_in';
    message: string;
    ticket: CheckInTicketRecord;
    checkedInAt?: string | null;
}

export interface CheckInResponse {
    success: boolean;
    ticket: CheckInTicketRecord;
}

export interface TempAccessAcceptResponse {
    event: {
        id: string;
        organizerId: string;
        title: string;
    };
    access: {
        id: string;
        expiresAt: string;
    };
}

// =============================================================================
// Check-In API Functions
// =============================================================================

export const listCheckInTickets = async (
    eventId: string,
    options?: {
        status?: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
        search?: string;
        limit?: number;
        offset?: number;
    }
) => {
    const params: Record<string, string> = {};
    if (options?.status) params.status = options.status;
    if (options?.search) params.search = options.search;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);

    return api.get<{ tickets: CheckInTicketRecord[] }>(
        `/api/v1/events/${eventId}/check-in/tickets`,
        { params: Object.keys(params).length > 0 ? params : undefined }
    );
};

export const getCheckInStats = async (eventId: string) => {
    return api.get<CheckInStatsRecord>(`/api/v1/events/${eventId}/check-in/stats`);
};

export const scanTicketCode = async (eventId: string, ticketCode: string) => {
    return api.post<ScanResult>(`/api/v1/events/${eventId}/check-in/scan`, {
        ticketCode,
    });
};

export const scanAndCheckInTicket = async (eventId: string, ticketCode: string) => {
    return api.post<ScanAndCheckInResponse>(`/api/v1/events/${eventId}/check-in/scan-and-check-in`, {
        ticketCode,
    });
};

export const checkInTicket = async (eventId: string, ticketId: string) => {
    return api.post<CheckInResponse>(`/api/v1/events/${eventId}/check-in/${ticketId}`);
};

export const undoCheckIn = async (eventId: string, ticketId: string) => {
    return api.post<CheckInResponse>(`/api/v1/events/${eventId}/check-in/${ticketId}/undo`);
};

export const acceptTempAccessToken = async (token: string) => {
    return api.post<TempAccessAcceptResponse>(
        `/api/v1/events/temporary-access/${token}/accept`
    );
};
