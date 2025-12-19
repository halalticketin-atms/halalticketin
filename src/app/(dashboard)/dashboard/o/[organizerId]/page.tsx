'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Ticket, DollarSign, Users } from 'lucide-react';

import { StatCard, RecentEvents } from '@/components/dashboard';

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

    const fetchAnalytics = useEffectEvent(async (currentOrganizerId: string | null) => {
        if (!currentOrganizerId) {
            setAnalyticsStats(null);
            return;
        }
        try {
            const response = await api.get<AnalyticsResponse>('/api/v1/analytics/overview', {
                params: { organizerId: currentOrganizerId },
            });
            setAnalyticsStats(response.stats);
        } catch {
            // Silently fail - dashboard will show defaults
        }
    });

    useEffect(() => {
        void fetchAnalytics(organizerId ?? null);
    }, [organizerId]);

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

                {/* Recent Events - Full Width */}
                <RecentEvents events={recentEventsData} />
            </div>
        </div>
    );
}
