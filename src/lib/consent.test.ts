import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readConsentPreferences, writeConsentPreferences } from './consent';

describe('consent preferences v2', () => {
    beforeEach(() => {
        vi.stubGlobal('document', { cookie: '' });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('writes analytics and marketing with version 2', () => {
        writeConsentPreferences({ analytics: true, marketing: false, version: 2 });

        expect(readConsentPreferences()).toMatchObject({
            analytics: true,
            marketing: false,
            version: 2,
        });
    });

    it('treats version 1 marketing-only cookies as stale', () => {
        document.cookie = `ht_consent=${encodeURIComponent(JSON.stringify({ marketing: true, version: 1 }))}; Path=/`;

        expect(readConsentPreferences()).toBeNull();
    });
});
