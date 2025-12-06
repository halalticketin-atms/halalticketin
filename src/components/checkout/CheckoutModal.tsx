'use client';

import { useState } from 'react';
import { Check, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface CheckoutModalProps {
    items?: OrderItem[];
    fees?: number;
    discount?: { code: string; amount: number };
    currency?: string;
}

const defaultItems: OrderItem[] = [
    { name: 'General Admissions Tickets', quantity: 5, price: 50 },
    { name: 'VIP Tickets', quantity: 2, price: 350 },
    { name: 'Family Tickets', quantity: 1, price: 100 },
];

export function CheckoutModal({
    items = defaultItems,
    fees = 10,
    discount = { code: 'SUMMER 25', amount: 60 },
    currency = '€',
}: CheckoutModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank'>('card');
    const [saveCard, setSaveCard] = useState(false);
    const [step, setStep] = useState(2); // 1: Info, 2: Payment, 3: Complete

    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    const total = subtotal + fees - discount.amount;

    return (
        <div className="w-full max-w-[900px] mx-auto">
            <div
                className="flex flex-col md:flex-row overflow-hidden rounded-[2rem] shadow-2xl shadow-black/10"
                style={{ minHeight: '480px' }}
            >
                {/* Left Panel - Order Summary */}
                <div className="flex-1 bg-gradient-to-br from-white to-primary/5 p-8 md:p-10">
                    {/* Logo */}
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Check className="w-8 h-8 text-white stroke-[3]" />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-2xl font-bold mb-8 italic underline decoration-2 underline-offset-4">
                        Order Summary
                    </h2>

                    {/* Line Items */}
                    <div className="space-y-4 mb-8">
                        {items.map((item, i) => (
                            <div key={i} className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-800">{item.name}</p>
                                    <p className="text-xs text-gray-400">QTY: {item.quantity}</p>
                                </div>
                                <p className="font-semibold text-gray-800">{currency}{item.price}</p>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Fees</span>
                            <span>{currency}{fees}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Discount ({discount.code})</span>
                            <span className="text-green-600">- {currency}{discount.amount}</span>
                        </div>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-baseline mt-8 pt-4 border-t border-gray-200">
                        <span className="text-2xl font-bold">Total</span>
                        <span className="text-3xl font-bold">{currency}{total}</span>
                    </div>
                </div>

                {/* Right Panel - Payment */}
                <div className="flex-1 bg-primary p-8 md:p-10 flex flex-col">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[
                            { num: 1, label: 'Information' },
                            { num: 2, label: 'Payment' },
                            { num: 3, label: 'Complete' },
                        ].map((s, i) => (
                            <div key={s.num} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={cn(
                                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2',
                                            step > s.num
                                                ? 'bg-white text-primary border-white'
                                                : step === s.num
                                                    ? 'bg-primary/80 text-white border-primary/80'
                                                    : 'bg-transparent text-white/60 border-white/40'
                                        )}
                                    >
                                        {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                                    </div>
                                    <span className="text-xs mt-1 text-white/80">{s.label}</span>
                                </div>
                                {i < 2 && <div className="w-12 h-0.5 bg-white/30 mx-2 mt-[-16px]" />}
                            </div>
                        ))}
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all',
                                paymentMethod === 'card'
                                    ? 'bg-white border-white text-gray-800 shadow-md'
                                    : 'bg-transparent border-white/50 text-white hover:bg-white/10'
                            )}
                        >
                            <CreditCard className="w-4 h-4" />
                            Credit Card
                        </button>
                        <button
                            onClick={() => setPaymentMethod('bank')}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-medium transition-all',
                                paymentMethod === 'bank'
                                    ? 'bg-white border-white text-gray-800 shadow-md'
                                    : 'bg-transparent border-white/50 text-white hover:bg-white/10'
                            )}
                        >
                            <Building2 className="w-4 h-4" />
                            Bank Transfer
                        </button>
                    </div>

                    {/* Card Form */}
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                Cardholder&apos;s Name
                            </label>
                            <Input
                                className="h-12 bg-primary/20 border-0 rounded-xl text-gray-800 placeholder:text-gray-500 font-medium"
                                placeholder="JOHN DOE"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-1.5">
                                Card Number
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1F71] font-bold italic text-sm">
                                    VISA
                                </span>
                                <Input
                                    className="h-12 bg-primary/20 border-0 rounded-xl text-gray-800 placeholder:text-gray-500 font-medium pl-14"
                                    placeholder="1234 5678 9012 3456"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1.5">
                                    Expiry
                                </label>
                                <Input
                                    className="h-12 bg-primary/20 border-0 rounded-xl text-gray-800 placeholder:text-gray-500 font-medium"
                                    placeholder="MM/YY"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-1.5">
                                    CVV
                                </label>
                                <Input
                                    className="h-12 bg-primary/20 border-0 rounded-xl text-gray-800 placeholder:text-gray-400 font-medium"
                                    placeholder="123"
                                />
                            </div>
                        </div>

                        {/* Save Card Checkbox */}
                        <div className="flex items-center gap-2 pt-2">
                            <Checkbox
                                id="save-card"
                                checked={saveCard}
                                onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                                className="border-white/50 data-[state=checked]:bg-primary-foreground data-[state=checked]:border-primary-foreground"
                            />
                            <label htmlFor="save-card" className="text-sm text-white/80 cursor-pointer">
                                Save your card information.
                            </label>
                        </div>
                    </div>

                    {/* Pay Button */}
                    <Button
                        size="lg"
                        className="w-full h-14 mt-6 bg-white hover:bg-white/90 text-primary font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all"
                    >
                        Pay Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
