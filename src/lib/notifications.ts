/**
 * Global toast notification utilities.
 * 
 * Provides consistent, user-friendly feedback across the application.
 * Handles error transformation, loading states, and action-based toasts.
 * 
 * @example
 * ```tsx
 * import { toast } from '@/lib/notifications';
 * 
 * // Simple success
 * toast.success('Profile updated!');
 * 
 * // Error with automatic transformation
 * try {
 *   await api.post('/endpoint', data);
 * } catch (error) {
 *   toast.error(error); // Automatically shows user-friendly message
 * }
 * 
 * // Promise-based toast
 * toast.promise(
 *   api.post('/endpoint', data),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved!',
 *     error: 'Failed to save',
 *   }
 * );
 * 
 * // With action button
 * toast.error('Payment failed', {
 *   action: {
 *     label: 'Try Again',
 *     onClick: () => retryPayment(),
 *   },
 * });
 * ```
 */

import { toast as sonnerToast } from 'sonner';
import { ApiError } from './api';
import { getBackendErrorMessage } from './api-errors';

export interface ToastOptions {
    /** Optional description text shown below the main message */
    description?: string;
    /** Duration in milliseconds (default: 4000) */
    duration?: number;
    /** Action button configuration */
    action?: {
        label: string;
        onClick: () => void;
    };
    /** Custom icon (emoji or text) */
    icon?: string;
    /** Toast position on screen */
    position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export interface PromiseToastMessages<T = unknown> {
    /** Message shown while promise is pending */
    loading: string;
    /** Message shown on success (string or function that receives result) */
    success: string | ((data: T) => string);
    /** Message shown on error (string or function that receives error) */
    error: string | ((error: unknown) => string);
}

/**
 * Transform an error into a user-friendly message.
 * Prioritizes backend error codes, falls back to status messages, then generic error.
 */
export function getUserFriendlyMessage(error: unknown): string {
    // Handle ApiError from api.ts
    if (error instanceof ApiError) {
        const backendMessage = getBackendErrorMessage(error.payload, '');
        if (backendMessage) return backendMessage;

        // Status code fallbacks
        const statusMessages: Record<number, string> = {
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

        return statusMessages[error.status] || error.message;
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
 * Show a success toast notification.
 */
export function success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
        description: options?.description,
        duration: options?.duration || 4000,
        action: options?.action,
        position: options?.position,
        icon: options?.icon,
    });
}

/**
 * Show an error toast notification.
 * Automatically transforms backend errors into user-friendly messages.
 * 
 * @param err - Error object, ApiError, or string
 * @param customMessage - Optional custom message to override automatic transformation
 * @param options - Additional toast options (excluding description)
 */
export function error(err: unknown, customMessage?: string, options?: Omit<ToastOptions, 'description'>) {
    const message = customMessage || getUserFriendlyMessage(err);
    const description = (() => {
        if (!(err instanceof ApiError)) return undefined;
        if (!err.payload || typeof err.payload !== 'object') return undefined;
        if (!('details' in err.payload)) return undefined;
        const details = (err.payload as { details?: unknown }).details;
        return typeof details === 'string' ? details : undefined;
    })();

    // Log original error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
        console.error('Toast Error:', err);
    }

    return sonnerToast.error(message, {
        description,
        duration: options?.duration || 5000, // Longer for errors
        action: options?.action,
        position: options?.position,
        icon: options?.icon,
    });
}

/**
 * Show a warning toast notification.
 */
export function warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
        description: options?.description,
        duration: options?.duration || 4000,
        action: options?.action,
        position: options?.position,
        icon: options?.icon,
    });
}

/**
 * Show an info toast notification.
 */
export function info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, {
        description: options?.description,
        duration: options?.duration || 4000,
        action: options?.action,
        position: options?.position,
        icon: options?.icon,
    });
}

/**
 * Show a loading toast that can be updated or dismissed.
 * Returns a toast ID that can be used to update or dismiss the toast.
 * 
 * @example
 * ```tsx
 * const toastId = toast.loading('Uploading...');
 * // Later...
 * toast.dismiss(toastId);
 * // Or update it
 * toast.success('Upload complete!', { id: toastId });
 * ```
 */
export function loading(message: string, options?: Omit<ToastOptions, 'duration'>) {
    return sonnerToast.loading(message, {
        description: options?.description,
        position: options?.position,
        icon: options?.icon,
    });
}

/**
 * Promise-based toast that shows loading, success, and error states automatically.
 * 
 * @example
 * ```tsx
 * toast.promise(
 *   api.post('/events', data),
 *   {
 *     loading: 'Creating event...',
 *     success: (event) => `${event.name} created!`,
 *     error: 'Failed to create event',
 *   }
 * );
 * ```
 */
export function promise<T>(
    promiseOrFunction: Promise<T> | (() => Promise<T>),
    messages: PromiseToastMessages<T>,
    options?: ToastOptions
) {
    return sonnerToast.promise(promiseOrFunction, {
        loading: messages.loading,
        success: (data) => {
            return typeof messages.success === 'function'
                ? messages.success(data)
                : messages.success;
        },
        error: (err) => {
            // If custom error handler provided, use it
            if (typeof messages.error === 'function') {
                return messages.error(err);
            }

            // Otherwise use user-friendly error transformation
            return getUserFriendlyMessage(err);
        },
        duration: options?.duration,
        position: options?.position,
        action: options?.action,
    });
}

/**
 * Dismiss a specific toast by ID.
 */
export function dismiss(toastId?: string | number) {
    sonnerToast.dismiss(toastId);
}

/**
 * Dismiss all active toasts.
 */
export function dismissAll() {
    sonnerToast.dismiss();
}

/**
 * Default export as namespace for cleaner imports.
 * 
 * @example
 * ```tsx
 * import { toast } from '@/lib/notifications';
 * 
 * toast.success('Done!');
 * toast.error(error);
 * ```
 */
export const toast = {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    dismissAll,
};
