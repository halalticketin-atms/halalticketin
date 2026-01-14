export interface BackendErrorPayload {
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
    message?: string;
    [key: string]: unknown;
}

export interface ParsedBackendError {
    code?: string;
    message?: string;
    details?: unknown;
}

const ERROR_CODE_FALLBACKS: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input and try again.',
    NOT_FOUND: "We couldn't find what you're looking for.",
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: "You don't have permission to do this.",
    CONFLICT: 'This action conflicts with existing data.',
    INTERNAL_ERROR: 'Something went wrong. Please try again later.',
    REGISTRATION_FAILED: 'We could not complete registration. Please try again.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    EMAIL_NOT_CONFIRMED: 'Please verify your email first. Check your inbox/spam for the confirmation link.',
    ORGANIZER_ONBOARDING_REQUIRED: 'Organizer onboarding is required to continue.',
    STRIPE_CONNECT_REQUIRED: 'Payment setup is incomplete for this organizer.',
    EVENT_ACCESS_REQUIRED: 'This event requires an access code.',
    EVENT_ACCESS_DENIED: 'That access code is incorrect.',
};

export function parseBackendError(payload: unknown): ParsedBackendError | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const maybeError = (payload as BackendErrorPayload).error;
    if (typeof maybeError === 'string') {
        return { message: maybeError };
    }
    if (maybeError && typeof maybeError === 'object') {
        const errorObject = maybeError as Record<string, unknown>;
        return {
            code: typeof errorObject.code === 'string' ? errorObject.code : undefined,
            message: typeof errorObject.message === 'string' ? errorObject.message : undefined,
            details: errorObject.details,
        };
    }

    const message = (payload as BackendErrorPayload).message;
    if (typeof message === 'string') {
        return { message };
    }

    return null;
}

export function getBackendErrorMessage(payload: unknown, fallback: string): string {
    const parsed = parseBackendError(payload);

    if (parsed?.message && parsed.message.trim()) {
        return parsed.message.trim();
    }

    if (parsed?.code && ERROR_CODE_FALLBACKS[parsed.code]) {
        return ERROR_CODE_FALLBACKS[parsed.code];
    }

    if (typeof payload === 'string' && payload.trim()) {
        return payload.trim();
    }

    return fallback;
}

export function getBackendErrorDetails<T = Record<string, unknown>>(payload: unknown): T | undefined {
    const parsed = parseBackendError(payload);
    return parsed?.details as T | undefined;
}
