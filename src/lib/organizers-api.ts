import api from './api';
import type { EventScope, OrganizerRole, TeamInvitation, TeamMember } from '@/types';

export type EventScopeInput =
    | {
        mode: 'all';
    }
    | {
        mode: 'limited';
        eventIds: string[];
    };

export interface CreateOrganizerPayload {
    name: string;
    bio?: string;
    avatarUrl?: string;
    website?: string;
    replyToEmail?: string;
    socialLinks?: Record<string, string>;
    defaultTimezone?: string;
}

export interface TeamMembershipResponse {
    memberships: TeamMember[];
}

export interface TeamInvitationsResponse {
    invitations: TeamInvitation[];
}

export interface UpdateMembershipPayload {
    role?: Extract<OrganizerRole, 'co_owner' | 'admin' | 'editor' | 'check_in'>;
    status?: 'active' | 'suspended';
    eventScope?: EventScopeInput;
}

export interface CreateInvitationPayload {
    email: string;
    role: Extract<OrganizerRole, 'co_owner' | 'admin' | 'editor' | 'check_in'>;
    eventScope?: EventScopeInput;
}

export interface CreateInvitationResponse {
    invitation: TeamInvitation;
    token?: string;
    acceptUrl?: string;
    emailSent: boolean;
}

export interface AcceptInvitationResponse {
    membership: {
        id: string;
        role: string;
        status: string;
        organizerId: string;
        organizerName: string;
    };
}

export interface OrganizerEventOption {
    id: string;
    name: string;
    bannerImageUrl: string | null;
}

export const fetchTeamMemberships = async (organizerId: string) => {
    return api.get<TeamMembershipResponse>(`/api/v1/organizers/${organizerId}/memberships`);
};

export const updateTeamMembership = async (
    organizerId: string,
    membershipId: string,
    payload: UpdateMembershipPayload
) => {
    return api.patch<{ membership: TeamMember }>(
        `/api/v1/organizers/${organizerId}/memberships/${membershipId}`,
        payload
    );
};

export const fetchTeamInvitations = async (organizerId: string) => {
    return api.get<TeamInvitationsResponse>(`/api/v1/organizers/${organizerId}/invitations`);
};

export const createTeamInvitation = async (
    organizerId: string,
    payload: CreateInvitationPayload
) => {
    return api.post<CreateInvitationResponse>(`/api/v1/organizers/${organizerId}/invitations`, payload);
};

export const revokeTeamInvitation = async (organizerId: string, invitationId: string) => {
    return api.delete<{ success: boolean }>(
        `/api/v1/organizers/${organizerId}/invitations/${invitationId}`
    );
};

export interface InvitationInfoResponse {
    email: string;
    role: string;
    organizerName: string;
    expiresAt: string;
    alreadyAccepted: boolean;
}

export const fetchInvitationInfo = async (token: string) => {
    return api.get<InvitationInfoResponse>(`/api/v1/invitations/${token}/info`);
};

export const acceptInvitationToken = async (token: string) => {
    return api.post<AcceptInvitationResponse>(`/api/v1/invitations/${token}/accept`);
};

export const eventScopeToInput = (scope: EventScope): EventScopeInput =>
    scope.mode === 'limited'
        ? { mode: 'limited', eventIds: scope.eventIds }
        : {
            mode: 'all',
        };

export const fetchOrganizerEventOptions = async (organizerId: string) => {
    const response = await api.get<{ filters: { events: OrganizerEventOption[] } }>(
        '/api/v1/analytics/overview',
        { params: { organizerId } }
    );
    return response.filters.events;
};

// ============================================================================
// Collaborations API
// ============================================================================

export interface CollaboratingOrg {
    id: string;
    name: string;
    avatarUrl: string | null;
}

export interface HostedCollaboration {
    id: string;
    eventId: string;
    eventTitle: string;
    partnerOrg: CollaboratingOrg;
    accessLevel: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}

export interface PartnerCollaboration {
    id: string;
    eventId: string;
    eventTitle: string;
    hostOrg: CollaboratingOrg;
    accessLevel: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}

export interface CollaborationsResponse {
    hostedCollaborations: HostedCollaboration[];
    partnerCollaborations: PartnerCollaboration[];
}

export interface CollaborationDecisionResponse {
    collaborator: {
        id: string;
        status: 'pending' | 'accepted' | 'declined';
        acceptedAt?: string | null;
        declinedAt?: string | null;
    };
}

export const fetchOrganizerCollaborations = async (organizerId: string) => {
    return api.get<CollaborationsResponse>(`/api/v1/organizers/${organizerId}/collaborations`);
};

export const invitePartnerOrg = async (eventId: string, partnerOrgId: string, accessLevel: string = 'editor') => {
    return api.post<{ collaborator: HostedCollaboration }>(
        `/api/v1/events/${eventId}/collaborators`,
        { partnerOrgId, accessLevel }
    );
};

export const removeCollaboration = async (eventId: string, collaboratorId: string) => {
    return api.delete<{ success: boolean }>(`/api/v1/events/${eventId}/collaborators/${collaboratorId}`);
};

export const updateCollaborationStatus = async (
    eventId: string,
    collaboratorId: string,
    status: 'accepted' | 'declined'
) => {
    return api.patch<CollaborationDecisionResponse>(
        `/api/v1/events/${eventId}/collaborators/${collaboratorId}`,
        { status }
    );
};

// ============================================================================
// Public Organizer Profile API (no authentication required)
// ============================================================================

export interface PublicOrganizerProfile {
    id: string;
    name: string;
    bio: string | null;
    avatarUrl: string | null;
    website: string | null;
    socialLinks: Record<string, string> | null;
    city: string | null;
    country: string | null;
    followerCount: number;
}

export interface PublicOrganizerEvent {
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
}

export interface PublicOrganizerProfileResponse {
    organizer: PublicOrganizerProfile;
    upcomingEvents: PublicOrganizerEvent[];
    pastEvents: PublicOrganizerEvent[];
}

export const fetchPublicOrganizerProfile = async (organizerId: string) => {
    return api.get<PublicOrganizerProfileResponse>(`/api/v1/public/organizers/${organizerId}`);
};
