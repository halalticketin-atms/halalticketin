'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarPlus, Ticket, UserPlus, TrendingUp, Shield, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api, { ApiError } from '@/lib/api';

type ActivityItem = {
    id: string;
    type: 'user' | 'event' | 'ticket';
    label: string;
    createdAt: string;
};

type AdminOverviewResponse = {
    windowDays: number;
    windowStart: string;
    totals: {
        users: number;
        events: number;
        tickets: number;
    };
    window: {
        users: number;
        events: number;
        tickets: number;
    };
    activity: ActivityItem[];
};

const activityIcons = {
    user: UserPlus,
    event: CalendarPlus,
    ticket: Ticket,
};

const activityColors = {
    user: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
    event: 'from-purple-500 to-violet-500',
    ticket: 'from-amber-500 to-orange-500',
};

const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown time';
    }
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
};

const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatTimestamp(value);
};

export default function AdminDashboardPage() {
    const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchOverview = async () => {
            setIsLoading(true);
            try {
                const response = await api.get<AdminOverviewResponse>('/api/v1/admin/overview', {
                    params: { days: '7', activityLimit: '12' },
                });
                if (!cancelled) {
                    setOverview(response);
                    setError(null);
                }
            } catch (err) {
                if (cancelled) {
                    return;
                }
                if (err instanceof ApiError) {
                    if (err.status === 403) {
                        setError('You do not have access to the admin dashboard.');
                    } else if (err.status === 401) {
                        setError('Please sign in to view the admin dashboard.');
                    } else {
                        setError(err.message || 'Unable to load admin dashboard.');
                    }
                } else {
                    setError('Unable to load admin dashboard.');
                }
                setOverview(null);
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void fetchOverview();

        return () => {
            cancelled = true;
        };
    }, []);

    const stats = useMemo(() => {
        const windowDays = overview?.windowDays ?? 7;
        return [
            {
                title: `New Users`,
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.users ?? 0,
                total: overview?.totals.users ?? 0,
                icon: UserPlus,
                gradient: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
                bgGradient: 'from-[var(--brand-mint)]/10 to-[var(--brand-cyan)]/10',
            },
            {
                title: `New Events`,
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.events ?? 0,
                total: overview?.totals.events ?? 0,
                icon: CalendarPlus,
                gradient: 'from-purple-500 to-violet-500',
                bgGradient: 'from-purple-500/10 to-violet-500/10',
            },
            {
                title: `Tickets Sold`,
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.tickets ?? 0,
                total: overview?.totals.tickets ?? 0,
                icon: Ticket,
                gradient: 'from-amber-500 to-orange-500',
                bgGradient: 'from-amber-500/10 to-orange-500/10',
            },
        ];
    }, [overview]);

    // Split activity into events and users
    const { eventActivity, userActivity } = useMemo(() => {
        const events = (overview?.activity ?? []).filter(item => item.type === 'event');
        const users = (overview?.activity ?? []).filter(item => item.type === 'user');
        return { eventActivity: events.slice(0, 6), userActivity: users.slice(0, 6) };
    }, [overview]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-muted/30">
                <div className="container py-12">
                    <Card className="max-w-2xl mx-auto border-destructive/30">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <Shield className="h-5 w-5 text-destructive" />
                                </div>
                                <CardTitle>Access Denied</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8 space-y-8">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-teal)] via-[var(--brand-cyan)] to-[var(--brand-mint)] p-6 md:p-8"
                >
                    {/* Background decoration */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-white/90" />
                                <p className="text-sm font-semibold text-white/90 uppercase tracking-widest">Admin Dashboard</p>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white">Platform Overview</h1>
                            <p className="text-white/80 max-w-md">
                                Monitor signups, events, and ticket activity across Halal Ticketin.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                                Live Data
                            </Badge>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                            >
                                <Card className={`relative overflow-hidden border-border/60 bg-gradient-to-br ${stat.bgGradient}`}>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <div>
                                            <CardTitle className="text-sm font-medium text-foreground">
                                                {stat.title}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                                        </div>
                                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                            {Number(stat.value).toLocaleString()}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Total: <span className="font-medium text-foreground">{Number(stat.total).toLocaleString()}</span>
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Activity Sections - Side by Side */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* New Events */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                    >
                        <Card className="border-border/60 h-full">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-md">
                                        <CalendarPlus className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">New Events</CardTitle>
                                        <p className="text-xs text-muted-foreground">Recently created</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                    {eventActivity.length} recent
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {eventActivity.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">No new events recently.</p>
                                ) : (
                                    eventActivity.map((item) => (
                                        <div
                                            key={`event-${item.id}`}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/50 p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center flex-shrink-0">
                                                    <CalendarPlus className="h-4 w-4 text-purple-500" />
                                                </div>
                                                <p className="text-sm font-medium truncate">{item.label}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* New Users */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.4 }}
                    >
                        <Card className="border-border/60 h-full">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-cyan)] flex items-center justify-center shadow-md">
                                        <UserPlus className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">New Users</CardTitle>
                                        <p className="text-xs text-muted-foreground">Recently signed up</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-[var(--brand-mint)]/20 text-[var(--brand-teal)] border-[var(--brand-teal)]/20">
                                    {userActivity.length} recent
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {userActivity.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">No new users recently.</p>
                                ) : (
                                    userActivity.map((item) => (
                                        <div
                                            key={`user-${item.id}`}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/50 p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--brand-mint)]/30 to-[var(--brand-cyan)]/30 flex items-center justify-center flex-shrink-0">
                                                    <UserPlus className="h-4 w-4 text-[var(--brand-teal)]" />
                                                </div>
                                                <p className="text-sm font-medium truncate">{item.label}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Ticket Activity Section */}
                {(overview?.activity ?? []).filter(item => item.type === 'ticket').length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 }}
                    >
                        <Card className="border-border/60">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                                        <Ticket className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Recent Ticket Purchases</CardTitle>
                                        <p className="text-xs text-muted-foreground">Latest transactions</p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                    {(overview?.activity ?? []).filter(item => item.type === 'ticket').length} recent
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {(overview?.activity ?? []).filter(item => item.type === 'ticket').slice(0, 6).map((item) => (
                                        <div
                                            key={`ticket-${item.id}`}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/50 p-3 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Ticket className="h-4 w-4 text-amber-500" />
                                                </div>
                                                <p className="text-sm font-medium truncate">{item.label}</p>
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {formatRelativeTime(item.createdAt)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="text-center py-4"
                >
                    <p className="text-xs text-muted-foreground">
                        Data refreshes automatically. Last window started {overview?.windowStart ? formatTimestamp(overview.windowStart) : 'recently'}.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
