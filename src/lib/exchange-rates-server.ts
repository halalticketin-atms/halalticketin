import 'server-only';

import type { ExchangeRatesData } from '@/hooks/useExchangeRates';

export async function getExchangeRatesInitialData(): Promise<ExchangeRatesData | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/v1/exchange-rates`, {
            cache: 'no-store',
            credentials: 'omit',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) return null;
        return await response.json() as ExchangeRatesData;
    } catch {
        return null;
    }
}
