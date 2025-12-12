export type EventScope =
    | {
          mode: 'all';
          eventIds: [];
      }
    | {
          mode: 'limited';
          eventIds: string[];
      };

export type OrganizerRole = 'owner' | 'admin' | 'editor' | 'check_in' | 'viewer';
export type MembershipStatus = 'pending' | 'active' | 'suspended';

export interface TeamMember {
    id: string;
    role: OrganizerRole;
    status: MembershipStatus;
    createdAt: string | null;
    updatedAt: string | null;
    user: {
        id: string;
        email: string;
        name: string | null;
        avatarUrl: string | null;
    };
    eventScope: EventScope;
}

export interface TeamInvitation {
    id: string;
    email: string;
    role: OrganizerRole;
    status: 'pending' | 'accepted' | 'revoked' | 'expired';
    expiresAt: string;
    acceptedAt: string | null;
    revokedAt: string | null;
    createdAt: string | null;
    eventScope: EventScope;
}
