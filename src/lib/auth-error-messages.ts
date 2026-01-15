import { ApiError } from '@/lib/api';
import { getBackendErrorMessage, parseBackendError } from '@/lib/api-errors';

export type AuthUiError = {
    message: string;
    showSupportLink?: boolean;
    field?: 'email' | 'organizerName';
};

export type AuthErrorOptions = {
    fallbackMessage: string;
    nameLabel?: string;
};

const isGenericErrorMessage = (value: string) => {
    const message = value.toLowerCase();
    return (
        message.includes('unexpected error occurred')
        || message.includes('internal server error')
        || message.includes('something went wrong')
        || message.includes('api error')
    );
};

const extractDetailsMessage = (details: unknown) => {
    if (!details) return null;
    if (typeof details === 'string') return details.trim();
    if (Array.isArray(details) && details.length > 0 && typeof details[0] === 'string') {
        return String(details[0]).trim();
    }
    if (typeof details === 'object') {
        const record = details as Record<string, unknown>;
        const candidateKeys = ['message', 'detail', 'error', 'reason', 'hint', 'constraint'];
        for (const key of candidateKeys) {
            const value = record[key];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
        const fieldErrors = record.fieldErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
            const entries = Object.entries(fieldErrors as Record<string, unknown>);
            if (entries.length > 0) {
                const [field, messages] = entries[0];
                if (Array.isArray(messages) && messages.length > 0 && typeof messages[0] === 'string') {
                    return `${field}: ${messages[0]}`;
                }
            }
        }
    }
    return null;
};

const stripFieldPrefix = (value: string) => value.replace(/^[a-zA-Z0-9_.]+:\s*/, '');

export const getAuthUiError = (err: unknown, options: AuthErrorOptions): AuthUiError => {
    if (err instanceof Error && !(err instanceof ApiError)) {
        const lower = err.message.toLowerCase();
        if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('load failed')) {
            return { message: 'Unable to reach the server. Check your connection and try again.' };
        }
        if (err.message && !isGenericErrorMessage(err.message)) {
            return { message: err.message };
        }
        return { message: options.fallbackMessage, showSupportLink: true };
    }

    if (err instanceof ApiError) {
        const parsed = parseBackendError(err.payload);
        const backendMessage = getBackendErrorMessage(err.payload, err.message);
        const message = backendMessage || err.message;
        const normalized = message.toLowerCase();
        const detailMessage = extractDetailsMessage(parsed?.details);
        const detailNormalized = detailMessage?.toLowerCase() ?? '';

        // Log error details for debugging (development only)
        if (process.env.NODE_ENV === 'development') {
            console.log('[getAuthUiError] API Error:', {
                status: err.status,
                code: parsed?.code,
                message,
                details: parsed?.details
            });
        }

        // Early check for CONFLICT (409) status - these have clear, specific messages
        if (err.status === 409 || parsed?.code === 'CONFLICT') {
            // Email conflict
            if (normalized.includes('email') || normalized.includes('account')) {
                return {
                    message: 'Email is already linked to an account. Sign in instead or use a different email.',
                    field: 'email'
                };
            }
            // Organization name conflict
            if (normalized.includes('organization') || normalized.includes('organizer') || normalized.includes('organiser')) {
                return {
                    message: 'Organization name already exists. Try a different name or ask the owner to invite you.',
                    field: 'organizerName'
                };
            }
            // Generic conflict - use the backend message if it's useful
            if (message && !isGenericErrorMessage(message)) {
                return { message };
            }
        }

        const isEmailConflict = (
            (normalized.includes('email') && /(already|exists|registered|in use|taken)/.test(normalized))
            || normalized.includes('user already registered')
            || (parsed?.code === 'REGISTRATION_FAILED' && normalized.includes('registered'))
            || detailNormalized.includes('users_email_unique')
            || detailNormalized.includes('user already registered')
            || detailNormalized.includes('already registered')
            || (detailNormalized.includes('email') && /(already|exists|registered|in use|taken)/.test(detailNormalized))
        );

        if (isEmailConflict) {
            return {
                message: 'Email is already linked to an account. Sign in instead or use a different email.',
                field: 'email'
            };
        }

        const isOrganizerNameConflict = (
            (normalized.includes('organization') || normalized.includes('organizer') || normalized.includes('organiser'))
            && (normalized.includes('already exists') || /already (exists|taken)/.test(normalized))
        ) || detailNormalized.includes('organizers_name_unique_lower')
            || (detailNormalized.includes('organization') && detailNormalized.includes('already'))
            || (parsed?.code === 'VALIDATION_ERROR' && normalized.includes('organization') && normalized.includes('already'));

        if (isOrganizerNameConflict) {
            return {
                message: 'Organization name already exists. Try a different name or ask the owner to invite you.',
                field: 'organizerName'
            };
        }

        if (normalized.includes('terms') && (normalized.includes('accept') || normalized.includes('accepted'))) {
            return { message: 'Please accept the Terms of Use to continue.' };
        }

        if (normalized.includes('password')) {
            const isPasswordDetail = (
                normalized.includes('uppercase')
                || normalized.includes('lowercase')
                || normalized.includes('symbol')
                || normalized.includes('number')
                || normalized.includes('weak')
                || normalized.includes('characters')
            );
            if (isPasswordDetail) {
                return {
                    message: 'Password must be at least 8 characters and include upper/lowercase, a number, and a symbol.'
                };
            }
        }

        if (normalized.includes('email') && (normalized.includes('invalid') || normalized.includes('valid email'))) {
            return { message: 'Enter a valid email address.' };
        }

        if (normalized.includes('charity number') && normalized.includes('required')) {
            return { message: 'Charity number is required for charity organizers.' };
        }

        if (options.nameLabel && normalized.includes('name')) {
            const nameLabel = options.nameLabel;
            if (normalized.includes('required')) {
                return { message: `${nameLabel} is required.` };
            }
            if (normalized.includes('at least') || normalized.includes('too short') || normalized.includes('minimum')) {
                return { message: `${nameLabel} must be at least 2 characters.` };
            }
        }

        const isRateLimited = err.status === 429 || parsed?.code === 'RATE_LIMIT_EXCEEDED';
        if (isRateLimited) {
            return { message: 'Too many attempts. Try again in a minute.' };
        }

        if (parsed?.code === 'UNAUTHORIZED' || err.status === 401) {
            return { message: 'Please sign in to continue.' };
        }

        if (parsed?.code === 'FORBIDDEN' || err.status === 403) {
            return { message: "You don't have permission to do this." };
        }

        if (parsed?.code === 'VALIDATION_ERROR' && message) {
            const cleaned = stripFieldPrefix(message);
            if (cleaned && !isGenericErrorMessage(cleaned)) {
                return { message: cleaned };
            }
        }

        if (err.status >= 500 || parsed?.code === 'INTERNAL_ERROR') {
            if (detailMessage && !isGenericErrorMessage(detailMessage)) {
                return { message: detailMessage, showSupportLink: true };
            }
            if (message && !isGenericErrorMessage(message)) {
                return { message, showSupportLink: true };
            }
            return { message: options.fallbackMessage, showSupportLink: true };
        }

        if (message && !isGenericErrorMessage(message)) {
            return { message };
        }
    }

    if (err instanceof Error && err.message && !isGenericErrorMessage(err.message)) {
        return { message: err.message };
    }

    return { message: options.fallbackMessage, showSupportLink: true };
};
