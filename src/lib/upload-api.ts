import { getAuthToken } from './api';
import { getBackendErrorMessage } from './api-errors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UploadResponse {
    url: string;
}

interface UploadError {
    error: string;
}

/**
 * Upload a user avatar image.
 */
export async function uploadAvatar(file: File): Promise<UploadResponse> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/v1/uploads/avatar`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null) as UploadError | null;
        throw new Error(getBackendErrorMessage(errorData, 'Failed to upload avatar'));
    }

    return response.json() as Promise<UploadResponse>;
}

/**
 * Upload an organizer avatar image.
 */
export async function uploadOrganizerAvatar(organizerId: string, file: File): Promise<UploadResponse> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/v1/uploads/organizer-avatar/${organizerId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null) as UploadError | null;
        throw new Error(getBackendErrorMessage(errorData, 'Failed to upload avatar'));
    }

    return response.json() as Promise<UploadResponse>;
}

/**
 * Upload an event banner image.
 */
export async function uploadEventBanner(eventId: string, file: File): Promise<UploadResponse> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/v1/uploads/event-banner/${eventId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null) as UploadError | null;
        throw new Error(getBackendErrorMessage(errorData, 'Failed to upload banner'));
    }

    return response.json() as Promise<UploadResponse>;
}

/**
 * Upload an attendee email image for a specific event.
 */
export async function uploadAttendeeEmailImage(eventId: string, file: File): Promise<UploadResponse> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/v1/uploads/attendee-email-image/${eventId}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null) as UploadError | null;
        throw new Error(getBackendErrorMessage(errorData, 'Failed to upload email image'));
    }

    return response.json() as Promise<UploadResponse>;
}

/**
 * Convert a File to a data URL for preview.
 */
export function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Unexpected reader result type'));
            }
        };
        reader.onerror = () => {
            reject(reader.error ?? new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Convert a data URL string to a File.
 */
export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
