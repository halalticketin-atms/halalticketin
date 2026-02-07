/**
 * Fee calculation utilities for Halal Ticketin platform (Frontend)
 * 
 * This mirrors the backend fee calculations to ensure consistency
 * across the platform for fee display and calculations.
 * 
 * Fee structure:
 * - PAYG: £0.55 per ticket (converted to local currency)
 * - Token: Variable based on credits purchased (£0.23-0.47)
 * - Charity: £0.20 per ticket (requires verified charity status)
 */

// Base fees in GBP (will be converted to transaction currency)
export const PAYG_FEE_GBP = 0.55; // £0.55 per ticket
export const CHARITY_FEE_GBP = 0.20; // £0.20 per ticket

export const CHARITY_PLATFORM_FEE_DISCOUNT_RATE = 0.5;
export const CHARITY_CREDIT_DISCOUNT_RATE = 0.25;

// Credit system constants (sold in GBP, used for token-based pricing)
export const MIN_CREDITS = 100;
export const MAX_CREDITS = 20000;
export const MAX_PRICE_GBP = 0.47; // £0.47 per credit at 100 credits (equivalent to ~€0.55)
export const MIN_PRICE_GBP = 0.23; // £0.23 per credit at 20,000 credits (equivalent to ~€0.27)
export const MIN_STAMPS = 100;
export const MAX_STAMPS = 200000;
export const MAX_STAMP_PRICE_GBP = 0.0012; // £1.20 per 1,000 stamps at 100 stamps
export const MIN_STAMP_PRICE_GBP = 0.0005; // £0.50 per 1,000 stamps at 200,000 stamps

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

const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx',
    'vnd', 'vuv', 'xaf', 'xof', 'xpf'
]);

const THREE_DECIMAL_CURRENCIES = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);

export const getCurrencyExponent = (currency?: string) => {
    const normalized = typeof currency === 'string' ? currency.toLowerCase() : '';
    if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
        return 0;
    }
    if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
        return 3;
    }
    return 2;
};

export const toSmallestUnit = (amount: number | string, currency?: string): number => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const exponent = getCurrencyExponent(currency);
    const factor = Math.pow(10, exponent);
    return Math.round(num * factor);
};

export const fromSmallestUnit = (amount: number, currency?: string): number => {
    const exponent = getCurrencyExponent(currency);
    const factor = Math.pow(10, exponent);
    return amount / factor;
};

export const roundCurrencyAmount = (amount: number, currency?: string): number => {
    const exponent = getCurrencyExponent(currency);
    const factor = Math.pow(10, exponent);
    return Math.round(amount * factor) / factor;
};

export const ceilCurrencyAmount = (amount: number, currency?: string): number => {
    const exponent = getCurrencyExponent(currency);
    const factor = Math.pow(10, exponent);
    return Math.ceil(amount * factor) / factor;
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

export function calculateStampPrice(stamps: number): number {
    if (stamps < MIN_STAMPS) {
        return MAX_STAMP_PRICE_GBP;
    }
    const clampedStamps = Math.min(stamps, MAX_STAMPS);
    return MAX_STAMP_PRICE_GBP - (MAX_STAMP_PRICE_GBP - MIN_STAMP_PRICE_GBP) *
        (clampedStamps - MIN_STAMPS) / (MAX_STAMPS - MIN_STAMPS);
}

export function calculateStampPurchaseCost(stamps: number): number {
    return stamps * calculateStampPrice(stamps);
}

export const applyCharityPlatformFeeDiscount = (
    amountInSmallestUnit: number,
    discountRate: number = CHARITY_PLATFORM_FEE_DISCOUNT_RATE
): number => {
    if (discountRate <= 0) {
        return amountInSmallestUnit;
    }
    return Math.round(amountInSmallestUnit * (1 - discountRate));
};

export const applyCharityCreditDiscount = (
    price: number,
    discountRate: number = CHARITY_CREDIT_DISCOUNT_RATE
): number => {
    if (discountRate <= 0) {
        return price;
    }
    return price * (1 - discountRate);
};

export interface FeeCalculationParams {
    feeTier: FeeTier;
    ticketCount: number;
    currency: string;
    customBookingFee?: number;
    creditsAvailable?: number;
    exchangeRates?: Record<string, number>;
    charityDiscountRate?: number;
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
    rates: Record<string, number> = FALLBACK_EXCHANGE_RATES
): number {
    if (feeTier === 'token') {
        return 0;
    }

    if (feeTier === 'charity') {
        const fee = convertFromGBP(CHARITY_FEE_GBP, currency, rates);
        return fromSmallestUnit(toSmallestUnit(fee, currency), currency);
    }

    const fee = convertFromGBP(PAYG_FEE_GBP, currency, rates);
    return fromSmallestUnit(toSmallestUnit(fee, currency), currency);
}

/**
 * Calculate platform fee for ticket sales
 */
export function calculatePlatformFee(params: FeeCalculationParams): FeeCalculationResult {
    const {
        feeTier,
        ticketCount,
        currency,
        creditsAvailable = 0,
        exchangeRates = FALLBACK_EXCHANGE_RATES,
        charityDiscountRate
    } = params;

    if (feeTier === 'charity') {
        const feePerTicketRaw = convertFromGBP(CHARITY_FEE_GBP, currency, exchangeRates);
        const feePerTicketSmallestUnit = toSmallestUnit(feePerTicketRaw, currency);
        const feePerTicket = fromSmallestUnit(feePerTicketSmallestUnit, currency);
        return {
            feePerTicket,
            totalFee: feePerTicketSmallestUnit * ticketCount > 0
                ? fromSmallestUnit(feePerTicketSmallestUnit * ticketCount, currency)
                : 0,
            ticketsUsingCredits: 0,
            ticketsUsingPayg: ticketCount,
            feeDescription: `${getCurrencySymbol(currency)}${feePerTicket.toFixed(2)}/ticket (Charity rate)`
        };
    }

    if (feeTier === 'token') {
        const ticketsUsingCredits = Math.min(creditsAvailable, ticketCount);
        const ticketsUsingPayg = ticketCount - ticketsUsingCredits;
        return {
            feePerTicket: 0,
            totalFee: 0,
            ticketsUsingCredits,
            ticketsUsingPayg,
            feeDescription: 'No platform fee (credits applied)'
        };
    }

    const baseFeePerTicket = convertFromGBP(PAYG_FEE_GBP, currency, exchangeRates);
    const feePerTicketSmallestUnit = toSmallestUnit(baseFeePerTicket, currency);
    let totalFeeSmallestUnit = feePerTicketSmallestUnit * ticketCount;
    if (charityDiscountRate && charityDiscountRate > 0) {
        totalFeeSmallestUnit = applyCharityPlatformFeeDiscount(totalFeeSmallestUnit, charityDiscountRate);
    }
    const totalFee = fromSmallestUnit(totalFeeSmallestUnit, currency);
    const feePerTicket = ticketCount > 0
        ? (charityDiscountRate && charityDiscountRate > 0 ? totalFee / ticketCount : fromSmallestUnit(feePerTicketSmallestUnit, currency))
        : 0;
    return {
        feePerTicket,
        totalFee,
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
