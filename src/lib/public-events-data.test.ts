import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { getPublicEventsSnapshot } from './public-events-data';

afterEach(() => vi.unstubAllGlobals());

describe('anonymous catalogue snapshot', () => {
    it('loads the first page without credentials or a persistent cache', async () => {
        const snapshot = { events: [{ id: 'public-event' }], hasMore: true };
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot });
        vi.stubGlobal('fetch', fetchMock);

        expect(await getPublicEventsSnapshot()).toEqual(snapshot);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toMatch(/\/api\/v1\/public\/events\?limit=12$/);
        expect(options).toMatchObject({ cache: 'no-store', credentials: 'omit' });
        expect(options.headers).toBeUndefined();
        expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it.each(['unavailable', 'network', 'invalid-json'])('keeps browser loading available after %s failure', async failure => {
        const fetchMock = failure === 'network'
            ? vi.fn().mockRejectedValue(new Error('Network unavailable'))
            : vi.fn().mockResolvedValue({
                ok: failure !== 'unavailable',
                json: async () => { throw new Error('Invalid JSON'); },
            });
        vi.stubGlobal('fetch', fetchMock);
        expect(await getPublicEventsSnapshot()).toBeNull();
    });
});
