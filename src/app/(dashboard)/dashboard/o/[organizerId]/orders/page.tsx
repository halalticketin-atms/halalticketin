'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Download,
    Receipt,
    CreditCard,
    Calendar,
    User,
    Ticket,
    Check,
    X,
    Mail,
    RefreshCw,
    ChevronDown,
    Users,
    Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { toast } from '@/lib/notifications';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';
import { OrderCard, type OrderResponse, type OrderItem, type OrderStatus } from '@/components/orders/OrderCard';
import { ticketTypeColors } from '@/components/dashboard/CircularProgress';

const progressColorMap: Record<string, string> = {
    primary: 'bg-linear-to-r from-violet-500 to-purple-500',
    emerald: 'bg-linear-to-r from-emerald-500 to-teal-500',
    violet: 'bg-linear-to-r from-violet-500 to-purple-500',
    amber: 'bg-linear-to-r from-amber-500 to-orange-500',
    rose: 'bg-linear-to-r from-rose-500 to-pink-500',
    sky: 'bg-linear-to-r from-sky-500 to-blue-500',
    lime: 'bg-linear-to-r from-lime-500 to-green-500',
    fuchsia: 'bg-linear-to-r from-fuchsia-500 to-pink-500',
};



interface OrdersResponse {
    orders: OrderResponse[];
}

interface TicketBreakdownItem {
    ticketTypeId: string;
    name: string;
    quantity: number;
    revenue: number;
}

interface EventBreakdown {
    eventId: string;
    eventName: string;
    bannerImageUrl?: string;
    isActive: boolean;
    tickets: TicketBreakdownItem[];
    total: { quantity: number; revenue: number };
}

interface TicketBreakdownResponse {
    events: EventBreakdown[];
    currency: string;
}

const statusBadges: Record<OrderStatus, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    refunded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partially_refunded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusLabels: Record<OrderStatus, string> = {
    completed: 'Paid',
    refunded: 'Refunded',
    partially_refunded: 'Partial Refund',
};

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

const getEffectiveUnitPrice = (item: Pick<OrderItem, 'unitPrice' | 'organizerFee'>) =>
    item.unitPrice + (item.organizerFee ?? 0);

export default function OrdersPage() {
    const organizerId = useOrganizerFromParams();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [eventFilter, setEventFilter] = useState<string[]>([]); // Multi-select event filter
    const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dialog state
    const [activeTab, setActiveTab] = useState<'details' | 'refund'>('details');
    const [refundType, setRefundType] = useState<'full' | 'partial' | 'tickets'>('full');
    const [partialAmount, setPartialAmount] = useState('');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [refundError, setRefundError] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);
    const [emailCooldowns, setEmailCooldowns] = useState<Map<string, number>>(new Map());

    // Export state
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportType, setExportType] = useState<'attendees' | 'emails'>('attendees');
    const [isExporting, setIsExporting] = useState(false);
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    const [includeAllEvents, setIncludeAllEvents] = useState(true);

    // Ticket breakdown state
    const [eventBreakdowns, setEventBreakdowns] = useState<EventBreakdown[]>([]);
    const [breakdownCurrency, setBreakdownCurrency] = useState('GBP');
    const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
    const [showAllBreakdown, setShowAllBreakdown] = useState(false);

    // Page tab state - Orders or Tickets view
    const [pageTab, setPageTab] = useState<'orders' | 'tickets'>('orders');

    const EMAIL_COOLDOWN_SECONDS = 60;

    const canResendEmail = (orderId: string) => {
        const lastSent = emailCooldowns.get(orderId);
        if (!lastSent) return true;
        return Date.now() - lastSent > EMAIL_COOLDOWN_SECONDS * 1000;
    };

    const getCooldownRemaining = (orderId: string) => {
        const lastSent = emailCooldowns.get(orderId);
        if (!lastSent) return 0;
        const elapsed = Date.now() - lastSent;
        const remaining = Math.ceil((EMAIL_COOLDOWN_SECONDS * 1000 - elapsed) / 1000);
        return remaining > 0 ? remaining : 0;
    };

    const handleResendEmail = async (orderId: string) => {
        if (!canResendEmail(orderId)) {
            toast.warning('Please wait', {
                description: `You can resend in ${getCooldownRemaining(orderId)} seconds.`
            });
            return;
        }

        setIsResending(true);
        try {
            await api.post(`/api/v1/orders/${orderId}/resend-confirmation`);
            // Record cooldown
            setEmailCooldowns(prev => new Map(prev).set(orderId, Date.now()));
            toast.success('Confirmation email sent', {
                description: 'The attendee will receive their tickets shortly.'
            });
        } catch (err) {
            console.error('Failed to resend email:', err);
            toast.error(err, undefined, {
                action: {
                    label: 'Retry',
                    onClick: () => handleResendEmail(orderId),
                },
            });
        } finally {
            setIsResending(false);
        }
    };

    const handleOpenExportModal = (type: 'attendees' | 'emails') => {
        setExportType(type);
        setExportModalOpen(true);
        // Reset filters
        setSelectedEvents([]);
        setDateRange({ start: '', end: '' });
        setIncludeAllEvents(true);
    };

    const handleExport = async () => {
        if (!organizerId) return;

        setIsExporting(true);
        try {
            const params = new URLSearchParams({
                organizerId,
            });

            // Add event filter if not all events selected
            if (!includeAllEvents && selectedEvents.length > 0) {
                params.append('eventId', selectedEvents[0]);
            }

            // Add status filter (from current view)
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            // Add date range if specified
            if (dateRange.start) {
                params.append('startDate', dateRange.start);
            }
            if (dateRange.end) {
                params.append('endDate', dateRange.end);
            }

            // Add includeRefunded for email export
            if (exportType === 'emails') {
                params.append('includeRefunded', 'false');
            }

            const endpoint = exportType === 'attendees'
                ? '/api/v1/orders/export/attendees'
                : '/api/v1/orders/export/emails';

            // Use fetch instead of axios to avoid JSON parsing
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Get auth token from localStorage
            const token = typeof window !== 'undefined'
                ? window.localStorage.getItem('halal-ticketin-access-token')
                : null;

            const headers: HeadersInit = {
                'Accept': 'text/csv',
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${baseURL}${endpoint}?${params}`, {
                method: 'GET',
                credentials: 'include',
                headers,
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get the CSV text
            const csvText = await response.text();

            // Create download link
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = exportType === 'attendees'
                ? `attendees-${Date.now()}.csv`
                : `emails-${Date.now()}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Export complete', {
                description: `${exportType === 'attendees' ? 'Attendee list' : 'Email list'} downloaded successfully`,
            });
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Export failed', `Unable to generate ${exportType === 'attendees' ? 'attendee list' : 'email list'}`);
        } finally {
            setIsExporting(false);
            setExportModalOpen(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchOrders = async () => {
            if (!organizerId) {
                setOrders([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const response = await api.get<OrdersResponse>('/api/v1/orders', {
                    params: { organizerId },
                });
                if (!isMounted) {
                    return;
                }
                setOrders(response.orders);
                setError(null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unable to load orders';
                if (!isMounted) {
                    return;
                }
                setError(message);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void fetchOrders();
        return () => {
            isMounted = false;
        };
    }, [organizerId]);

    // Fetch ticket breakdown
    useEffect(() => {
        let isMounted = true;
        const fetchBreakdown = async () => {
            if (!organizerId) {
                setEventBreakdowns([]);
                return;
            }
            setIsLoadingBreakdown(true);
            try {
                const response = await api.get<TicketBreakdownResponse>('/api/v1/orders/ticket-breakdown', {
                    params: { organizerId },
                });
                if (!isMounted) return;
                setEventBreakdowns(response.events);
                setBreakdownCurrency(response.currency);
            } catch (err) {
                console.error('Failed to fetch ticket breakdown:', err);
            } finally {
                if (isMounted) setIsLoadingBreakdown(false);
            }
        };

        void fetchBreakdown();
        return () => {
            isMounted = false;
        };
    }, [organizerId]);

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.attendee.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.attendee.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesEvent = eventFilter.length === 0 || eventFilter.includes(order.event.id);
        return matchesSearch && matchesStatus && matchesEvent;
    });

    const openOrderDetails = (order: OrderResponse) => {
        setSelectedOrder(order);
        setActiveTab('details');
        setRefundType('full');
        setPartialAmount('');
        setSelectedTicketIds(new Set());
        setRefundError(null);
        setIsDialogOpen(true);
    };

    const { totalOrders, paidOrders, revenueTotal } = useMemo(() => {
        const totals = orders.reduce(
            (acc, order) => {
                acc.totalOrders += 1;
                if (order.status === 'completed' || order.status === 'partially_refunded') {
                    if (order.status === 'completed') {
                        acc.paidOrders += 1;
                    }
                    // Use net revenue to match overview stats
                    acc.revenueTotal += order.totals.net ?? order.totals.total;
                }
                return acc;
            },
            { totalOrders: 0, paidOrders: 0, revenueTotal: 0 }
        );
        return totals;
    }, [orders]);

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="font-display text-3xl font-bold">Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage purchases and process refunds</p>
                </motion.div>

                {/* Orders / Tickets Toggle */}
                <div className="mb-6">
                    <div className="inline-flex p-1 bg-muted/80 rounded-xl">
                        <button
                            onClick={() => setPageTab('orders')}
                            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pageTab === 'orders'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Receipt className="inline-block h-4 w-4 mr-2" />
                            Orders
                        </button>
                        <button
                            onClick={() => setPageTab('tickets')}
                            className={`px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${pageTab === 'tickets'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Ticket className="inline-block h-4 w-4 mr-2" />
                            Tickets
                        </button>
                    </div>
                </div>

                {/* Stats Cards - Horizontal scroll on mobile */}
                <div className="mb-8 -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
                                            <Receipt className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                                            <p className="text-2xl font-bold">{totalOrders}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-100 dark:border-green-900">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                                            <Check className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Paid Orders</p>
                                            <p className="text-2xl font-bold">{paidOrders}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="min-w-[280px] snap-start md:min-w-0"
                        >
                            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                                            <CreditCard className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">Net Revenue</p>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(revenueTotal, orders[0]?.totals.currency ?? 'GBP')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>



                {/* Tickets Tab - Ticket Breakdown Section */}
                {pageTab === 'tickets' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isLoadingBreakdown ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                            </div>
                        ) : eventBreakdowns.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-1">No ticket data yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Ticket sales breakdown will appear here once you start selling
                                </p>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-semibold text-lg">Ticket Sales by Event</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {showAllBreakdown ? 'All events' : 'Active events'}
                                            </p>
                                        </div>
                                    </div>
                                    {(eventBreakdowns.filter(e => e.isActive).length > 2 || eventBreakdowns.some(e => !e.isActive)) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowAllBreakdown(!showAllBreakdown)}
                                            className="text-violet-600 hover:text-violet-700 dark:text-violet-400"
                                        >
                                            {showAllBreakdown
                                                ? 'Show Less'
                                                : `See All (${eventBreakdowns.length} events)`
                                            }
                                            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showAllBreakdown ? 'rotate-180' : ''}`} />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid gap-4 grid-cols-1">
                                    {(showAllBreakdown ? eventBreakdowns : eventBreakdowns.filter(e => e.isActive).slice(0, 4)).map((event, eventIndex) => (
                                        <motion.div
                                            key={event.eventId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.01 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Card
                                                className={`bg-gradient-to-br ${event.isActive
                                                    ? 'from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-100 dark:border-violet-900'
                                                    : 'from-gray-50/50 to-slate-50/50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-200 dark:border-gray-800'
                                                    }`}
                                            >
                                                <CardContent className="pt-4 pb-4">
                                                    <div className="flex gap-4 mb-4">
                                                        <div className="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-muted flex items-center justify-center relative shadow-sm border border-border/10">
                                                            {event.bannerImageUrl ? (
                                                                <Image
                                                                    src={event.bannerImageUrl}
                                                                    alt={event.eventName}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            ) : (
                                                                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h4 className="font-semibold text-sm truncate">{event.eventName}</h4>
                                                                {!event.isActive && (
                                                                    <Badge variant="secondary" className="text-[10px] shrink-0">Past</Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {event.total.quantity} tickets • {formatCurrency(event.total.revenue, breakdownCurrency)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {event.tickets.map((ticket, ticketIndex) => {
                                                            const percentage = event.total.quantity > 0
                                                                ? (ticket.quantity / event.total.quantity) * 100
                                                                : 0;

                                                            const colorKey = ticketTypeColors[ticketIndex % ticketTypeColors.length];
                                                            const colorClass = progressColorMap[colorKey];

                                                            // Extract the solid color from the gradient class for the tooltip border/bg
                                                            // This is a bit of a hack since we're using tailwind classes
                                                            // improved approach: define explicit hex/tailwnd colors map
                                                            const tooltipStyles = {
                                                                primary: 'bg-violet-500 border-violet-500 text-white',
                                                                emerald: 'bg-emerald-500 border-emerald-500 text-white',
                                                                violet: 'bg-violet-500 border-violet-500 text-white',
                                                                amber: 'bg-amber-500 border-amber-500 text-white',
                                                                rose: 'bg-rose-500 border-rose-500 text-white',
                                                                sky: 'bg-sky-500 border-sky-500 text-white',
                                                                lime: 'bg-lime-500 border-lime-500 text-white',
                                                                fuchsia: 'bg-fuchsia-500 border-fuchsia-500 text-white',
                                                            }[colorKey] || 'bg-slate-800 border-slate-800 text-white';

                                                            return (
                                                                <div key={ticket.ticketTypeId || ticketIndex} className="space-y-1.5">
                                                                    <div className="flex items-center justify-between text-xs">
                                                                        <span className="font-medium truncate flex-1 mr-2">{ticket.name}</span>
                                                                        <div className="flex items-center gap-2 text-right shrink-0">
                                                                            <span className="text-muted-foreground">{ticket.quantity}</span>
                                                                            <span className="font-medium min-w-[60px]">
                                                                                {formatCurrency(ticket.revenue, breakdownCurrency)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <TooltipProvider>
                                                                        <Tooltip delayDuration={0}>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="h-4 bg-muted/50 rounded-full overflow-hidden cursor-pointer">
                                                                                    <motion.div
                                                                                        initial={{ width: 0 }}
                                                                                        animate={{ width: `${percentage}%` }}
                                                                                        whileHover={{ opacity: 0.8 }}
                                                                                        transition={{ delay: 0.3 + eventIndex * 0.1 + ticketIndex * 0.05, duration: 0.4 }}
                                                                                        className={`h-full rounded-full ${event.isActive
                                                                                            ? colorClass
                                                                                            : 'bg-linear-to-r from-gray-400 to-slate-400'
                                                                                            }`}
                                                                                    />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent
                                                                                showArrow={false}
                                                                                side="top"
                                                                                className={`border-2 ${event.isActive ? tooltipStyles : 'bg-gray-500 border-gray-500 text-white'}`}
                                                                            >
                                                                                <p className="font-medium">{ticket.name}</p>
                                                                                <p className="text-xs opacity-90">
                                                                                    {ticket.quantity} sold ({percentage.toFixed(1)}%)
                                                                                </p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Orders Tab Content */}
                {pageTab === 'orders' && (
                    <>
                        {/* Filters & Search with gradient background */}
                        <Card className="mb-6 bg-linear-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20 border-indigo-100/50 dark:border-indigo-900/50">
                            <CardContent className="py-4">
                                <div className="flex flex-col gap-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by order ID, name, or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 h-10 bg-background/80 backdrop-blur"
                                        />
                                        {searchQuery && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[150px] h-10 bg-background/80 backdrop-blur">
                                                <Filter className="h-4 w-4 mr-2" />
                                                <SelectValue placeholder="Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="completed">Paid</SelectItem>
                                                <SelectItem value="refunded">Refunded</SelectItem>
                                                <SelectItem value="partially_refunded">Partial Refund</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Event Filter Dropdown */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Ticket className="h-4 w-4 mr-2" />
                                                    Events {eventFilter.length > 0 && `(${eventFilter.length})`}
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-56">
                                                <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                                                    {/* All Events Option */}
                                                    <div
                                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer border-b pb-2 mb-2"
                                                        onClick={() => setEventFilter([])}
                                                    >
                                                        <Checkbox
                                                            id="filter-event-all"
                                                            checked={eventFilter.length === 0}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                        <Label
                                                            htmlFor="filter-event-all"
                                                            className="flex-1 cursor-pointer font-medium text-sm"
                                                        >
                                                            All Events
                                                        </Label>
                                                    </div>

                                                    {Array.from(new Set(orders.map(o => ({ id: o.event.id, name: o.event.name }))))
                                                        .filter((event, index, self) =>
                                                            index === self.findIndex(e => e.id === event.id)
                                                        )
                                                        .map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted rounded cursor-pointer"
                                                                onClick={() => {
                                                                    if (eventFilter.includes(event.id)) {
                                                                        setEventFilter(eventFilter.filter(id => id !== event.id));
                                                                    } else {
                                                                        setEventFilter([...eventFilter, event.id]);
                                                                    }
                                                                }}
                                                            >
                                                                <Checkbox
                                                                    id={`filter-event-${event.id}`}
                                                                    checked={eventFilter.includes(event.id)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <Label
                                                                    htmlFor={`filter-event-${event.id}`}
                                                                    className="flex-1 cursor-pointer font-normal text-sm"
                                                                >
                                                                    {event.name || "Unnamed Event"}
                                                                </Label>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 bg-background/80 backdrop-blur">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Export
                                                    <ChevronDown className="h-4 w-4 ml-2" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('attendees')}>
                                                    <Users className="mr-2 h-4 w-4" />
                                                    Attendee List
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenExportModal('emails')}>
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Email List
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Event Filter Chips */}
                        {eventFilter.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {eventFilter.map(eventId => {
                                    const event = orders.find(o => o.event.id === eventId)?.event;
                                    return (
                                        <Badge
                                            key={eventId}
                                            variant="secondary"
                                            className="px-3 py-1.5 cursor-pointer hover:bg-secondary/80"
                                            onClick={() => setEventFilter(eventFilter.filter(id => id !== eventId))}
                                        >
                                            {event?.name || "Event"}
                                            <X className="h-3 w-3 ml-1.5" />
                                        </Badge>
                                    );
                                })}
                                {eventFilter.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => setEventFilter([])}
                                    >
                                        Clear all
                                    </Button>
                                )}
                            </div>
                        )}


                        {/* Orders Grid */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-32">
                                <div className="text-center">
                                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                                    <p className="text-muted-foreground">Loading orders...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <Card className="p-12 text-center">
                                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">{error}</p>
                            </Card>
                        ) : filteredOrders.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-lg font-medium mb-1">No orders found</p>
                                <p className="text-sm text-muted-foreground">
                                    {searchQuery || statusFilter !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'Orders will appear here once customers make purchases'}
                                </p>
                            </Card>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredOrders.map((order, index) => (
                                        <motion.div
                                            key={order.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: index * 0.05, duration: 0.2 }}
                                        >
                                            <OrderCard
                                                order={order}
                                                onViewDetails={openOrderDetails}
                                                onResendEmail={handleResendEmail}
                                                onRefund={(order) => {
                                                    setSelectedOrder(order);
                                                    setActiveTab('refund');
                                                    setRefundType('full');
                                                    setPartialAmount('');
                                                    setSelectedTicketIds(new Set());
                                                    setRefundError(null);
                                                    setIsDialogOpen(true);
                                                }}
                                                isResending={isResending}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}
                    </>
                )}

                {/* Order Details Dialog with Tabs */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-2rem)] sm:max-h-[85dvh] overflow-y-auto">
                        {selectedOrder && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                        <span className="font-mono text-sm">{selectedOrder.orderNumber.slice(0, 8)}...</span>
                                        <Badge className={`${statusBadges[selectedOrder.status]} capitalize`}>
                                            {statusLabels[selectedOrder.status]}
                                        </Badge>
                                    </DialogTitle>
                                </DialogHeader>

                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'refund')} className="mt-4">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="details">Details</TabsTrigger>
                                        <TabsTrigger
                                            value="refund"
                                            disabled={selectedOrder.status === 'refunded'}
                                        >
                                            Refund
                                        </TabsTrigger>
                                    </TabsList>

                                    <motion.div
                                        layout
                                        className="overflow-hidden mt-4"
                                        transition={{ duration: 0.2, type: "tween", ease: "easeInOut" }}
                                    >
                                        {activeTab === 'details' ? (
                                            <motion.div
                                                layout
                                                key="details"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TabsContent value="details" forceMount className="mt-0 space-y-4 p-1">
                                                    {/* Customer */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <User className="h-4 w-4" /> Customer
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-semibold">{selectedOrder.attendee.name ?? 'Unnamed'}</p>
                                                            <p className="text-sm text-muted-foreground">{selectedOrder.attendee.email}</p>
                                                        </div>
                                                    </div>

                                                    {/* Event */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <Calendar className="h-4 w-4" /> Event
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-semibold">{selectedOrder.event.name ?? 'Unpublished'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Tickets */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <Ticket className="h-4 w-4" /> Tickets
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                                            {selectedOrder.items.map((item) => (
                                                                <div key={item.id} className="flex justify-between text-sm">
                                                                    <span>{item.quantity}x {item.name ?? 'Ticket'}</span>
                                                                    <span className="font-medium">
                                                                        {formatCurrency(getEffectiveUnitPrice(item) * item.quantity, selectedOrder.totals.currency)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <Separator />

                                                    {/* Total */}
                                                    <div className="flex justify-between font-semibold text-lg">
                                                        <span>Total</span>
                                                        <span>{formatCurrency(selectedOrder.totals.total, selectedOrder.totals.currency)}</span>
                                                    </div>

                                                    {/* Payment */}
                                                    <div>
                                                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4" /> Payment
                                                        </h4>
                                                        <div className="bg-muted/50 rounded-lg p-3">
                                                            <p className="font-medium">{selectedOrder.paymentMethod ?? 'Payment details unavailable'}</p>
                                                            <p className="text-xs text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleString('en-GB')}</p>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-3 pt-2">
                                                        <Button
                                                            variant="outline"
                                                            className="flex-1"
                                                            onClick={() => selectedOrder && handleResendEmail(selectedOrder.id)}
                                                            disabled={isResending}
                                                        >
                                                            <Mail className="h-4 w-4 mr-2" />
                                                            {isResending ? 'Sending...' : 'Resend Email'}
                                                        </Button>
                                                        {(selectedOrder.status === 'completed' || selectedOrder.status === 'partially_refunded') && (
                                                            <Button
                                                                variant="destructive"
                                                                className="flex-1"
                                                                onClick={() => setActiveTab('refund')}
                                                            >
                                                                <RefreshCw className="h-4 w-4 mr-2" /> Refund
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TabsContent>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                layout
                                                key="refund"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <TabsContent value="refund" forceMount className="mt-0 space-y-4 p-1">
                                                    {/* Refund Type Selection */}
                                                    <div className="space-y-3">
                                                        <Label>Refund Type</Label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(['full', 'partial', 'tickets'] as const).map((type) => (
                                                                <Button
                                                                    key={type}
                                                                    variant={refundType === type ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => setRefundType(type)}
                                                                    className="capitalize"
                                                                >
                                                                    {type === 'tickets' ? 'By Ticket' : type}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Full Refund */}
                                                    {refundType === 'full' && (
                                                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-muted-foreground">Full refund amount</p>
                                                            <p className="text-2xl font-bold">{formatCurrency(selectedOrder.totals.total, selectedOrder.totals.currency)}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">All tickets will be revoked</p>
                                                        </div>
                                                    )}

                                                    {/* Partial Amount */}
                                                    {refundType === 'partial' && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="amount">Refund Amount</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                                                    {selectedOrder.totals.currency === 'GBP' ? '£' : selectedOrder.totals.currency === 'EUR' ? '€' : '$'}
                                                                </span>
                                                                <Input
                                                                    id="amount"
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0.01"
                                                                    max={selectedOrder.totals.total}
                                                                    value={partialAmount}
                                                                    onChange={(e) => setPartialAmount(e.target.value)}
                                                                    className="pl-8"
                                                                    placeholder={`Max: ${selectedOrder.totals.total.toFixed(2)}`}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Tickets remain valid after partial refund</p>
                                                        </div>
                                                    )}

                                                    {/* Ticket Selection */}
                                                    {refundType === 'tickets' && (
                                                        <div className="space-y-3">
                                                            <Label>Select Tickets to Refund</Label>
                                                            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2">
                                                                {selectedOrder.items.flatMap((item) =>
                                                                    Array.from({ length: item.quantity }, (_, i) => {
                                                                        const ticketId = `${item.id}-${i}`;
                                                                        return (
                                                                            <div
                                                                                key={ticketId}
                                                                                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                                                                                onClick={() => {
                                                                                    setSelectedTicketIds((prev) => {
                                                                                        const next = new Set(prev);
                                                                                        if (next.has(ticketId)) next.delete(ticketId);
                                                                                        else next.add(ticketId);
                                                                                        return next;
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <Checkbox checked={selectedTicketIds.has(ticketId)} />
                                                                                    <span className="text-sm">{item.name || 'Ticket'}</span>
                                                                                </div>
                                                                                <span className="text-sm font-medium">
                                                                                    {formatCurrency(getEffectiveUnitPrice(item), selectedOrder.totals.currency)}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })
                                                                )}
                                                            </div>
                                                            {selectedTicketIds.size > 0 && (
                                                                <div className="flex justify-between text-sm font-medium">
                                                                    <span>{selectedTicketIds.size} ticket(s)</span>
                                                                    <span>
                                                                        {formatCurrency(
                                                                            selectedOrder.items.reduce((sum, item) => {
                                                                                const count = Array.from({ length: item.quantity }).filter((_, i) =>
                                                                                    selectedTicketIds.has(`${item.id}-${i}`)
                                                                                ).length;
                                                                                return sum + count * getEffectiveUnitPrice(item);
                                                                            }, 0),
                                                                            selectedOrder.totals.currency
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {refundError && (
                                                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                                                            {refundError}
                                                        </div>
                                                    )}

                                                    {/* Refund Button */}
                                                    <Button
                                                        variant="destructive"
                                                        className="w-full"
                                                        disabled={isProcessing || (refundType === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0))}
                                                        onClick={async () => {
                                                            setIsProcessing(true);
                                                            setRefundError(null);
                                                            try {
                                                                const body: { amount?: number } = {};
                                                                if (refundType === 'partial') {
                                                                    body.amount = parseFloat(partialAmount);
                                                                } else if (refundType === 'tickets') {
                                                                    body.amount = selectedOrder.items.reduce((sum, item) => {
                                                                        const count = Array.from({ length: item.quantity }).filter((_, i) =>
                                                                            selectedTicketIds.has(`${item.id}-${i}`)
                                                                        ).length;
                                                                        return sum + count * getEffectiveUnitPrice(item);
                                                                    }, 0);
                                                                }
                                                                await api.post(`/api/v1/orders/${selectedOrder.id}/refund`, body);
                                                                setOrders((prev) =>
                                                                    prev.map((o) =>
                                                                        o.id === selectedOrder.id
                                                                            ? { ...o, status: (refundType === 'full' ? 'refunded' : 'partially_refunded') as OrderStatus }
                                                                            : o
                                                                    )
                                                                );
                                                                setIsDialogOpen(false);
                                                            } catch (err) {
                                                                setRefundError(err instanceof Error ? err.message : 'Failed to process refund');
                                                            } finally {
                                                                setIsProcessing(false);
                                                            }
                                                        }}
                                                    >
                                                        {isProcessing ? 'Processing...' : `Process ${refundType === 'full' ? 'Full' : 'Partial'} Refund`}
                                                    </Button>
                                                </TabsContent>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </Tabs>
                            </>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Export Modal */}
                <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>
                                Export {exportType === 'attendees' ? 'Attendee List' : 'Email List'}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Event Selection */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base font-medium">Events</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="all-events"
                                            checked={includeAllEvents}
                                            onCheckedChange={(checked) => {
                                                setIncludeAllEvents(!!checked);
                                                if (checked) {
                                                    setSelectedEvents([]);
                                                }
                                            }}
                                        />
                                        <Label htmlFor="all-events" className="font-normal cursor-pointer">
                                            All Events
                                        </Label>
                                    </div>
                                </div>

                                {!includeAllEvents && (
                                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                        {/* Get unique events from orders */}
                                        {Array.from(new Set(orders.map(o => o.event.id)))
                                            .map(eventId => {
                                                const order = orders.find(o => o.event.id === eventId);
                                                if (!order) return null;

                                                return (
                                                    <div key={eventId} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`event-${eventId}`}
                                                            checked={selectedEvents.includes(eventId)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedEvents([...selectedEvents, eventId]);
                                                                } else {
                                                                    setSelectedEvents(selectedEvents.filter(id => id !== eventId));
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`event-${eventId}`}
                                                            className="font-normal cursor-pointer flex-1"
                                                        >
                                                            {order.event.name || 'Unnamed Event'}
                                                        </Label>
                                                    </div>
                                                );
                                            })
                                            .filter(Boolean)
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Date Range */}
                            <div className="space-y-3">
                                <Label className="text-base font-medium">Date Range (Optional)</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="start-date" className="text-sm text-muted-foreground">From</Label>
                                        <Input
                                            id="start-date"
                                            type="date"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="end-date" className="text-sm text-muted-foreground">To</Label>
                                        <Input
                                            id="end-date"
                                            type="date"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Current Filters Info */}
                            <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                <p className="font-medium mb-1">Current Filters Applied:</p>
                                <ul className="space-y-0.5 text-muted-foreground">
                                    <li>• Status: {statusFilter === 'all' ? 'All' : statusLabels[statusFilter as OrderStatus]}</li>
                                    {searchQuery && <li>• Search: &quot;{searchQuery}&quot;</li>}
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setExportModalOpen(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleExport}
                                disabled={isExporting || (!includeAllEvents && selectedEvents.length === 0)}
                            >
                                {isExporting ? (
                                    <>
                                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export CSV
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
