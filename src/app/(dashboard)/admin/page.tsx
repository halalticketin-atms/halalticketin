'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    CalendarPlus,
    Ticket,
    UserPlus,
    TrendingUp,
    Shield,
    Sparkles,
    Users,
    Building2,
    Calendar,
    Search,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ShoppingCart,
} from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api, { ApiError } from '@/lib/api';
import {
    getTimeSeries,
    getUsersList,
    getOrganizersList,
    getEventsList,
    type TimeSeriesPeriod,
    type TimeSeriesResponse,
    type AdminUser,
    type AdminOrganizer,
    type AdminEvent,
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
        fetchUsers({});
    }, []);

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
        fetchOrganizers({});
    }, []);

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchOrganizers({ offset: 0, search: value });
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
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {organizers.map((org) => (
                                        <tr key={org.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-medium truncate max-w-[180px]">{org.name}</p>
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
                                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                                                {[org.city, org.country].filter(Boolean).join(', ') || '-'}
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
        </Card>
    );
}

function EventsTable() {
    const [events, setEvents] = useState<AdminEvent[]>([]);
    const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchEvents = useCallback(async (params: { offset?: number; search?: string }) => {
        setIsLoading(true);
        try {
            const result = await getEventsList({
                limit: 25,
                offset: params.offset ?? pagination.offset,
                search: params.search ?? search,
                status: 'published',
            });
            setEvents(result.data);
            setPagination(result.pagination);
        } catch {
            // Handle error silently
        } finally {
            setIsLoading(false);
        }
    }, [pagination.offset, search]);

    useEffect(() => {
        fetchEvents({});
    }, []);

    const handleSearch = (value: string) => {
        setSearch(value);
        fetchEvents({ offset: 0, search: value });
    };

    const statusColors: Record<string, string> = {
        draft: 'bg-gray-500/10 text-gray-600',
        published: 'bg-emerald-500/10 text-emerald-600',
        cancelled: 'bg-red-500/10 text-red-600',
        archived: 'bg-amber-500/10 text-amber-600',
    };

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                        Events
                        <Badge variant="secondary" className="ml-2">{pagination.total}</Badge>
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                        <div className="relative flex-1 sm:flex-none">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search events..."
                                className="pl-8 h-9 w-full sm:w-[200px]"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
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
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8"></th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Organizer</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Tickets</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Orders</th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Price Range</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => (
                                        <Fragment key={event.id}>
                                            <tr
                                                className="border-b border-border/40 hover:bg-muted/20 transition-colors cursor-pointer"
                                                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                                            >
                                                <td className="px-4 py-3">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        {expandedId === event.id ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium truncate max-w-[200px]">{event.title}</p>
                                                        <p className="text-xs text-muted-foreground">{formatDate(event.startDatetime)}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary" className={`text-xs capitalize ${statusColors[event.status]}`}>
                                                        {event.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground truncate max-w-[120px]">
                                                    {event.organizer.name}
                                                </td>
                                                <td className="px-4 py-3 text-center hidden md:table-cell">
                                                    <span className="font-medium">{event.totalSold}</span>
                                                    <span className="text-muted-foreground">/{event.totalCapacity}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center hidden md:table-cell font-medium">
                                                    {event.ordersCount}
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                                                    {event.priceRange.min === event.priceRange.max
                                                        ? formatPrice(event.priceRange.min, event.currency)
                                                        : `${formatPrice(event.priceRange.min, event.currency)} - ${formatPrice(event.priceRange.max, event.currency)}`}
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
                                                        <td colSpan={7} className="px-4 py-3 bg-muted/20">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                                                {event.ticketTypes.map((tt) => (
                                                                    <div key={tt.id} className="rounded-lg bg-background border border-border/60 p-3">
                                                                        <p className="font-medium text-sm">{tt.name}</p>
                                                                        <div className="mt-2 flex items-center justify-between text-xs">
                                                                            <span className="text-muted-foreground">{formatPrice(tt.price, tt.currency)}</span>
                                                                            <span>
                                                                                <span className="font-medium">{tt.sold}</span>
                                                                                <span className="text-muted-foreground">/{tt.total} sold</span>
                                                                            </span>
                                                                        </div>
                                                                        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)]"
                                                                                style={{ width: `${tt.total > 0 ? (tt.sold / tt.total) * 100 : 0}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </Fragment>
                                    ))}
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
                    params: { days: '7', activityLimit: '12' },
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

        void fetchOverview();
        void fetchCharities();

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

    const stats = useMemo(() => {
        const windowDays = overview?.windowDays ?? 7;
        return [
            {
                title: 'New Users',
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.users ?? 0,
                total: overview?.totals.users ?? 0,
                icon: UserPlus,
                gradient: 'from-[var(--brand-teal)] to-[var(--brand-cyan)]',
                bgGradient: 'from-[var(--brand-mint)]/10 to-[var(--brand-cyan)]/10',
            },
            {
                title: 'New Events',
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.events ?? 0,
                total: overview?.totals.events ?? 0,
                icon: CalendarPlus,
                gradient: 'from-purple-500 to-violet-500',
                bgGradient: 'from-purple-500/10 to-violet-500/10',
            },
            {
                title: 'Tickets Sold',
                subtitle: `Last ${windowDays} days`,
                value: overview?.window.tickets ?? 0,
                total: overview?.totals.tickets ?? 0,
                icon: Ticket,
                gradient: 'from-amber-500 to-orange-500',
                bgGradient: 'from-amber-500/10 to-orange-500/10',
            },
        ];
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
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--brand-teal)] via-[var(--brand-cyan)] to-[var(--brand-mint)] p-5 sm:p-6 md:p-8"
                >
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    </div>

                    <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-white/90" />
                                <p className="text-sm font-semibold text-white/90 uppercase tracking-widest">Admin Dashboard</p>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Platform Overview</h1>
                            <p className="text-white/80 text-sm sm:text-base max-w-md">
                                Monitor signups, events, and ticket activity across Halal Ticketin.
                            </p>
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 w-fit">
                            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                            Live Data
                        </Badge>
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
                        {/* Stats Grid */}
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
                                                    <CardTitle className="text-sm font-medium text-foreground">{stat.title}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                                                </div>
                                                <div
                                                    className={`h-10 w-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}
                                                >
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
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

                        {/* Platform Trends Chart */}
                        <PlatformTrendsChart
                            data={timeSeries}
                            period={timeSeriesPeriod}
                            onPeriodChange={setTimeSeriesPeriod}
                            isLoading={isTimeSeriesLoading}
                        />

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
                                            <Sparkles className="h-4 w-4 text-white" />
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
                        Data refreshes automatically. Last window started{' '}
                        {overview?.windowStart ? formatTimestamp(overview.windowStart) : 'recently'}.
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
