import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import type { ProfileResponse } from '@/context/auth-context';
import type { OrganizerSummary } from '@/context/organizer-context';
import { decodeWebSessionCookie } from './web-session-cookie';
import {
    WEB_SESSION_ACTIVATION_COOKIE,
    WEB_SESSION_COOKIE,
    type DashboardSessionSeed,
} from './web-session-types';

export async function fetchPrivateJson<T>(accessToken: string, pathname: string): Promise<T | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}${pathname}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
            credentials: 'omit',
            cache: 'no-store',
            signal: AbortSignal.timeout(3000),
        });
        return response.ok ? await response.json() as T : null;
    } catch {
        return null;
    }
}

/** React's request cache shares verification across layout and page, never between users. */
export const getVerifiedWebSession = cache(async (): Promise<{
    accessToken: string;
    seed: DashboardSessionSeed;
} | null> => {
    const store = await cookies();
    const session = decodeWebSessionCookie(
        store.get(WEB_SESSION_COOKIE)?.value,
        store.get(WEB_SESSION_ACTIVATION_COOKIE)?.value,
    );
    if (!session) return null;

    const [profile, response] = await Promise.all([
        fetchPrivateJson<ProfileResponse>(session.accessToken, '/api/v1/auth/me'),
        fetchPrivateJson<{ organizers: OrganizerSummary[] }>(session.accessToken, '/api/v1/organizers'),
    ]);
    if (!profile?.user?.id || !Array.isArray(profile.memberships)
        || typeof profile.needsOnboarding !== 'boolean'
        || !Array.isArray(response?.organizers)) return null;

    return {
        accessToken: session.accessToken,
        seed: { nonce: session.nonce, profile, organizers: response.organizers },
    };
});

export async function getDashboardSessionSeed(): Promise<DashboardSessionSeed | null> {
    return (await getVerifiedWebSession())?.seed ?? null;
}
