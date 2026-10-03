import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    seedCurrent: false,
    effects: [] as Array<() => (() => void) | void>,
    onChange: null as null | ((event: string, session: { access_token: string; refresh_token: string; user: { id: string } } | null) => Promise<void>),
    profileIds: [] as string[],
    getSession: vi.fn(), sdkSignOut: vi.fn(), signOut: null as (() => void) | null, refresh: null as (() => Promise<void>) | null,
}));
vi.mock('react', async original => {
    const react = await original<typeof import('react')>();
    return {
        ...react,
        useEffect: (effect: () => (() => void) | void) => state.effects.push(effect),
        useState: (initial: unknown) => {
            const [value, set] = react.useState(initial);
            return [value, (next: unknown) => {
                if (next && typeof next === 'object' && 'user' in next) state.profileIds.push((next as { user: { id: string } }).user.id);
                set(next);
            }];
        },
    };
});
vi.mock('@/lib/web-session-client', () => ({ ensureWebSession: vi.fn().mockResolvedValue(false), isWebSessionSeedCurrent: () => state.seedCurrent }));
vi.mock('@/lib/upload-api', () => ({ dataUrlToFile: vi.fn(), uploadOrganizerAvatar: vi.fn() }));
vi.mock('@/lib/supabase-readiness', async original => ({
    ...await original<typeof import('../lib/supabase-readiness')>(),
    subscribeSupabaseClient: () => () => {},
}));
vi.mock('@/lib/supabase', () => ({ getSupabase: () => ({ auth: {
    getSession: state.getSession,
    signOut: state.sdkSignOut,
    admin: { signOut: state.sdkSignOut },
    onAuthStateChange: (callback: typeof state.onChange) => {
        state.onChange = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
} }) }));

let cleanup: (() => void) | void;
beforeEach(() => {
    vi.resetModules();
    state.seedCurrent = false; state.effects = []; state.onChange = null; state.profileIds = [];
    state.getSession.mockReset(); state.signOut = null; state.refresh = null; state.sdkSignOut.mockReset().mockResolvedValue({ error: null });
    const storage = new Map<string, string>();
    // These ownership fixtures explicitly exercise returning SDK sessions.
    storage.set('sb-synthetic-auth-token', JSON.stringify({ access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } }));
    vi.stubGlobal('window', {
        location: new URL('https://synthetic.example.test/dashboard'),
        localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
        addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.example.test');
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
        const id = new Headers(init?.headers).get('Authorization') === 'Bearer account-a' ? 'a' : 'b';
        return Promise.resolve(Response.json({ user: { id }, memberships: [], isOrganizer: true, needsOnboarding: false }));
    }));
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it.each(['valid', 'expired'])('bootstraps a %s backend-only session with real API ownership and no SDK', async condition => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    window.localStorage.removeItem('sb-synthetic-auth-token');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    const identity = api.getAuthIdentityRevision();
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/refresh')) return Promise.resolve(Response.json({ accessToken: 'rotated-a', refreshToken: 'rotated-refresh-a' }));
        if (condition === 'expired' && new Headers(init?.headers).get('Authorization') === 'Bearer account-a') {
            return Promise.resolve(new Response('{}', { status: 401 }));
        }
        return Promise.resolve(Response.json({ user: { id: 'a' }, memberships: [], isOrganizer: true, needsOnboarding: false }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.getSession).not.toHaveBeenCalled();
    expect(state.onChange).toBeNull();
    expect(api.getAuthIdentityRevision()).toBe(identity);
    expect(api.getAuthToken()).toBe(condition === 'expired' ? 'rotated-a' : 'account-a');
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(condition === 'expired' ? 1 : 0);
    if (condition === 'valid') expect(fetchMock).toHaveBeenCalledOnce();
});

function switchToBInside(seam: 'setAuthToken' | 'clearAuthSession') {
    const originalRead = window.localStorage.getItem;
    let switched = false;
    window.localStorage.getItem = (key: string) => {
        if (!switched && key === 'halal-ticketin-access-token' && new Error().stack?.includes(seam)) {
            switched = true;
            window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
            window.localStorage.setItem('halal-ticketin-refresh-token', 'refresh-b');
            window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify({ access_token: 'account-b' }));
            window.localStorage.removeItem('halal-ticketin:session-retired');
        }
        return originalRead(key);
    };
    return () => switched;
}

it.each(['SIGNED_IN', 'getSession'])('rejects automatic SDK %s adoption when its setter observes newer B', async mode => {
    const api = await import('@/lib/api');
    const { AuthProvider, useAuth } = await import('./auth-context');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    const rotated = { access_token: 'rotated-a', refresh_token: 'rotated-refresh-a', user: { id: 'a' } };
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    state.getSession.mockImplementation(async () => {
        if (mode === 'getSession') await gate;
        return { data: { session: mode === 'getSession' ? rotated : oldSession } };
    });
    state.seedCurrent = true;
    function Seed() {
        const auth = useAuth();
        useEffect(() => { auth.adoptSessionSeed({ nonce: 'seeded-nonce-1234567890', profile: {
            user: { id: 'a', email: 'a@example.test', name: null, avatarUrl: null, gender: null, dateOfBirth: null, homeCountry: null, homeCity: null },
            memberships: [], isOrganizer: true, needsOnboarding: false,
        }, organizers: [] }); }, [auth]);
        return null;
    }
    renderToStaticMarkup(<AuthProvider><Seed /></AuthProvider>);
    cleanup = state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(state.onChange).not.toBeNull());
    if (mode === 'SIGNED_IN') await new Promise<void>(resolve => setImmediate(resolve));
    const switched = switchToBInside('setAuthToken');
    try {
        if (mode === 'getSession') { release(); await new Promise<void>(resolve => setImmediate(resolve)); }
        else await state.onChange!('SIGNED_IN', rotated);
        expect(switched()).toBe(true);
        expect(api.getAuthToken()).toBe('account-b');
        expect(api.getRefreshToken()).toBe('refresh-b');
        expect(window.localStorage.getItem('halal-ticketin:session-retired')).toBeNull();
    } finally { release(); }
});

it.each(['SIGNED_OUT', 'profile401', 'storage-removal'])('rejects automatic %s cleanup when the clear seam observes newer B', async mode => {
    const api = await import('@/lib/api');
    const { AuthProvider, useAuth } = await import('./auth-context');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } } } });
    function ReadRefresh() {
        const { refresh } = useAuth();
        useEffect(() => { state.refresh = refresh; }, [refresh]);
        return null;
    }
    renderToStaticMarkup(<AuthProvider><ReadRefresh /></AuthProvider>);
    cleanup = state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    if (mode === 'profile401') {
        api.setRefreshToken(null);
        vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => Promise.resolve(
            new Headers(init?.headers).get('Authorization') === 'Bearer account-a'
                ? new Response('{}', { status: 401 })
                : Response.json({ user: { id: 'b' }, memberships: [], isOrganizer: true, needsOnboarding: false })
        )));
    }
    if (mode === 'storage-removal') {
        window.localStorage.removeItem('halal-ticketin-access-token');
        window.localStorage.removeItem('halal-ticketin-refresh-token');
    }
    const switched = switchToBInside('clearAuthSession');
    if (mode === 'SIGNED_OUT') await state.onChange!('SIGNED_OUT', null);
    else if (mode === 'profile401') await state.refresh!();
    else {
        const handler = vi.mocked(window.addEventListener).mock.calls.find(call => call[0] === 'storage')![1] as (event: StorageEvent) => void;
        handler({ key: 'halal-ticketin-access-token', newValue: null, storageArea: window.localStorage } as StorageEvent);
    }
    expect(switched()).toBe(true);
    expect(api.getAuthToken()).toBe('account-b');
    expect(api.getRefreshToken()).toBe('refresh-b');
    expect(window.localStorage.getItem('sb-synthetic-auth-token')).toContain('account-b');
    expect(window.localStorage.getItem('halal-ticketin:session-retired')).toBeNull();
    await vi.waitFor(() => expect(state.profileIds.at(-1)).toBe('b'));
});

it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'])('rejects obsolete SDK %s recovery after real shared API credentials switch from A to B', async event => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    state.getSession.mockImplementation(async () => { await gate; return { data: { session: oldSession } }; });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>);
    cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.onChange).not.toBeNull());
    api.setAuthToken('account-b'); api.setRefreshToken('refresh-b');
    const revision = api.getAuthSessionRevision();
    try {
        await state.onChange!(event, oldSession);
        expect(api.getAuthToken()).toBe('account-b');
        expect(api.getRefreshToken()).toBe('refresh-b');
        expect(api.getAuthSessionRevision()).toBe(revision);
        release();
        await vi.waitFor(() => expect(state.profileIds).toEqual(['b']));
        await state.onChange!('SIGNED_IN', oldSession);
        expect(api.getAuthToken()).toBe('account-b');
        expect(state.profileIds).toEqual(['b']);
        const identityB = api.getAuthIdentityRevision();
        await state.onChange!('TOKEN_REFRESHED', { access_token: 'rotated-b', refresh_token: 'rotated-refresh-b', user: { id: 'b' } });
        expect(api.getAuthToken()).toBe('rotated-b');
        expect(api.getAuthIdentityRevision()).toBe(identityB);
        // A later current cross-tab session remains a legitimate SDK sign-in.
        api.setAuthToken('account-c'); api.setRefreshToken('refresh-c');
        await state.onChange!('SIGNED_IN', { access_token: 'account-c', refresh_token: 'refresh-c', user: { id: 'c' } });
        expect(api.getAuthToken()).toBe('account-c');
        api.clearAuthSession();
        api.setAuthToken('later-sign-in'); api.setRefreshToken('later-refresh');
        window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify({ access_token: 'later-sign-in' }));
        await state.onChange!('SIGNED_IN', { access_token: 'later-sign-in', refresh_token: 'later-refresh', user: { id: 'd' } });
        expect(api.getAuthToken()).toBe('later-sign-in');
    } finally { release(); }
});

it.each(['SIGNED_IN', 'TOKEN_REFRESHED'])('rejects late SDK %s after completed logout, while allowing an intentional API-backed sign-in', async event => {
    const api = await import('@/lib/api');
    const { AuthProvider, useAuth } = await import('./auth-context');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(oldSession));
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: oldSession } });
    function ReadSignOut() {
        const { signOut } = useAuth();
        useEffect(() => { state.signOut = signOut; }, [signOut]);
        return null;
    }
    renderToStaticMarkup(<AuthProvider><ReadSignOut /></AuthProvider>);
    cleanup = state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    state.signOut!();
    await state.sdkSignOut.mock.results[0].value;
    await new Promise<void>(resolve => setImmediate(resolve));
    await state.onChange!(event, oldSession);
    expect(api.getAuthToken()).toBeNull();
    expect(api.getRefreshToken()).toBeNull();
    expect(state.profileIds).toEqual(['a']);
    const fresh = { access_token: 'fresh-login-b', refresh_token: 'fresh-refresh-b', user: { id: 'b' } };
    api.setAuthToken(fresh.access_token); api.setRefreshToken(fresh.refresh_token);
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(fresh));
    await state.onChange!('SIGNED_IN', fresh);
    expect(api.getAuthToken()).toBe('fresh-login-b');
});

it('rejects an obsolete broadcast after shared storage is cleared without a storage event', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(oldSession));
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: oldSession } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>);
    cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    window.localStorage.removeItem('halal-ticketin-access-token');
    window.localStorage.removeItem('halal-ticketin-refresh-token');
    await state.onChange!('SIGNED_IN', oldSession);
    expect(api.getAuthToken()).toBeNull();
    expect(api.getRefreshToken()).toBeNull();
    expect(state.profileIds).toEqual(['a']);
});

it('keeps retired credentials cleared after SDK auto-refresh writes a rotated old session and after remount', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(oldSession));
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: oldSession } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    api.clearAuthSession();
    const rotated = { access_token: 'rotated-old-a', refresh_token: 'rotated-refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(rotated));
    await state.onChange!('TOKEN_REFRESHED', rotated);
    await state.onChange!('SIGNED_IN', rotated);
    expect(api.getAuthToken()).toBeNull();
    cleanup?.();
    state.effects = []; state.getSession.mockResolvedValue({ data: { session: rotated } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(api.getAuthToken()).toBeNull();
    expect(state.profileIds).toEqual(['a']);
    api.setAuthToken('intentional-new-login'); api.setRefreshToken('intentional-refresh');
    await state.onChange!('SIGNED_IN', { access_token: 'intentional-new-login', refresh_token: 'intentional-refresh', user: { id: 'b' } });
    expect(api.getAuthToken()).toBe('intentional-new-login');
});

it('keeps an offline logout retired across remount and binds remote revocation to the captured old token', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider, useAuth } = await import('./auth-context');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(oldSession));
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: oldSession } });
    state.sdkSignOut.mockResolvedValue({ error: new Error('Offline synthetic logout') });
    function ReadSignOut() { const { signOut } = useAuth(); useEffect(() => { state.signOut = signOut; }, [signOut]); return null; }
    renderToStaticMarkup(<AuthProvider><ReadSignOut /></AuthProvider>); cleanup = state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    state.signOut!();
    await state.sdkSignOut.mock.results[0].value;
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(window.localStorage.getItem('sb-synthetic-auth-token')).toBeNull();
    expect(state.sdkSignOut).toHaveBeenCalledWith('account-a', 'global');
    cleanup?.(); state.effects = [];
    renderToStaticMarkup(<AuthProvider>Reloaded</AuthProvider>); cleanup = state.effects[0]();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(api.getAuthToken()).toBeNull();
    expect(api.getRefreshToken()).toBeNull();
});

it('does not let an unowned SIGNED_OUT event clear a backend-password session', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    api.setAuthToken('account-b'); api.setRefreshToken('refresh-b');
    state.getSession.mockResolvedValue({ data: { session: null } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['b']));
    await state.onChange!('SIGNED_OUT', null);
    expect(api.getAuthToken()).toBe('account-b');
    expect(api.getRefreshToken()).toBe('refresh-b');
});

it('keeps current B credentials when a queued account-A removal notification arrives', async () => {
    const handlers = new Set<(event: StorageEvent) => void>();
    vi.mocked(window.addEventListener).mockImplementation((_type, handler) => { handlers.add(handler as (event: StorageEvent) => void); });
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    state.getSession.mockResolvedValue({ data: { session: null } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    api.setAuthToken('account-b'); api.setRefreshToken('refresh-b');
    handlers.forEach(handler => handler({ key: 'halal-ticketin-access-token', oldValue: 'account-a', newValue: null, storageArea: window.localStorage } as StorageEvent));
    expect(api.getAuthToken()).toBe('account-b');
    expect(api.getRefreshToken()).toBe('refresh-b');
});

it('keeps returning backend B credentials ahead of an already-persisted different SDK user A', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    const oldSession = { access_token: 'account-a', refresh_token: 'refresh-a', user: { id: 'a' } };
    window.localStorage.setItem('sb-synthetic-auth-token', JSON.stringify(oldSession));
    api.setAuthToken('account-b'); api.setRefreshToken('refresh-b');
    state.getSession.mockResolvedValue({ data: { session: oldSession } });
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['b']));
    expect(api.getAuthToken()).toBe('account-b');
    expect(api.getRefreshToken()).toBe('refresh-b');
});

it('recovers an expired same-user API token using a rotated SDK token and verifies its profile', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider } = await import('./auth-context');
    const expired = `synthetic.${Buffer.from(JSON.stringify({ sub: 'a', exp: 1 })).toString('base64url')}.signature`;
    api.setAuthToken(expired); api.setRefreshToken('refresh-a');
    const rotated = { access_token: 'rotated-a', refresh_token: 'rotated-refresh-a', user: { id: 'a' } };
    state.getSession.mockResolvedValue({ data: { session: rotated } });
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => Promise.resolve(
        new Headers(init?.headers).get('Authorization') === 'Bearer rotated-a'
            ? Response.json({ user: { id: 'a' }, memberships: [], isOrganizer: true, needsOnboarding: false })
            : new Response('{}', { status: 401 })
    )));
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>); cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.profileIds).toEqual(['a']));
    expect(api.getAuthToken()).toBe('rotated-a');
    expect(api.getRefreshToken()).toBe('rotated-refresh-a');
    expect(fetch).toHaveBeenCalledOnce();
});

it('preserves verified seeded identity during same-user getSession recovery with a rotated token', async () => {
    const api = await import('@/lib/api');
    const { AuthProvider, useAuth } = await import('./auth-context');
    api.setAuthToken('account-a'); api.setRefreshToken('refresh-a');
    const identity = api.getAuthIdentityRevision();
    const revision = api.getAuthSessionRevision();
    state.seedCurrent = true;
    state.getSession.mockResolvedValue({ data: { session: { access_token: 'rotated-a', refresh_token: 'rotated-refresh-a', user: { id: 'a' } } } });
    const profile: import('./auth-context').ProfileResponse = {
        user: { id: 'a', email: 'a@example.test', name: 'Amina', avatarUrl: null, gender: null, dateOfBirth: null, homeCountry: null, homeCity: null },
        memberships: [], isOrganizer: true, needsOnboarding: false,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(profile)));
    function AdoptSeed() {
        const auth = useAuth();
        useEffect(() => { auth.adoptSessionSeed({ nonce: 'seeded-nonce-1234567890', profile, organizers: [] }); }, [auth]);
        return null;
    }
    renderToStaticMarkup(<AuthProvider><AdoptSeed /></AuthProvider>); cleanup = state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(api.getAuthToken()).toBe('rotated-a'));
    expect(api.getAuthIdentityRevision()).toBe(identity);
    expect(api.getAuthSessionRevision()).toBeGreaterThan(revision);
    expect(api.getRefreshToken()).toBe('rotated-refresh-a');
});
