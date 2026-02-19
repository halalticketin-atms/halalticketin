'use client';

import { Suspense, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CreditCard, CheckCircle2 } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizers } from '@/context/organizer-context';
import { createCreditPurchaseSession } from '@/lib/credits-api';
import { CHARITY_CREDIT_DISCOUNT_RATE, applyCharityCreditDiscount, calculateCreditPrice } from '@/lib/fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function PurchaseCreditsContent() {
    const organizerId = useOrganizerFromParams();
    const searchParams = useSearchParams();
    const { organizers } = useOrganizers();
    const { rates } = useExchangeRates();
    const organizer = organizers.find((item) => item.id === organizerId);
    const isCharity = Boolean(organizer?.isCharityVerified && organizer?.charityNumber);
    const organizerCurrency = (organizer?.defaultCurrency || 'GBP').toUpperCase();
    const exchangeRate = rates[organizerCurrency] ?? 1;

    const parsedCredits = parseInt(searchParams.get('credits') || '1000', 10);
    const initialCredits = Number.isFinite(parsedCredits) ? parsedCredits : 1000;
    const [credits, setCredits] = useState(Math.max(100, Math.min(20000, initialCredits)));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pricing = useMemo(() => {
        const basePricePerCreditGBP = calculateCreditPrice(credits);
        const discountRate = isCharity ? CHARITY_CREDIT_DISCOUNT_RATE : 0;
        const discountedPricePerCreditGBP = applyCharityCreditDiscount(basePricePerCreditGBP, discountRate);
        const basePricePerCredit = basePricePerCreditGBP * exchangeRate;
        const pricePerCredit = discountedPricePerCreditGBP * exchangeRate;
        const subtotal = credits * basePricePerCredit;
        const discountedSubtotal = credits * pricePerCredit;
        const discountAmount = Math.max(0, subtotal - discountedSubtotal);
        const vatRate = 0.23;
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;

        return {
            basePricePerCredit,
            pricePerCredit,
            subtotal,
            discountAmount,
            vat,
            total,
            currency: organizerCurrency
        };
    }, [credits, exchangeRate, isCharity, organizerCurrency]);

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-IE', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const handlePurchase = async () => {
        if (!organizerId) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const result = await createCreditPurchaseSession(organizerId, credits);
            if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setError(result.message || 'Failed to start purchase');
                setIsSubmitting(false);
            }
        } catch {
            setError('An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-8">
            <div className="max-w-xl mx-auto px-4 sm:px-0">
                <Link
                    href={`/dashboard/o/${organizerId}/billing`}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Credits
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold">Buy Credits</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Pre-pay for platform fees and save up to 50%.
                        </p>
                    </div>

                    {/* Slider Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="text-lg font-bold">{credits.toLocaleString()} credits</span>
                        </div>

                        <Slider
                            value={[credits]}
                            onValueChange={(vals) => setCredits(vals[0])}
                            min={100}
                            max={20000}
                            step={100}
                            className="cursor-pointer"
                        />

                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>100</span>
                            <span>20,000</span>
                        </div>
                    </div>

                    {/* Pricing Breakdown */}
                    <div className="border-t border-b border-border py-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                {credits.toLocaleString()} credits × {formatCurrency(pricing.basePricePerCredit, pricing.currency)}
                            </span>
                            <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
                        </div>
                        {pricing.discountAmount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Charity discount (25%)</span>
                                <span>-{formatCurrency(pricing.discountAmount, pricing.currency)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">VAT (23%)</span>
                            <span>{formatCurrency(pricing.vat, pricing.currency)}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-border">
                            <span className="font-semibold">Total</span>
                            <span className="text-xl font-bold">{formatCurrency(pricing.total, pricing.currency)}</span>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                            {error}
                        </p>
                    )}

                    {/* CTA Button */}
                    <Button
                        onClick={handlePurchase}
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white font-semibold shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                            <>
                                <CreditCard className="h-5 w-5" />
                                Checkout with Stripe
                            </>
                        )}
                    </Button>

                    {/* Benefits Row */}
                    <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Save up to 50%</span>
                        </div>
                        {isCharity && (
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>Charity discount applied</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Never expires</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Use for any event</span>
                        </div>
                    </div>

                    {/* Terms */}
                    <p className="text-[10px] text-center text-muted-foreground">
                        By clicking checkout, you agree to our Terms of Service. Credits are non-refundable.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}

function PurchaseCreditsFallback() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
    );
}

export default function PurchaseCreditsPage() {
    return (
        <Suspense fallback={<PurchaseCreditsFallback />}>
            <PurchaseCreditsContent />
        </Suspense>
    );
}
