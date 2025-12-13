'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Ticket, DollarSign, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { StatCard, RecentEvents, QuickActions } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { useOrganizerEvents, DashboardEvent } from '@/hooks/useOrganizerEvents';
import api from '@/lib/api';

interface AnalyticsStats {
    totalRevenue: number;
    ticketsSold: number;
    paidOrders: number;
    totalEvents: number;
    currency: string;
}

interface AnalyticsResponse {
    stats: AnalyticsStats;
}

const upcomingMilestones: Array<{ event: string; milestone: string; progress: number }> = [];

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

export default function DashboardPage() {
    const organizerId = useOrganizerFromParams();
    const { user, memberships, isLoading } = useAuth();
    const { events, counts } = useOrganizerEvents(organizerId);
    const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);

    const fetchAnalytics = useCallback(async () => {
        if (!organizerId) return;
        try {
            const response = await api.get<AnalyticsResponse>('/api/v1/analytics/overview', {
                params: { organizerId },
            });
            setAnalyticsStats(response.stats);
        } catch {
            // Silently fail - dashboard will show defaults
        }
    }, [organizerId]);

    useEffect(() => {
        void fetchAnalytics();
    }, [fetchAnalytics]);

    const greetingName = user?.name || user?.email?.split('@')[0] || 'there';
    const welcomeTitle = user ? `Welcome back, ${greetingName}! 👋` : 'Welcome to your dashboard';
    const welcomeSubtitle = user
        ? "Here's what's happening with your events"
        : 'Sign in to start creating and managing your halal events.';

    // Transform events for RecentEvents component
    const recentEventsData = useMemo(() => {
        return events.slice(0, 5).map((event: DashboardEvent) => {
            const start = event.startDatetime ? new Date(event.startDatetime) : null;
            const dateStr = start
                ? start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Date TBD';

            let location = 'Location TBD';
            if (event.locationType === 'online') {
                location = 'Online Event';
            } else if (event.venue) {
                location = event.city ? `${event.venue}, ${event.city}` : event.venue;
            } else if (event.city) {
                location = event.city;
            }

            // Map displayStatus to the component's expected status
            let status: 'published' | 'draft' | 'completed' = 'draft';
            if (event.displayStatus === 'draft') {
                status = 'draft';
            } else if (event.displayStatus === 'past') {
                status = 'completed';
            } else {
                status = 'published';
            }

            return {
                id: event.id,
                title: event.title || 'Untitled Event',
                date: dateStr,
                location,
                status,
                ticketsSold: 0, // Will be populated when orders are implemented
                totalTickets: 100, // Placeholder
                imageUrl: event.bannerImageUrl || '/images/placeholder-event.jpg',
            };
        });
    }, [events]);

    const stats = useMemo(
        () => [
            { title: 'Total Events', value: counts.all, icon: Calendar },
            { title: 'Tickets Sold', value: analyticsStats?.ticketsSold ?? 0, icon: Ticket },
            {
                title: 'Revenue',
                value: formatCurrency(analyticsStats?.totalRevenue ?? 0, analyticsStats?.currency ?? 'GBP'),
                icon: DollarSign,
            },
            { title: 'Organizer Teams', value: memberships.length, icon: Users },
        ],
        [counts.all, memberships.length, analyticsStats]
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

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    {stats.map((stat, i) => (
                        <StatCard key={stat.title} {...stat} delay={i * 0.1} />
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Recent Events - Takes 2 columns */}
                    <div className="lg:col-span-2">
                        <RecentEvents events={recentEventsData} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <QuickActions organizerId={organizerId ?? undefined} />

                        {!user && !isLoading && (
                            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
                                <CardContent className="py-6 text-center space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Sign in to see your upcoming events, milestones, and organizer analytics.
                                    </p>
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                                    >
                                        Go to login
                                    </Link>
                                </CardContent>
                            </Card>
                        )}

                        {/* Upcoming Milestones */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                        >
                            <Card className="border-border/50 overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        Upcoming Milestones
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {upcomingMilestones.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Once you publish events, your important milestones will appear here.
                                        </p>
                                    ) : (
                                        upcomingMilestones.map((item) => (
                                            <div key={item.event}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-medium">{item.event}</span>
                                                    <span className="text-muted-foreground">{item.progress}%</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">{item.milestone}</p>
                                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-primary to-[oklch(0.72_0.15_185)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.progress}%` }}
                                                        transition={{ duration: 1, delay: 0.5 }}
                                                    />
                                                </div>
                                            </div>
                                        ))
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
