import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';

const mocks = vi.hoisted(() => ({ connection: vi.fn(), initialData: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: null, memberships: [] }) }));
vi.mock('next/server', () => ({ connection: mocks.connection }));
vi.mock('@/lib/exchange-rates-server', () => ({ getExchangeRatesInitialData: mocks.initialData }));

import PricingPage from './page';

beforeEach(() => {
    mocks.connection.mockReset().mockResolvedValue(undefined);
    mocks.initialData.mockReset().mockResolvedValue({
        base: 'GBP', date: '2026-10-03', rates: { GBP: 1, EUR: 1.2 },
        currencies: SUPPORTED_CURRENCIES, lastUpdated: '2026-10-03T10:00:00Z',
    });
});

describe('pricing initial rendering', () => {
    it('shows the final selected currency without a rates loading placeholder in server HTML', async () => {
        const html = renderToStaticMarkup(await PricingPage());
        const currency = html.match(/<button\b[^>]*role="combobox"[\s\S]*?<\/button>/)?.[0];
        expect(currency).toContain('GBP');
        expect(currency).toContain('£');
        expect(html).not.toContain('Loading rates');
        expect(mocks.connection).toHaveBeenCalledOnce();
        expect(mocks.initialData).toHaveBeenCalledOnce();
        expect(mocks.connection.mock.invocationCallOrder[0]).toBeLessThan(mocks.initialData.mock.invocationCallOrder[0]);
    });

    it('keeps the browser loading flow available when the anonymous snapshot fails', async () => {
        mocks.initialData.mockResolvedValue(null);
        const html = renderToStaticMarkup(await PricingPage());
        expect(html).toContain('Loading rates');
        expect(html).toContain('GBP');
    });
});
