import { describe, expect, it } from 'vitest';

import {
    ceilCurrencyAmount,
    fromSmallestUnit,
    getCurrencyExponent,
    roundCurrencyAmount,
    toSmallestUnit
} from './fees';

describe('currency units', () => {
    it('returns expected currency exponents', () => {
        expect(getCurrencyExponent('JPY')).toBe(0);
        expect(getCurrencyExponent('KWD')).toBe(3);
        expect(getCurrencyExponent('GBP')).toBe(2);
    });

    it('converts to and from smallest unit using exponent', () => {
        expect(toSmallestUnit(1000, 'JPY')).toBe(1000);
        expect(toSmallestUnit(10.5, 'KWD')).toBe(10500);
        expect(fromSmallestUnit(10500, 'KWD')).toBeCloseTo(10.5, 6);
    });

    it('rounds and ceils with currency exponent', () => {
        expect(roundCurrencyAmount(10.555, 'GBP')).toBe(10.56);
        expect(roundCurrencyAmount(10.55, 'JPY')).toBe(11);
        expect(roundCurrencyAmount(10.5554, 'KWD')).toBe(10.555);

        expect(ceilCurrencyAmount(10.551, 'GBP')).toBe(10.56);
        expect(ceilCurrencyAmount(10.01, 'JPY')).toBe(11);
        expect(ceilCurrencyAmount(10.5551, 'KWD')).toBe(10.556);
    });
});
