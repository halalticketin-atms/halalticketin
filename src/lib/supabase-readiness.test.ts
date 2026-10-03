import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { getSupabase } from './supabase';

beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.example.test');
    vi.stubGlobal('window', { localStorage: { getItem: () => null }, location: new URL('https://frontend.example.test/') });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('lightweight auth readiness', () => {
    it('replays an existing client and stops notifying removed subscribers', async () => {
        const { publishSupabaseClient, subscribeSupabaseClient } = await import('./supabase-readiness');
        const client = { auth: {} } as ReturnType<typeof getSupabase>;
        const early = vi.fn();
        const removeEarly = subscribeSupabaseClient(early);
        publishSupabaseClient(client);
        const late = vi.fn();
        const removeLate = subscribeSupabaseClient(late);
        expect(early).toHaveBeenCalledExactlyOnceWith(client);
        expect(late).toHaveBeenCalledExactlyOnceWith(client);
        removeEarly();
        removeLate();
        publishSupabaseClient(client);
        expect(early).toHaveBeenCalledOnce();
        expect(late).toHaveBeenCalledOnce();
    });

    it('defers only when storage is readable and no session or callback data exists', async () => {
        const { needsSupabaseSession } = await import('./supabase-readiness');
        expect(needsSupabaseSession()).toBe(false);
        window.localStorage.getItem = () => { throw new Error('Storage blocked'); };
        expect(needsSupabaseSession()).toBe(true);
    });

    it('initialises immediately for stored SDK credentials', async () => {
        window.localStorage.getItem = key => key === 'sb-synthetic-auth-token' ? 'stored-session' : null;
        expect((await import('./supabase-readiness')).needsSupabaseSession()).toBe(true);
    });

    it.each(['halal-ticketin-access-token', 'halal-ticketin-refresh-token'])('defers SDK construction for API-only %s', async key => {
        window.localStorage.getItem = storedKey => storedKey === key ? 'stored-session' : null;
        expect((await import('./supabase-readiness')).needsSupabaseSession()).toBe(false);
    });

    it.each(['/auth/callback', '/reset-password', '/?code=callback', '/?token_hash=recovery&type=recovery', '/#access_token=callback&refresh_token=refresh', '/?error=access_denied', '/#error_description=Denied'])('preserves callback detection for %s', async path => {
        Object.assign(window, { location: new URL(path, 'https://frontend.example.test') });
        expect((await import('./supabase-readiness')).needsSupabaseSession()).toBe(true);
    });

    it('falls back to initialisation when the configured project key cannot be determined', async () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
        expect((await import('./supabase-readiness')).needsSupabaseSession()).toBe(true);
    });
});
