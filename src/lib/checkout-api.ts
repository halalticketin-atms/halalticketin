import { getBackendErrorDetails, getBackendErrorMessage, parseBackendError } from './api-errors';

/**
 * Checkout API client for frontend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface CartItem {
    ticketTypeId: string;
    quantity: number;
    unitPrice?: number;
}

export interface TicketAttendeePayload {
    name: string;
    email?: string;
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
    waitlistOfferToken?: string;
    tracking?: {
        marketingConsent: boolean;
        fbp?: string;
        fbc?: string;
        fbclid?: string;
        eventSourceUrl?: string;
    };
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
    adjustedItems?: Array<{ ticketTypeId: string; quantity: number }>;
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

export type CheckoutQuoteResult = {
    quote: CheckoutQuoteResponse | null;
    error?: {
        code?: string;
        message?: string;
        retryAfter?: number;
    };
};

export async function getCheckoutQuote(
    eventId: string,
    request: { items: CartItem[]; promoCode?: string },
    options?: { accessCode?: string; accessToken?: string }
): Promise<CheckoutQuoteResult> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (options?.accessToken) {
            headers['Authorization'] = `Bearer ${options.accessToken}`;
        }
        if (options?.accessCode) {
            headers['x-event-access-code'] = options.accessCode;
        }
        const response = await fetch(`${API_URL}/api/v1/events/${eventId}/checkout/quote`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request)
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const parsed = parseBackendError(data);
            const retryAfterHeader = response.headers.get('retry-after');
            const retryAfterFromHeader = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : NaN;
            const retryAfterFromBody =
                typeof (data as { retryAfter?: unknown } | null)?.retryAfter === 'number'
                    ? (data as { retryAfter: number }).retryAfter
                    : typeof (data as { error?: { retryAfter?: unknown } } | null)?.error?.retryAfter === 'number'
                        ? (data as { error: { retryAfter: number } }).error.retryAfter
                        : undefined;
            const retryAfter = retryAfterFromBody ?? (Number.isFinite(retryAfterFromHeader) ? retryAfterFromHeader : undefined);
            const fallbackCode = typeof (data as { code?: unknown } | null)?.code === 'string'
                ? (data as { code: string }).code
                : undefined;
            const fallbackMessage = typeof (data as { message?: unknown } | null)?.message === 'string'
                ? (data as { message: string }).message
                : undefined;
            return {
                quote: null,
                error: {
                    code: parsed?.code ?? fallbackCode,
                    message: parsed?.message ?? fallbackMessage,
                    retryAfter
                }
            };
        }
        return { quote: data as CheckoutQuoteResponse };
    } catch {
        return {
            quote: null,
            error: {
                message: 'Failed to load quote'
            }
        };
    }
}

/**
 * Create a checkout session for an event
 */
export async function createCheckoutSession(
    eventId: string,
    request: CheckoutRequest,
    accessToken?: string,
    accessCode?: string
): Promise<CheckoutResponse> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (accessCode) {
            headers['x-event-access-code'] = accessCode;
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
            const adjustedItems = Array.isArray(details.adjustedItems)
                ? details.adjustedItems.filter((item): item is { ticketTypeId: string; quantity: number } =>
                    Boolean(item)
                    && typeof (item as { ticketTypeId?: unknown }).ticketTypeId === 'string'
                    && typeof (item as { quantity?: unknown }).quantity === 'number'
                )
                : undefined;
            return {
                success: false,
                message: getBackendErrorMessage(data, 'Checkout failed'),
                error: data,
                unavailableTypes: Array.isArray(details.unavailableTypes) ? details.unavailableTypes : undefined,
                issues: Array.isArray(details.issues) ? details.issues : undefined,
                adjustedItems: adjustedItems && adjustedItems.length > 0 ? adjustedItems : undefined,
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
    isPending?: boolean;
    totalAmount: number;
    currency: string;
    organizerId: string;
    eventId: string;
    metaPixelId: string | null;
    metaEventId?: string | null;
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
    request: CheckoutRequest,
    options?: {
        redirectTarget?: 'self' | 'top';
        accessCode?: string;
    },
): Promise<{
    success: boolean;
    isFreeOrder?: boolean;
    orderId?: string;
    tickets?: CheckoutSuccessResponse['tickets'];
    error?: string;
    adjustedItems?: Array<{ ticketTypeId: string; quantity: number }>;
}> {
    const result = await createCheckoutSession(eventId, request, undefined, options?.accessCode);

    if (!result.success) {
        const issuesSuffix = result.issues && result.issues.length > 0
            ? ` ${result.issues.join(' ')}`
            : '';
        return {
            success: false,
            error: `${result.message}${issuesSuffix}`.trim(),
            adjustedItems: result.adjustedItems
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
        if (options?.redirectTarget === 'top' && window.top) {
            window.top.location.href = result.checkoutUrl;
        } else {
            window.location.href = result.checkoutUrl;
        }
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
    items: CartItem[],
    subtotal?: number,
    accessCode?: string,
    accessToken?: string
): Promise<ValidatePromoResult> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        if (accessCode) {
            headers['x-event-access-code'] = accessCode;
        }
        const payload: { promoCode: string; items: CartItem[]; subtotal?: number } = { promoCode, items };
        if (typeof subtotal === 'number') {
            payload.subtotal = subtotal;
        }
        const response = await fetch(
            `${API_URL}/api/v1/events/${eventId}/checkout/validate-promo`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
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
    promoCode: string,
    accessCode?: string
): Promise<{ id: string; name: string; description: string | null; price: string; currency: string; type: string; customFee?: number | null; earlyBirdPrice?: string | null; earlyBirdEndDate?: string | null }[]> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessCode) {
            headers['x-event-access-code'] = accessCode;
        }
        const response = await fetch(
            `${API_URL}/api/v1/public/events/${eventSlug}/unlocked-tickets`,
            {
                method: 'POST',
                headers,
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

export interface JoinWaitlistRequest {
    ticketTypeId: string;
    quantity: number;
    email: string;
    name?: string;
}

export interface JoinWaitlistResponse {
    entryId: string;
    status: 'joined' | 'updated';
    position: number;
    ticketTypeId: string;
    quantity: number;
}

export async function joinWaitlist(
    eventSlug: string,
    payload: JoinWaitlistRequest,
    accessCode?: string
): Promise<JoinWaitlistResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessCode) {
        headers['x-event-access-code'] = accessCode;
    }

    const response = await fetch(`${API_URL}/api/v1/public/events/${eventSlug}/waitlist`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(getBackendErrorMessage(data, 'Failed to join waitlist'));
    }

    return data as JoinWaitlistResponse;
}

export async function claimWaitlistOffer(
    token: string,
    request: Omit<CheckoutRequest, 'items' | 'waitlistOfferToken'>,
    accessCode?: string
): Promise<CheckoutResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessCode) {
        headers['x-event-access-code'] = accessCode;
    }

    const response = await fetch(`${API_URL}/api/v1/public/waitlist-offers/${token}/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        return {
            success: false,
            message: getBackendErrorMessage(data, 'Failed to claim waitlist offer'),
            error: data
        };
    }

    return data as CheckoutSuccessResponse;
}
