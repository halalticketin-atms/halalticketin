'use client';

import { motion } from 'motion/react';
import { Calendar, Ticket, DollarSign, Users, TrendingUp } from 'lucide-react';
import { StatCard, RecentEvents, QuickActions } from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Placeholder data
const stats = [
    { title: 'Total Events', value: 12, icon: Calendar, trend: { value: 20, isPositive: true } },
    { title: 'Tickets Sold', value: '1,247', icon: Ticket, trend: { value: 15, isPositive: true } },
    { title: 'Revenue', value: '£12,450', icon: DollarSign, trend: { value: 8, isPositive: true } },
    { title: 'Attendees', value: '892', icon: Users, trend: { value: 12, isPositive: true } },
];

const recentEvents = [
    {
        id: '1',
        title: 'Community Iftar 2024',
        date: 'Dec 15, 2024',
        location: 'London',
        status: 'published' as const,
        ticketsSold: 45,
        totalTickets: 100,
        imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=300&h=200&fit=crop',
    },
    {
        id: '2',
        title: 'Islamic Finance Workshop',
        date: 'Jan 10, 2025',
        location: 'Online',
        status: 'published' as const,
        ticketsSold: 28,
        totalTickets: 50,
        imageUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=300&h=200&fit=crop',
    },
    {
        id: '3',
        title: 'Youth Conference 2025',
        date: 'Feb 1, 2025',
        location: 'Birmingham',
        status: 'draft' as const,
        ticketsSold: 0,
        totalTickets: 500,
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
    },
];

const upcomingMilestones = [
    { event: 'Community Iftar', milestone: 'Event starts in 9 days', progress: 45 },
    { event: 'Finance Workshop', milestone: 'Early bird ends in 14 days', progress: 56 },
];

export default function DashboardPage() {
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
                    <h1 className="font-display text-2xl sm:text-3xl font-bold">Welcome back, Amina! 👋</h1>
                    <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your events</p>
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
                        <RecentEvents events={recentEvents} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <QuickActions />

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
                                    {upcomingMilestones.map((item) => (
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
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
