import { describe, expect, it } from 'vitest';
import {
    applyCharityCreditDiscount,
    calculateFeePerTicket,
    calculatePlatformFee,
} from './fees';

describe('platform fees', () => {
    it('charges the PAYG rate in GBP', () => {
        const result = calculatePlatformFee({
            feeTier: 'payg',
            ticketCount: 3,
            currency: 'GBP',
        });

        expect(result).toMatchObject({
            feePerTicket: 0.55,
            totalFee: 1.65,
            ticketsUsingCredits: 0,
            ticketsUsingPayg: 3,
            feeDescription: '£0.55/ticket',
        });
    });

    it('prices a legacy charity tier at the verified charity PAYG discount', () => {
        const result = calculatePlatformFee({
            feeTier: 'charity',
            ticketCount: 3,
            currency: 'GBP',
            charityDiscountRate: 0.5,
        });

        expect(result).toMatchObject({
            totalFee: 0.83,
            ticketsUsingCredits: 0,
            ticketsUsingPayg: 3,
            feeDescription: '£0.28/ticket',
        });
        expect(result.feePerTicket).toBeCloseTo(0.2766666667, 10);
    });

    it('uses the PAYG rate for a legacy charity tier without a verified discount', () => {
        const result = calculatePlatformFee({
            feeTier: 'charity',
            ticketCount: 3,
            currency: 'GBP',
        });

        expect(result).toMatchObject({
            feePerTicket: 0.55,
            totalFee: 1.65,
            feeDescription: '£0.55/ticket',
        });
    });

    it('applies the verified charity discount after converting and rounding the PAYG fee', () => {
        const result = calculatePlatformFee({
            feeTier: 'payg',
            ticketCount: 2,
            currency: 'EUR',
            exchangeRates: { EUR: 1.17 },
            charityDiscountRate: 0.5,
        });

        expect(result).toMatchObject({
            feePerTicket: 0.32,
            totalFee: 0.64,
            feeDescription: '€0.32/ticket',
        });
    });

    it('keeps credits and free tickets free of customer platform fees', () => {
        const creditResult = calculatePlatformFee({
            feeTier: 'token',
            ticketCount: 4,
            creditsAvailable: 2,
            currency: 'GBP',
        });
        const freeTicketResult = calculatePlatformFee({
            feeTier: 'payg',
            ticketCount: 0,
            currency: 'GBP',
        });

        expect(creditResult).toMatchObject({
            totalFee: 0,
            ticketsUsingCredits: 2,
            ticketsUsingPayg: 2,
        });
        expect(freeTicketResult).toMatchObject({
            feePerTicket: 0,
            totalFee: 0,
        });
    });
});

describe('fee helpers', () => {
    it('uses the PAYG rate for a legacy charity tier unless a discount rate is supplied', () => {
        expect(calculateFeePerTicket('charity', 'GBP')).toBe(0.55);
        expect(calculateFeePerTicket('charity', 'GBP', undefined, 0.5)).toBe(0.28);
    });

    it('keeps the separate 25% charity credit discount', () => {
        expect(applyCharityCreditDiscount(0.4)).toBeCloseTo(0.3, 10);
    });
});
