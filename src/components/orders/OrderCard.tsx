'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import {
    MoreHorizontal,
    Mail,
    RefreshCw,
    Eye,
    Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

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

interface OrderCardProps {
    order: OrderResponse;
    onViewDetails: (order: OrderResponse) => void;
    onResendEmail: (orderId: string) => void;
    onRefund: (order: OrderResponse) => void;
    isResending?: boolean;
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

const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

export function OrderCard({
    order,
    onViewDetails,
    onResendEmail,
    onRefund,
    isResending = false,
}: OrderCardProps) {
    const x = useMotionValue(0);
    const [isDragging, setIsDragging] = useState(false);

    // Transform x position to show/hide action buttons
    const leftActionOpacity = useTransform(x, [0, 100], [0, 1]);
    const rightActionOpacity = useTransform(x, [0, -100], [0, 1]);

    const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);
        const threshold = 80;

        if (info.offset.x > threshold) {
            // Swiped right - resend email
            onResendEmail(order.id);
        } else if (info.offset.x < -threshold && (order.status === 'completed' || order.status === 'partially_refunded')) {
            // Swiped left - refund
            onRefund(order);
        }

        // Reset position
        x.set(0);
    };

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Background action buttons (visible on swipe) */}
            <motion.div
                className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"
                style={{ zIndex: 0 }}
            >
                {/* Left action - Resend Email */}
                <motion.div
                    style={{ opacity: leftActionOpacity }}
                    className="flex items-center gap-2 text-primary font-medium"
                >
                    <Mail className="h-5 w-5" />
                    <span className="hidden sm:inline">Resend</span>
                </motion.div>

                {/* Right action - Refund */}
                {(order.status === 'completed' || order.status === 'partially_refunded') && (
                    <motion.div
                        style={{ opacity: rightActionOpacity }}
                        className="flex items-center gap-2 text-destructive font-medium"
                    >
                        <span className="hidden sm:inline">Refund</span>
                        <RefreshCw className="h-5 w-5" />
                    </motion.div>
                )}
            </motion.div>

            {/* Main card content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -150, right: 150 }}
                dragElastic={0.2}
                style={{ x, zIndex: 1 }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative md:cursor-default"
                onClick={() => !isDragging && onViewDetails(order)}
            >
                {/* Header: Order number and status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <Badge
                        variant="outline"
                        className="font-mono text-xs px-2.5 py-1 bg-muted/50"
                    >
                        {order.orderNumber.slice(0, 12)}...
                    </Badge>
                    <Badge className={`${statusBadges[order.status]} capitalize shrink-0`}>
                        {statusLabels[order.status]}
                    </Badge>
                </div>

                {/* Customer info */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {getInitials(order.attendee.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">
                            {order.attendee.name ?? 'Unnamed attendee'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {order.attendee.email}
                        </p>
                    </div>
                </div>

                {/* Event and date */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground truncate">
                            {order.event.name ?? 'Unpublished Event'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </span>
                        <span>•</span>
                        <span>
                            {new Date(order.createdAt).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </span>
                    </div>
                </div>

                {/* Footer: Price and actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                        <p className="text-xl font-bold">
                            {formatCurrency(order.totals.total, order.totals.currency)}
                        </p>
                    </div>

                    {/* Desktop action menu */}
                    <div className="hidden md:block" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onViewDetails(order)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onResendEmail(order.id)}
                                    disabled={isResending}
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {isResending ? 'Sending...' : 'Resend Confirmation'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {(order.status === 'completed' || order.status === 'partially_refunded') && (
                                    <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => onRefund(order)}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Issue Refund
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Mobile swipe hint (only visible first few times) */}
                <div className="md:hidden absolute bottom-2 right-2">
                    <div className="flex gap-1">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
