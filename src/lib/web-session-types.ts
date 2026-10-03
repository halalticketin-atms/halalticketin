import type { ProfileResponse } from '@/context/auth-context';
import type { OrganizerSummary } from '@/context/organizer-context';

/** Verified private initial data. Credentials remain server-only. */
export interface DashboardSessionSeed {
    nonce: string;
    profile: ProfileResponse;
    organizers: OrganizerSummary[];
}

export const WEB_SESSION_COOKIE = 'ht-web-session';
export const WEB_SESSION_ACTIVATION_COOKIE = 'ht-web-session-active';
export const WEB_SESSION_NONCE_PATTERN = /^[a-zA-Z0-9_-]{20,80}$/;
