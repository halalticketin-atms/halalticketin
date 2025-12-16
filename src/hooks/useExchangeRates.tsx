'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { FALLBACK_EXCHANGE_RATES, SUPPORTED_CURRENCIES, type SupportedCurrency } from '@/lib/fees';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const CACHE_KEY = 'halal-ticketin:exchange-rates';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for frontend cache

interface ExchangeRatesData {
    base: string;
    date: string;
    rates: Record<string, number>;
    currencies: typeof SUPPORTED_CURRENCIES;
    lastUpdated: string;
}

interface CachedRates {
    data: ExchangeRatesData;
    fetchedAt: number;
}

interface ExchangeRatesContextValue {
    rates: Record<string, number>;
    currencies: typeof SUPPORTED_CURRENCIES;
    isLoading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    refresh: () => Promise<void>;
    convertFromGBP: (amountGBP: number, currency: string) => number;
    convertToGBP: (amount: number, currency: string) => number;
    getRate: (from: string, to: string) => number;
}

const ExchangeRatesContext = createContext<ExchangeRatesContextValue | null>(null);

/**
 * Load cached rates from localStorage
 */
function loadCachedRates(): CachedRates | null {
    if (typeof window === 'undefined') return null;

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const parsed = JSON.parse(cached) as CachedRates;

        // Check if cache is still valid
        if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

/**
 * Save rates to localStorage cache
 */
function saveCachedRates(data: ExchangeRatesData): void {
    if (typeof window === 'undefined') return;

    try {
        const cached: CachedRates = {
            data,
            fetchedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Provider component for exchange rates
 */
export function ExchangeRatesProvider({ children }: { children: ReactNode }) {
    const [rates, setRates] = useState<Record<string, number>>(FALLBACK_EXCHANGE_RATES);
    const [currencies, setCurrencies] = useState<typeof SUPPORTED_CURRENCIES>(SUPPORTED_CURRENCIES);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchRates = useCallback(async (useCache = true) => {
        // Try cache first
        if (useCache) {
            const cached = loadCachedRates();
            if (cached) {
                setRates(cached.data.rates);
                setCurrencies(cached.data.currencies);
                setLastUpdated(new Date(cached.data.lastUpdated));
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/api/v1/exchange-rates`, {
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch exchange rates: ${response.status}`);
            }

            const data = await response.json() as ExchangeRatesData;

            setRates(data.rates);
            setCurrencies(data.currencies);
            setLastUpdated(new Date(data.lastUpdated));
            saveCachedRates(data);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch exchange rates';
            setError(message);
            console.warn('Exchange rates fetch failed, using fallback rates:', message);
            // Keep using fallback rates
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch rates on mount
    useEffect(() => {
        void fetchRates();
    }, [fetchRates]);

    // Conversion functions
    const convertFromGBP = useCallback((amountGBP: number, currency: string): number => {
        const rate = rates[currency.toUpperCase()] ?? 1;
        return amountGBP * rate;
    }, [rates]);

    const convertToGBP = useCallback((amount: number, currency: string): number => {
        const rate = rates[currency.toUpperCase()] ?? 1;
        return amount / rate;
    }, [rates]);

    const getRate = useCallback((from: string, to: string): number => {
        const fromRate = rates[from.toUpperCase()] ?? 1;
        const toRate = rates[to.toUpperCase()] ?? 1;
        return toRate / fromRate;
    }, [rates]);

    const refresh = useCallback(async () => {
        await fetchRates(false); // Skip cache
    }, [fetchRates]);

    const value = useMemo<ExchangeRatesContextValue>(() => ({
        rates,
        currencies,
        isLoading,
        error,
        lastUpdated,
        refresh,
        convertFromGBP,
        convertToGBP,
        getRate,
    }), [rates, currencies, isLoading, error, lastUpdated, refresh, convertFromGBP, convertToGBP, getRate]);

    return (
        <ExchangeRatesContext.Provider value={value}>
            {children}
        </ExchangeRatesContext.Provider>
    );
}

/**
 * Hook to use exchange rates in components
 */
export function useExchangeRates() {
    const context = useContext(ExchangeRatesContext);

    if (!context) {
        // If not in provider, return fallback values
        return {
            rates: FALLBACK_EXCHANGE_RATES,
            currencies: SUPPORTED_CURRENCIES,
            isLoading: false,
            error: null,
            lastUpdated: null,
            refresh: async () => { },
            convertFromGBP: (amountGBP: number, currency: string) => {
                const rate = FALLBACK_EXCHANGE_RATES[currency.toUpperCase()] ?? 1;
                return amountGBP * rate;
            },
            convertToGBP: (amount: number, currency: string) => {
                const rate = FALLBACK_EXCHANGE_RATES[currency.toUpperCase()] ?? 1;
                return amount / rate;
            },
            getRate: (from: string, to: string) => {
                const fromRate = FALLBACK_EXCHANGE_RATES[from.toUpperCase()] ?? 1;
                const toRate = FALLBACK_EXCHANGE_RATES[to.toUpperCase()] ?? 1;
                return toRate / fromRate;
            },
        } satisfies ExchangeRatesContextValue;
    }

    return context;
}

/**
 * Get list of supported currency codes
 */
export function getSupportedCurrencyCodes(): SupportedCurrency[] {
    return Object.keys(SUPPORTED_CURRENCIES) as SupportedCurrency[];
}
