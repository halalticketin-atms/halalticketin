import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let storage: Map<string, string>;
let cookies: Map<string, string>;
beforeEach(() => {
    vi.resetModules();
    storage = new Map();
    cookies = new Map();
    vi.stubGlobal('window', {
        location: new URL('https://frontend.example.test'),
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        },
        addEventListener: vi.fn(),
    });
    vi.stubGlobal('document', {
        get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
        set cookie(value: string) {
            const [key, item] = value.split(';')[0].split('=');
            if (value.includes('Max-Age=0')) cookies.delete(key);
            else cookies.set(key, item);
        },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

async function session() {
    const client = await import('./web-session-client');
    const api = await import('./api');
    return { ...client, ...api };
}

describe('web session activation', () => {
    it('acknowledges once and retains a valid returning backend-password session without rotating its seed', async () => {
        const current = await session();
        current.setAuthToken('backend-password');
        expect(await current.ensureWebSession()).toBe(true);
        const nonce = storage.get('halal-ticketin:web-session-nonce')!;
        expect(current.isWebSessionSeedCurrent(nonce)).toBe(true);
        expect(await current.ensureWebSession()).toBe(true);
        expect(fetch).toHaveBeenCalledOnce();
        expect(storage.get('halal-ticketin:web-session-nonce')).toBe(nonce);
    });

    it('clears activation synchronously on offline logout and rejects a late account-A acknowledgement', async () => {
        let release!: (response: Response) => void;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
        const current = await session();
        current.setAuthToken('account-a');
        const pending = current.ensureWebSession();
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        const nonce = storage.get('halal-ticketin:web-session-nonce')!;
        cookies.set('ht-web-session-active', nonce);
        current.clearAuthSession();
        expect(cookies.has('ht-web-session-active')).toBe(false);
        expect(current.isWebSessionSeedCurrent(nonce)).toBe(false);
        release(new Response(null, { status: 204 }));
        expect(await pending).toBe(false);
        expect(cookies.has('ht-web-session-active')).toBe(false);
    });

    it('serialises account writes and only activates the current shared account', async () => {
        let release!: (response: Response) => void;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
        const current = await session();
        current.setAuthToken('account-a');
        const accountA = current.ensureWebSession();
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        window.localStorage.setItem('halal-ticketin-access-token', 'account-b');
        const accountB = current.ensureWebSession();
        release(new Response(null, { status: 204 }));
        expect(await accountA).toBe(false);
        expect(await accountB).toBe(true);
        const requests = vi.mocked(fetch).mock.calls;
        expect(JSON.parse(requests.at(-1)![1]!.body as string).accessToken).toBe('account-b');
        expect(current.isWebSessionSeedCurrent(storage.get('halal-ticketin:web-session-nonce')!)).toBe(true);
    });

    it('leaves SSR inactive after a failed acknowledgement while preserving browser credentials', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
        const current = await session();
        current.setAuthToken('valid-browser-token');
        expect(await current.ensureWebSession()).toBe(false);
        expect(current.getAuthToken()).toBe('valid-browser-token');
        expect(cookies.has('ht-web-session-active')).toBe(false);
    });

    it('never restores a marker overwritten by another tab during a pending write', async () => {
        let release!: (response: Response) => void;
        vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
        const current = await session();
        current.setAuthToken('account-a');
        const pending = current.ensureWebSession();
        await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
        storage.set('halal-ticketin:web-session-nonce', 'other-tab-nonce-1234567890');
        release(new Response(null, { status: 204 }));
        expect(await pending).toBe(false);
        expect(cookies.has('ht-web-session-active')).toBe(false);
    });
});

it('repairs a missing HttpOnly cookie on startup without rotating valid returning seed metadata', async () => {
    storage.set('halal-ticketin-access-token', 'returning-account');
    storage.set('halal-ticketin:web-session-binding', 'returning-account');
    storage.set('halal-ticketin:web-session-nonce', 'returning-nonce-1234567890');
    cookies.set('ht-web-session-active', 'returning-nonce-1234567890');
    const current = await session();
    expect(current.isWebSessionSeedCurrent('returning-nonce-1234567890')).toBe(true);
    expect(await current.ensureWebSession()).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).nonce).toBe('returning-nonce-1234567890');
});

it('preserves another tab’s current binding when reconciling its account-B credentials', async () => {
    const current = await session();
    current.setAuthToken('account-a');
    await current.ensureWebSession();
    storage.set('halal-ticketin-access-token', 'account-b');
    storage.set('halal-ticketin:web-session-binding', 'account-b');
    storage.set('halal-ticketin:web-session-nonce', 'account-b-nonce-1234567890');
    cookies.set('ht-web-session-active', 'account-b-nonce-1234567890');
    expect(current.getAuthToken()).toBe('account-b');
    expect(current.isWebSessionSeedCurrent('account-b-nonce-1234567890')).toBe(true);
    expect(cookies.get('ht-web-session-active')).toBe('account-b-nonce-1234567890');
});

it('rejects a token-B session paired with account-A seed metadata', async () => {
    storage.set('halal-ticketin-access-token', 'account-b');
    storage.set('halal-ticketin:web-session-binding', 'account-a');
    storage.set('halal-ticketin:web-session-nonce', 'account-a-nonce-1234567890');
    cookies.set('ht-web-session-active', 'account-a-nonce-1234567890');
    const current = await session();
    expect(current.isWebSessionSeedCurrent('account-a-nonce-1234567890')).toBe(false);
});

it('repairs a late account-A POST using the current cross-tab account-B token and nonce', async () => {
    let release!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const current = await session();
    current.setAuthToken('account-a');
    const pendingA = current.ensureWebSession();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    storage.set('halal-ticketin-access-token', 'account-b');
    storage.set('halal-ticketin:web-session-binding', 'account-b');
    storage.set('halal-ticketin:web-session-nonce', 'account-b-nonce-1234567890');
    cookies.set('ht-web-session-active', 'account-b-nonce-1234567890');
    release(new Response(null, { status: 204 }));
    expect(await pendingA).toBe(false);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string)).toEqual({ accessToken: 'account-b', nonce: 'account-b-nonce-1234567890' });
});

it('repairs a late DELETE after another tab has activated account B', async () => {
    let release!: (response: Response) => void;
    const current = await session();
    current.setAuthToken('account-a');
    await current.ensureWebSession();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    current.clearAuthSession();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    storage.set('halal-ticketin-access-token', 'account-b');
    storage.set('halal-ticketin:web-session-binding', 'account-b');
    storage.set('halal-ticketin:web-session-nonce', 'account-b-nonce-1234567890');
    cookies.set('ht-web-session-active', 'account-b-nonce-1234567890');
    release(new Response(null, { status: 204 }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
    expect(JSON.parse(vi.mocked(fetch).mock.calls[2][1]!.body as string)).toEqual({ accessToken: 'account-b', nonce: 'account-b-nonce-1234567890' });
});

it('bounds acknowledgement failure and retains browser fallback credentials', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Timed out')));
    }));
    const current = await session();
    current.setAuthToken('browser-fallback');
    const pending = current.ensureWebSession();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe(false);
    expect(current.getAuthToken()).toBe('browser-fallback');
    expect(cookies.has('ht-web-session-active')).toBe(false);
});
