import { connection } from 'next/server';
import { ExchangeRatesProvider } from '@/hooks/useExchangeRates';
import { getExchangeRatesInitialData } from '@/lib/exchange-rates-server';
import PricingPageClient from './PricingPageClient';

export default async function PricingPage() {
    await connection();
    const initialData = await getExchangeRatesInitialData();

    return (
        <ExchangeRatesProvider initialData={initialData}>
            <PricingPageClient />
        </ExchangeRatesProvider>
    );
}
