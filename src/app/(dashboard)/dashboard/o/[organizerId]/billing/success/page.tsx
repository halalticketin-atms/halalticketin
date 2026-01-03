'use client';

import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, Wallet, PartyPopper } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function CreditPurchaseSuccessPage() {
    const organizerId = useOrganizerFromParams();

    return (
        <div className="container min-h-[80vh] flex items-center justify-center py-12">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <div className="text-center space-y-6">
                    <div className="relative inline-block">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                            className="h-24 w-24 bg-[var(--brand-mint)] rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[var(--brand-mint)]/20"
                        >
                            <CheckCircle2 className="h-12 w-12 text-[var(--brand-teal)]" />
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                            className="absolute -top-2 -right-2"
                        >
                            <PartyPopper className="h-6 w-6 text-yellow-500" />
                        </motion.div>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-extrabold tracking-tight">Purchase Successful!</h1>
                        <p className="text-muted-foreground">
                            Your credits have been added to your organizer account and are ready to use.
                        </p>
                    </div>

                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-6 flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                            <Wallet className="h-6 w-6 text-[var(--brand-teal)]" />
                        </div>
                        <div className="text-left">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Balance</p>
                            <p className="text-lg font-bold">Credits Updated</p>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button asChild className="w-full h-12 rounded-xl bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white font-bold shadow-lg hover:opacity-90 transition-all">
                            <Link href={`/dashboard/o/${organizerId}/billing`} className="flex items-center justify-center gap-2">
                                Go to Credits Dashboard
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </Button>

                        <Button asChild variant="ghost" className="w-full">
                            <Link href="/dashboard">
                                Back to Overview
                            </Link>
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground pt-4">
                        A confirmation email with your receipt has been sent to your registered email address.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
