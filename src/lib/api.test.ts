import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
    });
});

afterEach(() => vi.unstubAllGlobals());

async function startPendingRefresh() {
    const session = await import('./api');
    session.setAuthToken('old-access');
    session.setRefreshToken('old-refresh');
    let finishRefresh!: (response: Response) => void;
    let startedRefresh!: () => void;
    const started = new Promise<void>(resolve => { startedRefresh = resolve; });
    const refresh = new Promise<Response>(resolve => { finishRefresh = resolve; });
    const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (url.endsWith('/auth/refresh')) {
            startedRefresh();
            return refresh;
        }
        return Promise.resolve(new Response('{}', { status: 401 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const request = session.api.get('/api/v1/private').catch(error => error);
    await started;
    return { session, request, finishRefresh, fetchMock };
}

describe('API session refresh ordering', () => {
    it('conditionally accepts an owned null token without rejecting its own retirement', async () => {
        const session = await import('./api');
        session.setAuthToken('account-a'); session.setRefreshToken('refresh-a');
        const expectedSession = session.getAuthSessionOwner();
        expect(session.setAuthToken(null, { expectedSession, refreshToken: null })).toBe(true);
        expect(session.getAuthToken()).toBeNull();
        expect(session.getRefreshToken()).toBeNull();
        expect(window.localStorage.getItem('halal-ticketin:session-retired')).toBe('1');
    });

    it('rejects failed-refresh cleanup when an activation listener accepts newer credentials', async () => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        const { subscribeWebSession } = await import('./web-session-activation');
        let switched = false;
        const stop = subscribeWebSession(() => {
            if (switched) return;
            switched = true;
            session.setAuthToken('account-b'); session.setRefreshToken('refresh-b');
            window.localStorage.setItem('sb-synthetic-auth-token', 'sdk-b');
        });
        try {
            finishRefresh(new Response('{}', { status: 500 }));
            expect(await request).toBeInstanceOf(session.ApiError);
            expect(switched).toBe(true);
            expect(session.getAuthToken()).toBe('account-b');
            expect(session.getRefreshToken()).toBe('refresh-b');
            expect(window.localStorage.getItem('sb-synthetic-auth-token')).toBe('sdk-b');
            expect(window.localStorage.getItem('halal-ticketin:session-retired')).toBeNull();
        } finally { stop(); }
    });

    it('publishes both removed credentials before failed-refresh cleanup notifications', async () => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        let observedRefresh: string | null | undefined;
        const stop = session.subscribeAuthSession(() => {
            if (session.getAuthToken()) return;
            observedRefresh = session.getRefreshToken();
            session.setAuthToken('account-b'); session.setRefreshToken('refresh-b');
        });
        try {
            finishRefresh(new Response('{}', { status: 500 }));
            expect(await request).toBeInstanceOf(session.ApiError);
            expect(observedRefresh).toBeNull();
            expect(session.getAuthToken()).toBe('account-b');
            expect(session.getRefreshToken()).toBe('refresh-b');
        } finally { stop(); }
    });

    it('does not clear a newer account observed inside failed-refresh cleanup', async () => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        const originalRead = window.localStorage.getItem;
        let switched = false;
        window.localStorage.getItem = (key: string) => {
            if (!switched && key === 'halal-ticketin-access-token' && new Error().stack?.includes('clearAuthSession')) {
                switched = true;
                window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
                window.localStorage.setItem('halal-ticketin-refresh-token', 'refresh-b');
                window.localStorage.removeItem('halal-ticketin:session-retired');
            }
            return originalRead(key);
        };
        finishRefresh(new Response('{}', { status: 500 }));

        expect(await request).toBeInstanceOf(session.ApiError);
        expect(switched).toBe(true);
        expect(session.getAuthToken()).toBe('account-b');
        expect(session.getRefreshToken()).toBe('refresh-b');
        expect(window.localStorage.getItem('halal-ticketin:session-retired')).toBeNull();
    });

    it('rejects refresh acceptance when the token setter observes a newer account', async () => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        const originalRead = window.localStorage.getItem;
        let switched = false;
        window.localStorage.getItem = (key: string) => {
            if (!switched && key === 'halal-ticketin-access-token' && new Error().stack?.includes('setAuthToken')) {
                switched = true;
                window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
                window.localStorage.setItem('halal-ticketin-refresh-token', 'refresh-b');
            }
            return originalRead(key);
        };
        finishRefresh(Response.json({ accessToken: 'rotated-a', refreshToken: 'rotated-refresh-a' }));

        expect(await request).toBeInstanceOf(session.ApiError);
        expect(switched).toBe(true);
        expect(session.getAuthToken()).toBe('account-b');
        expect(session.getRefreshToken()).toBe('refresh-b');
    });

    it('publishes the refreshed credential pair before notifying a synchronous account switch', async () => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        let observedRefresh: string | null = null;
        const stop = session.subscribeAuthSession(() => {
            if (session.getAuthToken() !== 'rotated-a') return;
            observedRefresh = session.getRefreshToken();
            session.setAuthToken('account-b');
            session.setRefreshToken('refresh-b');
        });
        try {
            finishRefresh(Response.json({ accessToken: 'rotated-a', refreshToken: 'rotated-refresh-a' }));
            expect(await request).toBeInstanceOf(session.ApiError);
            expect(observedRefresh).toBe('rotated-refresh-a');
            expect(session.getAuthToken()).toBe('account-b');
            expect(session.getRefreshToken()).toBe('refresh-b');
        } finally { stop(); }
    });

    it('does not refresh an account removed while its refresh credentials are read', async () => {
        const session = await import('./api');
        const { isSupabaseSessionRetired } = await import('./supabase-readiness');
        session.setAuthToken('account-a');
        session.setRefreshToken('refresh-a');
        const originalRead = window.localStorage.getItem;
        let removed = false;
        window.localStorage.getItem = (key: string) => {
            const value = originalRead(key);
            if (!removed && key === 'halal-ticketin-refresh-token') {
                removed = true;
                window.localStorage.removeItem('halal-ticketin-access-token');
            }
            return value;
        };
        const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
            ? Response.json({ accessToken: 'rotated-a', refreshToken: 'rotated-refresh-a' })
            : new Response('{}', { status: 401 })));
        vi.stubGlobal('fetch', fetchMock);

        const result = await session.api.get('/api/v1/private-fixture').catch(error => error);

        expect(result).toBeInstanceOf(session.ApiError);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(session.getAuthToken()).toBeNull();
        expect(isSupabaseSessionRetired()).toBe(true);
    });

    it('does not revive a retired account from a refresh token after observed access-token removal', async () => {
        const session = await import('./api');
        const { isSupabaseSessionRetired } = await import('./supabase-readiness');
        session.setAuthToken('account-a');
        session.setRefreshToken('refresh-a');
        window.localStorage.removeItem('halal-ticketin-access-token');
        expect(session.getAuthToken()).toBeNull();
        expect(isSupabaseSessionRetired()).toBe(true);
        const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
            ? Response.json({ accessToken: 'rotated-a', refreshToken: 'rotated-refresh-a' })
            : new Response('{}', { status: 401 })));
        vi.stubGlobal('fetch', fetchMock);

        const result = await session.api.get('/api/v1/private-fixture').catch(error => error);

        expect(result).toBeInstanceOf(session.ApiError);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(session.getAuthToken()).toBeNull();
        expect(isSupabaseSessionRetired()).toBe(true);
    });

    it('does not restore tokens when a refresh completes after sign-out', async () => {
        const { session, request, finishRefresh, fetchMock } = await startPendingRefresh();
        session.clearAuthSession();
        finishRefresh(Response.json({ accessToken: 'stale-access', refreshToken: 'stale-refresh' }));
        expect(await request).toBeInstanceOf(session.ApiError);
        expect(session.getAuthToken()).toBeNull();
        expect(session.getRefreshToken()).toBeNull();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([200, 500])('preserves a later sign-in when the old refresh returns %s', async status => {
        const { session, request, finishRefresh } = await startPendingRefresh();
        session.clearAuthSession();
        session.setAuthToken('new-access');
        session.setRefreshToken('new-refresh');
        finishRefresh(Response.json({ accessToken: 'stale-access', refreshToken: 'stale-refresh' }, { status }));
        expect(await request).toBeInstanceOf(session.ApiError);
        expect(session.getAuthToken()).toBe('new-access');
        expect(session.getRefreshToken()).toBe('new-refresh');
    });
});

describe('shared browser credentials', () => {
    it('reconciles non-empty account changes and storage clearing before returning a token', async () => {
        const session = await import('./api');
        session.setAuthToken('account-a');
        const revision = session.getAuthSessionRevision();
        const listener = vi.fn();
        const stop = session.subscribeAuthSession(listener);
        window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
        expect(session.getAuthToken()).toBe('account-b');
        expect(session.getAuthSessionRevision()).toBeGreaterThan(revision);
        window.localStorage.removeItem('halal-ticketin-access-token');
        expect(session.getAuthToken()).toBeNull();
        expect(listener).toHaveBeenCalledTimes(2);
        stop();
    });

    it('does not refresh an account-A request using account-B credentials', async () => {
        const session = await import('./api');
        session.setAuthToken('account-a');
        session.setRefreshToken('refresh-a');
        let finish!: (response: Response) => void;
        const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
        vi.stubGlobal('fetch', fetchMock);
        const result = session.api.get('/api/v1/private').catch(error => error);
        session.setAuthToken('account-b');
        session.setRefreshToken('refresh-b');
        finish(new Response('{}', { status: 401 }));
        expect(await result).toBeInstanceOf(session.ApiError);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(session.getAuthToken()).toBe('account-b');
    });
});

it('invalidates pending reads while preserving identity for a proven API token refresh', async () => {
    const { session, request, finishRefresh, fetchMock } = await startPendingRefresh();
    const identity = session.getAuthIdentityRevision();
    const revision = session.getAuthSessionRevision();
    fetchMock.mockImplementationOnce(() => Promise.resolve(Response.json({ ok: true })));
    finishRefresh(Response.json({ accessToken: 'rotated-access', refreshToken: 'rotated-refresh' }));
    await request;
    expect(session.getAuthIdentityRevision()).toBe(identity);
    expect(session.getAuthSessionRevision()).toBeGreaterThan(revision);
});

it.each([200, 500])('owns concurrent refreshes by account and retains B deduplication after A completes with %s', async oldStatus => {
    const session = await import('./api');
    session.setAuthToken('access-a');
    session.setRefreshToken('refresh-a');
    const releases = new Map<string, (response: Response) => void>();
    const refreshCalls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/refresh')) {
            const refreshToken = JSON.parse(init!.body as string).refreshToken as string;
            refreshCalls.push(refreshToken);
            return new Promise<Response>(resolve => releases.set(refreshToken, resolve));
        }
        const token = new Headers(init?.headers).get('Authorization');
        return Promise.resolve(token === 'Bearer rotated-b'
            ? Response.json({ account: 'b' })
            : new Response('{}', { status: 401 }));
    }));
    const accountA = session.api.get('/api/v1/private').catch(error => error);
    await new Promise<void>(resolve => setImmediate(resolve));
    session.setAuthToken('access-b');
    session.setRefreshToken('refresh-b');
    const accountB = session.api.get('/api/v1/private').catch(error => error);
    const concurrentB = session.api.get('/api/v1/private').catch(error => error);
    try {
        await new Promise<void>(resolve => setImmediate(resolve));
        expect(refreshCalls).toEqual(['refresh-a', 'refresh-b']);
        releases.get('refresh-a')!(Response.json({ accessToken: 'stale-a' }, { status: oldStatus }));
        expect(await accountA).toBeInstanceOf(session.ApiError);
        const laterB = session.api.get('/api/v1/private').catch(error => error);
        await new Promise<void>(resolve => setImmediate(resolve));
        expect(refreshCalls).toEqual(['refresh-a', 'refresh-b']);
        releases.get('refresh-b')!(Response.json({ accessToken: 'rotated-b', refreshToken: 'rotated-refresh-b' }));
        expect(await Promise.all([accountB, concurrentB, laterB])).toEqual([{ account: 'b' }, { account: 'b' }, { account: 'b' }]);
        expect(session.getAuthToken()).toBe('rotated-b');
        expect(session.getRefreshToken()).toBe('rotated-refresh-b');
    } finally {
        releases.get('refresh-a')?.(new Response('{}', { status: 500 }));
        releases.get('refresh-b')?.(new Response('{}', { status: 500 }));
        await Promise.all([accountA, accountB, concurrentB]);
    }
});

it('publishes external credential changes before notifying activation subscribers', async () => {
    const session = await import('./api');
    const { subscribeWebSession } = await import('./web-session-activation');
    session.setAuthToken('account-a');
    window.localStorage.setItem('halal-ticketin:web-session-binding', 'account-a');
    const revision = session.getAuthSessionRevision();
    const authChanged = vi.fn();
    const activationChanged = vi.fn(() => session.getAuthToken());
    const stopAuth = session.subscribeAuthSession(authChanged);
    const stopActivation = subscribeWebSession(activationChanged);
    window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
    try {
        expect(() => session.getAuthToken()).not.toThrow();
        expect(session.getAuthToken()).toBe('account-b');
        expect(activationChanged).toHaveBeenCalledOnce();
        expect(activationChanged).toHaveReturnedWith('account-b');
        expect(authChanged).toHaveBeenCalledOnce();
        expect(session.getAuthSessionRevision()).toBe(revision + 1);
    } finally {
        stopAuth();
        stopActivation();
    }
});

it('never retries account A’s mutation with account B credentials after A refresh completes', async () => {
    const session = await import('./api');
    session.setAuthToken('access-a'); session.setRefreshToken('refresh-a');
    const privateRequests: Array<{ token: string | null; body: BodyInit | null | undefined }> = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
        if (url.endsWith('/auth/refresh')) return Promise.resolve(Response.json({ accessToken: 'rotated-a', refreshToken: 'refresh-a' }));
        privateRequests.push({ token: new Headers(init?.headers).get('Authorization'), body: init?.body });
        return Promise.resolve(new Response('{}', { status: privateRequests.length === 1 ? 401 : 200 }));
    }));
    const stop = session.subscribeAuthSession(() => {
        if (session.getAuthToken() === 'rotated-a') queueMicrotask(() => {
            session.setAuthToken('account-b'); session.setRefreshToken('refresh-b');
        });
    });
    try {
        const result = await session.api.post('/api/v1/private-mutation', { owner: 'a' }).catch(error => error);
        expect(result).toBeInstanceOf(session.ApiError);
        expect(privateRequests).toEqual([{ token: 'Bearer access-a', body: JSON.stringify({ owner: 'a' }) }]);
        expect(session.getAuthToken()).toBe('account-b');
    } finally { stop(); }
});

it('cancels an A mutation if shared storage changes during its initial token snapshot', async () => {
    const session = await import('./api');
    session.setAuthToken('access-a'); session.setRefreshToken('refresh-a');
    const originalRead = window.localStorage.getItem;
    let switched = false;
    window.localStorage.getItem = (key: string) => {
        const value = originalRead(key);
        if (!switched && key === 'halal-ticketin-access-token') {
            switched = true;
            window.localStorage.setItem('halal-ticketin-access-token', 'access-b');
            window.localStorage.setItem('halal-ticketin-refresh-token', 'refresh-b');
        }
        return value;
    };
    const fetchMock = vi.fn((url: string) => Promise.resolve(url.endsWith('/auth/refresh')
        ? Response.json({ accessToken: 'rotated-b', refreshToken: 'refresh-b' })
        : new Response('{}', { status: 401 })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await session.api.post('/api/v1/private-mutation', { owner: 'a' }).catch(error => error);
    expect(result).toBeInstanceOf(session.ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(session.getAuthToken()).toBe('access-b');
    expect(session.getRefreshToken()).toBe('refresh-b');
});
