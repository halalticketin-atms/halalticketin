import { ceilCurrencyAmount, convertFromGBP } from '@/lib/fees';

export const LIMITS_GBP = {
    ticketPrice: 9_999,
    promoFixed: 9_999,
    donation: 1_000,
    customFee: 99,
};

export const MAX_TICKET_QUANTITY = 100_000;
export const MAX_PER_ORDER = 50;
export const PROMO_CODE_MIN_LENGTH = 3;
export const PROMO_CODE_MAX_LENGTH = 15;
export const MAX_PROMO_CODES_PER_EVENT = 100;

export const roundCurrencyLimit = (amount: number, currency?: string) =>
    ceilCurrencyAmount(amount, currency);

export const getCurrencyLimit = (
    amountGBP: number,
    currency: string,
    rates: Record<string, number>,
) => roundCurrencyLimit(convertFromGBP(amountGBP, currency, rates), currency);
