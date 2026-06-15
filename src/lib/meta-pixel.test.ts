import { beforeEach, describe, expect, it, vi } from 'vitest';

import { teardownMetaPixel } from './meta-pixel';

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
