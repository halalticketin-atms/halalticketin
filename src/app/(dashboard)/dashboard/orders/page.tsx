'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    Filter,
    Download,
    ChevronDown,
    MoreHorizontal,
    Mail,
    RefreshCw,
    Eye,
    Receipt,
    CreditCard,
    Calendar,
    User,
    Ticket,
    X,
    Check,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';

// Mock data
interface Order {
    id: string;
    orderNumber: string;
    createdAt: string;
    attendee: {
        name: string;
        email: string;
        phone?: string;
    };
    event: {
        id: string;
        name: string;
    };
    tickets: {
        type: string;
        quantity: number;
        unitPrice: number;
    }[];
    subtotal: number;
    fees: number;
    total: number;
    status: 'paid' | 'pending' | 'refunded' | 'cancelled';
    paymentMethod: string;
}

const mockOrders: Order[] = [
    {
        id: '1',
        orderNumber: 'ORD-2024-001',
        createdAt: '2024-12-05T14:30:00Z',
        attendee: { name: 'Ahmed Hassan', email: 'ahmed@example.com', phone: '+44 7123 456789' },
        event: { id: '1', name: 'Halal Food Festival 2024' },
        tickets: [{ type: 'VIP Pass', quantity: 2, unitPrice: 45 }],
        subtotal: 90,
        fees: 4.50,
        total: 94.50,
        status: 'paid',
        paymentMethod: 'Visa •••• 4242',
    },
    {
        id: '2',
        orderNumber: 'ORD-2024-002',
        createdAt: '2024-12-04T10:15:00Z',
        attendee: { name: 'Fatima Khan', email: 'fatima.k@example.com' },
        event: { id: '1', name: 'Halal Food Festival 2024' },
        tickets: [
            { type: 'General Admission', quantity: 4, unitPrice: 15 },
            { type: 'Kids Ticket', quantity: 2, unitPrice: 5 },
        ],
        subtotal: 70,
        fees: 3.50,
        total: 73.50,
        status: 'paid',
        paymentMethod: 'Mastercard •••• 5555',
    },
    {
        id: '3',
        orderNumber: 'ORD-2024-003',
        createdAt: '2024-12-03T16:45:00Z',
        attendee: { name: 'Omar Ali', email: 'omar.ali@example.com' },
        event: { id: '2', name: 'Islamic Art Exhibition' },
        tickets: [{ type: 'Standard Entry', quantity: 1, unitPrice: 25 }],
        subtotal: 25,
        fees: 1.25,
        total: 26.25,
        status: 'refunded',
        paymentMethod: 'Visa •••• 1234',
    },
    {
        id: '4',
        orderNumber: 'ORD-2024-004',
        createdAt: '2024-12-02T09:00:00Z',
        attendee: { name: 'Aisha Mohammed', email: 'aisha.m@example.com' },
        event: { id: '1', name: 'Halal Food Festival 2024' },
        tickets: [{ type: 'Family Pack', quantity: 1, unitPrice: 50 }],
        subtotal: 50,
        fees: 2.50,
        total: 52.50,
        status: 'pending',
        paymentMethod: 'Bank Transfer',
    },
];

const statusColors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    refunded: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function OrdersPage() {
    const [orders] = useState<Order[]>(mockOrders);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.attendee.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openOrderDetails = (order: Order) => {
        setSelectedOrder(order);
        setIsDrawerOpen(true);
    };

    const totalRevenue = orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.total, 0);

    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === 'paid').length;

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
                                    <p className="text-2xl font-bold">£{totalRevenue.toFixed(2)}</p>
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
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="refunded">Refunded</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
                                {filteredOrders.length === 0 ? (
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
                                                    <p className="font-medium">{order.attendee.name}</p>
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
                                                <span className="font-semibold">£{order.total.toFixed(2)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${statusColors[order.status]} capitalize`}>
                                                    {order.status}
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
                                                        {order.status === 'paid' && (
                                                            <DropdownMenuItem className="text-destructive">
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

            {/* Order Details Drawer */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    {selectedOrder && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-3">
                                    <span className="font-mono">{selectedOrder.orderNumber}</span>
                                    <Badge className={`${statusColors[selectedOrder.status]} capitalize`}>
                                        {selectedOrder.status}
                                    </Badge>
                                </SheetTitle>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Customer Info */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Customer
                                    </h4>
                                    <div className="bg-muted/50 rounded-xl p-4">
                                        <p className="font-semibold">{selectedOrder.attendee.name}</p>
                                        <p className="text-sm text-muted-foreground">{selectedOrder.attendee.email}</p>
                                        {selectedOrder.attendee.phone && (
                                            <p className="text-sm text-muted-foreground">{selectedOrder.attendee.phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Event */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Event
                                    </h4>
                                    <div className="bg-muted/50 rounded-xl p-4">
                                        <p className="font-semibold">{selectedOrder.event.name}</p>
                                    </div>
                                </div>

                                {/* Tickets */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <Ticket className="h-4 w-4" />
                                        Tickets
                                    </h4>
                                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                                        {selectedOrder.tickets.map((ticket, i) => (
                                            <div key={i} className="flex justify-between">
                                                <span>
                                                    {ticket.quantity}x {ticket.type}
                                                </span>
                                                <span className="font-medium">
                                                    £{(ticket.unitPrice * ticket.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Separator />

                                {/* Payment Summary */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span>£{selectedOrder.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Fees</span>
                                        <span>£{selectedOrder.fees.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                                        <span>Total</span>
                                        <span>£{selectedOrder.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Payment
                                    </h4>
                                    <div className="bg-muted/50 rounded-xl p-4">
                                        <p className="font-medium">{selectedOrder.paymentMethod}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(selectedOrder.createdAt).toLocaleString('en-GB')}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="flex-1">
                                        <Mail className="h-4 w-4 mr-2" />
                                        Resend Email
                                    </Button>
                                    {selectedOrder.status === 'paid' && (
                                        <Button variant="destructive" className="flex-1">
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refund
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
