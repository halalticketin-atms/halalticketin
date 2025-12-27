/**
 * User-friendly error messages and utilities.
 *
 * Translates backend error codes into actionable messages for users.
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should use @/lib/notifications instead.
 */

import { toast } from '@/lib/notifications';
import { ApiError } from './api';
import { getBackendErrorMessage } from './api-errors';

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

/**
 * Get a user-friendly message from an error
 * 
 * @deprecated Use the toast.error() function from @/lib/notifications instead.
 * It handles error transformation automatically.
 */
export function getUserFriendlyMessage(error: unknown): string {
    // Handle ApiError from api.ts
    if (error instanceof ApiError) {
        const backendMessage = getBackendErrorMessage(error.payload, '');
        if (backendMessage) {
            return backendMessage;
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
 * 
 * @deprecated Use toast.error() from @/lib/notifications instead.
 * Example: toast.error(error, 'Custom message')
 */
export function showError(error: unknown, customMessage?: string) {
    toast.error(error, customMessage);
}

/**
 * Show a success toast
 * 
 * @deprecated Use toast.success() from @/lib/notifications instead.
 */
export function showSuccess(message: string) {
    toast.success(message);
}

/**
 * Show an info toast
 * 
 * @deprecated Use toast.info() from @/lib/notifications instead.
 */
export function showInfo(message: string) {
    toast.info(message);
}

/**
 * Show a warning toast
 * 
 * @deprecated Use toast.warning() from @/lib/notifications instead.
 */
export function showWarning(message: string) {
    toast.warning(message);
}

/**
 * Wrap an async function with automatic error toast handling
 * 
 * @deprecated Use toast.promise() from @/lib/notifications instead for better UX.
 * It provides loading states and automatic success/error handling.
 */
export function withErrorHandling<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    errorMessage?: string
): (...args: T) => Promise<R | undefined> {
    return async (...args: T) => {
        try {
            return await fn(...args);
        } catch (error) {
            toast.error(error, errorMessage);
            return undefined;
        }
    };
}
