'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, History, Coins, ArrowUpRight, TrendingUp, RefreshCw } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useAuth } from '@/context/auth-context';
import { getCreditBalance, CreditBalanceResponse } from '@/lib/credits-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { CreditUsageBar, UsageSegment } from '@/components/dashboard/credits/CreditUsageBar';
import { CreditMetricCard } from '@/components/dashboard/credits/CreditMetricCard';

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

    const formatCurrency = (amount: string | number, currency: string) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    // Simple Used vs Available based on real data
    const usageData = useMemo(() => {
        if (!data) return { total: 0, used: 0, segments: [] };

        const total = data.totalPurchased > 0 ? data.totalPurchased : data.balance;
        const used = Math.max(0, data.totalPurchased - data.balance);

        const segments: UsageSegment[] = used > 0 ? [
            {
                id: 'used',
                label: 'Credits Used',
                value: used,
                color: 'var(--brand-teal, #0d9488)'
            }
        ] : [];

        return { total, used, segments };
    }, [data]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="container py-8 overflow-x-hidden space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-2xl sm:text-3xl font-bold">Credits</h1>
                    <p className="text-muted-foreground mt-1">Manage your wallet and available credits</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                >
                    <Button variant="outline" className="hidden sm:flex">
                        Manage Payment Methods
                    </Button>
                    <Button asChild className="rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md hover:opacity-90 transition-opacity px-6">
                        <Link href={`/dashboard/o/${organizerId}/billing/purchase`} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Top Up Wallet
                        </Link>
                    </Button>
                </motion.div>
            </div>

            {/* Top Metrics Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                <CreditMetricCard
                    title="Available Credits"
                    value={data?.balance?.toLocaleString() ?? 0}
                    icon={Wallet}
                    className="border-l-4 border-l-[var(--brand-teal)]"
                />
                <CreditMetricCard
                    title="Total Purchased"
                    value={data?.totalPurchased?.toLocaleString() ?? 0}
                    icon={Coins}
                />
            </div>

            {/* Usage Breakdown Bar */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-6"
            >
                <CreditUsageBar
                    total={usageData.total}
                    used={usageData.used}
                    segments={usageData.segments}
                />
            </motion.div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                Recent Transactions
                            </CardTitle>
                            <CardDescription>Your recent credit purchases and usage</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="hidden sm:flex">
                            Export CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {data?.history && data.history.length > 0 ? (
                            <div className="rounded-lg border border-border/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead className="text-right"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Real History Items (Purchases) */}
                                        {data.history.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {formatDate(item.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    Credit Top Up
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
                                                        Top Up
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-emerald-600 font-medium">
                                                    +{item.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    -
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border/50">
                                <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="font-semibold text-muted-foreground">No history yet</h3>
                                <p className="text-sm text-muted-foreground/60">Your credit purchases will appear here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

