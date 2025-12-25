'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Mail,
    RefreshCw,
    Eye,
    Receipt,
    CreditCard,
    Calendar,
    User,
    Ticket,
    Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { useOrganizerFromParams } from '@/hooks/useOrganizerFromParams';

type OrderStatus = 'completed' | 'refunded' | 'partially_refunded';

interface OrderItem {
    id: string;
    name: string | null;
    quantity: number;
    unitPrice: number;
}

interface OrderResponse {
    id: string;
    orderNumber: string;
    createdAt: string;
    attendee: {
        name: string | null;
        email: string;
        phone?: string | null;
    };
    event: {
        id: string;
        name: string | null;
    };
    totals: {
        subtotal: number;
        total: number;
        currency: string;
    };
    status: OrderStatus;
    items: OrderItem[];
    paymentMethod?: string | null;
}

interface OrdersResponse {
    orders: OrderResponse[];
}

const statusBadges: Record<OrderStatus, string> = {
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    refunded: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    partially_refunded: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
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

export default function OrdersPage() {
    const organizerId = useOrganizerFromParams();
    const [orders, setOrders] = useState<OrderResponse[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
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

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.attendee.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.attendee.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
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
                if (order.status === 'completed') {
                    acc.paidOrders += 1;
                    acc.revenueTotal += order.totals.total;
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

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-3 mb-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Receipt className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                    <p className="text-2xl font-bold">{totalOrders}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Paid Orders</p>
                                    <p className="text-2xl font-bold">{paidOrders}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <CreditCard className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                                    <p className="text-2xl font-bold">
                                        {formatCurrency(revenueTotal, orders[0]?.totals.currency ?? 'GBP')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters & Search */}
                <Card className="mb-6">
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by order ID, name, or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-10">
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
                                <Button variant="outline" className="h-10">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead className="hidden md:table-cell">Event</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Loading orders...
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            {error}
                                        </TableCell>
                                    </TableRow>
                                ) : filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <div className="text-muted-foreground">
                                                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p>No orders found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <TableRow
                                            key={order.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => openOrderDetails(order)}
                                        >
                                            <TableCell>
                                                <span className="font-mono text-sm font-medium">
                                                    {order.orderNumber}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{order.attendee.name ?? 'Unnamed attendee'}</p>
                                                    <p className="text-xs text-muted-foreground">{order.attendee.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-sm">{order.event.name}</span>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-semibold">
                                                    {formatCurrency(order.totals.total, order.totals.currency)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusBadges[order.status]} capitalize`}>
                                                    {statusLabels[order.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openOrderDetails(order); }}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Mail className="mr-2 h-4 w-4" />
                                                            Resend Confirmation
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {(order.status === 'completed' || order.status === 'partially_refunded') && (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedOrder(order);
                                                                    setActiveTab('refund');
                                                                    setRefundType('full');
                                                                    setPartialAmount('');
                                                                    setSelectedTicketIds(new Set());
                                                                    setRefundError(null);
                                                                    setIsDialogOpen(true);
                                                                }}
                                                            >
                                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                                Issue Refund
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

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
                                                                    {formatCurrency(item.unitPrice * item.quantity, selectedOrder.totals.currency)}
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
                                                    <Button variant="outline" className="flex-1">
                                                        <Mail className="h-4 w-4 mr-2" /> Resend Email
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
                                                                                {formatCurrency(item.unitPrice, selectedOrder.totals.currency)}
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
                                                                            return sum + count * item.unitPrice;
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
                                                                    return sum + count * item.unitPrice;
                                                                }, 0);
                                                            }
                                                            await api.post(`/orders/${selectedOrder.id}/refund`, body);
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
        </div>
    );
}
