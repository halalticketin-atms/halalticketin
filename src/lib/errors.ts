/**
 * User-friendly error messages and utilities.
 *
 * Translates backend error codes into actionable messages for users.
 */

import { toast } from 'sonner';
import { ApiError } from './api';

// Backend error codes map to user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your input and try again',
    NOT_FOUND: "We couldn't find what you're looking for",
    UNAUTHORIZED: 'Please sign in to continue',
    FORBIDDEN: "You don't have permission to do this",
    CONFLICT: 'This action conflicts with existing data',
    INTERNAL_ERROR: 'Something went wrong. Please try again later',
};

// Status code fallbacks when no error code is provided
const STATUS_MESSAGES: Record<number, string> = {
    400: 'Invalid request. Please check your input',
    401: 'Please sign in to continue',
    403: "You don't have permission to do this",
    404: "We couldn't find what you're looking for",
    409: 'This action conflicts with existing data',
    429: 'Too many requests. Please wait a moment',
    500: 'Something went wrong. Please try again later',
    502: 'Server is temporarily unavailable',
    503: 'Service is temporarily unavailable',
};

interface BackendError {
    error?: {
        code?: string;
        message?: string;
        details?: unknown;
    };
    message?: string;
}

/**
 * Get a user-friendly message from an error
 */
export function getUserFriendlyMessage(error: unknown): string {
    // Handle ApiError from api.ts
    if (error instanceof ApiError) {
        const payload = error.payload as BackendError;

        // Try to get message from backend error structure
        if (payload?.error?.code) {
            // Use our friendly message for known codes
            const friendlyMessage = ERROR_MESSAGES[payload.error.code];
            if (friendlyMessage) {
                return friendlyMessage;
            }
            // Fall back to backend message
            return payload.error.message || error.message;
        }

        // Fall back to status code message
        const statusMessage = STATUS_MESSAGES[error.status];
        if (statusMessage) {
            return statusMessage;
        }

        return error.message;
    }

    // Handle standard Error
    if (error instanceof Error) {
        return error.message;
    }

    // Handle string errors
    if (typeof error === 'string') {
        return error;
    }

    return 'An unexpected error occurred';
}

/**
 * Show an error toast with user-friendly message
 */
export function showError(error: unknown, customMessage?: string) {
    const message = customMessage || getUserFriendlyMessage(error);
    toast.error(message);

    // Log original error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', error);
    }
}

/**
 * Show a success toast
 */
export function showSuccess(message: string) {
    toast.success(message);
}

/**
 * Show an info toast
 */
export function showInfo(message: string) {
    toast.info(message);
}

/**
 * Show a warning toast
 */
export function showWarning(message: string) {
    toast.warning(message);
}

/**
 * Wrap an async function with automatic error toast handling
 */
export function withErrorHandling<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    errorMessage?: string
): (...args: T) => Promise<R | undefined> {
    return async (...args: T) => {
        try {
            return await fn(...args);
        } catch (error) {
            showError(error, errorMessage);
            return undefined;
        }
    };
}
