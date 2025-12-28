"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar,
    Ticket,
    DollarSign,
    ArrowLeft,
    Receipt,
    TrendingUp,
    TrendingDown,
    Check,
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
        netRevenue: number; // Revenue after platform + Stripe fees
        ticketsSold: number;
        paidOrders: number;
        totalEvents: number;
        currency: string;
    };
    charts: {
        revenueMonthly: MonthlyPoint[];
        ticketsMonthly: MonthlyPoint[];
        revenueYearly: MonthlyPoint[];
        ticketsYearly: MonthlyPoint[];
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
    const [chartView, setChartView] = useState<'revenue' | 'tickets'>('revenue');
    const [periodView, setPeriodView] = useState<'6months' | 'yearly'>('6months');
    const [selectedYear, setSelectedYear] = useState<number>(2025);
    const [eventSortBy, setEventSortBy] = useState<'revenue' | 'tickets'>('revenue');
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

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
                if (periodView === 'yearly') {
                    params.year = selectedYear.toString();
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
        [organizerId, periodView, selectedYear]
    );

    useEffect(() => {
        if (!organizerId) {
            setAnalytics(null);
            setIsLoading(false);
            return;
        }
        void fetchAnalytics(selectedEvent === 'all' ? undefined : selectedEvent);
    }, [fetchAnalytics, organizerId, selectedEvent]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const eventOptions = analytics?.filters.events ?? [];
    const selectedEventMeta = selectedEvent === 'all' ? null : eventOptions.find(event => event.id === selectedEvent);

    // Enhanced KPI stats with consistent styling
    const stats = useMemo(() => {
        if (!analytics) {
            return [];
        }

        return [
            {
                title: 'Net Revenue',
                value: formatCurrency(analytics.stats.netRevenue, analytics.stats.currency),
                icon: DollarSign,
                cardClass: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900',
                iconClass: 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg',
            },
            {
                title: 'Tickets Sold',
                value: analytics.stats.ticketsSold.toLocaleString(),
                icon: Ticket,
                cardClass: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900',
                iconClass: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg',
            },
            {
                title: 'Paid Orders',
                value: analytics.stats.paidOrders.toLocaleString(),
                icon: Check,
                cardClass: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900',
                iconClass: 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg',
            },
            {
                title: 'Total Events',
                value: analytics.stats.totalEvents.toString(),
                icon: Calendar,
                cardClass: 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900',
                iconClass: 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg',
            },
        ];
    }, [analytics]);

    // Calculate derived metrics
    const derivedMetrics = useMemo(() => {
        if (!analytics) {
            return { avgTicketPrice: 0, peakMonth: null, growth: null, avgOrderValue: 0 };
        }

        const avgTicketPrice = analytics.stats.ticketsSold > 0
            ? analytics.stats.netRevenue / analytics.stats.ticketsSold
            : 0;

        const avgOrderValue = analytics.stats.paidOrders > 0
            ? analytics.stats.netRevenue / analytics.stats.paidOrders
            : 0;

        // Find peak sales month
        const peakMonth = analytics.charts.revenueMonthly.reduce((max, point) =>
            point.value > max.value ? point : max
            , analytics.charts.revenueMonthly[0]);

        // Calculate growth (last month vs previous month)
        const months = analytics.charts.revenueMonthly;
        const growth = months.length >= 2 ? {
            percentage: months[months.length - 2].value > 0
                ? ((months[months.length - 1].value - months[months.length - 2].value) / months[months.length - 2].value) * 100
                : 0,
            isPositive: months[months.length - 1].value >= months[months.length - 2].value
        } : null;

        return { avgTicketPrice, peakMonth, growth, avgOrderValue };
    }, [analytics]);

    const currentSeries = useMemo(() => {
        if (!analytics) return [];

        if (periodView === 'yearly') {
            return chartView === 'revenue'
                ? analytics.charts.revenueYearly
                : analytics.charts.ticketsYearly;
        }

        return chartView === 'revenue'
            ? analytics.charts.revenueMonthly
            : analytics.charts.ticketsMonthly;
    }, [analytics, chartView, periodView]);
    const maxValue = Math.max(1, ...currentSeries.map(point => point.value));

    // Top events sorted by revenue or tickets
    const topEvents = useMemo(() => {
        if (!analytics) return [];
        return [...analytics.eventPerformance]
            .sort((a, b) => eventSortBy === 'revenue' ? b.revenue - a.revenue : b.ticketsSold - a.ticketsSold)
            .slice(0, 5);
    }, [analytics, eventSortBy]);

    const maxEventValue = topEvents.length > 0
        ? (eventSortBy === 'revenue' ? topEvents[0].revenue : topEvents[0].ticketsSold)
        : 1;

    const handleEventChange = (value: string) => {
        setSelectedEvent(value);
    };

    const emptyState = !isLoading && !error && analytics?.eventPerformance.length === 0;

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 max-w-7xl">
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
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                Viewing data for {selectedEventMeta.name}
                            </p>
                        )}
                    </div>

                    {/* Event Selector */}
                    <div className="flex items-center gap-3">
                        {mounted ? (
                            <Select value={selectedEvent} onValueChange={handleEventChange}>
                                <SelectTrigger className="w-full sm:w-[280px] h-12 bg-background">
                                    <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All events</SelectItem>
                                    {eventOptions.map(event => (
                                        <SelectItem key={event.id} value={event.id}>
                                            <div className="flex items-center gap-3">
                                                {event.bannerImageUrl && (
                                                    <div className="relative h-6 w-6 rounded overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={event.bannerImageUrl}
                                                            alt=""
                                                            fill
                                                            sizes="24px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <span className="truncate">{event.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="w-full sm:w-[280px] h-12 bg-background rounded-md border border-input" />
                        )}
                    </div>
                </motion.div>

                {/* Enhanced KPI Cards with consistent styling */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.length === 0 && isLoading && (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <Card key={i} className="h-32 animate-pulse" />
                            ))}
                        </>
                    )}
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card className={stat.cardClass}>
                                <CardContent className="p-4 sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-muted-foreground mb-1 truncate">{stat.title}</p>
                                            <p className="text-2xl sm:text-3xl font-bold break-words">{stat.value}</p>
                                        </div>
                                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${stat.iconClass}`}>
                                            <stat.icon className="h-6 w-6" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3 mb-6">
                    {/* Left Column - Charts (2/3 width on desktop) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Revenue/Tickets Chart with Toggle */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <CardTitle className="text-lg font-semibold">
                                            {chartView === 'revenue' ? 'Revenue' : 'Tickets'} Over Time
                                        </CardTitle>
                                        <div className="flex gap-2 flex-wrap">
                                            {/* Period Toggle */}
                                            <div className="flex gap-1 bg-muted rounded-lg p-1">
                                                <Button
                                                    variant={periodView === '6months' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setPeriodView('6months')}
                                                    className="h-7 text-xs px-3"
                                                >
                                                    6 Months
                                                </Button>
                                                <Button
                                                    variant={periodView === 'yearly' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setPeriodView('yearly')}
                                                    className="h-7 text-xs px-3"
                                                >
                                                    Yearly
                                                </Button>
                                            </div>

                                            {/* Year Selector - Only show for yearly view */}
                                            {periodView === 'yearly' && (
                                                <div className="flex gap-1 bg-muted rounded-lg p-1">
                                                    <Button
                                                        variant={selectedYear === 2025 ? 'default' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => setSelectedYear(2025)}
                                                        className="h-7 text-xs px-3"
                                                    >
                                                        2025
                                                    </Button>
                                                    <Button
                                                        variant={selectedYear === 2026 ? 'default' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => setSelectedYear(2026)}
                                                        className="h-7 text-xs px-3"
                                                    >
                                                        2026
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Chart Type Toggle */}
                                            <div className="flex gap-1 bg-muted rounded-lg p-1">
                                                <Button
                                                    variant={chartView === 'revenue' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setChartView('revenue')}
                                                    className="h-7 px-3"
                                                >
                                                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                                                    Revenue
                                                </Button>
                                                <Button
                                                    variant={chartView === 'tickets' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setChartView('tickets')}
                                                    className="h-7 px-3"
                                                >
                                                    <Ticket className="h-3.5 w-3.5 mr-1.5" />
                                                    Tickets
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-64 relative pb-6">
                                        <AnimatePresence mode="wait">
                                            <motion.svg
                                                key={chartView}
                                                className="w-full h-full"
                                                viewBox="0 0 600 210"
                                                preserveAspectRatio="none"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {/* Grid lines */}
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <line
                                                        key={i}
                                                        x1="0"
                                                        y1={5 + i * 50}
                                                        x2="600"
                                                        y2={5 + i * 50}
                                                        stroke="currentColor"
                                                        strokeOpacity="0.1"
                                                        className="text-muted-foreground"
                                                    />
                                                ))}

                                                {/* Gradient fill */}
                                                <defs>
                                                    <linearGradient id={`${chartView}Gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor={chartView === 'revenue' ? '#10b981' : '#3b82f6'} stopOpacity="0.3" />
                                                        <stop offset="100%" stopColor={chartView === 'revenue' ? '#10b981' : '#3b82f6'} stopOpacity="0.05" />
                                                    </linearGradient>
                                                    <linearGradient id={`${chartView}LineGradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor={chartView === 'revenue' ? '#10b981' : '#3b82f6'} />
                                                        <stop offset="100%" stopColor={chartView === 'revenue' ? '#059669' : '#2563eb'} />
                                                    </linearGradient>
                                                </defs>

                                                {currentSeries.length > 0 && (
                                                    <>
                                                        {/* Line path */}
                                                        <motion.path
                                                            d={currentSeries.map((point, i) => {
                                                                const x = (i / (currentSeries.length - 1)) * 600;
                                                                const y = 10 + (1 - point.value / maxValue) * 190;
                                                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                                            }).join(' ')}
                                                            fill="none"
                                                            stroke={`url(#${chartView}LineGradient)`}
                                                            strokeWidth="3"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            initial={{ pathLength: 0 }}
                                                            animate={{ pathLength: 1 }}
                                                            transition={{ duration: 1.5, ease: "easeInOut" }}
                                                        />

                                                        {/* Fill area */}
                                                        <motion.path
                                                            d={`${currentSeries.map((point, i) => {
                                                                const x = (i / (currentSeries.length - 1)) * 600;
                                                                const y = 10 + (1 - point.value / maxValue) * 190;
                                                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                                            }).join(' ')} L 600 210 L 0 210 Z`}
                                                            fill={`url(#${chartView}Gradient)`}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ duration: 1, delay: 0.5 }}
                                                        />

                                                        {/* Interactive data points */}
                                                        {currentSeries.map((point, i) => {
                                                            const x = (i / (currentSeries.length - 1)) * 600;
                                                            const y = 10 + (1 - point.value / maxValue) * 190;
                                                            return (
                                                                <g key={i}>
                                                                    {/* Invisible larger hit area */}
                                                                    <circle
                                                                        cx={x}
                                                                        cy={y}
                                                                        r="15"
                                                                        fill="transparent"
                                                                        className="cursor-pointer"
                                                                        onMouseEnter={() => setHoveredPoint(i)}
                                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                                    />
                                                                    {/* Visible point */}
                                                                    <motion.circle
                                                                        cx={x}
                                                                        cy={y}
                                                                        r={hoveredPoint === i ? "7" : "5"}
                                                                        fill={chartView === 'revenue' ? '#10b981' : '#3b82f6'}
                                                                        stroke="white"
                                                                        strokeWidth="2"
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ duration: 0.3, delay: 0.5 + (i * 0.1) }}
                                                                        className="pointer-events-none"
                                                                    />
                                                                </g>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </motion.svg>
                                        </AnimatePresence>

                                        {/* Tooltip */}
                                        <AnimatePresence>
                                            {hoveredPoint !== null && currentSeries[hoveredPoint] && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute top-0 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border z-10"
                                                >
                                                    <div className="text-xs font-medium">{currentSeries[hoveredPoint].label}</div>
                                                    <div className="text-sm font-bold">
                                                        {chartView === 'revenue'
                                                            ? formatCurrency(currentSeries[hoveredPoint].value, analytics?.stats.currency ?? 'GBP')
                                                            : currentSeries[hoveredPoint].value.toLocaleString()}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* X-axis labels */}
                                        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                                            {currentSeries.map((point, i) => (
                                                <span key={i} className="text-xs text-muted-foreground truncate">
                                                    {point.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Top Events Performance */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="border-border/50">
                                <CardHeader>
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <CardTitle className="text-lg font-semibold">Top Performing Events</CardTitle>
                                        <div className="flex gap-1 bg-muted rounded-lg p-1">
                                            <Button
                                                variant={eventSortBy === 'revenue' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setEventSortBy('revenue')}
                                                className="h-7 text-xs"
                                            >
                                                <DollarSign className="h-3 w-3 mr-1" />
                                                Revenue
                                            </Button>
                                            <Button
                                                variant={eventSortBy === 'tickets' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setEventSortBy('tickets')}
                                                className="h-7 text-xs"
                                            >
                                                <Ticket className="h-3 w-3 mr-1" />
                                                Tickets
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {topEvents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No event data available</p>
                                    ) : (
                                        <div className="space-y-6">
                                            {topEvents.map((event, i) => {
                                                const currentValue = eventSortBy === 'revenue' ? event.revenue : event.ticketsSold;
                                                const percentage = (currentValue / maxEventValue) * 100;
                                                return (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.4 + (i * 0.1) }}
                                                        className="space-y-2"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {event.bannerImageUrl ? (
                                                                <div className="relative h-12 w-16 rounded-lg overflow-hidden flex-shrink-0">
                                                                    <Image
                                                                        src={event.bannerImageUrl}
                                                                        alt=""
                                                                        fill
                                                                        sizes="64px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-12 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                                    <Calendar className="h-6 w-6 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                            <p className="text-sm font-medium flex-1 min-w-0 truncate">{event.name}</p>
                                                        </div>

                                                        {/* Progress bar with value on right */}
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ duration: 1, delay: 0.6 + (i * 0.1) }}
                                                                />
                                                            </div>

                                                            {/* Value at end of bar */}
                                                            <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                                                                {eventSortBy === 'revenue' ? (
                                                                    <>
                                                                        <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                                                                        <span className="font-semibold">
                                                                            {formatCurrency(event.revenue, analytics?.stats.currency ?? 'GBP')}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Ticket className="h-3.5 w-3.5 text-indigo-500" />
                                                                        <span className="font-semibold">
                                                                            {event.ticketsSold}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column - Derived Metrics (1/3 width on desktop) */}
                    <div className="space-y-6">
                        {/* Average Ticket Price */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900">
                                <CardContent className="p-4 sm:p-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">Average Ticket Price</p>
                                    <p className="text-2xl sm:text-3xl font-bold break-words">
                                        {analytics
                                            ? formatCurrency(derivedMetrics.avgTicketPrice, analytics.stats.currency)
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">Live calculation</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Average Order Value */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900">
                                <CardContent className="p-4 sm:p-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">Average Order Value</p>
                                    <p className="text-2xl sm:text-3xl font-bold break-words">
                                        {analytics
                                            ? formatCurrency(derivedMetrics.avgOrderValue, analytics.stats.currency)
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">Per paid order</p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Peak Sales Month */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900">
                                <CardContent className="p-4 sm:p-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">Peak Sales Month</p>
                                    {derivedMetrics.peakMonth ? (
                                        <>
                                            <p className="text-2xl sm:text-3xl font-bold">{derivedMetrics.peakMonth.label}</p>
                                            <p className="text-sm text-muted-foreground mt-2 break-words">
                                                {formatCurrency(derivedMetrics.peakMonth.value, analytics?.stats.currency ?? 'GBP')}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-bold text-muted-foreground">—</p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Monthly Growth */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="border-border/50">
                                <CardContent className="p-4 sm:p-6">
                                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">Revenue Growth</p>
                                    {derivedMetrics.growth ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <p className={`text-2xl sm:text-3xl font-bold ${derivedMetrics.growth.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {derivedMetrics.growth.isPositive ? '+' : ''}{derivedMetrics.growth.percentage.toFixed(1)}%
                                                </p>
                                                {derivedMetrics.growth.isPositive ? (
                                                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                                                ) : (
                                                    <TrendingDown className="h-6 w-6 text-red-500" />
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">Month over month</p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-bold text-muted-foreground">—</p>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
