'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    AlertTriangle,
    CalendarPlus,
    CheckCircle2,
    Clock3,
    Ticket,
    UserPlus,
    TrendingUp,
    Shield,
    Radar,
    Radio,
    Globe,
    Lock,
    ShoppingCart,
    History,
    Hourglass,
    CircleSlash,
    PenLine,
    Ban,
    Archive,
    Heart,
    Users,
    Building2,
    Calendar,
    Search,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    CirclePlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import api, { ApiError } from '@/lib/api';
import {
    getTimeSeries,
    getUsersList,
    getOrganizersList,
    getEventsList,
    getCheckoutSweeperAudit,
    grantOrganizerCredits,
    type TimeSeriesPeriod,
    type TimeSeriesResponse,
    type AdminUser,
    type AdminOrganizer,
    type AdminEvent,
    type CheckoutSweeperAuditResponse,
} from '@/lib/admin-api';

// =====================
// Types
// =====================

type ActivityItem = {
    id: string;
    type: 'user' | 'event' | 'ticket';
    label: string;
    createdAt: string;
};

type EventBreakdown = {
    live: number;
    published: number;
    private: number;
    previous: number;
    notOnSale: number;
    soldOut: number;
    draft: number;
    cancelled: number;
    archived: number;
};

type AdminOverviewResponse = {
    windowDays: number;
    windowStart: string;
    totals: {
        users: number;
        events: number;
        tickets: number;
        orders: number;
        liveEvents: number;
        publishedEvents: number;
        privateEvents: number;
    };
    window: {
        users: number;
        events: number;
        tickets: number;
        orders: number;
    };
    eventBreakdown: EventBreakdown;
    activity: ActivityItem[];
};

type CharityItem = {
    id: string;
    name: string;
    charityNumber: string | null;
    isCharityVerified: boolean;
    organizerType: string;
    createdAt: string;
    updatedAt: string;
};

type CharityResponse = {
    data: CharityItem[];
    pagination: {
        limit: number;
        offset: number;
        total: number;
    };
};

// =====================
// Utility Functions
// =====================

const formatTimestamp = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
};

const formatRelativeTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
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

const formatDate = (value: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency || 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};

const shortId = (value: string) => value.slice(0, 8);

// =====================
// Sales-state presentation
// =====================

type SalesState = AdminEvent['salesState'];

type SalesStateMeta = {
    label: string;
    icon: LucideIcon;
    badge: string;
    dot: string;
};

const SALES_STATE_META: Record<SalesState, SalesStateMeta> = {
    live: {
        label: 'Live - on sale',
        icon: Radio,
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        dot: 'bg-emerald-500',
    },
    not_on_sale: {
        label: 'Not on sale yet',
        icon: Hourglass,
        badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
        dot: 'bg-sky-500',
    },
    sold_out: {
        label: 'Sold out',
        icon: CircleSlash,
        badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
        dot: 'bg-amber-500',
    },
    private: {
        label: 'Private - link only',
        icon: Lock,
        badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
        dot: 'bg-violet-500',
    },
    previous: {
        label: 'Previous',
        icon: History,
        badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
        dot: 'bg-slate-400',
    },
    draft: {
        label: 'Draft',
        icon: PenLine,
        badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/25',
        dot: 'bg-zinc-400',
    },
    cancelled: {
        label: 'Cancelled',
        icon: Ban,
        badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
        dot: 'bg-rose-500',
    },
    archived: {
        label: 'Archived',
        icon: Archive,
        badge: 'bg-stone-500/10 text-stone-600 dark:text-stone-300 border-stone-500/25',
        dot: 'bg-stone-400',
    },
};

const SALES_STATE_ORDER: SalesState[] = [
    'live',
    'not_on_sale',
    'sold_out',
    'private',
    'previous',
    'draft',
    'cancelled',
    'archived',
];

const compactNumber = (value: number) =>
    new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const getCompactSalesStateLabel = (state: SalesState) => {
    switch (state) {
        case 'live':
            return 'Live';
        case 'not_on_sale':
            return 'Paused';
        case 'sold_out':
            return 'Sold out';
        case 'private':
            return 'Private';
        case 'previous':
            return 'Previous';
        case 'draft':
            return 'Draft';
        case 'cancelled':
            return 'Cancelled';
        case 'archived':
            return 'Archived';
    }
};

// =====================
// Chart Component
// =====================

function PlatformTrendsChart({
    data,
    period,
    onPeriodChange,
    isLoading,
}: {
    data: TimeSeriesResponse | null;
    period: TimeSeriesPeriod;
    onPeriodChange: (period: TimeSeriesPeriod) => void;
    isLoading: boolean;
}) {
    const periods: { value: TimeSeriesPeriod; label: string }[] = [
        { value: '7d', label: '7 days' },
        { value: '30d', label: '30 days' },
        { value: '90d', label: '90 days' },
        { value: '1y', label: '1 year' },
    ];

    const chartData = useMemo(() => {
        if (!data?.data) return [];
        return data.data.map((bucket) => ({
            ...bucket,
            name: new Date(bucket.date).toLocaleDateString('en-GB', {
                month: 'short',
                day: 'numeric',
            }),
        }));
    }, [data]);

    return (
        <Card className="border-border/60">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-cyan)] flex items-center justify-center shadow-md">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Platform Trends</CardTitle>
                        <p className="text-xs text-muted-foreground">Activity over time</p>
                    </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                    {periods.map((p) => (
                        <Button
                            key={p.value}
                            variant={period === p.value ? 'default' : 'outline'}
                            size="sm"
                            className="text-xs px-3"
                            onClick={() => onPeriodChange(p.value)}
                        >
                            {p.label}
                        </Button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                ) : (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--brand-teal))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--brand-teal))" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorTickets" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'hsl(var(--border))' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                    tickLine={false}
                                    axisLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    }}
                                    labelStyle={{ fontWeight: 600 }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    name="Users"
                                    stroke="hsl(var(--brand-teal))"
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="events"
                                    name="Events"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorEvents)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="tickets"
                                    name="Tickets"
                                    stroke="#22c55e"
                                    fillOpacity={1}
                                    fill="url(#colorTickets)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="orders"
                                    name="Orders"
                                    stroke="#f59e0b"
                                    fillOpacity={1}
                                    fill="url(#colorOrders)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// =====================
// Data Table Components
// =====================

function Pagination({
    offset,
    limit,
    total,
    onPageChange,
}: {
    offset: number;
    limit: number;
    total: number;
    onPageChange: (offset: number) => void;
}) {
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="flex items-center justify-between px-2 py-3">
            <p className="text-xs text-muted-foreground">
                Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(offset - limit)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                    {currentPage} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => onPageChange(offset + limit)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function UsersTable() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'true' | 'false'>('all');
    const hasLoadedInitialUsersRef = useRef(false);

    const fetchUsers = useCallback(async (params: { offset?: number; search?: string; isOrganizer?: 'all' | 'true' | 'false' }) => {
        setIsLoading(true);
        try {
            const result = await getUsersList({
                limit: 25,
                offset: params.offset ?? pagination.offset,
                search: params.search ?? search,
                isOrganizer: params.isOrganizer ?? filter,
            });
            setUsers(result.data);
            setPagination(result.pagination);
        } catch {
            // Handle error silently
        } finally {
            setIsLoading(false);
        }
    }, [pagination.offset, search, filter]);

    useEffect(() => {
        if (hasLoadedInitialUsersRef.current) {
            return;
        }
        hasLoadedInitialUsersRef.current = true;
        fetchUsers({});
    }, [fetchUsers]);

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchUsers({ offset: 0, search: value });
    };

    const handleFilterChange = (value: 'all' | 'true' | 'false') => {
        setFilter(value);
        fetchUsers({ offset: 0, isOrganizer: value });
    };

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-[var(--brand-teal)]" />
                        Users
                        <Badge variant="secondary" className="ml-2">{pagination.total}</Badge>
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                className="pl-8 h-9 w-full sm:w-[200px]"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="h-9 px-3 rounded-md border bg-background text-sm"
                            value={filter}
                            onChange={(e) => handleFilterChange(e.target.value as 'all' | 'true' | 'false')}
                        >
                            <option value="all">All Users</option>
                            <option value="true">Organizers Only</option>
                            <option value="false">Attendees Only</option>
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {isLoading ? (
                    <div className="h-40 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/30">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Organization</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium truncate max-w-[150px]">{user.name || 'Unnamed'}</p>
                                                    <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[150px]">{user.email}</p>
                                                    <p className="text-xs text-muted-foreground lg:hidden">
                                                        Joined {formatDate(user.createdAt)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground truncate max-w-[200px]">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={user.isOrganizer ? 'default' : 'secondary'} className="text-xs">
                                                    {user.isOrganizer ? 'Organizer' : 'Attendee'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                                                {user.organizer?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                                                {formatDate(user.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            offset={pagination.offset}
                            limit={pagination.limit}
                            total={pagination.total}
                            onPageChange={(offset) => fetchUsers({ offset })}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function OrganizersTable() {
    const [organizers, setOrganizers] = useState<AdminOrganizer[]>([]);
    const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'individual' | 'organization' | 'charity'>('all');
    const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false);
    const [selectedOrganizer, setSelectedOrganizer] = useState<AdminOrganizer | null>(null);
    const [grantCredits, setGrantCredits] = useState('100');
    const [grantReason, setGrantReason] = useState('');
    const [grantError, setGrantError] = useState<string | null>(null);
    const [grantSuccess, setGrantSuccess] = useState<string | null>(null);
    const [isGrantSubmitting, setIsGrantSubmitting] = useState(false);
    const hasLoadedInitialOrganizersRef = useRef(false);

    const fetchOrganizers = useCallback(async (params: { offset?: number; search?: string; type?: typeof filter }) => {
        setIsLoading(true);
        try {
            const result = await getOrganizersList({
                limit: 25,
                offset: params.offset ?? pagination.offset,
                search: params.search ?? search,
                type: params.type ?? filter,
            });
            setOrganizers(result.data);
            setPagination(result.pagination);
        } catch {
            // Handle error silently
        } finally {
            setIsLoading(false);
        }
    }, [pagination.offset, search, filter]);

    useEffect(() => {
        if (hasLoadedInitialOrganizersRef.current) {
            return;
        }
        hasLoadedInitialOrganizersRef.current = true;
        fetchOrganizers({});
    }, [fetchOrganizers]);

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchOrganizers({ offset: 0, search: value });
    };

    const openGrantDialog = (organizer: AdminOrganizer) => {
        setSelectedOrganizer(organizer);
        setGrantCredits('100');
        setGrantReason('');
        setGrantError(null);
        setIsGrantDialogOpen(true);
    };

    const submitGrant = async () => {
        if (!selectedOrganizer) return;

        const creditsInput = grantCredits.trim();
        const reason = grantReason.trim();

        if (!/^\d+$/.test(creditsInput)) {
            setGrantError('Credits must be an integer between 1 and 100,000.');
            return;
        }

        const credits = Number(creditsInput);
        if (!Number.isSafeInteger(credits) || credits < 1 || credits > 100000) {
            setGrantError('Credits must be an integer between 1 and 100,000.');
            return;
        }
        if (reason.length < 3) {
            setGrantError('Reason must be at least 3 characters.');
            return;
        }

        setIsGrantSubmitting(true);
        setGrantError(null);

        try {
            await grantOrganizerCredits(selectedOrganizer.id, { credits, reason });
            setGrantSuccess(`Added ${credits.toLocaleString()} credits to ${selectedOrganizer.name}.`);
            setIsGrantDialogOpen(false);
            await fetchOrganizers({
                offset: pagination.offset,
                search,
                type: filter,
            });
        } catch (error) {
            if (error instanceof ApiError) {
                setGrantError(error.message || 'Unable to grant credits.');
            } else {
                setGrantError('Unable to grant credits.');
            }
        } finally {
            setIsGrantSubmitting(false);
        }
    };

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-purple-500" />
                        Organizers
                        <Badge variant="secondary" className="ml-2">{pagination.total}</Badge>
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search organizers..."
                                className="pl-8 h-9 w-full sm:w-[200px]"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="h-9 px-3 rounded-md border bg-background text-sm"
                            value={filter}
                            onChange={(e) => {
                                const value = e.target.value as typeof filter;
                                setFilter(value);
                                fetchOrganizers({ offset: 0, type: value });
                            }}
                        >
                            <option value="all">All Types</option>
                            <option value="individual">Individual</option>
                            <option value="organization">Organization</option>
                            <option value="charity">Charity</option>
                        </select>
                    </div>
                </div>
                {grantSuccess && (
                    <p className="text-sm text-emerald-600 mt-3">{grantSuccess}</p>
                )}
            </CardHeader>
            <CardContent className="px-0">
                {isLoading ? (
                    <div className="h-40 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/30">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Events</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Orders</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Tickets Sold</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Credits</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizers.map((org) => (
                                        <tr key={org.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium truncate max-w-[120px] sm:max-w-[180px]">{org.name}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-xs capitalize ${org.organizerType === 'charity'
                                                        ? 'bg-emerald-500/10 text-emerald-600'
                                                        : org.organizerType === 'organization'
                                                            ? 'bg-purple-500/10 text-purple-600'
                                                            : ''
                                                        }`}
                                                >
                                                    {org.organizerType}
                                                    {org.isCharityVerified && ' ✓'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="font-medium">{org.eventsCount}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="font-medium">{org.ordersCount}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className="font-medium">{org.ticketsSold}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className="font-medium">{org.creditBalance.toLocaleString()}</span>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                                                {[org.city, org.country].filter(Boolean).join(', ') || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2 sm:px-3"
                                                    onClick={() => openGrantDialog(org)}
                                                    aria-label={`Add credits to ${org.name}`}
                                                >
                                                    <CirclePlus className="h-3.5 w-3.5 sm:mr-1.5" />
                                                    <span className="hidden sm:inline">Add Credits</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            offset={pagination.offset}
                            limit={pagination.limit}
                            total={pagination.total}
                            onPageChange={(offset) => fetchOrganizers({ offset })}
                        />
                    </>
                )}
            </CardContent>
            <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Credits</DialogTitle>
                        <DialogDescription>
                            Grant platform credits to {selectedOrganizer?.name ?? 'this organizer'}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Credits</p>
                            <Input
                                type="number"
                                min={1}
                                max={100000}
                                step={1}
                                value={grantCredits}
                                onChange={(event) => setGrantCredits(event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Reason</p>
                            <Textarea
                                value={grantReason}
                                onChange={(event) => setGrantReason(event.target.value)}
                                placeholder="Example: goodwill top-up after support issue"
                                rows={3}
                            />
                        </div>
                        {grantError && (
                            <p className="text-sm text-destructive">{grantError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsGrantDialogOpen(false)}
                            disabled={isGrantSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitGrant} disabled={isGrantSubmitting}>
                            {isGrantSubmitting ? 'Granting...' : 'Grant Credits'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function EventsTable() {
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<AdminEvent['status'] | 'all'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const hasLoadedInitialEventsRef = useRef(false);

    const fetchEvents = useCallback(async (params: {
        offset?: number;
        search?: string;
        status?: AdminEvent['status'] | 'all';
    }) => {
        setIsLoading(true);
        try {
            const result = await getEventsList({
                limit: 25,
                offset: params.offset ?? pagination.offset,
                search: params.search ?? search,
                status: params.status ?? statusFilter,
            });
            setEvents(result.data);
            setPagination(result.pagination);
        } catch {
            // Handle error silently
        } finally {
            setIsLoading(false);
        }
    }, [pagination.offset, search, statusFilter]);

    useEffect(() => {
        if (hasLoadedInitialEventsRef.current) {
            return;
        }
        hasLoadedInitialEventsRef.current = true;
        fetchEvents({});
    }, [fetchEvents]);

    const handleSearch = (value: string) => {
        setSearch(value);
        setExpandedId(null);
        fetchEvents({ offset: 0, search: value });
    };

    const handleStatusFilterChange = (value: AdminEvent['status'] | 'all') => {
        setStatusFilter(value);
        setExpandedId(null);
        fetchEvents({ offset: 0, status: value });
    };

    const groupedEvents = useMemo(
        () => SALES_STATE_ORDER
            .map((state) => ({
                state,
                events: events.filter((event) => event.salesState === state),
            }))
            .filter((group) => group.events.length > 0),
        [events]
    );

    const statusFilters: { value: AdminEvent['status'] | 'all'; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Drafts' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'archived', label: 'Archived' },
    ];

    const renderEventRows = (sectionEvents: AdminEvent[]) =>
        sectionEvents.map((event) => {
            const meta = SALES_STATE_META[event.salesState];
            const StateIcon = meta.icon;
            const isPublic = event.visibility === 'public';
            const VisibilityIcon = isPublic ? Globe : Lock;

            return (
                <Fragment key={event.id}>
                    <tr
                        className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/20"
                        onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                    >
                        <td className="px-2 py-3 sm:px-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                aria-label={expandedId === event.id ? 'Collapse event details' : 'Expand event details'}
                                onClick={(clickEvent) => {
                                    clickEvent.stopPropagation();
                                    setExpandedId(expandedId === event.id ? null : event.id);
                                }}
                            >
                                {expandedId === event.id ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </Button>
                        </td>
                        <td className="px-2 py-3 sm:px-4">
                            <div className="max-w-[150px] sm:max-w-none sm:min-w-[180px]">
                                <p className="truncate font-medium sm:max-w-[260px]">{event.title}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {formatDate(event.startDatetime)}
                                    {event.publishedAt ? ` - Published ${formatDate(event.publishedAt)}` : ''}
                                </p>
                                <p className="truncate text-xs text-muted-foreground sm:hidden">
                                    {event.organizer.name}
                                </p>
                            </div>
                        </td>
                        <td className="px-2 py-3 sm:px-4">
                            <Badge variant="secondary" className={`gap-1.5 whitespace-nowrap border text-xs ${meta.badge}`}>
                                <StateIcon className="h-3.5 w-3.5" />
                                <span className="sm:hidden">{getCompactSalesStateLabel(event.salesState)}</span>
                                <span className="hidden sm:inline">{meta.label}</span>
                            </Badge>
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                            <Badge
                                variant="secondary"
                                className={`gap-1.5 whitespace-nowrap border text-xs ${isPublic
                                    ? 'border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                                    : 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                                    }`}
                            >
                                <VisibilityIcon className="h-3.5 w-3.5" />
                                {isPublic ? 'Public' : 'Private'}
                            </Badge>
                        </td>
                        <td className="hidden max-w-[150px] truncate px-3 py-3 text-muted-foreground md:table-cell sm:px-4">
                            {event.organizer.name}
                        </td>
                        <td className="hidden px-3 py-3 text-center md:table-cell sm:px-4">
                            <span className="font-medium">{event.totalSold}</span>
                            <span className="text-muted-foreground">/{event.totalCapacity}</span>
                            {event.donationCount > 0 && (
                                <span className="ml-1 text-muted-foreground">+{event.donationCount}</span>
                            )}
                        </td>
                        <td className="hidden px-3 py-3 text-center font-medium lg:table-cell sm:px-4">
                            {event.ordersCount}
                        </td>
                    </tr>
                    <AnimatePresence>
                        {expandedId === event.id && (
                            <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                key={`${event.id}-expand`}
                            >
                                <td colSpan={7} className="bg-muted/20 px-4 py-4">
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(280px,2fr)]">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="rounded-lg border border-border/60 bg-background p-3">
                                                <p className="text-xs text-muted-foreground">Available</p>
                                                <p className="font-semibold">{event.ticketsAvailable.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-background p-3">
                                                <p className="text-xs text-muted-foreground">Orders</p>
                                                <p className="font-semibold">{event.ordersCount.toLocaleString()}</p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-background p-3">
                                                <p className="text-xs text-muted-foreground">Venue</p>
                                                <p className="truncate font-semibold">{event.venue || event.city || '-'}</p>
                                            </div>
                                            <div className="rounded-lg border border-border/60 bg-background p-3">
                                                <p className="text-xs text-muted-foreground">Price</p>
                                                <p className="truncate font-semibold">
                                                    {event.priceRange.min === event.priceRange.max
                                                        ? formatPrice(event.priceRange.min, event.currency)
                                                        : `${formatPrice(event.priceRange.min, event.currency)} - ${formatPrice(event.priceRange.max, event.currency)}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                            {event.ticketTypes.length === 0 ? (
                                                <div className="rounded-lg border border-border/60 bg-background p-3 text-sm text-muted-foreground">
                                                    No active ticket types.
                                                </div>
                                            ) : (
                                                event.ticketTypes.map((tt) => (
                                                    <div key={tt.id} className="rounded-lg border border-border/60 bg-background p-3">
                                                        <p className="truncate text-sm font-medium">{tt.name}</p>
                                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                                            <span className="text-muted-foreground">{formatPrice(tt.price, tt.currency)}</span>
                                                            <span>
                                                                <span className="font-medium">{tt.sold}</span>
                                                                <span className="text-muted-foreground">/{tt.total} sold</span>
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)]"
                                                                style={{ width: `${tt.total > 0 ? Math.min((tt.sold / tt.total) * 100, 100) : 0}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </motion.tr>
                        )}
                    </AnimatePresence>
                </Fragment>
            );
        });

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        Events
                        <Badge variant="secondary" className="ml-2">{pagination.total}</Badge>
                    </CardTitle>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                        <div className="relative min-w-[220px] flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search events..."
                                className="h-9 w-full pl-8 sm:w-[240px]"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/40 p-1">
                            {statusFilters.map((option) => (
                                <Button
                                    key={option.value}
                                    variant={statusFilter === option.value ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2.5 text-xs"
                                    onClick={() => handleStatusFilterChange(option.value)}
                                >
                                    {option.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {isLoading ? (
                    <div className="h-40 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border/60 bg-muted/30">
                                        <th className="w-8 px-2 py-3 text-left font-medium text-muted-foreground sm:px-4"></th>
                                        <th className="px-2 py-3 text-left font-medium text-muted-foreground sm:px-4">Event</th>
                                        <th className="px-2 py-3 text-left font-medium text-muted-foreground sm:px-4">State</th>
                                        <th className="hidden px-3 py-3 text-left font-medium text-muted-foreground sm:table-cell sm:px-4">Visibility</th>
                                        <th className="hidden px-3 py-3 text-left font-medium text-muted-foreground md:table-cell sm:px-4">Organiser</th>
                                        <th className="hidden px-3 py-3 text-center font-medium text-muted-foreground md:table-cell sm:px-4">Tickets</th>
                                        <th className="hidden px-3 py-3 text-center font-medium text-muted-foreground lg:table-cell sm:px-4">Orders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedEvents.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                                No events match this view.
                                            </td>
                                        </tr>
                                    ) : (
                                        groupedEvents.map((group) => {
                                            const meta = SALES_STATE_META[group.state];
                                            return (
                                                <Fragment key={group.state}>
                                                    <tr className="border-y border-border/60 bg-muted/40">
                                                        <td colSpan={7} className="px-4 py-2">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        {meta.label}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {group.events.length.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {renderEventRows(group.events)}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            offset={pagination.offset}
                            limit={pagination.limit}
                            total={pagination.total}
                            onPageChange={(offset) => fetchEvents({ offset })}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// =====================
// Main Admin Dashboard
// =====================

export default function AdminDashboardPage() {
    const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [charities, setCharities] = useState<CharityItem[]>([]);
    const [charityTotal, setCharityTotal] = useState(0);
    const [charityError, setCharityError] = useState<string | null>(null);
    const [isCharityLoading, setIsCharityLoading] = useState(true);
    const [updatingCharityId, setUpdatingCharityId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [sweeperAudit, setSweeperAudit] = useState<CheckoutSweeperAuditResponse | null>(null);
    const [isSweeperLoading, setIsSweeperLoading] = useState(true);
    const [sweeperError, setSweeperError] = useState<string | null>(null);

    // Time series state
    const [timeSeries, setTimeSeries] = useState<TimeSeriesResponse | null>(null);
    const [timeSeriesPeriod, setTimeSeriesPeriod] = useState<TimeSeriesPeriod>('30d');
    const [isTimeSeriesLoading, setIsTimeSeriesLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchOverview = async () => {
            setIsLoading(true);
            try {
                const response = await api.get<AdminOverviewResponse>('/api/v1/admin/overview', {
                    params: { activityLimit: '12' },
                });
                if (!cancelled) {
                    setOverview(response);
                    setError(null);
                }
            } catch (err) {
                if (cancelled) return;
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
                if (!cancelled) setIsLoading(false);
            }
        };

        const fetchCharities = async () => {
            setIsCharityLoading(true);
            try {
                const response = await api.get<CharityResponse>('/api/v1/admin/charities', {
                    params: { status: 'all', limit: '12', offset: '0' },
                });
                if (!cancelled) {
                    setCharities(response.data);
                    setCharityTotal(response.pagination.total ?? response.data.length);
                    setCharityError(null);
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError) {
                    if (err.status === 403) {
                        setCharityError('You do not have access to charity requests.');
                    } else if (err.status === 401) {
                        setCharityError('Please sign in to view charity requests.');
                    } else {
                        setCharityError(err.message || 'Unable to load charity requests.');
                    }
                } else {
                    setCharityError('Unable to load charity requests.');
                }
                setCharities([]);
                setCharityTotal(0);
            } finally {
                if (!cancelled) setIsCharityLoading(false);
            }
        };

        const fetchSweeperAudit = async () => {
            setIsSweeperLoading(true);
            try {
                const response = await getCheckoutSweeperAudit({ hours: 24, limit: 6 });
                if (!cancelled) {
                    setSweeperAudit(response);
                    setSweeperError(null);
                }
            } catch (err) {
                if (cancelled) return;
                if (err instanceof ApiError) {
                    setSweeperError(err.message || 'Unable to load checkout sweeper audit.');
                } else {
                    setSweeperError('Unable to load checkout sweeper audit.');
                }
                setSweeperAudit(null);
            } finally {
                if (!cancelled) setIsSweeperLoading(false);
            }
        };

        void fetchOverview();
        void fetchCharities();
        void fetchSweeperAudit();

        return () => {
            cancelled = true;
        };
    }, []);

    // Fetch time series data
    useEffect(() => {
        let cancelled = false;

        const fetchTimeSeries = async () => {
            setIsTimeSeriesLoading(true);
            try {
                const response = await getTimeSeries(timeSeriesPeriod);
                if (!cancelled) {
                    setTimeSeries(response);
                }
            } catch {
                // Silent fail
            } finally {
                if (!cancelled) setIsTimeSeriesLoading(false);
            }
        };

        void fetchTimeSeries();

        return () => {
            cancelled = true;
        };
    }, [timeSeriesPeriod]);

    const windowDays = overview?.windowDays ?? 30;

    // Event-state cards: emphasise what is live on the platform right now.
    const eventStateCards = useMemo(() => {
        const totals = overview?.totals;
        return [
            {
                title: 'Live events',
                subtitle: 'Public & upcoming on Browse',
                value: totals?.liveEvents ?? 0,
                icon: Radio,
                gradient: 'from-emerald-500 to-teal-500',
                bgGradient: 'from-emerald-500/10 to-teal-500/10',
                live: true,
            },
            {
                title: 'Published events',
                subtitle: 'Published status',
                value: totals?.publishedEvents ?? 0,
                icon: Globe,
                gradient: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
                bgGradient: 'from-[var(--brand-mint)]/10 to-[var(--brand-cyan)]/10',
                live: false,
            },
            {
                title: 'Private events',
                subtitle: 'Unlisted, link only',
                value: totals?.privateEvents ?? 0,
                icon: Lock,
                gradient: 'from-violet-500 to-purple-500',
                bgGradient: 'from-violet-500/10 to-purple-500/10',
                live: false,
            },
        ];
    }, [overview]);

    // Platform totals with rolling-window deltas.
    const platformStatCards = useMemo(() => {
        const totals = overview?.totals;
        const win = overview?.window;
        return [
            {
                title: 'Users',
                value: totals?.users ?? 0,
                windowValue: win?.users ?? 0,
                icon: Users,
                gradient: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
            },
            {
                title: 'Orders',
                value: totals?.orders ?? 0,
                windowValue: win?.orders ?? 0,
                icon: ShoppingCart,
                gradient: 'from-amber-500 to-orange-500',
            },
            {
                title: 'Tickets sold',
                value: totals?.tickets ?? 0,
                windowValue: win?.tickets ?? 0,
                icon: Ticket,
                gradient: 'from-rose-500 to-pink-500',
            },
        ];
    }, [overview]);

    // Secondary event states for the breakdown strip.
    const breakdownItems = useMemo(() => {
        const b = overview?.eventBreakdown;
        const items: { state: SalesState; value: number }[] = [
            { state: 'previous', value: b?.previous ?? 0 },
            { state: 'not_on_sale', value: b?.notOnSale ?? 0 },
            { state: 'sold_out', value: b?.soldOut ?? 0 },
            { state: 'draft', value: b?.draft ?? 0 },
            { state: 'cancelled', value: b?.cancelled ?? 0 },
            { state: 'archived', value: b?.archived ?? 0 },
        ];
        return items;
    }, [overview]);

    const { eventActivity, userActivity } = useMemo(() => {
        const events = (overview?.activity ?? []).filter((item) => item.type === 'event');
        const users = (overview?.activity ?? []).filter((item) => item.type === 'user');
        return { eventActivity: events.slice(0, 6), userActivity: users.slice(0, 6) };
    }, [overview]);

    const handleRevokeCharity = async (organizerId: string) => {
        setUpdatingCharityId(organizerId);
        try {
            await api.patch(`/api/v1/admin/organizers/${organizerId}/charity`, {
                isCharityVerified: false,
            });
            setCharities((prev) =>
                prev.map((item) =>
                    item.id === organizerId
                        ? { ...item, isCharityVerified: false, updatedAt: new Date().toISOString() }
                        : item
                )
            );
        } catch (err) {
            setCharityError(err instanceof Error ? err.message : 'Unable to update charity status.');
        } finally {
            setUpdatingCharityId(null);
        }
    };

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
            <div className="container py-6 sm:py-8 space-y-6">
                {/* Operations snapshot header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--brand-teal)] via-[var(--brand-cyan)] to-[var(--brand-mint)] p-5 sm:p-6 md:p-7"
                >
                    <div className="absolute inset-0 overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-[0.08]"
                            style={{
                                backgroundImage:
                                    'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                                backgroundSize: '28px 28px',
                            }}
                        />
                    </div>

                    <div className="relative z-10 space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
                                        <Radar className="h-4 w-4 text-white" />
                                    </span>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                                        Platform operations
                                    </p>
                                </div>
                                <h1 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                                    What&rsquo;s live right now
                                </h1>
                            </div>
                            <Badge className="w-fit gap-1.5 border-white/30 bg-white/15 text-white hover:bg-white/25">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                </span>
                                Live - last {windowDays}d
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15 sm:grid-cols-4">
                            {[
                                { label: 'Live events', value: overview?.totals.liveEvents ?? 0, icon: Radio },
                                { label: 'Published', value: overview?.totals.publishedEvents ?? 0, icon: Globe },
                                { label: 'Private', value: overview?.totals.privateEvents ?? 0, icon: Lock },
                                {
                                    label: `Orders - ${windowDays}d`,
                                    value: overview?.window.orders ?? 0,
                                    icon: ShoppingCart,
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="bg-white/5 px-3.5 py-3 backdrop-blur-sm">
                                        <div className="flex items-center gap-1.5 text-white/80">
                                            <Icon className="h-3.5 w-3.5" />
                                            <span className="text-[11px] font-medium uppercase tracking-wide">
                                                {item.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-2xl font-bold leading-none text-white">
                                            {Number(item.value).toLocaleString()}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* Tabs Navigation */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
                        <TabsTrigger value="overview" className="gap-2">
                            <TrendingUp className="h-4 w-4 hidden sm:block" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4 hidden sm:block" />
                            Users
                        </TabsTrigger>
                        <TabsTrigger value="organizers" className="gap-2">
                            <Building2 className="h-4 w-4 hidden sm:block" />
                            Orgs
                        </TabsTrigger>
                        <TabsTrigger value="events" className="gap-2">
                            <Calendar className="h-4 w-4 hidden sm:block" />
                            Events
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-foreground">Events by state</h2>
                                <span className="text-xs text-muted-foreground">
                                    {Number(overview?.totals.events ?? 0).toLocaleString()} total
                                </span>
                            </div>
                            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                                {eventStateCards.map((stat, index) => {
                                    const Icon = stat.icon;
                                    return (
                                        <motion.div
                                            key={stat.title}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4, delay: index * 0.08 }}
                                        >
                                            <Card className={`relative overflow-hidden border-border/60 bg-gradient-to-br ${stat.bgGradient}`}>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                    <div className="space-y-0.5">
                                                        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                                            {stat.title}
                                                            {stat.live && (
                                                                <span className="relative flex h-2 w-2" aria-hidden>
                                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                                </span>
                                                            )}
                                                        </CardTitle>
                                                        <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                                                    </div>
                                                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                                        <Icon className="h-5 w-5 text-white" />
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                                        {Number(stat.value).toLocaleString()}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.24 }}
                                className="mt-3 flex flex-wrap items-stretch gap-2"
                            >
                                {breakdownItems.map((item) => {
                                    const meta = SALES_STATE_META[item.state];
                                    const Icon = meta.icon;
                                    return (
                                        <div
                                            key={item.state}
                                            className="flex flex-1 items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2 min-w-[140px]"
                                        >
                                            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border ${meta.badge}`}>
                                                <Icon className="h-3.5 w-3.5" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-base font-semibold leading-none">{item.value.toLocaleString()}</p>
                                                <p className="truncate text-xs text-muted-foreground">{meta.label}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </div>

                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                            {platformStatCards.map((stat, index) => {
                                const Icon = stat.icon;
                                return (
                                    <motion.div
                                        key={stat.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: 0.28 + index * 0.08 }}
                                    >
                                        <Card className="relative overflow-hidden border-border/60">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <div>
                                                    <CardTitle className="text-sm font-medium text-foreground">{stat.title}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">All time</p>
                                                </div>
                                                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex items-end justify-between gap-2">
                                                <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                                    {Number(stat.value).toLocaleString()}
                                                </div>
                                                <Badge variant="secondary" className="mb-1 gap-1 font-medium text-muted-foreground">
                                                    <TrendingUp className="h-3 w-3" />
                                                    +{compactNumber(stat.windowValue)} - {windowDays}d
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Platform Trends Chart */}
                        <PlatformTrendsChart
                            data={timeSeries}
                            period={timeSeriesPeriod}
                            onPeriodChange={setTimeSeriesPeriod}
                            isLoading={isTimeSeriesLoading}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <Card className="border-border/60">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-md">
                                            <Clock3 className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Checkout Sweeper</CardTitle>
                                            <p className="text-xs text-muted-foreground">24h audit: failures and released holds</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                                        {sweeperAudit?.lastRun
                                            ? `Last run ${formatRelativeTime(sweeperAudit.lastRun.runFinishedAt)}`
                                            : 'No runs logged'}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isSweeperLoading ? (
                                        <p className="text-sm text-muted-foreground">Loading sweeper audit...</p>
                                    ) : sweeperError ? (
                                        <p className="text-sm text-muted-foreground">{sweeperError}</p>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                <div className="rounded-lg border border-border/60 bg-background p-3">
                                                    <p className="text-xs text-muted-foreground">Finalized paid</p>
                                                    <p className="text-xl font-semibold">{sweeperAudit?.totals.finalized ?? 0}</p>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background p-3">
                                                    <p className="text-xs text-muted-foreground">Expired holds</p>
                                                    <p className="text-xl font-semibold">{sweeperAudit?.totals.expired ?? 0}</p>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background p-3">
                                                    <p className="text-xs text-muted-foreground">Failures</p>
                                                    <p className="text-xl font-semibold text-rose-600">{sweeperAudit?.totals.failed ?? 0}</p>
                                                </div>
                                                <div className="rounded-lg border border-border/60 bg-background p-3">
                                                    <p className="text-xs text-muted-foreground">Rows scanned</p>
                                                    <p className="text-xl font-semibold">{sweeperAudit?.totals.scanned ?? 0}</p>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 lg:grid-cols-2">
                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                                                        Recent Failures
                                                    </p>
                                                    {sweeperAudit?.recentFailures.length ? (
                                                        sweeperAudit.recentFailures.map((item) => (
                                                            <div
                                                                key={`${item.runId}-${item.orderId}-${item.error}`}
                                                                className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3"
                                                            >
                                                                <p className="text-xs font-mono text-rose-700">order {shortId(item.orderId)}</p>
                                                                <p className="text-sm text-rose-700">{item.error}</p>
                                                                <p className="text-xs text-muted-foreground">{formatRelativeTime(item.runFinishedAt)}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No failures in the last 24 hours.</p>
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-sm font-medium flex items-center gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        Recent Changes
                                                    </p>
                                                    {sweeperAudit?.recentChanges.length ? (
                                                        sweeperAudit.recentChanges.map((item) => (
                                                            <div
                                                                key={`${item.runId}-${item.orderId}-${item.action}`}
                                                                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                                                            >
                                                                <p className="text-sm text-emerald-700 capitalize">{item.action}</p>
                                                                <p className="text-xs font-mono text-emerald-700">order {shortId(item.orderId)}</p>
                                                                <p className="text-xs text-muted-foreground">{formatRelativeTime(item.runFinishedAt)}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground">No releases or finalizations in the last 24 hours.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Activity Sections */}
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

                        {/* Charity Signups */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.55 }}
                        >
                            <Card className="border-border/60">
                                <CardHeader className="flex flex-row items-center justify-between pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                                            <Heart className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">Charity Signups</CardTitle>
                                            <p className="text-xs text-muted-foreground">Auto-approved, reviewable here</p>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                        {charityTotal} total
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {isCharityLoading ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">Loading charity signups...</p>
                                    ) : charityError ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">{charityError}</p>
                                    ) : charities.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">No charity signups yet.</p>
                                    ) : (
                                        charities.map((item) => (
                                            <div
                                                key={`charity-${item.id}`}
                                                className="flex flex-col gap-3 rounded-lg border border-border/40 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{item.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Charity number: {item.charityNumber || 'Not provided'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Submitted {formatRelativeTime(item.createdAt)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            item.isCharityVerified
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                                        }
                                                    >
                                                        {item.isCharityVerified ? 'Verified' : 'Revoked'}
                                                    </Badge>
                                                    {item.isCharityVerified && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRevokeCharity(item.id)}
                                                            disabled={updatingCharityId === item.id}
                                                        >
                                                            {updatingCharityId === item.id ? 'Revoking...' : 'Revoke'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users">
                        <UsersTable />
                    </TabsContent>

                    {/* Organizers Tab */}
                    <TabsContent value="organizers">
                        <OrganizersTable />
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events">
                        <EventsTable />
                    </TabsContent>
                </Tabs>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="text-center py-4"
                >
                    <p className="text-xs text-muted-foreground">
                        Data refreshes automatically. Showing all-time totals.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
