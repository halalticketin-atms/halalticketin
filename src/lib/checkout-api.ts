/**
 * Checkout API client for frontend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CartItem {
    ticketTypeId: string;
    quantity: number;
}

export interface CheckoutRequest {
    items: CartItem[];
    attendeeEmail: string;
    attendeeName?: string;
    promoCode?: string;
}

export interface CheckoutSuccessResponse {
    success: true;
    orderId: string;
    totalAmount: number;
    currency: string;
    // For free orders - tickets are returned immediately
    tickets?: Array<{
        id: string;
        ticketCode: string;
        ticketType: string;
        attendeeName: string | null;
        attendeeEmail: string | null;
    }>;
    // For paid orders - redirect URL to Stripe
    checkoutUrl?: string;
}

export interface CheckoutErrorResponse {
    success: false;
    message: string;
    error?: unknown;
    unavailableTypes?: string[];
    issues?: string[];
}

export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;

/**
 * Create a checkout session for an event
 */
export async function createCheckoutSession(
    eventId: string,
    request: CheckoutRequest,
    accessToken?: string
): Promise<CheckoutResponse> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(
            `${API_URL}/api/v1/events/${eventId}/checkout/session`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(request)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                message: data.message || 'Checkout failed',
                error: data.error,
                unavailableTypes: data.unavailableTypes,
                issues: data.issues
            };
        }

        return data as CheckoutSuccessResponse;
    } catch (error) {
        console.error('Checkout request failed:', error);
        return {
            success: false,
            message: 'Failed to connect to server',
            error
        };
    }
}

/**
 * Get order status (for polling after checkout)
 */
export async function getOrderStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    totalAmount: number;
    currency: string;
    tickets?: Array<{
        id: string;
        ticketCode: string;
        ticketType: string;
        attendeeName: string | null;
        attendeeEmail: string | null;
    }>;
} | null> {
    try {
        const response = await fetch(`${API_URL}/api/v1/orders/${orderId}/status`);

        if (!response.ok) {
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('Failed to get order status:', error);
        return null;
    }
}

/**
 * Handle checkout flow - returns true if redirecting to Stripe
 */
export async function handleCheckout(
    eventId: string,
    request: CheckoutRequest
): Promise<{
    success: boolean;
    isFreeOrder?: boolean;
    orderId?: string;
    tickets?: CheckoutSuccessResponse['tickets'];
    error?: string;
}> {
    const result = await createCheckoutSession(eventId, request);

    if (!result.success) {
        return {
            success: false,
            error: result.message
        };
    }

    // Free order - tickets returned immediately
    if (result.tickets && result.tickets.length > 0) {
        return {
            success: true,
            isFreeOrder: true,
            orderId: result.orderId,
            tickets: result.tickets
        };
    }

    // Paid order - redirect to Stripe
    if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return {
            success: true,
            isFreeOrder: false,
            orderId: result.orderId
        };
    }

    return {
        success: false,
        error: 'Unexpected response from server'
    };
}
