/**
 * Fee calculation utilities for Halal Ticketin platform (Frontend)
 * 
 * This mirrors the backend fee calculations to ensure consistency
 * across the platform for fee display and calculations.
 * 
 * Fee structure:
 * - PAYG: £0.55 per ticket (converted to local currency)
 * - Token: Variable based on credits purchased (€0.27-0.55)
 * - Charity: £0.20 per ticket (requires verified charity status)
 */

// Base fees in GBP (will be converted to transaction currency)
export const PAYG_FEE_GBP = 0.55; // £0.55 per ticket
export const CHARITY_FEE_GBP = 0.20; // £0.20 per ticket

// Credit system constants (sold in GBP, used for token-based pricing)
export const MIN_CREDITS = 100;
export const MAX_CREDITS = 20000;
export const MAX_PRICE_GBP = 0.47; // £0.47 per credit at 100 credits (equivalent to ~€0.55)
export const MIN_PRICE_GBP = 0.23; // £0.23 per credit at 20,000 credits (equivalent to ~€0.27)

// Legacy EUR constants (kept for reference)
export const MAX_PRICE_EUR = 0.55; // €0.55 per credit at 100 credits
export const MIN_PRICE_EUR = 0.27; // €0.27 per credit at 20,000 credits

/**
 * Supported currencies with display info
 * Matches backend supported currencies
 */
export const SUPPORTED_CURRENCIES = {
    GBP: { symbol: '£', name: 'British Pound' },
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { symbol: 'A$', name: 'Australian Dollar' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham' },
    SAR: { symbol: '﷼', name: 'Saudi Riyal' },
    MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
    SGD: { symbol: 'S$', name: 'Singapore Dollar' },
    INR: { symbol: '₹', name: 'Indian Rupee' },
    PKR: { symbol: '₨', name: 'Pakistani Rupee' },
    TRY: { symbol: '₺', name: 'Turkish Lira' },
    NGN: { symbol: '₦', name: 'Nigerian Naira' },
    ZAR: { symbol: 'R', name: 'South African Rand' },
    EGP: { symbol: 'E£', name: 'Egyptian Pound' },
    IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
    BDT: { symbol: '৳', name: 'Bangladeshi Taka' },
} as const;

export type SupportedCurrency = keyof typeof SUPPORTED_CURRENCIES;

/**
 * Static fallback exchange rates (value = how many units per 1 GBP)
 * Used when API is unavailable
 */
export const FALLBACK_EXCHANGE_RATES: Record<string, number> = {
    GBP: 1.0,
    EUR: 1.17,
    USD: 1.27,
    CAD: 1.72,
    AUD: 1.93,
    AED: 4.66,
    SAR: 4.76,
    MYR: 5.63,
    SGD: 1.70,
    INR: 106.0,
    PKR: 353.0,
    TRY: 43.5,
    NGN: 1950.0,
    ZAR: 23.0,
    EGP: 62.0,
    IDR: 20100.0,
    BDT: 152.0,
};

export type FeeTier = 'payg' | 'token' | 'charity';

/**
 * Get exchange rate for a currency (using provided rates or fallback)
 */
export function getExchangeRate(
    currency: string,
    rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
    return rates[currency.toUpperCase()] ?? 1;
}

/**
 * Convert GBP amount to target currency
 */
export function convertFromGBP(
    amountGBP: number,
    targetCurrency: string,
    rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
    const rate = getExchangeRate(targetCurrency, rates);
    return amountGBP * rate;
}

/**
 * Convert amount to GBP from source currency
 */
export function convertToGBP(
    amount: number,
    sourceCurrency: string,
    rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
    const rate = getExchangeRate(sourceCurrency, rates);
    return amount / rate;
}

/**
 * Calculate price per credit based on volume purchased (in GBP)
 * Uses linear interpolation between MAX_PRICE_GBP at MIN_CREDITS
 * and MIN_PRICE_GBP at MAX_CREDITS
 */
export function calculateCreditPrice(credits: number): number {
    if (credits < MIN_CREDITS) {
        return MAX_PRICE_GBP; // Use max price for below minimum
    }
    const clampedCredits = Math.min(credits, MAX_CREDITS);
    return MAX_PRICE_GBP - (MAX_PRICE_GBP - MIN_PRICE_GBP) *
        (clampedCredits - MIN_CREDITS) / (MAX_CREDITS - MIN_CREDITS);
}

export interface FeeCalculationParams {
    feeTier: FeeTier;
    ticketCount: number;
    currency: string;
    customBookingFee?: number;
    creditsAvailable?: number;
    exchangeRates?: Record<string, number>;
}

export interface FeeCalculationResult {
    feePerTicket: number;
    totalFee: number;
    ticketsUsingCredits: number;
    ticketsUsingPayg: number;
    creditFeePerTicket?: number;
    feeDescription: string;
}

/**
 * Calculate the fee per ticket based on tier
 */
export function calculateFeePerTicket(
    feeTier: FeeTier,
    currency: string,
    customBookingFee?: number,
    rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
    if (feeTier === 'token' && customBookingFee !== undefined && customBookingFee >= 0) {
        return customBookingFee;
    }

    if (feeTier === 'charity') {
        return convertFromGBP(CHARITY_FEE_GBP, currency, rates);
    }

    return convertFromGBP(PAYG_FEE_GBP, currency, rates);
}

/**
 * Calculate platform fee for ticket sales
 */
export function calculatePlatformFee(params: FeeCalculationParams): FeeCalculationResult {
    const {
        feeTier,
        ticketCount,
        currency,
        customBookingFee,
        creditsAvailable = 0,
        exchangeRates = FALLBACK_EXCHANGE_RATES
    } = params;

    if (feeTier === 'charity') {
        const feePerTicket = convertFromGBP(CHARITY_FEE_GBP, currency, exchangeRates);
        return {
            feePerTicket,
            totalFee: feePerTicket * ticketCount,
            ticketsUsingCredits: 0,
            ticketsUsingPayg: ticketCount,
            feeDescription: `${getCurrencySymbol(currency)}${feePerTicket.toFixed(2)}/ticket (Charity rate)`
        };
    }

    if (feeTier === 'token' && creditsAvailable > 0) {
        const ticketsUsingCredits = Math.min(creditsAvailable, ticketCount);
        const ticketsUsingPayg = ticketCount - ticketsUsingCredits;

        const creditFeePerTicket = customBookingFee !== undefined
            ? customBookingFee
            : convertFromGBP(PAYG_FEE_GBP, currency, exchangeRates);
        const paygFeePerTicket = convertFromGBP(PAYG_FEE_GBP, currency, exchangeRates);

        const totalFee = (ticketsUsingCredits * creditFeePerTicket) +
            (ticketsUsingPayg * paygFeePerTicket);

        const feePerTicket = ticketCount > 0 ? totalFee / ticketCount : 0;

        let feeDescription: string;
        if (ticketsUsingPayg === 0) {
            feeDescription = `${getCurrencySymbol(currency)}${creditFeePerTicket.toFixed(2)}/ticket (using credits)`;
        } else {
            feeDescription = `${getCurrencySymbol(currency)}${creditFeePerTicket.toFixed(2)}/ticket for first ${ticketsUsingCredits}, then ${getCurrencySymbol(currency)}${paygFeePerTicket.toFixed(2)}/ticket`;
        }

        return {
            feePerTicket,
            totalFee,
            ticketsUsingCredits,
            ticketsUsingPayg,
            creditFeePerTicket,
            feeDescription
        };
    }

    const feePerTicket = convertFromGBP(PAYG_FEE_GBP, currency, exchangeRates);
    return {
        feePerTicket,
        totalFee: feePerTicket * ticketCount,
        ticketsUsingCredits: 0,
        ticketsUsingPayg: ticketCount,
        feeDescription: `${getCurrencySymbol(currency)}${feePerTicket.toFixed(2)}/ticket`
    };
}

/**
 * Get the currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
    const upper = currency.toUpperCase() as SupportedCurrency;
    return SUPPORTED_CURRENCIES[upper]?.symbol ?? currency;
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: string): string {
    const upper = currency.toUpperCase() as SupportedCurrency;
    return SUPPORTED_CURRENCIES[upper]?.name ?? currency;
}

/**
 * Format a fee amount for display
 */
export function formatFee(amount: number, currency: string): string {
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
}

/**
 * Format amount with proper currency formatting
 */
export function formatCurrency(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount);
    } catch {
        return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
    }
}

/**
 * Check if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
    return currency.toUpperCase() in SUPPORTED_CURRENCIES;
}
