import api from './api';

export interface CreditPurchaseSessionResponse {
    success: boolean;
    checkoutUrl?: string;
    sessionId?: string;
    message?: string;
}

export interface CreditHistoryItem {
    id: string;
    amount: number;
    pricePerCredit: string;
    totalPaid: string;
    currency: string;
    createdAt: string;
}

export interface CreditBalanceResponse {
    balance: number;
    availableBalance?: number;
    usedCredits?: number;
    totalPurchased: number;
    lastPurchaseAt: string | null;
    history: CreditHistoryItem[];
}

/**
 * Create a Stripe checkout session for purchasing credits
 */
export async function createCreditPurchaseSession(
    organizerId: string,
    credits: number
): Promise<CreditPurchaseSessionResponse> {
    try {
        const result = await api.post<CreditPurchaseSessionResponse>(
            `/api/v1/organizers/${organizerId}/credits/purchase-session`,
            { credits }
        );
        return result;
    } catch (error) {
        console.error('Credit purchase request failed:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to create purchase session'
        };
    }
}

/**
 * Get organizer credit balance and history.
 *
 * Throws on failure so callers can distinguish a genuine zero balance from a
 * failed request. Returning zeros here previously made an outage look identical
 * to "out of credits", which misled organisers — callers must handle the error.
 */
export async function getCreditBalance(
    organizerId: string
): Promise<CreditBalanceResponse> {
    return api.get<CreditBalanceResponse>(
        `/api/v1/organizers/${organizerId}/credits`
    );
}
