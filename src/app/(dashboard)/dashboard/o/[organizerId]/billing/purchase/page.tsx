'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Wallet, Info, CheckCircle2, CreditCard } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizers } from '@/context/organizer-context';
import { createCreditPurchaseSession } from '@/lib/credits-api';
import { calculateCreditPrice, MAX_PRICE_GBP, MIN_PRICE_GBP } from '@/lib/fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PurchaseCreditsPage() {
    const organizerId = useOrganizerFromParams();
    const searchParams = useSearchParams();
    const { organizers } = useOrganizers();
    const { rates } = useExchangeRates();
    const organizer = organizers.find((item) => item.id === organizerId);
    const organizerCurrency = (organizer?.defaultCurrency || 'GBP').toUpperCase();
    const exchangeRate = rates[organizerCurrency] ?? 1;

    // Initial credits from query param or default
    const parsedCredits = parseInt(searchParams.get('credits') || '1000', 10);
    const initialCredits = Number.isFinite(parsedCredits) ? parsedCredits : 1000;
    const [credits, setCredits] = useState(Math.max(100, Math.min(20000, initialCredits)));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pricing = useMemo(() => {
        const pricePerCreditGBP = calculateCreditPrice(credits);
        const pricePerCredit = pricePerCreditGBP * exchangeRate;
        const subtotal = credits * pricePerCredit;
        const vatRate = 0.23;
        const vat = subtotal * vatRate;
        const total = subtotal + vat;

        return {
            pricePerCredit,
            subtotal,
            vat,
            total,
            currency: organizerCurrency
        };
    }, [credits, exchangeRate, organizerCurrency]);

    const maxUnitPrice = MAX_PRICE_GBP * exchangeRate;
    const minUnitPrice = MIN_PRICE_GBP * exchangeRate;

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
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-8 max-w-4xl mx-auto">
            <Link
                href={`/dashboard/o/${organizerId}/billing`}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Credits
            </Link>

            <div className="grid gap-8 lg:grid-cols-5">
                {/* Selection Left Side */}
                <div className="lg:col-span-3 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-2xl sm:text-3xl font-bold">Buy Pre-paid Credits</h1>
                        <p className="text-muted-foreground mt-2">
                            Credits empower the "Pay Upfront" model, allowing you to save significantly on platform fees.
                        </p>
                    </motion.div>

                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-8">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-[var(--brand-teal)]" />
                                Select Credit Amount
                            </CardTitle>
                            <CardDescription>Drag the slider or enter a custom amount (min 100)</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-10 pb-8 space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground transition-all">
                                        Amount: <span className="text-lg font-bold text-foreground">{credits.toLocaleString()} Credits</span>
                                    </span>
                                    {credits >= 10000 && (
                                        <Badge className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white border-none px-3">
                                            Best Value
                                        </Badge>
                                    )}
                                </div>

                                <Slider
                                    value={[credits]}
                                    onValueChange={(vals) => setCredits(vals[0])}
                                    min={100}
                                    max={20000}
                                    step={100}
                                    className="cursor-pointer"
                                />

                                <div className="grid grid-cols-5 gap-2 px-1">
                                    {[100, 5000, 10000, 15000, 20000].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => setCredits(val)}
                                            className={cn(
                                                "text-[10px] sm:text-xs py-1 rounded-md transition-all",
                                                credits === val
                                                    ? "bg-[var(--brand-teal)] text-white font-bold"
                                                    : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {val.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/50">
                                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Tiered Pricing Schedule</p>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            <li>• 100 credits: <span className="font-semibold text-foreground">{formatCurrency(maxUnitPrice, pricing.currency)}</span> per unit</li>
                                            <li>• 20,000 credits: <span className="font-semibold text-foreground">{formatCurrency(minUnitPrice, pricing.currency)}</span> per unit</li>
                                            <li>• Currently: <span className="font-semibold text-[var(--brand-teal)]">{formatCurrency(pricing.pricePerCredit, pricing.currency)}</span> per unit</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Right Side */}
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="sticky top-24"
                    >
                        <Card className="border-border/50 shadow-xl shadow-primary/5 bg-gradient-to-br from-card to-muted/20">
                            <CardHeader>
                                <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{credits.toLocaleString()} Credits</span>
                                        <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">VAT (23%)</span>
                                        <span>{formatCurrency(pricing.vat, pricing.currency)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-border flex justify-between items-baseline">
                                        <span className="font-bold">Total Amount</span>
                                        <span className="text-2xl font-black text-foreground">
                                            {formatCurrency(pricing.total, pricing.currency)}
                                        </span>
                                    </div>
                                </div>

                                {error && (
                                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                        {error}
                                    </p>
                                )}

                                <Button
                                    onClick={handlePurchase}
                                    disabled={isSubmitting}
                                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all flex items-center justify-center gap-2"
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

                                <p className="text-[10px] text-center text-muted-foreground px-4">
                                    By clicking checkout, you agree to our Terms of Service. Credits are non-refundable and will be added to your account instantly after successful payment.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Benefits list */}
                        <div className="mt-6 space-y-4 px-2">
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-xs text-muted-foreground">Save up to 50% compared to pay-as-you-go fees.</p>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                <p className="text-xs text-muted-foreground">Credits never expire and can be used for any event.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// Helper function for class names
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
