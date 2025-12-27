/**
 * Toast Notification Usage Examples
 * 
 * This file demonstrates common toast notification patterns used throughout the app.
 * Copy these patterns into your components as needed.
 */

import { toast } from '@/lib/notifications';
import api from '@/lib/api';

/* ========================================
   AUTHENTICATION EXAMPLES
   ======================================== */

// Login success
function handleLoginSuccess(user: { email: string }) {
    toast.success('Welcome back!', {
        description: `Logged in as ${user.email}`,
        duration: 3000,
    });
}

// Login error with automatic error transformation
async function handleLogin(email: string, password: string) {
    try {
        const response = await api.post('/api/v1/auth/login', { email, password });
        toast.success('Welcome back!');
        return response;
    } catch (error) {
        // Automatically transforms backend errors to user-friendly messages
        toast.error(error, 'Failed to log in');
    }
}

// Signup with detailed feedback
async function handleSignup(data: Record<string, unknown>) {
    try {
        await api.post('/api/v1/auth/signup', data);
        toast.success('Account created successfully! 🎉', {
            description: 'Check your email to verify your account',
            duration: 5000,
        });
    } catch (error) {
        toast.error(error); // Uses default error message transformation
    }
}

// Session expired warning
function handleSessionExpired() {
    toast.warning('Session expired', {
        description: 'Please log in again to continue',
    });
}

/* ========================================
   EVENT MANAGEMENT EXAMPLES
   ======================================== */

// Create event with promise toast (loading → success/error)
async function createEvent(eventData: Record<string, unknown>) {
    return toast.promise(
        api.post('/api/v1/events', eventData),
        {
            loading: 'Creating your event...',
            success: (data) => {
                // Navigate to event page
                return 'Event created successfully! 🎉';
            },
            error: 'Failed to create event',
        }
    );
}

// Update event
async function updateEvent(eventId: string, eventData: Record<string, unknown>) {
    return toast.promise(
        api.put(`/api/v1/events/${eventId}`, eventData),
        {
            loading: 'Saving changes...',
            success: 'Changes saved ✓',
            error: (err) => {
                // Custom error handling for specific cases
                if (err instanceof Error && err.message.includes('duplicate')) {
                    return 'Event name already exists';
                }
                return 'Failed to save changes';
            },
        }
    );
}

// Publish event with action button
function publishEvent(eventId: string, onShare: () => void) {
    toast.success('Event is now live! 🚀', {
        description: 'Attendees can now purchase tickets',
        action: {
            label: 'Share Event',
            onClick: onShare,
        },
    });
}

// Delete event confirmation
async function deleteEvent(eventId: string) {
    return toast.promise(
        api.delete(`/api/v1/events/${eventId}`),
        {
            loading: 'Deleting event...',
            success: 'Event deleted',
            error: 'Failed to delete event',
        }
    );
}

/* ========================================
   TICKETING/CHECKOUT EXAMPLES
   ======================================== */

// Add to cart (brief confirmation)
function addToCart(ticketName: string, quantity: number) {
    toast.success(`${quantity}x ${ticketName} added`, {
        duration: 2000, // Brief
    });
}

// Payment processing
async function processPayment(checkoutData: Record<string, unknown>) {
    return toast.promise(
        api.post('/api/v1/checkout/process', checkoutData),
        {
            loading: 'Processing payment...',
            success: (order) => {
                // Navigate to success page
                return 'Tickets purchased! 🎫';
            },
            error: 'Payment failed',
        }
    );
}

// Payment failed with retry action
function handlePaymentError(error: unknown, onRetry: () => void) {
    toast.error(error, 'Payment could not be processed', {
        action: {
            label: 'Try Again',
            onClick: onRetry,
        },
        duration: 10000, // Longer for user to read
    });
}

// Free ticket checkout
function handleFreeTicketSuccess() {
    toast.success('Tickets confirmed! 🎉', {
        description: 'Check your email for confirmation',
    });
}

/* ========================================
   DASHBOARD/ORGANIZER EXAMPLES
   ======================================== */

// Process refund
async function processRefund(orderId: string, amount: number) {
    return toast.promise(
        api.post(`/api/v1/orders/${orderId}/refund`, { amount }),
        {
            loading: 'Processing refund...',
            success: 'Refund processed successfully',
            error: 'Failed to process refund',
        }
    );
}

// Resend confirmation email
async function resendConfirmationEmail(orderId: string) {
    return toast.promise(
        api.post(`/api/v1/orders/${orderId}/resend-confirmation`),
        {
            loading: 'Sending email...',
            success: 'Confirmation email sent ✓',
            error: 'Failed to send email',
        }
    );
}

// Rate limiting/cooldown warning
function handleCooldown(remainingSeconds: number) {
    toast.warning('Please wait', {
        description: `You can resend in ${remainingSeconds} seconds`,
        duration: 3000,
    });
}

// Check-in success (brief)
function handleCheckInSuccess() {
    toast.success('Guest checked in ✓', {
        duration: 2000,
    });
}

// Invalid QR code
function handleInvalidQRCode() {
    toast.error('Invalid ticket', {
        description: 'QR code not recognized',
    });
}

/* ========================================
   PROFILE/SETTINGS EXAMPLES
   ======================================== */

// Update profile
async function updateProfile(profileData: Record<string, unknown>) {
    return toast.promise(
        api.put('/api/v1/profile', profileData),
        {
            loading: 'Saving profile...',
            success: 'Profile updated successfully ✓',
            error: 'Failed to update profile',
        }
    );
}

// Avatar upload with file size error handling
async function uploadAvatar(file: File) {
    try {
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image too large. Max 2MB');
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        await toast.promise(
            api.post('/api/v1/profile/avatar', formData),
            {
                loading: 'Uploading profile picture...',
                success: 'Profile picture updated 📸',
                error: 'Failed to upload image',
            }
        );
    } catch (error) {
        toast.error(error);
    }
}

// Password change with specific error handling
async function changePassword(oldPassword: string, newPassword: string) {
    return toast.promise(
        api.put('/api/v1/profile/password', { oldPassword, newPassword }),
        {
            loading: 'Updating password...',
            success: 'Password updated successfully',
            error: (err: unknown) => {
                const status = typeof err === 'object' && err !== null && 'status' in err
                    ? (err as { status?: number }).status
                    : undefined;
                if (status === 401) {
                    return 'Current password is incorrect';
                }
                return 'Failed to update password';
            },
        }
    );
}

/* ========================================
   VALIDATION & FORM ERRORS
   ======================================== */

// Form validation errors
function handleValidationErrors(errors: Array<{ field: string; message: string }>) {
    toast.error('Please complete all required fields', {
        description: errors.map(e => e.message).join(', '),
        duration: 6000,
    });
}

// Generic validation error
function handleInvalidInput(message: string) {
    toast.error(message, {
        duration: 4000,
    });
}

/* ========================================
   NETWORK/SYSTEM ERRORS
   ======================================== */

// Network error (offline)
function handleNetworkError() {
    toast.error('Network error', {
        description: 'Please check your internet connection',
        duration: 5000,
    });
}

// Server error
function handleServerError() {
    toast.error('Server error', {
        description: 'Our team has been notified. Please try again later',
        duration: 6000,
    });
}

/* ========================================
   FILE OPERATIONS
   ======================================== */

// Export data
async function exportData(onDownload: (file: Blob) => void) {
    return toast.promise(
        api.get('/api/v1/export', { responseType: 'blob' }),
        {
            loading: 'Preparing export...',
            success: (file) => {
                onDownload(file);
                return 'Data exported successfully 📊';
            },
            error: 'Failed to export data',
        }
    );
}

// File upload progress (using loading toast that can be updated)
async function uploadFileWithProgress(file: File) {
    const toastId = toast.loading('Uploading file...', {
        description: '0% complete',
    });

    try {
        // Simulate progress updates
        // In real implementation, use upload progress events
        await api.post('/api/v1/upload', file);
        toast.dismiss(toastId);
        toast.success('File uploaded successfully');
    } catch (error) {
        toast.dismiss(toastId);
        toast.error(error, 'Upload failed');
    }
}

/* ========================================
   ADVANCED PATTERNS
   ======================================== */

// Optimistic UI with rollback on error
async function toggleFavorite(eventId: string, isFavorited: boolean, onRollback: () => void) {
    try {
        await api.post(`/api/v1/events/${eventId}/favorite`, { favorite: !isFavorited });
        toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites', {
            duration: 2000,
        });
    } catch (error) {
        onRollback(); // Revert UI state
        toast.error(error, 'Failed to update favorites');
    }
}

// Batch operation with summary
async function bulkDeleteTickets(ticketIds: string[]) {
    const toastId = toast.loading(`Deleting ${ticketIds.length} tickets...`);

    try {
        await api.post('/api/v1/tickets/bulk-delete', { ticketIds });
        toast.dismiss(toastId);
        toast.success(`${ticketIds.length} tickets deleted`, {
            duration: 3000,
        });
    } catch (error) {
        toast.dismiss(toastId);
        toast.error(error, 'Failed to delete tickets');
    }
}

export {
    // Export individual functions as needed for testing or reuse
};
