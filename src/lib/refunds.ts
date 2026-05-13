import { ApiError } from './api';

export type RefundIdempotencyParams = {
    amount?: number;
    ticketIds?: string[];
};

const createRefundIdempotencyKey = () => {
    if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
        return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const buildRefundRequestFingerprint = (params: RefundIdempotencyParams) =>
    JSON.stringify({
        amount: params.amount ?? null,
        ticketIds: [...(params.ticketIds ?? [])].sort(),
    });

const encodeFingerprint = (fingerprint: string) => {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window
            .btoa(fingerprint)
            .replaceAll('+', '-')
            .replaceAll('/', '_')
            .replaceAll('=', '');
    }

    return encodeURIComponent(fingerprint);
};

const getRefundStorageKey = (orderId: string, params: RefundIdempotencyParams) =>
    `refund-idempotency:${orderId}:${encodeFingerprint(buildRefundRequestFingerprint(params))}`;

export const getStoredRefundIdempotencyKey = (orderId: string, params: RefundIdempotencyParams = {}) => {
    if (typeof window === 'undefined') {
        return createRefundIdempotencyKey();
    }

    const storageKey = getRefundStorageKey(orderId, params);
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;

    const next = createRefundIdempotencyKey();
    window.localStorage.setItem(storageKey, next);
    return next;
};

export const clearStoredRefundIdempotencyKey = (
    orderId: string,
    params: RefundIdempotencyParams = {},
) => {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem(getRefundStorageKey(orderId, params));
        window.localStorage.removeItem(`refund-idempotency:${orderId}`);
    }
};

export const isStripeBalanceTopUpRequiredError = (error: unknown) => {
    if (!(error instanceof ApiError) || typeof error.payload !== 'object' || error.payload === null) {
        return false;
    }

    const payload = error.payload as {
        code?: string;
        error?: {
            code?: string;
            details?: {
                code?: string;
            };
        };
    };
    const codes = [payload.code, payload.error?.code, payload.error?.details?.code];
    return codes.some((code) =>
        code === 'STRIPE_BALANCE_TOP_UP_REQUIRED' || code === 'REFUND_TOP_UP_REQUIRED'
    );
};
