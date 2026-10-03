import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getPublicEventInitialData } from './public-event-server';

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    fetchMock.mockReset();
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('anonymous public event server data', () => {
    it('uses a fresh anonymous request without access, preview or auth parameters', async () => {
        const data = { event: { title: 'Public gathering' }, tickets: [] };
        fetchMock.mockResolvedValue({ ok: true, json: async () => data });

        expect(await getPublicEventInitialData('public/event?preview=1')).toEqual(data);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.test/api/v1/public/events/public%2Fevent%3Fpreview%3D1',
            { cache: 'no-store', credentials: 'omit', signal: expect.any(AbortSignal) },
        );
    });

    it.each([403, 404, 500])('does not expose a %s response as initial page data', async status => {
        const json = vi.fn();
        fetchMock.mockResolvedValue({ ok: false, status, json });
        expect(await getPublicEventInitialData('private-event')).toBeNull();
        expect(json).not.toHaveBeenCalled();
    });

    it('lets the browser retry when the server API is unavailable', async () => {
        fetchMock.mockRejectedValue(new Error('Network unavailable'));
        expect(await getPublicEventInitialData('public-event')).toBeNull();
    });
});
