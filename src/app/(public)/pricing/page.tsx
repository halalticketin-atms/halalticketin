'use client';

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { type OrganizerSummary } from '@/context/organizer-context';
import { Check, Wand2, Banknote, ShieldCheck, QrCode, BarChart3, Users } from 'lucide-react';
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
import {
    PAYG_FEE_GBP,
    MIN_CREDITS,
    MAX_CREDITS,
    MIN_PRICE_GBP,
    calculateCreditPrice,
    SUPPORTED_CURRENCIES,
    type SupportedCurrency,
    isSupportedCurrency
} from '@/lib/fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';

type FadeStyle = CSSProperties & { '--fade-delay'?: string };
const fadeStyle = (delay: string): FadeStyle => ({ '--fade-delay': delay });

export default function PricingPage() {
    const [currency, setCurrency] = useState<SupportedCurrency>('GBP');
    const [payUpfront, setPayUpfront] = useState(true);
    const [ticketPriceInput, setTicketPriceInput] = useState('20');
    const [credits, setCredits] = useState(1000);
    const [passFees, setPassFees] = useState(true);
    const router = useRouter();
    const { user, memberships } = useAuth();
    const calculatorRef = useRef<HTMLDivElement | null>(null);
    const [shouldRenderCalculator, setShouldRenderCalculator] = useState(false);

    // Use live exchange rates from API
    const { rates, isLoading: isLoadingRates } = useExchangeRates();

    // Default to organizer's currency if logged in
    useEffect(() => {
        if (!user || memberships.length === 0) return;

        const setOrganizerCurrency = async () => {
            try {
                const response = await api.get<{ organizers: OrganizerSummary[] }>('/api/v1/organizers');
                // Find the organizer corresponding to the first membership, or fallback to the first one found
                const orgId = memberships[0].organizerId;
                const activeOrg = response.organizers.find(o => o.id === orgId) || response.organizers[0];

                if (activeOrg?.defaultCurrency && isSupportedCurrency(activeOrg.defaultCurrency)) {
                    setCurrency(activeOrg.defaultCurrency as SupportedCurrency);
                }
            } catch (error) {
                // Silently fail and keep default currency
                console.debug('Failed to load organizer currency preferences', error);
            }
        };

        setOrganizerCurrency();
    }, [user, memberships]);

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

    // All calculations done in GBP first, then converted to display currency
    // Credit price is now in GBP (from fees.ts)
    const currentCreditPriceGBP = calculateCreditPrice(credits);
    const totalCreditCostGBP = credits * currentCreditPriceGBP;

    // Get currency info and exchange rate
    const currencyInfo = SUPPORTED_CURRENCIES[currency];
    const symbol = currencyInfo?.symbol ?? currency;
    const rate = rates[currency] ?? 1;

    // All fee calculations in GBP first - only platform fee (no processing fee shown)
    const platformFeeGBP = payUpfront ? currentCreditPriceGBP : PAYG_FEE_GBP;

    // Convert fees to display currency for breakdown
    const platformFeeDisplay = platformFeeGBP * rate;

    // Parse ticket price from string input (default to 0 for calculations if empty)
    const ticketPrice = parseFloat(ticketPriceInput) || 0;

    // Buyer pays and you receive calculations (in display currency) - only platform fee
    const buyerPays = passFees ? ticketPrice + platformFeeDisplay : ticketPrice;
    const youReceive = passFees ? ticketPrice : ticketPrice - platformFeeDisplay;

    return (
        <div className="min-h-screen relative overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)]">
            <AmbientBackground />

            <div className="relative z-10 container mx-auto px-4 pt-[calc(var(--nav-safe-offset)+1.5rem)] md:pt-[calc(var(--nav-safe-offset)+3rem)] pb-16">
                {/* Header */}
                <div className="text-center mb-12 md:mb-16 space-y-4 animate-fade-up">
                    <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
                        Simple, transparent pricing for <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)]">every event organiser.</span>
                    </h1>
                    <div className="flex justify-center mt-6">
                        <Select value={currency} onValueChange={(v) => setCurrency(v as SupportedCurrency)}>
                            <SelectTrigger className="w-[180px] bg-white/85 md:bg-white/60 border-white/60 md:backdrop-blur-sm text-slate-700 font-semibold h-10 rounded-full shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                                    <SelectItem key={code} value={code}>
                                        {code} ({info.symbol})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isLoadingRates && (
                            <span className="ml-2 text-xs text-slate-500 self-center">Loading rates...</span>
                        )}
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-6 md:gap-8 max-w-6xl mx-auto mb-24">

                    {/* Left Column: Marketing Card */}
                    <div className="lg:w-1/3 flex animate-fade-up" style={fadeStyle('0.1s')}>
                        <div className="w-full bg-gradient-to-br from-[var(--brand-cyan)] via-[var(--brand-teal)] to-[#0d9488] rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                            {/* Decorative gradients */}
                            <div className="hidden md:block absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white to-transparent opacity-15 blur-3xl rounded-full transform translate-x-1/2 -translate-y-1/2 group-hover:opacity-25 transition-opacity duration-500" />
                            <div className="hidden md:block absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#0f766e] to-transparent opacity-30 blur-3xl rounded-full transform -translate-x-1/2 translate-y-1/2 group-hover:opacity-40 transition-opacity duration-500" />

                            <div className="relative z-10 space-y-6">
                                <div>
                                    <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-4">
                                        Get started.
                                    </h2>
                                    <p className="text-white/90 text-lg leading-relaxed">
                                        Manage your ticket sales effortlessly. Our platform provides everything you need to create, promote, and sell out your events.
                                    </p>
                                </div>
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <Banknote className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">Instant Payouts</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <ShieldCheck className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">Secure Booking</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <QrCode className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">Effortless Ticketing</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <Wand2 className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">AI Integrated</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <BarChart3 className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">Real-time Analytics</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center backdrop-blur-sm">
                                            <Users className="h-5 w-5 text-white" />
                                        </div>
                                        <span className="font-semibold text-lg">Team Collaboration</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 mt-12">
                                <Button
                                    asChild
                                    size="lg"
                                    className="w-full bg-white text-teal-700 hover:bg-white/90 font-bold rounded-xl h-14 text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                                >
                                    <Link href="/contact">Contact Sales</Link>
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
                                    <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider">
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
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (user) {
                                            router.push('/dashboard');
                                        } else {
                                            router.push('/login?next=/dashboard');
                                        }
                                    }}
                                    className="mt-4 rounded-full border-slate-300 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-all hover:scale-105 px-8"
                                >
                                    Get Started
                                </Button>
                            </div>
                        </div>

                        {/* Pay Upfront Card (Highlighted) */}
                        <div className="glass-surface md:backdrop-blur-xl border-2 border-[var(--brand-cyan)] rounded-[2rem] p-6 md:p-8 shadow-xl shadow-[var(--brand-cyan)]/10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden scale-[1.02] animate-fade-up" style={fadeStyle('0.2s')}>
                            <div className="flex-1 text-center md:text-left z-10">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <h3 className="font-display text-2xl font-bold text-slate-800">Pay Upfront</h3>
                                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                                        Save Big
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4">Buy credits in advance. Best for regular event organisers.</p>
                                <ul className="space-y-2 text-sm text-slate-500">
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Lowest fees guaranteed</li>
                                    <li className="flex items-center gap-2 justify-center md:justify-start"><Check className="h-4 w-4 text-[var(--brand-cyan)]" /> Credits never expire</li>
                                </ul>
                            </div>
                            <div className="text-center z-10">
                                <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">From</div>
                                <div className="font-display text-5xl font-bold text-slate-900 mb-1">
                                    {symbol}{(MIN_PRICE_GBP * rate).toFixed(2)}
                                </div>
                                <div className="text-sm text-slate-500">per ticket</div>
                                <Button
                                    onClick={() => document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="mt-4 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 hover:shadow-lg transition-all hover:scale-105 cursor-pointer px-8 shadow-md"
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
                                    <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider">
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
                                <div className="font-display text-5xl font-bold text-slate-900 mb-1">
                                    {symbol}{(PAYG_FEE_GBP * rate).toFixed(2)}
                                </div>
                                <div className="text-sm text-slate-500">per ticket</div>
                                <Button
                                    variant="outline"
                                    onClick={() => { setPayUpfront(false); document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' }) }}
                                    className="mt-4 rounded-full border-slate-300 hover:bg-slate-100 hover:border-slate-400 cursor-pointer transition-all hover:scale-105 px-8"
                                >
                                    Calculate
                                </Button>
                            </div>
                        </div>

                        {/* Charity Discount Banner */}
                        <div className="animate-fade-up" style={fadeStyle('0.3s')}>
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/10 via-purple-500/10 to-fuchsia-500/10 border border-purple-200/50 px-6 py-4 md:px-8 md:py-5">
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
                                <div className="relative z-10 flex items-center justify-center gap-4">
                                    <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/25">
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                    </div>
                                    <p className="font-display text-lg font-bold text-slate-800 text-center md:text-left">
                                        Registered charities receive <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-600">50% off</span> platform fees
                                    </p>
                                </div>
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
                                <p className="text-slate-600 max-w-2xl mx-auto">See exactly what you&rsquo;re paying per ticket.</p>
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
                                                className={`flex-1 md:flex-none relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors cursor-pointer ${payUpfront ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Pay Upfront
                                            </button>
                                            <button
                                                onClick={() => setPayUpfront(false)}
                                                className={`flex-1 md:flex-none relative z-10 px-8 py-3 rounded-full text-sm font-bold transition-colors cursor-pointer ${!payUpfront ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
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
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={ticketPriceInput}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        // Allow empty, digits, and one decimal point
                                                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                            // Prevent values over 9999
                                                            const numVal = parseFloat(val);
                                                            if (val === '' || isNaN(numVal) || numVal <= 9999) {
                                                                setTicketPriceInput(val);
                                                            }
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        // Clean up the value on blur (remove trailing dot, format nicely)
                                                        if (ticketPriceInput === '' || ticketPriceInput === '.') {
                                                            setTicketPriceInput('0');
                                                        } else {
                                                            const num = parseFloat(ticketPriceInput);
                                                            if (!isNaN(num)) {
                                                                setTicketPriceInput(num.toString());
                                                            }
                                                        }
                                                    }}
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
                                                    <span className="text-slate-500">Unit cost: <span className="font-bold text-slate-900">{symbol}{(currentCreditPriceGBP * rate).toFixed(2)}</span></span>
                                                    <span className="text-[var(--brand-teal)] font-bold">Total: {symbol}{(totalCreditCostGBP * rate).toFixed(2)} <span className="text-xs font-normal text-slate-400">+VAT</span></span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Credits Info Note */}
                                        <div className="flex items-start gap-3 text-xs text-slate-500 bg-slate-50/70 rounded-xl p-4 border border-slate-100/80">
                                            <div className="w-0.5 h-full min-h-[2.5rem] bg-gradient-to-b from-[var(--brand-cyan)] to-[var(--brand-teal)] rounded-full flex-shrink-0" />
                                            <p className="leading-relaxed">
                                                <span className="font-semibold text-slate-700">1 credit = 1 paid ticket.</span>{' '}
                                                Buy more credits to lower your per‑ticket rate. Credits are prepaid, so allows you to replace the platform fee with your own custom fee.
                                            </p>
                                        </div>
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
                                                <span className="font-bold text-xl text-slate-900">{symbol}{ticketPrice.toFixed(2)}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500">Halal Ticketin Fee</span>
                                                    <span className="font-medium text-slate-700">{symbol}{platformFeeDisplay.toFixed(2)}</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100">
                                                <div className="flex justify-between items-center mb-6 bg-slate-50 p-3 rounded-xl">
                                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pass fees to buyer?</span>
                                                    <Switch checked={passFees} onCheckedChange={setPassFees} />
                                                </div>

                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-slate-600 font-medium">Buyer Pays</span>
                                                    <span className="text-2xl font-bold text-slate-900">{symbol}{buyerPays.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <span className="text-slate-600 font-medium">You Receive</span>
                                                    <span className="text-2xl font-bold text-[var(--brand-teal)]">{symbol}{youReceive.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <Button
                                                onClick={() => {
                                                    const creditsValue = Math.round(credits);
                                                    if (user) {
                                                        // Redirect to dashboard billing - dashboard will resolve organizer
                                                        router.push(`/dashboard/billing?credits=${creditsValue}`);
                                                    } else {
                                                        // Not logged in - redirect to login, then to dashboard
                                                        const nextPath = `/dashboard/billing?credits=${creditsValue}`;
                                                        router.push(`/login?next=${encodeURIComponent(nextPath)}`);
                                                    }
                                                }}
                                                className="w-full mt-8 rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90 transition-all hover:scale-[1.02] font-bold h-12 shadow-md cursor-pointer hover:shadow-lg"
                                            >
                                                Get Started
                                            </Button>
                                            <p className="text-[10px] text-center text-muted-foreground px-4 italic">
                                                * Requires an organiser profile. You&apos;ll be prompted to sign in or create one.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-surface rounded-[2.5rem] p-8 shadow-xl min-h-[520px] animate-pulse" />
                    )}
                </div>

                {/* Payment Processing Fees Information */}
                <div className="max-w-4xl mx-auto mt-16 animate-fade-up" style={fadeStyle('0.35s')}>
                    <div className="glass-surface md:backdrop-blur-xl rounded-[2rem] p-8 md:p-10 shadow-lg">
                        <h3 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mb-4">
                            Payment Processing Fees
                        </h3>
                        <div className="space-y-4 text-slate-600 leading-relaxed">
                            <p>
                                The pricing plans above show <strong>our platform fees only</strong>. To accept payments online,
                                you&apos;ll also need a payment processor.
                            </p>
                            <p>
                                Halal Ticketin does not directly handle or process customer payments. All
                                transactions are facilitated through trusted, fully certified payment service
                                providers. For example, Stripe is used to ensure fast, secure, and reliable
                                transfers of funds from ticket purchasers directly to your nominated bank
                                account.
                            </p>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-200">
                            <h4 className="font-bold text-lg text-slate-800 mb-4">Example Stripe Fees</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {[
                                    { region: 'UK', fee: '1.5% + £0.20' },
                                    { region: 'US', fee: '2.9% + $0.30' },
                                    { region: 'Eurozone', fee: '1.5% + €0.25' },
                                    { region: 'Canada', fee: '2.9% + C$0.30' },
                                    { region: 'Australia', fee: '1.75% + A$0.30' },
                                ].map(({ region, fee }) => (
                                    <div key={region} className="bg-slate-50 rounded-xl p-4 text-center">
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{region}</div>
                                        <div className="font-semibold text-slate-800">{fee}</div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-4">
                                * Fees may vary based on card type and region.
                                <a href="https://stripe.com/pricing" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-teal)] hover:underline ml-1">
                                    Learn more about Stripe pricing →
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
