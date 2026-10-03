import type { OrderResponse } from '@/components/orders/OrderCard';
import type { EventRecord } from '@/lib/events-api';
import { buildOrdersPageSearchParams, getOrdersPageUrlState } from '@/lib/orders-attendees-ui';

export interface OrdersResponse {
    orders: OrderResponse[];
}

export interface TicketBreakdownItem {
    ticketTypeId: string;
    name: string;
    quantity: number;
    revenue: number;
    isArchived?: boolean;
}

export interface EventBreakdown {
    eventId: string;
    eventName: string;
    bannerImageUrl?: string;
    isActive: boolean;
    giftedTickets: number;
    promoCodes: Array<{
        id: string;
        code: string;
        usageCount: number;
        usageLimit: number | null;
        isActive: boolean;
    }>;
    tickets: TicketBreakdownItem[];
    total: { quantity: number; revenue: number };
}

export interface TicketBreakdownResponse {
    events: EventBreakdown[];
    currency: string;
}

export interface OrdersPageSeed {
    nonce: string;
    userId: string;
    organizerId: string;
    queryKey: string;
    orders: OrderResponse[] | null;
    ticketBreakdown: TicketBreakdownResponse | null;
    organizerEvents: EventRecord[] | null;
}

export const getOrdersPageQueryKey = (params: URLSearchParams): string =>
    buildOrdersPageSearchParams(getOrdersPageUrlState(params)).toString();

export const getOrdersResourcePaths = (organizerId: string) => {
    const query = new URLSearchParams({ organizerId }).toString();
    return {
        orders: `/api/v1/orders?${query}`,
        ticketBreakdown: `/api/v1/orders/ticket-breakdown?${query}`,
        organizerEvents: `/api/v1/organizers/${encodeURIComponent(organizerId)}/events`,
    };
};
