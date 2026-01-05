'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Calendar, Ticket, DollarSign } from 'lucide-react';

import { StatCard, EventPerformanceCards } from '@/components/dashboard';

import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { buildDashboardPath } from '@/lib/organizer-path';
import api from '@/lib/api';

interface AnalyticsStats {
    totalRevenue: number;
    netRevenue?: number; // Revenue after fees, optional for backwards compatibility
    ticketsSold: number;
    paidOrders: number;
    totalEvents: number;
    currency: string;
}

interface AnalyticsResponse {
    stats: AnalyticsStats;
}

interface EventPerformanceData {
    id: string;
    title: string;
    startDatetime: string | null;
    venue: string | null;
    city: string | null;
    bannerImageUrl: string | null;
    ticketsSold: number;
    totalTickets: number;
    revenue: number;
    currency: string;
    status: 'published' | 'draft' | 'cancelled' | 'archived';
    displayStatus: 'published' | 'draft' | 'past';
    salesTrend: number[];
    trendPercentage: number;
    weeklySales: Array<{
        weekStart: string;
        ticketsSold: number;
        revenue: number;
    }>;
    ticketTypeBreakdown: Array<{
        id: string;
        name: string;
        sold: number;
        total: number;
        revenue: number;
    }>;
}

interface EventsPerformanceResponse {
    events: EventPerformanceData[];
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

export default function DashboardPage() {
    const router = useRouter();
    const organizerId = useOrganizerFromParams();
    const { user } = useAuth();
    const { organizers } = useOrganizers();
    const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
    const [eventsPerformance, setEventsPerformance] = useState<EventPerformanceData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Get the current user's role for this organizer
    const activeOrganizer = organizers.find((org) => org.id === organizerId);
    const userRole = activeOrganizer?.role;

    // Redirect check-in users to the check-in page
    useEffect(() => {
        if (organizerId && userRole === 'check_in') {
            router.replace(`${buildDashboardPath(organizerId)}/check-in`);
        }
    }, [organizerId, userRole, router]);

    const fetchData = useEffectEvent(async (currentOrganizerId: string | null) => {
        if (!currentOrganizerId) {
            setAnalyticsStats(null);
            setEventsPerformance([]);
            return;
        }

        setIsLoading(true);
        try {
            // Fetch both analytics stats and events performance in parallel
            const [analyticsRes, eventsRes] = await Promise.all([
                api.get<AnalyticsResponse>('/api/v1/analytics/overview', {
                    params: { organizerId: currentOrganizerId },
                }),
                api.get<EventsPerformanceResponse>('/api/v1/analytics/events-performance', {
                    params: { organizerId: currentOrganizerId },
                })
            ]);

            setAnalyticsStats(analyticsRes.stats);
            setEventsPerformance(eventsRes.events);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            // Continue with empty data on error
        } finally {
            setIsLoading(false);
        }
    });

    useEffect(() => {
        void fetchData(organizerId ?? null);
    }, [organizerId]);

    const greetingName = user?.name || user?.email?.split('@')[0] || '';
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimateWave = !prefersReducedMotion;
    const welcomeTitle = (
        <span className="inline-flex flex-wrap items-center gap-2">
            <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Salaam{greetingName ? `, ${greetingName}` : ''}
            </span>
            {shouldAnimateWave ? (
                <motion.span
                    className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent"
                    animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                >
                    👋
                </motion.span>
            ) : (
                <span className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent">
                    👋
                </span>
            )}
        </span>
    );
    const welcomeSubtitle = user
        ? "Here's what's happening with your events"
        : 'Sign in to start creating and managing your halal events.';

    const stats = useMemo(
        () => [
            {
                title: 'Net Revenue',
                value: formatCurrency(analyticsStats?.netRevenue ?? analyticsStats?.totalRevenue ?? 0, analyticsStats?.currency ?? 'GBP'),
                icon: DollarSign,
                color: 'green' as const
            },
            {
                title: 'Tickets Sold',
                value: analyticsStats?.ticketsSold ?? 0,
                icon: Ticket,
                color: 'blue' as const
            },
            {
                title: 'Active Events',
                value: eventsPerformance.length,
                icon: Calendar,
                color: 'purple' as const
            },
        ],
        [analyticsStats, eventsPerformance]
    );

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 overflow-x-hidden">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-2xl sm:text-3xl font-bold">{welcomeTitle}</h1>
                    <p className="text-muted-foreground mt-1">{welcomeSubtitle}</p>
                </motion.div>

                {/* Stats Grid - Only 3 cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                    {stats.map((stat, i) => (
                        <StatCard key={stat.title} {...stat} delay={i * 0.1} />
                    ))}
                </div>

                {/* Event Performance Cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                ) : (
                    <EventPerformanceCards events={eventsPerformance} organizerId={organizerId} />
                )}
            </div>
        </div>
    );
}
