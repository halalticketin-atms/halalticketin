'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Info, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import Link from 'next/link';

type Currency = 'GBP' | 'USD' | 'EUR';

const currencies: Record<Currency, { symbol: string; rate: number }> = {
    GBP: { symbol: '£', rate: 1 },
    USD: { symbol: '$', rate: 1.27 },
    EUR: { symbol: '€', rate: 1.17 },
};

export default function PricingPage() {
    const [currency, setCurrency] = useState<Currency>('GBP');
    const [payUpfront, setPayUpfront] = useState(true);
    const [ticketPrice, setTicketPrice] = useState(20);
    const [credits, setCredits] = useState(500);
    const [passFees, setPassFees] = useState(false);

    // Constants
    const PAY_AS_YOU_GO_FEE = 0.60;
    const CREDIT_PRICE_LOW = 0.22; // For high volume
    const CREDIT_PRICE_HIGH = 0.45; // For low volume

    // Calculate cost per credit based on volume (simplified logic)
    const getCreditPrice = (count: number) => {
        if (count >= 1000) return 0.22;
        if (count >= 500) return 0.41;
        if (count >= 100) return 0.45;
        return 0.50;
    };

    const currentCreditPrice = getCreditPrice(credits);
    const totalCreditCost = credits * currentCreditPrice;

    // Breakdown Calculations
    const platformFee = payUpfront ? currentCreditPrice : PAY_AS_YOU_GO_FEE;
    const processingFee = (ticketPrice * 0.015) + 0.20; // Stripe approx 1.5% + 20p
    const vat = platformFee * 0.2; // 20% VAT on platform fee

    const totalFees = platformFee + processingFee + vat;
    const buyerPays = passFees ? ticketPrice + totalFees : ticketPrice;
    const youReceive = passFees ? ticketPrice : ticketPrice - totalFees;

    const symbol = currencies[currency].symbol;
    const rate = currencies[currency].rate;

    return (
        <div className="min-h-screen bg-[#F0FDF4] overflow-x-hidden font-sans text-[#1a1a1a]">
            {/* Curved Header Background */}
            <div className="absolute top-0 left-0 w-full h-[800px] z-0 overflow-hidden">
                <svg
                    viewBox="0 0 1440 800"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full object-cover"
                    preserveAspectRatio="none"
                >
                    <path d="M0 0H1440V550C1440 550 1100 650 720 500C340 350 0 550 0 550V0Z" fill="#E6FFFA" />
                    <path d="M-100 0H600C600 0 450 300 200 250C-50 200 -100 0 -100 0Z" fill="#14B8A6" fillOpacity="0.2" />
                    <path d="M1000 0H1500V400C1500 400 1250 500 1000 300C750 100 1000 0 1000 0Z" fill="#14B8A6" fillOpacity="0.2" />
                </svg>
            </div>

            <div className="relative z-10 container pt-12 pb-20">
                {/* Header Content */}
                <div className="flex justify-between items-start mb-12">
                    <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                        <SelectTrigger className="w-[100px] bg-transparent border-none text-muted-foreground hover:text-foreground font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="text-center flex-1 pr-[100px]">
                        <span className="inline-block px-4 py-1.5 rounded-full bg-[#4FD1C5] text-white text-sm font-bold mb-4 shadow-lg shadow-teal-500/20">
                            Halal Ticketin&apos;
                        </span>
                        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-[#1a1a1a]">
                            Ticketin&apos; the right way
                        </h1>
                    </div>
                </div>

                {/* 3 Cards Section */}
                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
                    {/* Free Card */}
                    <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border border-teal-50 text-center flex flex-col items-center">
                        <div className="w-full bg-[#6EE7B7] text-[#064E3B] font-bold py-6 px-4 rounded-[2rem] mb-6 transform rotate-[-2deg] flex items-center justify-center min-h-[100px]">
                            Free for free<br />No fees for issuing zero<br />cost free tickets.
                        </div>
                        <div className="text-5xl font-bold mb-2">{symbol}0</div>
                        <div className="mt-auto pt-6 text-sm text-gray-500">
                            Always free for community events
                        </div>
                    </motion.div>

                    {/* Pay Upfront Card */}
                    <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border border-teal-50 text-center flex flex-col items-center relative z-20 scale-105">
                        <div className="w-full bg-[#4FD1C5] text-white font-bold py-6 px-4 rounded-[2rem] mb-6 transform rotate-[1deg] flex items-center justify-center min-h-[100px] shadow-lg shadow-teal-500/20">
                            Pay upfront<br />Buy credits in advance and<br />save
                        </div>
                        <div className="text-sm text-gray-500 mb-1">from</div>
                        <div className="text-5xl font-bold mb-1 text-[#1a1a1a]">
                            {symbol}{(0.22 * rate).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mb-4">per ticket (+VAT)</div>
                        <Button variant="link" className="text-teal-600 underline font-semibold" onClick={() => document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })}>
                            Calculate your price
                        </Button>
                    </motion.div>

                    {/* Pay As You Sell Card */}
                    <motion.div whileHover={{ y: -5 }} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-teal-900/5 border border-teal-50 text-center flex flex-col items-center">
                        <div className="w-full bg-[#2DD4BF] text-white font-bold py-6 px-4 rounded-[2rem] mb-6 transform rotate-[-1deg] flex items-center justify-center min-h-[100px]">
                            Pay as you sell<br />Simple, low pricing to get you<br />started
                        </div>
                        <div className="text-sm text-gray-500 mb-1">from</div>
                        <div className="text-5xl font-bold mb-1">
                            {symbol}{(0.60 * rate).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mb-4">per ticket (+VAT)</div>
                        <Button variant="link" className="text-teal-600 underline font-semibold" onClick={() => { setPayUpfront(false); document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' }) }}>
                            Calculate your price
                        </Button>
                    </motion.div>
                </div>

                {/* Feature Icons Row */}
                <div className="flex justify-center gap-8 md:gap-16 text-center text-sm font-medium text-gray-600 max-w-4xl mx-auto mb-20">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-teal-500">
                            <Check className="h-5 w-5" />
                        </div>
                        <span>No monthly fees</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-teal-500">
                            <Check className="h-5 w-5" />
                        </div>
                        <span>Cancel anytime</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-teal-500">
                            <Check className="h-5 w-5" />
                        </div>
                        <span>Charity discount</span>
                    </div>
                </div>

                {/* Create Event CTA */}
                <div className="text-center mb-32">
                    <Button size="lg" className="rounded-full bg-[#2DD4BF] hover:bg-[#26b8a5] text-black font-bold px-8 py-6 text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                        Create event
                    </Button>
                </div>

                {/* Calculator Section */}
                <div id="calc" className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto items-start">

                    {/* Left Column: Inputs */}
                    <div>
                        <h2 className="font-display text-4xl font-bold mb-8 text-[#1a1a1a]">Calculate your fees</h2>

                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="text-lg font-semibold">Models</Label>
                            </div>
                            <div className="flex items-center gap-4 bg-white p-1 rounded-full border w-fit">
                                <button
                                    onClick={() => setPayUpfront(true)}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${payUpfront ? 'bg-[#2DD4BF] text-white' : 'hover:bg-gray-100'}`}
                                >
                                    Pay upfront
                                </button>
                                <button
                                    onClick={() => setPayUpfront(false)}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${!payUpfront ? 'bg-[#2DD4BF] text-white' : 'hover:bg-gray-100'}`}
                                >
                                    Pay as you sell
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-10">
                            {[
                                'Each ticket sold equals one credit used',
                                payUpfront ? 'Buy credits now use later' : 'Pay only when you sell',
                                'Automate your top-ups',
                                'Pass fees on to your ticket buyer'
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#6EE7B7] text-white flex items-center justify-center">
                                        <Check className="h-3 w-3 stroke-[3]" />
                                    </div>
                                    <span className="font-medium text-gray-700">{item}</span>
                                </div>
                            ))}
                        </div>

                        <div className="h-px bg-gray-200 my-8" />

                        {/* Ticket Price Input */}
                        <div className="mb-8">
                            <Label className="font-bold text-lg mb-4 block">Ticket price</Label>
                            <div className="relative w-[150px]">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">{symbol}</span>
                                <Input
                                    type="number"
                                    value={ticketPrice}
                                    onChange={(e) => setTicketPrice(Number(e.target.value))}
                                    className="pl-8 h-12 text-lg font-bold rounded-xl border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Credits Slider (only for Upfront) */}
                        {payUpfront && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <Label className="font-bold text-lg underline decoration-2 decoration-black">Ticket credits</Label>
                                    <div className="border border-black rounded-lg px-3 py-1 font-bold bg-white">
                                        {credits}
                                    </div>
                                </div>
                                <Slider
                                    value={[credits]}
                                    onValueChange={(vals) => setCredits(vals[0])}
                                    min={50}
                                    max={5000}
                                    step={50}
                                    className="py-4"
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    {credits} ticket credits cost {symbol}{(currentCreditPrice * rate).toFixed(2)} per credit, totalling
                                </p>
                                <div className="text-2xl font-bold mt-1">
                                    {symbol}{(totalCreditCost * rate).toFixed(2)} +VAT
                                </div>
                                <Button className="mt-4 w-full md:w-auto rounded-full bg-[#2DD4BF] hover:bg-[#26b8a5] text-black font-bold px-8 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-lg h-12">
                                    Buy now
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Breakdown */}
                    <div className="bg-[#FEFCE8] p-8 rounded-3xl border border-yellow-100 relative mt-12 md:mt-24">
                        {/* Receipt visual */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline border-b border-gray-200 pb-4">
                                <span className="text-gray-600">Ticket price</span>
                                <span className="font-bold text-xl">{symbol}{(ticketPrice * rate).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-baseline text-sm text-gray-600">
                                <span>Halal Ticketin&apos; fee:</span>
                                <span className="font-medium">{symbol}{(platformFee * rate).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-baseline text-sm text-gray-600 border-b border-gray-200 pb-4">
                                <span className="flex items-center gap-1">
                                    Payment processing fees*
                                    <Info className="h-3 w-3 text-gray-400" />
                                </span>
                                <span className="font-medium">{symbol}{(processingFee * rate).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-baseline py-2">
                                <span className="text-gray-600 font-medium">Your buyers pay:</span>
                                <span className="font-bold text-2xl">{symbol}{((buyerPays) * rate).toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-baseline py-2">
                                <span className="text-gray-600 font-medium">You receive:</span>
                                <span className="font-bold text-2xl text-[#059669]">{symbol}{((youReceive) * rate).toFixed(2)}</span>
                            </div>

                            <div className="mt-8 bg-white/50 p-4 rounded-xl flex items-center justify-between">
                                <span className="font-medium text-sm">Absorb all fees</span>
                                <Switch checked={passFees} onCheckedChange={setPassFees} />
                                <span className="font-medium text-sm">Pass on all fees</span>
                            </div>

                            <p className="text-[10px] text-gray-400 mt-4 leading-tight">
                                *Processing fees are illustrative only and based on typical transactions with Stripe.
                                Fees are exclusive of VAT where applicable.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
