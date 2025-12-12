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
    role?: Extract<OrganizerRole, 'admin' | 'editor' | 'check_in' | 'viewer'>;
    status?: 'active' | 'suspended';
    eventScope?: EventScopeInput;
}

export interface CreateInvitationPayload {
    email: string;
    role: Extract<OrganizerRole, 'admin' | 'editor' | 'check_in' | 'viewer'>;
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
