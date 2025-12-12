"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from 'motion/react';
import {
    Calendar,
    Ticket,
    DollarSign,
    ArrowLeft,
    Receipt,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';

interface AnalyticsEvent {
    id: string;
    name: string;
    bannerImageUrl: string | null;
    revenue: number;
    ticketsSold: number;
    lastOrderAt: string | null;
}

interface MonthlyPoint {
    label: string;
    value: number;
}

interface AnalyticsResponse {
    filters: {
        events: Array<{
            id: string;
            name: string;
            bannerImageUrl: string | null;
        }>;
    };
    stats: {
        totalRevenue: number;
        ticketsSold: number;
        paidOrders: number;
        totalEvents: number;
        currency: string;
    };
    charts: {
        revenueMonthly: MonthlyPoint[];
        ticketsMonthly: MonthlyPoint[];
    };
    eventPerformance: AnalyticsEvent[];
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

export default function AnalyticsPage() {
    const organizerId = useOrganizerFromParams();
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(
        async (eventId?: string) => {
            if (!organizerId) {
                return;
            }
            setIsLoading(true);
            try {
                const params: Record<string, string> = { organizerId };
                if (eventId) {
                    params.eventId = eventId;
                }
                const response = await api.get<AnalyticsResponse>('/api/v1/analytics/overview', {
                    params,
                });
                setAnalytics(response);
                setError(null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to load analytics';
                setError(message);
                if (eventId) {
                    setSelectedEvent('all');
                }
            } finally {
                setIsLoading(false);
            }
        },
        [organizerId]
    );

    useEffect(() => {
        if (!organizerId) {
            setAnalytics(null);
            setIsLoading(false);
            return;
        }
        void fetchAnalytics();
    }, [fetchAnalytics, organizerId]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const eventOptions = analytics?.filters.events ?? [];
    const selectedEventMeta = selectedEvent === 'all' ? null : eventOptions.find(event => event.id === selectedEvent);

    const stats = useMemo(() => {
        if (!analytics) {
            return [];
        }

        return [
            {
                title: 'Total Revenue',
                value: formatCurrency(analytics.stats.totalRevenue, analytics.stats.currency),
                icon: DollarSign,
            },
            {
                title: 'Tickets Sold',
                value: analytics.stats.ticketsSold.toString(),
                icon: Ticket,
            },
            {
                title: 'Paid Orders',
                value: analytics.stats.paidOrders.toString(),
                icon: Receipt,
            },
            {
                title: 'Active Events',
                value: analytics.stats.totalEvents.toString(),
                icon: Calendar,
            },
        ];
    }, [analytics]);

    const revenueSeries = analytics?.charts.revenueMonthly ?? [];
    const ticketsSeries = analytics?.charts.ticketsMonthly ?? [];
    const maxRevenue = Math.max(1, ...revenueSeries.map(point => point.value));
    const maxTickets = Math.max(1, ...ticketsSeries.map(point => point.value));

    const handleEventChange = (value: string) => {
        setSelectedEvent(value);
        if (value === 'all') {
            void fetchAnalytics();
        } else {
            void fetchAnalytics(value);
        }
    };

    const emptyState = !isLoading && !error && analytics?.eventPerformance.length === 0;

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <Button variant="ghost" size="sm" className="mb-2" asChild>
                            <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Dashboard
                            </Link>
                        </Button>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold">Analytics</h1>
                        <p className="text-muted-foreground">Track performance and insights</p>
                        {selectedEventMeta && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Viewing data for {selectedEventMeta.name}
                            </p>
                        )}
                    </div>

                    {/* Event Selector */}
                    <div className="flex items-center gap-3">
                        {mounted ? (
                            <Select value={selectedEvent} onValueChange={handleEventChange}>
                                <SelectTrigger className="w-[280px] h-12 bg-background">
                                    <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All events</SelectItem>
                                    {eventOptions.map(event => (
                                        <SelectItem key={event.id} value={event.id}>
                                            <div className="flex items-center gap-3">
                                                {event.bannerImageUrl && (
                                                    <div className="relative h-6 w-6 rounded overflow-hidden">
                                                        <Image
                                                            src={event.bannerImageUrl}
                                                            alt=""
                                                            fill
                                                            sizes="24px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                {event.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="w-[280px] h-12 bg-background rounded-md border border-input" />
                        )}
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.length === 0 && isLoading && (
                        <Card className="border-border/50 h-32 animate-pulse" />
                    )}
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className="border-border/50 hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                                            <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                        </div>
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <stat.icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Charts Section */}
                <Tabs defaultValue="revenue" className="space-y-6">
                    <TabsList className="bg-muted/50">
                        <TabsTrigger value="revenue">Revenue</TabsTrigger>
                        <TabsTrigger value="tickets">Ticket Sales</TabsTrigger>
                        <TabsTrigger value="engagement">Engagement</TabsTrigger>
                    </TabsList>

                    <TabsContent value="revenue">
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Main Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="lg:col-span-2"
                            >
                                <Card className="border-border/50">
                                    <CardHeader className="flex-row items-center justify-between">
                                        <CardTitle className="text-lg">Revenue Over Time</CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <div className="h-3 w-3 rounded-full bg-primary" />
                                                Revenue
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-72 flex items-end justify-between gap-3 pt-8">
                                            {revenueSeries.map((point, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {formatCurrency(point.value, analytics?.stats.currency ?? 'GBP')}
                                                    </span>
                                                    <motion.div
                                                        className="w-full bg-gradient-to-t from-primary to-[oklch(0.72_0.15_185)] rounded-lg"
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${(point.value / maxRevenue) * 200}px` }}
                                                        transition={{ duration: 0.6, delay: i * 0.1 }}
                                                    />
                                                    <span className="text-xs text-muted-foreground">{point.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>

                            {/* Side Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Average Ticket Price</p>
                                        <p className="text-3xl font-bold mt-1">
                                            {analytics && analytics.stats.ticketsSold > 0
                                                ? formatCurrency(
                                                      analytics.stats.totalRevenue / analytics.stats.ticketsSold,
                                                      analytics.stats.currency
                                                  )
                                                : formatCurrency(0, analytics?.stats.currency ?? 'GBP')}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">Live calculation</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Conversion Rate</p>
                                        <p className="text-3xl font-bold mt-1">7.5%</p>
                                        <p className="text-sm text-green-600 mt-2">↑ 2.1% vs last period</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-border/50">
                                    <CardContent className="p-5">
                                        <p className="text-sm text-muted-foreground">Refund Rate</p>
                                        <p className="text-3xl font-bold mt-1">1.2%</p>
                                        <p className="text-sm text-green-600 mt-2">↓ 0.3% vs last period</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </TabsContent>

                    <TabsContent value="tickets">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Ticket Sales Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-72 flex items-end justify-between gap-3 pt-8">
                                        {ticketsSeries.map((point, i) => (
                                            <div key={point.label} className="flex-1 flex flex-col items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">{point.value}</span>
                                                <motion.div
                                                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-lg"
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${(point.value / maxTickets) * 200}px` }}
                                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                                />
                                                <span className="text-xs text-muted-foreground">{point.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="engagement">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader>
                                    <CardTitle className="text-lg">Engagement Metrics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Engagement tracking will be available once we start collecting on-site analytics.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>
                </Tabs>

                {/* Event Performance Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <Card className="border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Event Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <p className="text-sm text-muted-foreground">Loading event performance...</p>
                            ) : error ? (
                                <p className="text-sm text-muted-foreground">{error}</p>
                            ) : emptyState ? (
                                <p className="text-sm text-muted-foreground">No event activity yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Event</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Tickets</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
                                                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Last Order</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics?.eventPerformance.map(event => (
                                                <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            {event.bannerImageUrl ? (
                                                                <div className="relative h-10 w-14 rounded-lg overflow-hidden">
                                                                    <Image
                                                                        src={event.bannerImageUrl}
                                                                        alt=""
                                                                        fill
                                                                        sizes="56px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-10 w-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                                    No image
                                                                </div>
                                                            )}
                                                            <span className="font-medium">{event.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">{event.ticketsSold}</td>
                                                    <td className="py-4 px-4 text-right font-medium">
                                                        {formatCurrency(event.revenue, analytics?.stats.currency ?? 'GBP')}
                                                    </td>
                                                    <td className="py-4 px-4 text-right text-muted-foreground">
                                                        {event.lastOrderAt
                                                            ? new Date(event.lastOrderAt).toLocaleDateString('en-GB', {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              })
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
