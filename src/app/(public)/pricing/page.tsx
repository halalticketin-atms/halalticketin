'use client';

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import { Check, Info, Ticket, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AmbientBackground } from '@/components/layout/AmbientBackground';

type Currency = 'GBP' | 'USD' | 'EUR';

const currencies: Record<Currency, { symbol: string; rate: number }> = {
    GBP: { symbol: '£', rate: 1 },
    USD: { symbol: '$', rate: 1.27 },
    EUR: { symbol: '€', rate: 1.17 },
};

type FadeStyle = CSSProperties & { '--fade-delay'?: string };
const fadeStyle = (delay: string): FadeStyle => ({ '--fade-delay': delay });

export default function PricingPage() {
    const [currency, setCurrency] = useState<Currency>('GBP');
    const [payUpfront, setPayUpfront] = useState(true);
    const [ticketPrice, setTicketPrice] = useState(20);
    const [credits, setCredits] = useState(500);
    const [passFees, setPassFees] = useState(false);
    const calculatorRef = useRef<HTMLDivElement | null>(null);
    const [shouldRenderCalculator, setShouldRenderCalculator] = useState(false);
    const enableCalculator = useEffectEvent(() => {
        setShouldRenderCalculator(true);
    });

    useEffect(() => {
        if (shouldRenderCalculator) {
            return;
        }
        const target = calculatorRef.current;
        if (!target) {
            return;
        }
        if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
            enableCalculator();
            return;
        }
        const observer = new window.IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    enableCalculator();
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(target);
        return () => observer.disconnect();
    }, [shouldRenderCalculator]);

    // Fee Constants - aligned with backend/src/lib/fees.ts
    const PAY_AS_YOU_GO_FEE_GBP = 0.55; // £0.55 per ticket

    // Credit system constants (in EUR)
    const MIN_CREDITS = 100;
    const MAX_CREDITS = 20000;
    const MAX_PRICE_EUR = 0.55; // Price at minimum credits
    const MIN_PRICE_EUR = 0.27; // Price at maximum credits

    // Calculate cost per credit based on volume - uses linear interpolation
    const getCreditPrice = (count: number): number => {
        if (count < MIN_CREDITS) return MAX_PRICE_EUR; // Show max price for display
        const clampedCredits = Math.min(count, MAX_CREDITS);
        return MAX_PRICE_EUR - (MAX_PRICE_EUR - MIN_PRICE_EUR) *
            (clampedCredits - MIN_CREDITS) / (MAX_CREDITS - MIN_CREDITS);
    };

    const currentCreditPrice = getCreditPrice(credits);
    const totalCreditCost = credits * currentCreditPrice;

    // Breakdown Calculations
    const platformFee = payUpfront ? currentCreditPrice : PAY_AS_YOU_GO_FEE_GBP;
    const processingFee = (ticketPrice * 0.015) + 0.20; // Stripe approx 1.5% + 20p
    const vat = platformFee * 0.2; // 20% VAT on platform fee

    const totalFees = platformFee + processingFee + vat;
    const buyerPays = passFees ? ticketPrice + totalFees : ticketPrice;
    const youReceive = passFees ? ticketPrice : ticketPrice - totalFees;

    const symbol = currencies[currency].symbol;
    const rate = currencies[currency].rate;

    return (
        <div className="min-h-screen relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)]">
            <AmbientBackground />

            <div className="relative z-10 container mx-auto px-4 pt-24 md:pt-32 pb-16">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16 space-y-4 animate-fade-up">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-white/80 md:bg-white/50 md:backdrop-blur-md border border-white/60 text-teal-700 text-sm font-bold shadow-sm mb-4">
                        Transparent Pricing
                    </div>
                    <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
                        Simple pricing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)]">everyone</span>
                    </h1>
                    <div className="flex justify-center mt-6">
                        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                            <SelectTrigger className="w-[120px] bg-white/85 md:bg-white/60 border-white/60 md:backdrop-blur-sm text-slate-700 font-semibold h-10 rounded-full shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 max-w-6xl mx-auto mb-24">

                    {/* Left Column: Marketing Card */}
                    <div className="lg:w-1/3 flex animate-fade-up" style={fadeStyle('0.1s')}>
                        <div className="w-full bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                            {/* Decorative gradients */}
                            <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--brand-cyan)] to-transparent opacity-20 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:opacity-30 transition-opacity duration-500" />
                            <div className="hidden md:block absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[var(--brand-teal)] to-transparent opacity-20 blur-3xl rounded-full transform -translate-x-1/2 translate-y-1/2 group-hover:opacity-30 transition-opacity duration-500" />

                            <div className="relative z-10 space-y-6">
                                <div>
                                    <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
                                        Grow your<br />events now.
                                    </h2>
                                    <p className="text-slate-300 text-lg leading-relaxed">
                                        Manage your ticket sales effortlessly. Our platform provides everything you need to create, promote, and sell out your events.
                                    </p>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/60 md:bg-white/10 flex items-center justify-center md:backdrop-blur-sm">
                                            <Zap className="h-5 w-5 text-[var(--brand-cyan)]" />
                                        </div>
                                        <span className="font-semibold text-lg">Instant Payouts</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/60 md:bg-white/10 flex items-center justify-center md:backdrop-blur-sm">
                                            <Shield className="h-5 w-5 text-[var(--brand-cyan)]" />
                                        </div>
                                        <span className="font-semibold text-lg">Secure Booking</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/60 md:bg-white/10 flex items-center justify-center md:backdrop-blur-sm">
                                            <Ticket className="h-5 w-5 text-[var(--brand-cyan)]" />
                                        </div>
                                        <span className="font-semibold text-lg">Smart Ticketing</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 mt-12">
                                <Button size="lg" className="w-full bg-white text-slate-900 hover:bg-slate-50 font-bold rounded-xl h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                                    Contact Sales
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing Cards Stack */}
                    <div className="lg:w-2/3 grid gap-6">

                        {/* Free Card */}
                        <div className="glass-surface md:backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row items-center gap-6 group relative overflow-hidden animate-fade-up" style={fadeStyle('0.15s')}>
                            <div className="flex-1 text-center md:text-left z-10">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <h3 className="font-display text-2xl font-bold text-slate-800">Free</h3>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                        Community
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4">Perfect for free community events and meetups.</p>
                                <ul className="space-y-2 text-sm text-slate-500">
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> 0% Platform fees</li>
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Unlimited free tickets</li>
                                </ul>
                            </div>
                            <div className="text-center z-10">
                                <div className="font-display text-5xl font-bold text-slate-900 mb-1">{symbol}0</div>
                                <div className="text-sm text-slate-500">always free</div>
                                <Button variant="outline" className="mt-4 rounded-full border-slate-300 hover:bg-slate-50 px-8">
                                    Get Started
                                </Button>
                            </div>
                        </div>

                        {/* Pay Upfront Card (Highlighted) */}
                        <div className="glass-surface md:backdrop-blur-xl border-2 border-[var(--brand-cyan)] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-[var(--brand-cyan)]/10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden scale-[1.02] animate-fade-up" style={fadeStyle('0.2s')}>
                            <div className="absolute top-0 right-0 bg-[var(--brand-cyan)] text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl z-20">
                                MOST POPULAR
                            </div>
                            <div className="flex-1 text-center md:text-left z-10">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <h3 className="font-display text-2xl font-bold text-slate-800">Pay Upfront</h3>
                                    <span className="px-3 py-1 rounded-full bg-[var(--brand-cyan)]/10 text-[var(--brand-teal)] text-xs font-bold uppercase tracking-wider">
                                        Save Big
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4">Buy credits in advance. Best for regular event organizers.</p>
                                <ul className="space-y-2 text-sm text-slate-500">
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Lowest fees guaranteed</li>
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Credits never expire</li>
                                </ul>
                            </div>
                            <div className="text-center z-10">
                                <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">From</div>
                                <div className="font-display text-5xl font-bold text-slate-900 mb-1">
                                    {symbol}{(0.22 * rate).toFixed(2)}
                                </div>
                                <div className="text-sm text-slate-500">per ticket</div>
                                <Button
                                    onClick={() => document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="mt-4 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-opacity px-8 shadow-md"
                                >
                                    Calculate
                                </Button>
                            </div>
                        </div>

                        {/* Pay As You Sell Card */}
                        <div className="glass-surface md:backdrop-blur-xl rounded-[2rem] p-6 md:p-8 shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row items-center gap-6 group relative overflow-hidden animate-fade-up" style={fadeStyle('0.25s')}>
                            <div className="flex-1 text-center md:text-left z-10">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <h3 className="font-display text-2xl font-bold text-slate-800">Pay As You Sell</h3>
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                                        Flexible
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4">No upfront commitment. Pay only when you sell tickets.</p>
                                <ul className="space-y-2 text-sm text-slate-500">
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> No upfront costs</li>
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Deducted from revenue</li>
                                </ul>
                            </div>
                            <div className="text-center z-10">
                                <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">From</div>
                                <div className="font-display text-5xl font-bold text-slate-900 mb-1">
                                    {symbol}{(PAY_AS_YOU_GO_FEE_GBP * rate).toFixed(2)}
                                </div>
                                <div className="text-sm text-slate-500">per ticket</div>
                                <Button
                                    variant="outline"
                                    onClick={() => { setPayUpfront(false); document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' }) }}
                                    className="mt-4 rounded-full border-slate-300 hover:bg-slate-50 px-8"
                                >
                                    Calculate
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Calculator Section - Redesigned */}
                <div id="calc" ref={calculatorRef} className="max-w-5xl mx-auto animate-fade-up" style={fadeStyle('0.3s')}>
                    {shouldRenderCalculator ? (
                        <>
                            <div className="text-center mb-12">
                                <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-4">Calculate your savings</h2>
                                <p className="text-slate-600 max-w-2xl mx-auto">See exactly how much you&rsquo;ll pay (or save) based on your ticket price and volume.</p>
                            </div>

                            <div className="grid md:grid-cols-12 gap-8">
                                {/* Calculator Controls */}
                                <div className="md:col-span-7 glass-surface md:backdrop-blur-xl rounded-[2.5rem] p-8 shadow-xl">
                                    {/* Model Toggle */}
                                    <div className="mb-10">
                                        <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 block">Pricing Model</Label>
                                        <div className="bg-slate-100 p-1.5 rounded-full inline-flex relative w-full md:w-auto">
                                            <div
                                                className="absolute top-1.5 left-1.5 h-[calc(100%-12px)] bg-white rounded-full shadow-sm transition-transform duration-300 ease-out"
                                                style={{ width: '50%', transform: payUpfront ? 'translateX(0)' : 'translateX(100%)' }}
                                            />
                                            <button
                                                onClick={() => setPayUpfront(true)}
                                                className={`flex-1 md:flex-none relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors ${payUpfront ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Pay Upfront
                                            </button>
                                            <button
                                                onClick={() => setPayUpfront(false)}
                                                className={`flex-1 md:flex-none relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors ${!payUpfront ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Pay As You Sell
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Ticket Price Input */}
                                        <div>
                                            <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 block">Ticket Price</Label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">{symbol}</span>
                                                <Input
                                                    type="number"
                                                    value={ticketPrice}
                                                    onChange={(e) => setTicketPrice(Number(e.target.value))}
                                                    className="pl-10 h-16 text-2xl font-bold bg-white/50 border-slate-200 rounded-2xl focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 shadow-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Upfront Credits Slider */}
                                        {payUpfront && (
                                            <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <Label className="text-sm font-bold text-slate-500 uppercase tracking-widest">Ticket Volume</Label>
                                                    <div className="bg-white border border-slate-200 rounded-lg px-4 py-1.5 font-bold text-slate-900 shadow-sm">
                                                        {credits} credits
                                                    </div>
                                                </div>
                                                <Slider
                                                    value={[credits]}
                                                    onValueChange={(vals) => setCredits(vals[0])}
                                                    min={MIN_CREDITS}
                                                    max={MAX_CREDITS}
                                                    step={100}
                                                    className="py-4"
                                                />
                                                <div className="mt-4 flex justify-between items-center text-sm">
                                                    <span className="text-slate-500">Unit cost: <span className="font-bold text-slate-900">{symbol}{(currentCreditPrice * rate).toFixed(2)}</span></span>
                                                    <span className="text-[var(--brand-teal)] font-bold">Total: {symbol}{(totalCreditCost * rate).toFixed(2)} <span className="text-xs font-normal text-slate-400">+VAT</span></span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Breakdown Receipt */}
                                <div className="md:col-span-5">
                                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 h-full flex flex-col relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)]" />

                                        <h3 className="font-display text-2xl font-bold text-slate-900 mb-8">Estimated Breakdown</h3>

                                        <div className="space-y-6 flex-1">
                                            <div className="flex justify-between items-baseline pb-4 border-b border-slate-100">
                                                <span className="text-slate-600">Ticket Price</span>
                                                <span className="font-bold text-xl text-slate-900">{symbol}{(ticketPrice * rate).toFixed(2)}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Halal Ticketin Fee</span>
                                                    <span className="font-medium text-slate-700">{symbol}{(platformFee * rate).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 flex items-center gap-1">Processing Fees <Info className="h-3 w-3" /></span>
                                                    <span className="font-medium text-slate-700">{symbol}{(processingFee * rate).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">VAT (on fees)</span>
                                                    <span className="font-medium text-slate-700">{symbol}{(vat * rate).toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100">
                                                <div className="flex justify-between items-center mb-6 bg-slate-50 p-3 rounded-xl">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pass fees to buyer?</span>
                                                    <Switch checked={passFees} onCheckedChange={setPassFees} />
                                                </div>

                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-slate-600 font-medium">Buyer Pays</span>
                                                    <span className="text-2xl font-bold text-slate-900">{symbol}{((buyerPays) * rate).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-600 font-medium">You Receive</span>
                                                    <span className="text-2xl font-bold text-[var(--brand-teal)]">{symbol}{((youReceive) * rate).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button className="w-full mt-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold h-12">
                                            Get Started
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-surface rounded-[2.5rem] p-8 shadow-xl min-h-[520px] animate-pulse" />
                    )}
                </div>
            </div>
        </div>
    );
}
