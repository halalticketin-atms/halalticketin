import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';

vi.mock('server-only', () => ({}));

import { getExchangeRatesInitialData } from './exchange-rates-server';

const fetchMock = vi.fn();
const ratesData = {
    base: 'GBP', date: '2026-10-03', rates: { GBP: 1, EUR: 1.2 },
    currencies: SUPPORTED_CURRENCIES, lastUpdated: '2026-10-03T10:00:00Z',
};

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
});
afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('anonymous exchange rates server snapshot', () => {
    it('loads the public contract without credentials or a persistent cache, bounded to three seconds', async () => {
        const timeout = vi.spyOn(AbortSignal, 'timeout');
        fetchMock.mockResolvedValue({ ok: true, json: async () => ratesData });
        expect(await getExchangeRatesInitialData()).toEqual(ratesData);
        expect(timeout).toHaveBeenCalledWith(3000);
        expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/v1/exchange-rates', {
            cache: 'no-store', credentials: 'omit', headers: { Accept: 'application/json' },
            signal: expect.any(AbortSignal),
        });
    });

    it('falls back to the browser flow for a failed API response', async () => {
        const json = vi.fn();
        fetchMock.mockResolvedValue({ ok: false, json });
        expect(await getExchangeRatesInitialData()).toBeNull();
        expect(json).not.toHaveBeenCalled();
    });

    it('falls back when the request rejects', async () => {
        fetchMock.mockRejectedValue(new Error('Network unavailable'));
        expect(await getExchangeRatesInitialData()).toBeNull();
    });

    it('falls back when the API body cannot be parsed', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } });
        expect(await getExchangeRatesInitialData()).toBeNull();
    });
});
