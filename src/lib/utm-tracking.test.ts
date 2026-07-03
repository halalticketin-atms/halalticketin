import { beforeEach, describe, expect, it, vi } from 'vitest';

import { captureUtmParams, getStoredUtmParams } from './utm-tracking';

describe('utm-tracking', () => {
    let sessionStorageState: Record<string, string>;

    const stubWindow = (search: string) => {
        vi.stubGlobal('window', {
            location: { search },
            sessionStorage: {
                getItem: vi.fn((key: string) => sessionStorageState[key] ?? null),
                setItem: vi.fn((key: string, value: string) => {
                    sessionStorageState[key] = value;
                }),
            },
        });
    };

    beforeEach(() => {
        sessionStorageState = {};
    });

    it('captures UTM params from the URL and round-trips them through session storage', () => {
        stubWindow('?utm_source=facebook&utm_medium=cpc&utm_campaign=eid_2026&fbclid=abc');

        captureUtmParams();

        expect(getStoredUtmParams()).toEqual({
            utmSource: 'facebook',
            utmMedium: 'cpc',
            utmCampaign: 'eid_2026',
        });
    });

    it('keeps previously captured params when the URL has no UTM params', () => {
        stubWindow('?utm_source=instagram');
        captureUtmParams();

        stubWindow('?ref=homepage');
        captureUtmParams();

        expect(getStoredUtmParams()).toEqual({ utmSource: 'instagram' });
    });

    it('overwrites the stored attribution when a new UTM touch arrives', () => {
        stubWindow('?utm_source=instagram&utm_medium=social');
        captureUtmParams();

        stubWindow('?utm_source=facebook');
        captureUtmParams();

        expect(getStoredUtmParams()).toEqual({ utmSource: 'facebook' });
    });

    it('returns an empty object when nothing was captured', () => {
        stubWindow('');

        captureUtmParams();

        expect(getStoredUtmParams()).toEqual({});
    });

    it('truncates oversized values to 255 characters', () => {
        stubWindow(`?utm_source=${'a'.repeat(300)}`);

        captureUtmParams();

        expect(getStoredUtmParams().utmSource).toHaveLength(255);
    });
});
