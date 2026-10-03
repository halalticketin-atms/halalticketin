import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decodeWebSessionCookie } from '@/lib/web-session-cookie';
import { WEB_SESSION_COOKIE } from '@/lib/web-session-types';

const session = { accessToken: 'synthetic-account-A-token', nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
const request = (body: unknown, origin = 'https://web.example.test') => new Request('https://web.example.test/api/web-session', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify(body),
});

beforeEach(() => { vi.resetModules(); vi.stubEnv('NODE_ENV', 'production'); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('same-origin web session bridge', () => {
    it('stores token and nonce atomically, securely, without returning either or setting activation', async () => {
        const { POST } = await import('./route');
        const response = await POST(request(session));
        expect(response.status).toBe(204);
        expect(await response.text()).toBe('');
        expect(response.headers.get('cache-control')).toContain('no-store');
        const cookies = response.headers.getSetCookie();
        expect(cookies).toHaveLength(1);
        expect(cookies[0]).toContain('HttpOnly');
        expect(cookies[0]).toContain('Secure');
        expect(cookies[0]).toContain('SameSite=lax');
        expect(cookies[0]).toContain('Path=/');
        expect(cookies[0]).not.toContain('Domain=');
        const value = cookies[0].split(';')[0].slice(WEB_SESSION_COOKIE.length + 1);
        expect(decodeWebSessionCookie(value, session.nonce)).toEqual(session);
        expect(decodeWebSessionCookie(value, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')).toBeNull();
        expect(decodeWebSessionCookie(value, undefined)).toBeNull();
    });

    it('checks the browser Host when Next uses an internal request URL', async () => {
        const { POST } = await import('./route');
        const make = (origin: string, site = 'same-origin') => new Request('https://localhost:3210/api/web-session', {
            method: 'POST', headers: { Host: 'web.example.test', Origin: origin, 'Content-Type': 'application/json', 'Sec-Fetch-Site': site },
            body: JSON.stringify(session),
        });
        expect((await POST(make('https://web.example.test'))).status).toBe(204);
        for (const origin of ['https://localhost:3210', 'http://web.example.test', 'https://attacker.example.test']) {
            expect((await POST(make(origin))).status).toBe(403);
        }
        expect((await POST(make('https://web.example.test', 'cross-site'))).status).toBe(403);
    });

    it.each(['https://attacker.example.test', 'null', ''])('rejects origin %s without changing cookies', async origin => {
        const { POST } = await import('./route');
        const response = await POST(request(session, origin));
        expect(response.status).toBe(403);
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it.each([
        { ...session, accessToken: '' },
        { ...session, accessToken: 'a\r\nb' },
        { ...session, accessToken: 'a'.repeat(2049) },
        { ...session, nonce: 'short' },
        { ...session, nonce: '../invalid-marker/../../../' },
        null,
    ])('rejects malformed bridge input without setting cookies', async body => {
        const { POST } = await import('./route');
        const response = await POST(request(body));
        expect(response.status).toBe(400);
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it('clears only the HttpOnly cookie and leaves client activation authority untouched', async () => {
        const { DELETE } = await import('./route');
        const response = await DELETE(new Request('https://web.example.test/api/web-session', {
            method: 'DELETE', headers: { Origin: 'https://web.example.test' },
        }));
        expect(response.status).toBe(204);
        expect(response.headers.getSetCookie()).toHaveLength(1);
        expect(response.headers.getSetCookie()[0].split(';')[0]).toBe(`${WEB_SESSION_COOKIE}=`);
        expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    });
});
