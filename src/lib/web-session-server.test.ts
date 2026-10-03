import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: cookiesMock }));

import { encodeWebSessionCookie } from './web-session-cookie';
import { fetchPrivateJson, getVerifiedWebSession } from './web-session-server';
import { WEB_SESSION_ACTIVATION_COOKIE, WEB_SESSION_COOKIE } from './web-session-types';

const fetchMock = vi.fn();
const nonceA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const nonceB = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const store = (accessToken: string, nonce: string, activation: string | undefined = nonce) => ({
    get: (name: string) => name === WEB_SESSION_COOKIE
        ? { value: encodeWebSessionCookie({ accessToken, nonce }) }
        : name === WEB_SESSION_ACTIVATION_COOKIE && activation ? { value: activation } : undefined,
});
const profile = (id: string) => ({ user: { id, name: id }, memberships: [], needsOnboarding: false, isOrganizer: true });

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    fetchMock.mockReset();
    cookiesMock.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('request-local private server verification', () => {
    it('refuses a stale cookie/activation pair before any private request', async () => {
        cookiesMock.mockResolvedValue(store('account-A-token', nonceA, nonceB));
        expect(await getVerifiedWebSession()).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses an inactive or missing session without requesting private data', async () => {
        cookiesMock.mockResolvedValue({ get: () => undefined });
        expect(await getVerifiedWebSession()).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps concurrent credentials and responses separate and never exposes tokens in seed props', async () => {
        cookiesMock.mockResolvedValueOnce(store('account-A-token', nonceA)).mockResolvedValueOnce(store('account-B-token', nonceB));
        fetchMock.mockImplementation(async (url: string, options: RequestInit) => {
            const account = (options.headers as Record<string, string>).Authorization === 'Bearer account-A-token' ? 'A' : 'B';
            await new Promise(resolve => setTimeout(resolve, account === 'A' ? 5 : 0));
            return { ok: true, json: async () => url.endsWith('/auth/me') ? profile(account) : { organizers: [{ id: `org-${account}` }] } };
        });
        const [a, b] = await Promise.all([getVerifiedWebSession(), getVerifiedWebSession()]);
        expect(a?.seed.profile.user?.id).toBe('A');
        expect(b?.seed.profile.user?.id).toBe('B');
        expect(a?.seed.organizers[0]?.id).toBe('org-A');
        expect(b?.seed.organizers[0]?.id).toBe('org-B');
        expect(JSON.stringify([a?.seed, b?.seed])).not.toContain('account-A-token');
        expect(JSON.stringify([a?.seed, b?.seed])).not.toContain('account-B-token');
        expect(fetchMock).toHaveBeenCalledTimes(4);
        for (const [, options] of fetchMock.mock.calls) {
            expect(options.cache).toBe('no-store');
            expect(options.credentials).toBe('omit');
            expect(options.signal).toBeInstanceOf(AbortSignal);
        }
    });

    it('falls back when backend verification rejects the token', async () => {
        cookiesMock.mockResolvedValue(store('expired-token', nonceA));
        fetchMock.mockResolvedValue({ ok: false, status: 401 });
        expect(await getVerifiedWebSession()).toBeNull();
    });

    it('falls back on network failure rather than inventing private initial data', async () => {
        fetchMock.mockRejectedValue(new Error('Synthetic timeout'));
        expect(await fetchPrivateJson('synthetic-token', '/api/v1/orders')).toBeNull();
    });
});
