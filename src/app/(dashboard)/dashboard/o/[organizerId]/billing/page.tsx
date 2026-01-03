'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wallet, Plus, History, Coins, ArrowUpRight } from 'lucide-react';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useAuth } from '@/context/auth-context';
import { getCreditBalance, CreditBalanceResponse } from '@/lib/credits-api';
import { StatCard } from '@/components/dashboard';
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

    const stats = useMemo(() => [
        {
            title: 'Available Credits',
            value: data?.balance ?? 0,
            icon: Wallet,
            color: 'blue' as const,
        },
        {
            title: 'Total Purchased',
            value: data?.totalPurchased ?? 0,
            icon: Coins,
            color: 'purple' as const,
        }
    ], [data]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="container py-8 overflow-x-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-2xl sm:text-3xl font-bold">Credits</h1>
                    <p className="text-muted-foreground mt-1">Manage your pre-paid credits and view purchase history</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <Button asChild className="rounded-full bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md hover:opacity-90 transition-opacity px-6 h-11">
                        <Link href={`/dashboard/o/${organizerId}/billing/purchase`} className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            Buy Credits
                        </Link>
                    </Button>
                </motion.div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-8">
                {stats.map((stat, i) => (
                    <StatCard key={stat.title} {...stat} delay={i * 0.1} />
                ))}
            </div>

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
                                Purchase History
                            </CardTitle>
                            <CardDescription>Your recent credit transactions</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data?.history && data.history.length > 0 ? (
                            <div className="rounded-lg border border-border/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Credits</TableHead>
                                            <TableHead>Price/Unit</TableHead>
                                            <TableHead>Total Paid (excl. VAT)</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.history.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    {formatDate(item.createdAt)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-[var(--brand-mint)] text-[var(--brand-teal)] border-none">
                                                        +{item.amount.toLocaleString()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatCurrency(item.pricePerCredit, item.currency)}</TableCell>
                                                <TableCell className="font-semibold">{formatCurrency(item.totalPaid, item.currency)}</TableCell>
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
