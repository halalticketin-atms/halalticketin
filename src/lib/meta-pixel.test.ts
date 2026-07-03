import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initMetaPixel, teardownMetaPixel } from './meta-pixel';

describe('teardownMetaPixel', () => {
    const cookieWrites: string[] = [];
    let fbqMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        cookieWrites.length = 0;
        fbqMock = vi.fn();

        vi.stubGlobal('window', {
            location: {
                hostname: 'tickets.halalticketin.com',
                protocol: 'https:',
            },
            fbq: fbqMock,
        });

        vi.stubGlobal('document', {
            set cookie(value: string) {
                cookieWrites.push(value);
            },
        });
    });

    it('initializes with normalized advanced matching email when provided', () => {
        teardownMetaPixel();
        fbqMock.mockClear();

        initMetaPixel('123456789012345', { em: ' Buyer@Example.COM ' });

        expect(fbqMock).toHaveBeenCalledWith('init', '123456789012345', {
            em: 'buyer@example.com',
        });
    });

    it('re-initializes once when advanced matching email becomes available later', () => {
        teardownMetaPixel();
        fbqMock.mockClear();

        initMetaPixel('123456789012345');
        initMetaPixel('123456789012345', { em: 'buyer@example.com' });
        initMetaPixel('123456789012345', { em: 'buyer@example.com' });

        const initCalls = fbqMock.mock.calls.filter((call) => call[0] === 'init');
        expect(initCalls).toEqual([
            ['init', '123456789012345'],
            ['init', '123456789012345', { em: 'buyer@example.com' }],
        ]);
    });

    it('initializes without user data when no email is provided', () => {
        teardownMetaPixel();
        fbqMock.mockClear();

        initMetaPixel('123456789012345');
        initMetaPixel('123456789012345');

        const initCalls = fbqMock.mock.calls.filter((call) => call[0] === 'init');
        expect(initCalls).toEqual([['init', '123456789012345']]);
    });

    it('revokes Meta consent and clears host and parent-domain identifiers', () => {
        teardownMetaPixel();

        expect(fbqMock).toHaveBeenCalledWith('consent', 'revoke');
        expect(cookieWrites).toContain(
            '_fbp=; Max-Age=0; Path=/; SameSite=Lax; Domain=.halalticketin.com; Secure',
        );
        expect(cookieWrites).toContain(
            '_fbc=; Max-Age=0; Path=/; SameSite=Lax; Domain=.halalticketin.com; Secure',
        );
        expect(cookieWrites).toContain(
            '_fbp=; Max-Age=0; Path=/; SameSite=Lax; Domain=tickets.halalticketin.com; Secure',
        );
    });
});
