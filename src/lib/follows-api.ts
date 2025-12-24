import api from './api';

// ============================================================================
// Follow API - Authenticated endpoints for following organizers
// ============================================================================

export interface FollowedOrganizer {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    followedAt: string;
}

/**
 * Follow an organizer
 */
export const followOrganizer = async (organizerId: string) => {
    return api.post<{ success: boolean; following: boolean }>(
        `/api/v1/users/me/follows/${organizerId}`
    );
};

/**
 * Unfollow an organizer
 */
export const unfollowOrganizer = async (organizerId: string) => {
    return api.delete<{ success: boolean; following: boolean }>(
        `/api/v1/users/me/follows/${organizerId}`
    );
};

/**
 * Check if following an organizer
 */
export const checkIsFollowing = async (organizerId: string) => {
    return api.get<{ following: boolean }>(
        `/api/v1/users/me/follows/${organizerId}/check`
    );
};

/**
 * Get list of followed organizers
 */
export const getFollowedOrganizers = async () => {
    return api.get<{ organizers: FollowedOrganizer[] }>(
        `/api/v1/users/me/follows`
    );
};
