"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar,
    Ticket,
    DollarSign,
    ArrowLeft,
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
    donationCount: number;
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
        netRevenue: number;
        ticketsSold: number;
        donationCount: number;
        donationRevenue: number;
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

// Format large numbers for Y-axis
const formatAxisValue = (value: number, isRevenue: boolean, currency: string) => {
    if (isRevenue) {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}k`;
        }
        return formatCurrency(value, currency).replace(/\.00$/, '');
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
};

// Generate path with straight lines between points
const generateSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
};



export default function AnalyticsPage() {
    const organizerId = useOrganizerFromParams();
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [chartView, setChartView] = useState<'revenue' | 'tickets'>('revenue');
    const [eventSortBy, setEventSortBy] = useState<'revenue' | 'tickets'>('revenue');
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const [chartSize, setChartSize] = useState({ width: 560, height: 200 });

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
            } catch {
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
        void fetchAnalytics(selectedEvent === 'all' ? undefined : selectedEvent);
    }, [fetchAnalytics, organizerId, selectedEvent]);

    useEffect(() => {
        if (!analytics || selectedEvent === 'all') return;
        const stillExists = analytics.filters.events.some((event) => event.id === selectedEvent);
        if (!stillExists) {
            setSelectedEvent('all');
        }
    }, [analytics, selectedEvent]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const element = chartContainerRef.current;
        if (!element) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width <= 0 || height <= 0) return;
            setChartSize((prev) => {
                const nextWidth = Math.round(width);
                const nextHeight = Math.round(height);
                if (prev.width === nextWidth && prev.height === nextHeight) {
                    return prev;
                }
                return { width: nextWidth, height: nextHeight };
            });
        });

        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const eventOptions = analytics?.filters.events ?? [];
    const selectedEventMeta = selectedEvent === 'all' ? null : eventOptions.find(event => event.id === selectedEvent);

    // KPI stats with original card styling
    const stats = useMemo(() => {
        if (!analytics) {
            return [];
        }

        return [
            {
                title: 'Net Revenue',
                value: formatCurrency(analytics.stats.netRevenue, analytics.stats.currency),
                subtitle: analytics.stats.donationCount > 0
                    ? `Incl. ${formatCurrency(analytics.stats.donationRevenue, analytics.stats.currency)} from ${analytics.stats.donationCount.toLocaleString()} donation${analytics.stats.donationCount !== 1 ? 's' : ''}`
                    : undefined,
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

        const peakMonth = analytics.charts.revenueMonthly.reduce((max, point) =>
            point.value > max.value ? point : max
            , analytics.charts.revenueMonthly[0]);

        const months = analytics.charts.revenueMonthly;
        const growth = months.length >= 2 ? {
            percentage: months[months.length - 2].value > 0
                ? ((months[months.length - 1].value - months[months.length - 2].value) / months[months.length - 2].value) * 100
                : 0,
            isPositive: months[months.length - 1].value >= months[months.length - 2].value
        } : null;

        return { avgTicketPrice, peakMonth, growth, avgOrderValue };
    }, [analytics]);

    // Get current month + 5 months before (rolling 6-month window)
    const currentSeries = useMemo(() => {
        if (!analytics) return [];

        const sourceData = chartView === 'revenue'
            ? analytics.charts.revenueMonthly
            : analytics.charts.ticketsMonthly;

        // Take the last 6 months (current + 5 before)
        return sourceData.slice(-6);
    }, [analytics, chartView]);

    // Calculate max value with a minimum floor to avoid division issues
    const maxValue = useMemo(() => {
        const max = Math.max(1, ...currentSeries.map(point => point.value));
        // Round up to a nice number for the scale
        const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
        return Math.ceil(max / magnitude) * magnitude || 100;
    }, [currentSeries]);

    // Generate Y-axis scale values (5 steps)
    const yAxisValues = useMemo(() => {
        const steps = 5;
        const values: number[] = [];
        for (let i = 0; i <= steps; i++) {
            values.push(Math.round((maxValue / steps) * (steps - i)));
        }
        return values;
    }, [maxValue]);

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

    // Chart color - single consistent color
    const chartColor = chartView === 'revenue' ? '#10b981' : '#3b82f6';

    // Chart dimensions - responsive to container size
    const chartWidth = chartSize.width;
    const chartHeight = chartSize.height;
    const isCompactChart = chartWidth < 420;
    const chartPadding = isCompactChart
        ? { top: 16, right: 16, bottom: 28, left: 40 }
        : { top: 20, right: 20, bottom: 30, left: 50 };
    const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
    const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

    // Calculate chart points
    const chartPoints = useMemo(() => {
        if (currentSeries.length === 0) return [];

        return currentSeries.map((point, i) => ({
            x: currentSeries.length === 1
                ? plotWidth / 2
                : (i / (currentSeries.length - 1)) * plotWidth,
            y: plotHeight - (point.value / maxValue) * plotHeight,
            label: point.label,
            value: point.value,
        }));
    }, [currentSeries, maxValue, plotWidth, plotHeight]);

    // Generate smooth curve path
    const curvePath = useMemo(() => {
        if (chartPoints.length === 0) return '';
        return generateSmoothPath(chartPoints);
    }, [chartPoints]);

    // Generate fill path (curve + bottom edge)
    const fillPath = useMemo(() => {
        if (chartPoints.length === 0) return '';
        const curve = curvePath;
        return `${curve} L ${chartPoints[chartPoints.length - 1].x} ${plotHeight} L ${chartPoints[0].x} ${plotHeight} Z`;
    }, [curvePath, chartPoints, plotHeight]);

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

                {/* KPI Cards */}
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
                                            {'subtitle' in stat && stat.subtitle && (
                                                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                                            )}
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
                    {/* Left Column - Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Revenue/Tickets Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-border/50 gap-4 sm:gap-6">
                                <CardHeader className="pb-3 sm:pb-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <CardTitle className="text-lg font-semibold">
                                            {chartView === 'revenue' ? 'Net Revenue' : 'Tickets Sold'} — Last 6 Months
                                        </CardTitle>
                                        {/* Revenue vs Tickets Toggle */}
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
                                </CardHeader>
                                <CardContent>
                                    {/* Fixed height chart container */}
                                    <div ref={chartContainerRef} className="h-[260px] sm:h-[280px] relative">
                                        <svg
                                            className="w-full h-full"
                                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                            preserveAspectRatio="none"
                                        >
                                            {/* Chart area with padding */}
                                            <g transform={`translate(${chartPadding.left}, ${chartPadding.top})`}>
                                                {/* Horizontal grid lines */}
                                                {yAxisValues.map((_, i) => (
                                                    <line
                                                        key={i}
                                                        x1="0"
                                                        y1={(i / (yAxisValues.length - 1)) * plotHeight}
                                                        x2={plotWidth}
                                                        y2={(i / (yAxisValues.length - 1)) * plotHeight}
                                                        stroke="currentColor"
                                                        strokeOpacity="0.08"
                                                        className="text-muted-foreground"
                                                    />
                                                ))}

                                                {/* Y-axis labels */}
                                                {yAxisValues.map((value, i) => (
                                                    <text
                                                        key={i}
                                                        x="-10"
                                                        y={(i / (yAxisValues.length - 1)) * plotHeight + 4}
                                                        textAnchor="end"
                                                        className="fill-muted-foreground text-[10px]"
                                                    >
                                                        {formatAxisValue(value, chartView === 'revenue', analytics?.stats.currency ?? 'GBP')}
                                                    </text>
                                                ))}

                                                {/* Gradient definition */}
                                                <defs>
                                                    <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                                        <stop offset="0%" stopColor={chartColor} stopOpacity="0.2" />
                                                        <stop offset="100%" stopColor={chartColor} stopOpacity="0.02" />
                                                    </linearGradient>
                                                </defs>

                                                {chartPoints.length > 0 && (
                                                    <AnimatePresence mode="wait">
                                                        <motion.g
                                                            key={chartView}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            {/* Area fill with smooth curve */}
                                                            <path
                                                                d={fillPath}
                                                                fill="url(#chartFill)"
                                                            />

                                                            {/* Smooth curve line */}
                                                            <motion.path
                                                                d={curvePath}
                                                                fill="none"
                                                                stroke={chartColor}
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                initial={{ pathLength: 0 }}
                                                                animate={{ pathLength: 1 }}
                                                                transition={{ duration: 0.8, ease: "easeOut" }}
                                                            />

                                                            {/* Data points */}
                                                            {chartPoints.map((point, i) => {
                                                                const isHovered = hoveredPoint === i;
                                                                return (
                                                                    <g key={i}>
                                                                        {/* Hit area */}
                                                                        <circle
                                                                            cx={point.x}
                                                                            cy={point.y}
                                                                            r="16"
                                                                            fill="transparent"
                                                                            className="cursor-pointer"
                                                                            onMouseEnter={() => setHoveredPoint(i)}
                                                                            onMouseLeave={() => setHoveredPoint(null)}
                                                                        />
                                                                        {/* Visible point */}
                                                                        <motion.circle
                                                                            cx={point.x}
                                                                            cy={point.y}
                                                                            r={isHovered ? 6 : 4}
                                                                            fill={chartColor}
                                                                            stroke="white"
                                                                            strokeWidth="2"
                                                                            initial={{ scale: 0 }}
                                                                            animate={{ scale: 1 }}
                                                                            transition={{ delay: 0.3 + i * 0.05 }}
                                                                        />
                                                                    </g>
                                                                );
                                                            })}

                                                            {/* X-axis labels */}
                                                            {chartPoints.map((point, i) => (
                                                                <text
                                                                    key={i}
                                                                    x={point.x}
                                                                    y={plotHeight + 20}
                                                                    textAnchor="middle"
                                                                    className="fill-muted-foreground text-[11px]"
                                                                >
                                                                    {point.label}
                                                                </text>
                                                            ))}
                                                        </motion.g>
                                                    </AnimatePresence>
                                                )}
                                            </g>
                                        </svg>

                                        {/* Tooltip */}
                                        <AnimatePresence>
                                            {hoveredPoint !== null && chartPoints[hoveredPoint] && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    className="absolute top-4 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-lg border text-center z-10"
                                                >
                                                    <div className="text-xs text-muted-foreground">{chartPoints[hoveredPoint].label}</div>
                                                    <div className="text-sm font-semibold">
                                                        {chartView === 'revenue'
                                                            ? formatCurrency(chartPoints[hoveredPoint].value, analytics?.stats.currency ?? 'GBP')
                                                            : chartPoints[hoveredPoint].value.toLocaleString()}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                                        <p className="text-sm text-muted-foreground py-8 text-center">No event data available</p>
                                    ) : (
                                        <div className="space-y-5">
                                            {topEvents.map((event, i) => {
                                                const currentValue = eventSortBy === 'revenue' ? event.revenue : event.ticketsSold;
                                                const percentage = (currentValue / maxEventValue) * 100;
                                                return (
                                                    <motion.div
                                                        key={event.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.4 + (i * 0.08) }}
                                                        className="space-y-2.5"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Rank number */}
                                                            <span className="text-sm font-medium text-muted-foreground w-5 text-center">
                                                                {i + 1}
                                                            </span>

                                                            {/* Event image */}
                                                            {event.bannerImageUrl ? (
                                                                <div className="relative h-10 w-14 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                                                                    <Image
                                                                        src={event.bannerImageUrl}
                                                                        alt=""
                                                                        fill
                                                                        sizes="56px"
                                                                        className="object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            )}

                                                            {/* Event name */}
                                                            <p className="text-sm font-medium flex-1 min-w-0 truncate">
                                                                {event.name}
                                                            </p>
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="flex items-center gap-3 pl-8">
                                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        backgroundColor: eventSortBy === 'revenue' ? '#10b981' : '#3b82f6'
                                                                    }}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percentage}%` }}
                                                                    transition={{ duration: 0.6, delay: 0.5 + (i * 0.08) }}
                                                                />
                                                            </div>

                                                            {/* Value */}
                                                            <span className="text-sm font-medium min-w-[80px] text-right">
                                                                {eventSortBy === 'revenue'
                                                                    ? formatCurrency(event.revenue, analytics?.stats.currency ?? 'GBP')
                                                                    : event.ticketsSold.toLocaleString()}
                                                            </span>
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
                                    <p className="text-sm font-medium text-muted-foreground mb-2 truncate">Net Revenue Growth</p>
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
