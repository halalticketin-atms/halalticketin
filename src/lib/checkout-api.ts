import { getBackendErrorDetails, getBackendErrorMessage, parseBackendError } from './api-errors';

/**
 * Checkout API client for frontend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CartItem {
    ticketTypeId: string;
    quantity: number;
}

export interface TicketAttendeePayload {
    name: string;
    email: string;
    gender: 'male' | 'female';
    age?: number;
    customAnswers?: Record<string, unknown>;
}

export interface CheckoutRequest {
    items: CartItem[];
    attendeeEmail: string;
    attendeeName: string;
    attendeeAge?: number;
    attendeeGender: 'male' | 'female';
    useSharedInfo?: boolean;
    ticketAttendees?: TicketAttendeePayload[];
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
    code?: string;
}

export type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;

export interface CheckoutQuoteResponse {
    success: true;
    currency: string;
    subtotal: number;
    discount: number;
    organizerFee: number;
    platformFee: number;
    processingFee: number;
    total: number;
    useCreditsApplied: boolean;
    creditsApplied: number;
    paidTicketCount: number;
    promoCodeApplied: boolean;
}

export async function getCheckoutQuote(
    eventId: string,
    request: { items: CartItem[]; promoCode?: string }
): Promise<CheckoutQuoteResponse | null> {
    try {
        const response = await fetch(`${API_URL}/api/v1/events/${eventId}/checkout/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return null;
        }
        return data as CheckoutQuoteResponse;
    } catch {
        return null;
    }
}

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

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const parsed = parseBackendError(data);
            const details = getBackendErrorDetails<Record<string, unknown>>(data) ?? {};
            return {
                success: false,
                message: getBackendErrorMessage(data, 'Checkout failed'),
                error: data,
                unavailableTypes: Array.isArray(details.unavailableTypes) ? details.unavailableTypes : undefined,
                issues: Array.isArray(details.issues) ? details.issues : undefined,
                code: parsed?.code
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
    organizerId: string;
    eventId: string;
    metaPixelId: string | null;
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
        const issuesSuffix = result.issues && result.issues.length > 0
            ? ` ${result.issues.join(' ')}`
            : '';
        return {
            success: false,
            error: `${result.message}${issuesSuffix}`.trim()
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

/**
 * Validate a promo code and get discount info
 */
export interface ValidatePromoResult {
    valid: boolean;
    message?: string;
    discountType?: 'percentage' | 'amount';
    discountValue?: string;
    discountAmount?: string;
    code?: string;
    revealsHiddenTickets?: boolean;
    applicableTicketTypeIds?: string[] | null;
}

export async function validatePromoCode(
    eventId: string,
    promoCode: string,
    subtotal: number
): Promise<ValidatePromoResult> {
    try {
        const response = await fetch(
            `${API_URL}/api/v1/events/${eventId}/checkout/validate-promo`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promoCode, subtotal })
            }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return {
                valid: false,
                message: getBackendErrorMessage(data, 'Failed to validate promo code')
            };
        }
        return data as ValidatePromoResult;
    } catch {
        return { valid: false, message: 'Failed to validate promo code' };
    }
}

/**
 * Fetch hidden tickets that are unlocked by a promo code
 */
export async function fetchUnlockedTickets(
    eventSlug: string,
    promoCode: string
): Promise<{ id: string; name: string; description: string | null; price: string; currency: string; type: string; customFee?: number | null; earlyBirdPrice?: string | null; earlyBirdEndDate?: string | null }[]> {
    try {
        const response = await fetch(
            `${API_URL}/api/v1/public/events/${eventSlug}/unlocked-tickets`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promoCode })
            }
        );
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.tickets || [];
    } catch {
        return [];
    }
}
