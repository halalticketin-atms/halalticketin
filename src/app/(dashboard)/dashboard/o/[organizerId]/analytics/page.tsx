"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar,
    Ticket,
    DollarSign,
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Check,
    Crown,
    Medal,
    Award,
    Sparkles,
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
import { useOptimizedAnimation } from '@/hooks/useOptimizedAnimation';

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

// Ranking badge component for top performers
const RankBadge = ({ rank }: { rank: number }) => {
    const badges = [
        { icon: Crown, gradient: 'from-amber-400 to-yellow-500', shadow: 'shadow-amber-200/50' },
        { icon: Medal, gradient: 'from-slate-300 to-slate-400', shadow: 'shadow-slate-200/50' },
        { icon: Award, gradient: 'from-amber-600 to-orange-500', shadow: 'shadow-orange-200/50' },
    ];

    if (rank > 3) return null;

    const badge = badges[rank - 1];
    const Icon = badge.icon;

    return (
        <div className={`flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${badge.gradient} ${badge.shadow} shadow-lg`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
    );
};

export default function AnalyticsPage() {
    const organizerId = useOrganizerFromParams();
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [chartView, setChartView] = useState<'revenue' | 'tickets'>('revenue');
    const [periodView, setPeriodView] = useState<'6months' | 'yearly'>('6months');
    const [selectedYear, setSelectedYear] = useState<number>(2025);
    const [eventSortBy, setEventSortBy] = useState<'revenue' | 'tickets'>('revenue');
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const anim = useOptimizedAnimation();

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
            } catch {
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
                gradient: 'from-emerald-500 to-teal-500',
                bgGradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40',
                borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
            },
            {
                title: 'Tickets Sold',
                value: analytics.stats.ticketsSold.toLocaleString(),
                icon: Ticket,
                gradient: 'from-[var(--brand-cyan)] to-[var(--brand-teal)]',
                bgGradient: 'from-cyan-50 to-teal-50 dark:from-cyan-950/40 dark:to-teal-950/40',
                borderColor: 'border-cyan-200/60 dark:border-cyan-800/40',
            },
            {
                title: 'Paid Orders',
                value: analytics.stats.paidOrders.toLocaleString(),
                icon: Check,
                gradient: 'from-[var(--brand-mint)] to-emerald-500',
                bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40',
                borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
            },
            {
                title: 'Total Events',
                value: analytics.stats.totalEvents.toString(),
                icon: Calendar,
                gradient: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
                bgGradient: 'from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40',
                borderColor: 'border-teal-200/60 dark:border-teal-800/40',
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

    // Chart colors based on view
    const chartColors = chartView === 'revenue'
        ? { primary: 'var(--brand-teal)', secondary: 'var(--brand-cyan)', hex: '#0d9488' }
        : { primary: 'var(--brand-cyan)', secondary: 'var(--brand-mint)', hex: '#06b6d4' };

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 max-w-7xl">
                {/* Header */}
                <motion.div
                    initial={anim.initial}
                    animate={anim.animate}
                    transition={anim.transition}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
                >
                    <div>
                        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground" asChild>
                            <Link href={organizerId ? buildDashboardPath(organizerId) : '/dashboard'}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Dashboard
                            </Link>
                        </Button>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                            Analytics
                        </h1>
                        <p className="text-muted-foreground mt-1">Track performance and insights</p>
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
                                <SelectTrigger className="w-full sm:w-[280px] h-11 bg-background border-border/60 shadow-sm hover:border-primary/40 transition-colors">
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
                            <div className="w-full sm:w-[280px] h-11 bg-background rounded-lg border border-input animate-pulse" />
                        )}
                    </div>
                </motion.div>

                {/* Enhanced KPI Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.length === 0 && isLoading && (
                        <>
                            {[...Array(4)].map((_, i) => (
                                <Card key={i} className="h-28 animate-pulse bg-muted/50" />
                            ))}
                        </>
                    )}
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.title}
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: i * anim.staggerDelay }}
                        >
                            <Card className={`bg-gradient-to-br ${stat.bgGradient} ${stat.borderColor} overflow-hidden group hover:shadow-md transition-shadow`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-muted-foreground mb-1.5">{stat.title}</p>
                                            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
                                        </div>
                                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg group-hover:scale-105 transition-transform`}>
                                            <stat.icon className="h-5 w-5" />
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
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 2 }}
                        >
                            <Card className="border-border/40 shadow-sm overflow-hidden">
                                <CardHeader className="pb-4 bg-gradient-to-r from-transparent via-muted/30 to-transparent">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary/60" />
                                            <CardTitle className="text-lg font-semibold">
                                                {chartView === 'revenue' ? 'Net Revenue' : 'Tickets'} Over Time
                                            </CardTitle>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {/* Period Toggle */}
                                            <div className="flex gap-0.5 bg-muted/80 rounded-lg p-1 shadow-inner">
                                                <Button
                                                    variant={periodView === '6months' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setPeriodView('6months')}
                                                    className={`h-7 text-xs px-3 rounded-md transition-all ${periodView === '6months'
                                                            ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md'
                                                            : 'hover:bg-background/60'
                                                        }`}
                                                >
                                                    6 Months
                                                </Button>
                                                <Button
                                                    variant={periodView === 'yearly' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setPeriodView('yearly')}
                                                    className={`h-7 text-xs px-3 rounded-md transition-all ${periodView === 'yearly'
                                                            ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md'
                                                            : 'hover:bg-background/60'
                                                        }`}
                                                >
                                                    Yearly
                                                </Button>
                                            </div>

                                            {/* Year Selector - Only show for yearly view */}
                                            {periodView === 'yearly' && (
                                                <div className="flex gap-0.5 bg-muted/80 rounded-lg p-1 shadow-inner">
                                                    <Button
                                                        variant={selectedYear === 2025 ? 'default' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => setSelectedYear(2025)}
                                                        className={`h-7 text-xs px-3 rounded-md transition-all ${selectedYear === 2025
                                                                ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md'
                                                                : 'hover:bg-background/60'
                                                            }`}
                                                    >
                                                        2025
                                                    </Button>
                                                    <Button
                                                        variant={selectedYear === 2026 ? 'default' : 'ghost'}
                                                        size="sm"
                                                        onClick={() => setSelectedYear(2026)}
                                                        className={`h-7 text-xs px-3 rounded-md transition-all ${selectedYear === 2026
                                                                ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-md'
                                                                : 'hover:bg-background/60'
                                                            }`}
                                                    >
                                                        2026
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Chart Type Toggle */}
                                            <div className="flex gap-0.5 bg-muted/80 rounded-lg p-1 shadow-inner">
                                                <Button
                                                    variant={chartView === 'revenue' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setChartView('revenue')}
                                                    className={`h-7 px-3 rounded-md transition-all ${chartView === 'revenue'
                                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                                                            : 'hover:bg-background/60'
                                                        }`}
                                                >
                                                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                                                    <span className="text-xs">Revenue</span>
                                                </Button>
                                                <Button
                                                    variant={chartView === 'tickets' ? 'default' : 'ghost'}
                                                    size="sm"
                                                    onClick={() => setChartView('tickets')}
                                                    className={`h-7 px-3 rounded-md transition-all ${chartView === 'tickets'
                                                            ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                                                            : 'hover:bg-background/60'
                                                        }`}
                                                >
                                                    <Ticket className="h-3.5 w-3.5 mr-1.5" />
                                                    <span className="text-xs">Tickets</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
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
                                                {/* Grid lines - more subtle */}
                                                {[0, 1, 2, 3, 4].map((i) => (
                                                    <line
                                                        key={i}
                                                        x1="0"
                                                        y1={5 + i * 50}
                                                        x2="600"
                                                        y2={5 + i * 50}
                                                        stroke="currentColor"
                                                        strokeOpacity="0.06"
                                                        strokeDasharray="4 4"
                                                        className="text-muted-foreground"
                                                    />
                                                ))}

                                                {/* Gradient definitions */}
                                                <defs>
                                                    <linearGradient id={`${chartView}Gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor={chartColors.hex} stopOpacity="0.25" />
                                                        <stop offset="50%" stopColor={chartColors.hex} stopOpacity="0.1" />
                                                        <stop offset="100%" stopColor={chartColors.hex} stopOpacity="0.02" />
                                                    </linearGradient>
                                                    <linearGradient id={`${chartView}LineGradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor={chartView === 'revenue' ? '#059669' : '#0891b2'} />
                                                        <stop offset="50%" stopColor={chartColors.hex} />
                                                        <stop offset="100%" stopColor={chartView === 'revenue' ? '#0d9488' : '#14b8a6'} />
                                                    </linearGradient>
                                                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                                        <feMerge>
                                                            <feMergeNode in="coloredBlur" />
                                                            <feMergeNode in="SourceGraphic" />
                                                        </feMerge>
                                                    </filter>
                                                </defs>

                                                {currentSeries.length > 0 && (
                                                    <>
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
                                                            transition={{ duration: 0.8, delay: 0.3 }}
                                                        />

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
                                                            transition={{ duration: 1.2, ease: "easeInOut" }}
                                                        />

                                                        {/* Interactive data points */}
                                                        {currentSeries.map((point, i) => {
                                                            const x = (i / (currentSeries.length - 1)) * 600;
                                                            const y = 10 + (1 - point.value / maxValue) * 190;
                                                            const isHovered = hoveredPoint === i;
                                                            return (
                                                                <g key={i}>
                                                                    {/* Invisible larger hit area */}
                                                                    <circle
                                                                        cx={x}
                                                                        cy={y}
                                                                        r="20"
                                                                        fill="transparent"
                                                                        className="cursor-pointer"
                                                                        onMouseEnter={() => setHoveredPoint(i)}
                                                                        onMouseLeave={() => setHoveredPoint(null)}
                                                                    />
                                                                    {/* Outer glow on hover */}
                                                                    {isHovered && (
                                                                        <motion.circle
                                                                            cx={x}
                                                                            cy={y}
                                                                            r="12"
                                                                            fill={chartColors.hex}
                                                                            opacity="0.2"
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ duration: 0.2 }}
                                                                        />
                                                                    )}
                                                                    {/* Visible point */}
                                                                    <motion.circle
                                                                        cx={x}
                                                                        cy={y}
                                                                        r={isHovered ? "7" : "5"}
                                                                        fill={chartColors.hex}
                                                                        stroke="white"
                                                                        strokeWidth="2.5"
                                                                        filter={isHovered ? "url(#glow)" : undefined}
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ duration: 0.3, delay: 0.4 + (i * 0.08) }}
                                                                        className="pointer-events-none"
                                                                    />
                                                                </g>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </motion.svg>
                                        </AnimatePresence>

                                        {/* Enhanced Tooltip */}
                                        <AnimatePresence>
                                            {hoveredPoint !== null && currentSeries[hoveredPoint] && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute top-2 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-md text-foreground px-4 py-2.5 rounded-xl shadow-xl border border-border/50 z-10"
                                                >
                                                    <div className="text-xs font-medium text-muted-foreground">{currentSeries[hoveredPoint].label}</div>
                                                    <div className="text-base font-bold mt-0.5" style={{ color: chartColors.hex }}>
                                                        {chartView === 'revenue'
                                                            ? formatCurrency(currentSeries[hoveredPoint].value, analytics?.stats.currency ?? 'GBP')
                                                            : `${currentSeries[hoveredPoint].value.toLocaleString()} tickets`}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* X-axis labels */}
                                        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                                            {currentSeries.map((point, i) => (
                                                <span
                                                    key={i}
                                                    className={`text-[10px] sm:text-xs transition-colors ${hoveredPoint === i
                                                            ? 'text-foreground font-medium'
                                                            : 'text-muted-foreground'
                                                        }`}
                                                >
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
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 4 }}
                        >
                            <Card className="border-border/40 shadow-sm overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-transparent via-muted/30 to-transparent">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-2">
                                            <Crown className="h-4 w-4 text-amber-500" />
                                            <CardTitle className="text-lg font-semibold">Top Performing Events</CardTitle>
                                        </div>
                                        <div className="flex gap-0.5 bg-muted/80 rounded-lg p-1 shadow-inner">
                                            <Button
                                                variant={eventSortBy === 'revenue' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setEventSortBy('revenue')}
                                                className={`h-7 text-xs px-3 rounded-md transition-all ${eventSortBy === 'revenue'
                                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                                                        : 'hover:bg-background/60'
                                                    }`}
                                            >
                                                <DollarSign className="h-3 w-3 mr-1" />
                                                Revenue
                                            </Button>
                                            <Button
                                                variant={eventSortBy === 'tickets' ? 'default' : 'ghost'}
                                                size="sm"
                                                onClick={() => setEventSortBy('tickets')}
                                                className={`h-7 text-xs px-3 rounded-md transition-all ${eventSortBy === 'tickets'
                                                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md'
                                                        : 'hover:bg-background/60'
                                                    }`}
                                            >
                                                <Ticket className="h-3 w-3 mr-1" />
                                                Tickets
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    {topEvents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                                <Calendar className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">No event data available yet</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">Create and publish events to see performance data</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {topEvents.map((event, i) => {
                                                const currentValue = eventSortBy === 'revenue' ? event.revenue : event.ticketsSold;
                                                const percentage = (currentValue / maxEventValue) * 100;
                                                const rank = i + 1;
                                                return (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 + (i * 0.08) }}
                                                        className="group"
                                                    >
                                                        <div className="flex items-center gap-3 mb-2.5">
                                                            {/* Rank Badge */}
                                                            <RankBadge rank={rank} />
                                                            {rank > 3 && (
                                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-semibold">
                                                                    {rank}
                                                                </div>
                                                            )}

                                                            {/* Event Image */}
                                                            {event.bannerImageUrl ? (
                                                                <div className="relative h-11 w-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                                                                    <Image
                                                                        src={event.bannerImageUrl}
                                                                        alt=""
                                                                        fill
                                                                        sizes="64px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-11 w-16 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                    <Calendar className="h-5 w-5 text-muted-foreground/60" />
                                                                </div>
                                                            )}

                                                            {/* Event Name */}
                                                            <p className="text-sm font-medium flex-1 min-w-0 truncate group-hover:text-primary transition-colors">
                                                                {event.name}
                                                            </p>
                                                        </div>

                                                        {/* Progress bar with value */}
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <div className="flex-1 h-2.5 bg-muted/60 rounded-full overflow-hidden shadow-inner">
                                                                <motion.div
                                                                    className="h-full bg-gradient-to-r from-[var(--brand-mint)] via-[var(--brand-cyan)] to-[var(--brand-teal)] rounded-full shadow-sm"
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ duration: 0.8, delay: 0.5 + (i * 0.08), ease: "easeOut" }}
                                                                />
                                                            </div>

                                                            {/* Value */}
                                                            <div className="flex items-center gap-1.5 text-sm whitespace-nowrap min-w-[80px] justify-end">
                                                                {eventSortBy === 'revenue' ? (
                                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                                        {formatCurrency(event.revenue, analytics?.stats.currency ?? 'GBP')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                                                        {event.ticketsSold} <span className="text-muted-foreground text-xs font-normal">sold</span>
                                                                    </span>
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

                    {/* Right Column - Derived Metrics */}
                    <div className="space-y-4">
                        {/* Average Ticket Price */}
                        <motion.div
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 3 }}
                        >
                            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200/50 dark:border-emerald-800/30 overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Average Ticket Price</p>
                                            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                                                {analytics
                                                    ? formatCurrency(derivedMetrics.avgTicketPrice, analytics.stats.currency)
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Live calculation</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                                            <DollarSign className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Average Order Value */}
                        <motion.div
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 3.5 }}
                        >
                            <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/40 dark:to-teal-950/40 border-cyan-200/50 dark:border-cyan-800/30 overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Average Order Value</p>
                                            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
                                                {analytics
                                                    ? formatCurrency(derivedMetrics.avgOrderValue, analytics.stats.currency)
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">Per paid order</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg">
                                            <Ticket className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Peak Sales Month */}
                        <motion.div
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 4 }}
                        >
                            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-amber-200/50 dark:border-amber-800/30 overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Peak Sales Month</p>
                                            {derivedMetrics.peakMonth ? (
                                                <>
                                                    <p className="text-2xl sm:text-3xl font-bold tracking-tight">{derivedMetrics.peakMonth.label}</p>
                                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                                        {formatCurrency(derivedMetrics.peakMonth.value, analytics?.stats.currency ?? 'GBP')}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-3xl font-bold text-muted-foreground">—</p>
                                            )}
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                                            <Crown className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Monthly Growth */}
                        <motion.div
                            initial={anim.initial}
                            animate={anim.animate}
                            transition={{ ...anim.transition, delay: anim.staggerDelay * 5 }}
                        >
                            <Card className={`overflow-hidden ${derivedMetrics.growth?.isPositive
                                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border-emerald-200/50 dark:border-emerald-800/30'
                                    : derivedMetrics.growth && !derivedMetrics.growth.isPositive
                                        ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/40 border-red-200/50 dark:border-red-800/30'
                                        : 'border-border/40'
                                }`}>
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Revenue Growth</p>
                                            {derivedMetrics.growth ? (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${derivedMetrics.growth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                                            {derivedMetrics.growth.isPositive ? '+' : ''}{derivedMetrics.growth.percentage.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-2">Month over month</p>
                                                </>
                                            ) : (
                                                <p className="text-3xl font-bold text-muted-foreground">—</p>
                                            )}
                                        </div>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-lg ${derivedMetrics.growth?.isPositive
                                                ? 'bg-gradient-to-br from-emerald-500 to-green-500'
                                                : derivedMetrics.growth && !derivedMetrics.growth.isPositive
                                                    ? 'bg-gradient-to-br from-red-500 to-rose-500'
                                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                            }`}>
                                            {derivedMetrics.growth?.isPositive ? (
                                                <TrendingUp className="h-5 w-5 text-white" />
                                            ) : derivedMetrics.growth && !derivedMetrics.growth.isPositive ? (
                                                <TrendingDown className="h-5 w-5 text-white" />
                                            ) : (
                                                <TrendingUp className="h-5 w-5 text-white" />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
