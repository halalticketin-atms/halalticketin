'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useAuth } from '@/context/auth-context';
import { getCreditBalance, CreditBalanceResponse } from '@/lib/credits-api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function BillingPage() {
    const organizerId = useOrganizerFromParams();
    const { user } = useAuth();
    const [data, setData] = useState<CreditBalanceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!organizerId) return;
            try {
                const result = await getCreditBalance(organizerId);
                setData(result);
            } catch (error) {
                console.error('Failed to fetch credit data:', error);
            } finally {
                setIsLoading(false);
            }
        }
        void fetchData();
    }, [organizerId]);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(new Date(dateString));
    };

    // Usage calculations
    const usageData = useMemo(() => {
        if (!data) return { total: 0, used: 0, available: 0, usedPercentage: 0 };

        const total = data.totalPurchased > 0 ? data.totalPurchased : data.balance;
        const used = Math.max(0, data.totalPurchased - data.balance);
        const available = data.balance;
        const usedPercentage = total > 0 ? (used / total) * 100 : 0;

        return { total, used, available, usedPercentage };
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="container py-8 overflow-x-hidden">
            <div className="space-y-6">
                {/* Hero Card - Available Credits */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden rounded-2xl border border-[var(--brand-mint)]/30 bg-gradient-to-br from-[var(--brand-mint)]/5 via-background to-[var(--brand-cyan)]/5 p-6 sm:p-8 lg:p-10"
                >
                    {/* Decorative accents */}
                    <div className="absolute top-0 right-0 w-32 h-32 lg:w-48 lg:h-48 bg-gradient-to-bl from-[var(--brand-mint)]/10 to-transparent rounded-bl-full" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[var(--brand-cyan)]/5 to-transparent rounded-tr-full hidden lg:block" />

                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 lg:gap-12">
                        {/* Main balance */}
                        <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">Available Credits</p>
                            <h2 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] bg-clip-text text-transparent">
                                {data?.balance?.toLocaleString() ?? 0}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-2">
                                Ready to use for your events
                            </p>
                        </div>

                        {/* Desktop: Additional stat + CTA */}
                        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-4 lg:gap-6">
                            {/* Total Purchased stat - visible on md+ */}
                            <div className="hidden md:block text-right">
                                <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase mb-1">Total Purchased</p>
                                <p className="text-2xl lg:text-3xl font-bold text-foreground">
                                    {data?.totalPurchased?.toLocaleString() ?? 0}
                                </p>
                            </div>

                            <Button
                                asChild
                                variant="outline"
                                className="group rounded-full border-[var(--brand-teal)]/40 hover:border-[var(--brand-teal)] hover:bg-[var(--brand-teal)]/5 transition-all duration-300 px-5 lg:px-6 h-11"
                            >
                                <Link href={`/dashboard/o/${organizerId}/billing/purchase`} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4 text-[var(--brand-teal)] group-hover:scale-110 transition-transform" />
                                    <span className="font-medium">Add Credits</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Two Column Grid for Usage & Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Usage Progress Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">Credit Usage</span>
                            </div>
                        </div>

                        {/* Minimal Progress Bar */}
                        <div className="relative h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${usageData.usedPercentage}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] rounded-full"
                            />
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${100 - usageData.usedPercentage}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                                className="absolute right-0 top-0 h-full bg-[var(--brand-mint)]/40 rounded-full"
                            />
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)]" />
                                    <span className="text-muted-foreground">Used: <span className="font-medium text-foreground">{usageData.used.toLocaleString()}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--brand-mint)]/60" />
                                    <span className="text-muted-foreground">Available: <span className="font-medium text-foreground">{usageData.available.toLocaleString()}</span></span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Recent Transactions Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
                    >
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Recent Transactions</span>
                            </div>
                            {data?.history && data.history.length > 0 && (
                                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    View all
                                </button>
                            )}
                        </div>

                        {data?.history && data.history.length > 0 ? (
                            <div className="space-y-1">
                                {data.history.slice(0, 5).map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                                        className="flex items-center justify-between py-3 border-b border-border/30 last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-[var(--brand-mint)]/20 flex items-center justify-center">
                                                <ArrowDownLeft className="h-4 w-4 text-[var(--brand-teal)]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">Credit Top Up</p>
                                                <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-[var(--brand-teal)]">
                                                +{item.amount.toLocaleString()}
                                            </span>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-[var(--brand-teal)]" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-3">
                                    <Clock className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">No transactions yet</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Your credit activity will appear here</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
