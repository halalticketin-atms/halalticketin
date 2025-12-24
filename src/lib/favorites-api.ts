import api from './api';

// ============================================================================
// Favorites API - Authenticated endpoints for event favorites
// ============================================================================

export interface FavoriteEvent {
    id: string;
    slug: string | null;
    title: string | null;
    description: string | null;
    bannerImageUrl: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    timezone: string;
    locationType: 'in_person' | 'online' | 'hybrid';
    venue: string | null;
    city: string | null;
    country: string | null;
    category: string | null;
    organizerName: string | null;
    favoritedAt: string;
}

/**
 * Favorite an event
 */
export const favoriteEvent = async (eventId: string) => {
    return api.post<{ success: boolean; favorited: boolean }>(
        `/api/v1/users/me/favorites/${eventId}`
    );
};

/**
 * Unfavorite an event
 */
export const unfavoriteEvent = async (eventId: string) => {
    return api.delete<{ success: boolean; favorited: boolean }>(
        `/api/v1/users/me/favorites/${eventId}`
    );
};

/**
 * Check if an event is favorited
 */
export const checkIsFavorite = async (eventId: string) => {
    return api.get<{ favorited: boolean }>(
        `/api/v1/users/me/favorites/${eventId}/check`
    );
};

/**
 * Get list of favorite events
 */
export const getFavoriteEvents = async () => {
    return api.get<{ events: FavoriteEvent[] }>(
        `/api/v1/users/me/favorites`
    );
};
