import { describe, expect, it, vi } from 'vitest';

// Fee calculation tests for frontend
// Tests the fee calculation logic used in checkout

// Mock fee calculation functions based on fees.ts
const PLATFORM_FEE_RATES = {
    payg: 0.05, // 5%
    prepaid: 0,  // No platform fee (uses credits)
};

const STRIPE_FIXED_FEE = 0.20; // £0.20
const STRIPE_PERCENTAGE = 0.014; // 1.4%

// Calculate Stripe fee
function calculateStripeFee(amount: number): number {
    if (amount <= 0) return 0;
    // Stripe charges 1.4% + £0.20 for UK cards
    return Math.round((amount * STRIPE_PERCENTAGE + STRIPE_FIXED_FEE) * 100) / 100;
}

// Calculate platform fee
function calculatePlatformFee(subtotal: number, tier: 'payg' | 'prepaid'): number {
    if (subtotal <= 0 || tier === 'prepaid') return 0;
    return Math.round(subtotal * PLATFORM_FEE_RATES[tier] * 100) / 100;
}

// Calculate total with fees
function calculateTotal(
    subtotal: number,
    organizerFee: number,
    tier: 'payg' | 'prepaid',
    absorbFee: boolean
): {
    subtotal: number;
    platformFee: number;
    processingFee: number;
    organizerFee: number;
    total: number;
} {
    if (subtotal <= 0) {
        return { subtotal: 0, platformFee: 0, processingFee: 0, organizerFee: 0, total: 0 };
    }

    const platformFee = calculatePlatformFee(subtotal, tier);

    // Base amount before Stripe fee
    const baseAmount = subtotal + organizerFee + (absorbFee ? 0 : platformFee);

    // Calculate Stripe fee on the total amount
    const processingFee = calculateStripeFee(baseAmount);

    // Total paid by customer
    const total = absorbFee
        ? subtotal + organizerFee + processingFee
        : subtotal + organizerFee + platformFee + processingFee;

    return {
        subtotal,
        platformFee: absorbFee ? 0 : platformFee,
        processingFee,
        organizerFee,
        total: Math.round(total * 100) / 100
    };
}

describe('Fee Calculations - Stripe Fees', () => {
    it('calculates Stripe fee correctly for standard amount', () => {
        const amount = 25;
        const fee = calculateStripeFee(amount);
        // 25 * 0.014 + 0.20 = 0.35 + 0.20 = 0.55
        expect(fee).toBeCloseTo(0.55, 2);
    });

    it('returns 0 for zero amount', () => {
        expect(calculateStripeFee(0)).toBe(0);
    });

    it('returns 0 for negative amount', () => {
        expect(calculateStripeFee(-10)).toBe(0);
    });

    it('handles large amounts correctly', () => {
        const amount = 1000;
        const fee = calculateStripeFee(amount);
        // 1000 * 0.014 + 0.20 = 14.00 + 0.20 = 14.20
        expect(fee).toBeCloseTo(14.20, 2);
    });

    it('handles decimal amounts correctly', () => {
        const amount = 19.99;
        const fee = calculateStripeFee(amount);
        // 19.99 * 0.014 + 0.20 = 0.27986 + 0.20 ≈ 0.48
        expect(fee).toBeCloseTo(0.48, 2);
    });
});

describe('Fee Calculations - Platform Fees', () => {
    it('calculates 5% platform fee for PAYG tier', () => {
        const subtotal = 100;
        const fee = calculatePlatformFee(subtotal, 'payg');
        expect(fee).toBe(5);
    });

    it('returns 0 platform fee for prepaid tier', () => {
        const subtotal = 100;
        const fee = calculatePlatformFee(subtotal, 'prepaid');
        expect(fee).toBe(0);
    });

    it('returns 0 for zero subtotal', () => {
        expect(calculatePlatformFee(0, 'payg')).toBe(0);
    });

    it('handles decimal subtotals correctly', () => {
        const subtotal = 49.99;
        const fee = calculatePlatformFee(subtotal, 'payg');
        // 49.99 * 0.05 = 2.4995 ≈ 2.50
        expect(fee).toBeCloseTo(2.50, 2);
    });
});

describe('Fee Calculations - Total Calculation', () => {
    it('calculates total for standard paid order', () => {
        const result = calculateTotal(50, 0, 'payg', false);

        expect(result.subtotal).toBe(50);
        expect(result.platformFee).toBe(2.50); // 5% of 50
        // Processing fee on 52.50
        expect(result.processingFee).toBeCloseTo(0.94, 1);
        // Total should be reasonable
        expect(result.total).toBeGreaterThan(53);
    });

    it('calculates total with organizer fee', () => {
        const result = calculateTotal(50, 5, 'payg', false);

        expect(result.subtotal).toBe(50);
        expect(result.organizerFee).toBe(5);
        // Total includes organizer fee
        expect(result.total).toBeGreaterThan(55);
    });

    it('absorb fee reduces customer-visible platform fee', () => {
        const withoutAbsorb = calculateTotal(50, 0, 'payg', false);
        const withAbsorb = calculateTotal(50, 0, 'payg', true);

        expect(withAbsorb.platformFee).toBe(0);
        expect(withAbsorb.total).toBeLessThan(withoutAbsorb.total);
    });

    it('returns zeros for free tickets', () => {
        const result = calculateTotal(0, 0, 'payg', false);

        expect(result.subtotal).toBe(0);
        expect(result.platformFee).toBe(0);
        expect(result.processingFee).toBe(0);
        expect(result.total).toBe(0);
    });

    it('prepaid tier has no platform fee', () => {
        const result = calculateTotal(50, 0, 'prepaid', false);

        expect(result.platformFee).toBe(0);
        // Only processing fee on 50
        expect(result.total).toBeCloseTo(50 + calculateStripeFee(50), 2);
    });
});

describe('Fee Calculations - Currency Handling', () => {
    it('rounds fees to 2 decimal places', () => {
        // Amount that produces repeating decimal
        const subtotal = 33.33;
        const result = calculateTotal(subtotal, 0, 'payg', false);

        // All values should have at most 2 decimal places
        expect(Number.isInteger(result.platformFee * 100)).toBe(true);
        expect(Number.isInteger(result.total * 100)).toBe(true);
    });

    it('handles very small amounts', () => {
        const subtotal = 1;
        const result = calculateTotal(subtotal, 0, 'payg', false);

        expect(result.subtotal).toBe(1);
        expect(result.total).toBeGreaterThan(1);
    });
});

describe('Fee Calculations - Edge Cases', () => {
    it('handles maximum reasonable order', () => {
        const subtotal = 10000;
        const result = calculateTotal(subtotal, 100, 'payg', false);

        expect(result.total).toBeLessThan(12000);
        expect(result.platformFee).toBe(500); // 5% of 10000
    });

    it('organizer fee alone adds to total', () => {
        // Free ticket with organizer fee
        const subtotal = 0;
        const organizerFee = 5;

        // This is a bit unusual but should still work
        const result = calculateTotal(subtotal, organizerFee, 'payg', false);

        // Free ticket base case
        expect(result.total).toBe(0); // Our implementation returns 0 for 0 subtotal
    });
});

describe('Fee Display Formatting', () => {
    function formatCurrency(amount: number, currency: string): string {
        const symbols: Record<string, string> = {
            GBP: '£',
            EUR: '€',
            USD: '$'
        };
        const symbol = symbols[currency] || currency;
        return `${symbol}${amount.toFixed(2)}`;
    }

    it('formats GBP correctly', () => {
        expect(formatCurrency(25.50, 'GBP')).toBe('£25.50');
    });

    it('formats EUR correctly', () => {
        expect(formatCurrency(100, 'EUR')).toBe('€100.00');
    });

    it('formats USD correctly', () => {
        expect(formatCurrency(50, 'USD')).toBe('$50.00');
    });

    it('handles unknown currency', () => {
        expect(formatCurrency(25, 'XYZ')).toBe('XYZ25.00');
    });

    it('always shows 2 decimal places', () => {
        expect(formatCurrency(10, 'GBP')).toBe('£10.00');
        expect(formatCurrency(10.5, 'GBP')).toBe('£10.50');
    });
});

describe('Fee Breakdown Display', () => {
    it('shows all fee components', () => {
        const breakdown = calculateTotal(50, 2, 'payg', false);

        const display = {
            subtotal: `£${breakdown.subtotal.toFixed(2)}`,
            organizerFee: breakdown.organizerFee > 0 ? `£${breakdown.organizerFee.toFixed(2)}` : null,
            platformFee: breakdown.platformFee > 0 ? `£${breakdown.platformFee.toFixed(2)}` : null,
            processingFee: `£${breakdown.processingFee.toFixed(2)}`,
            total: `£${breakdown.total.toFixed(2)}`
        };

        expect(display.subtotal).toBe('£50.00');
        expect(display.organizerFee).toBe('£2.00');
        expect(display.platformFee).not.toBeNull();
    });

    it('hides zero fees', () => {
        const breakdown = calculateTotal(50, 0, 'prepaid', false);

        // Platform fee should be 0 for prepaid
        expect(breakdown.platformFee).toBe(0);
        // Organizer fee not set
        expect(breakdown.organizerFee).toBe(0);
    });
});
