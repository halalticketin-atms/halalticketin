'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Ticket } from 'lucide-react';
import api from '@/lib/api';
import {
    clearStoredRefundIdempotencyKey,
    getStoredRefundIdempotencyKey,
    getTopUpUrlFromError,
    type RefundIdempotencyParams,
} from '@/lib/refunds';

interface TicketInfo {
    id: string;
    name: string | null;
    price: number;
}

interface RefundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orderTotal: number;
    currency: string;
    items: Array<{ id: string; name: string | null; quantity: number; unitPrice: number }>;
    tickets?: TicketInfo[];
    onRefundComplete: () => void;
}

const formatCurrency = (amount: number, currency: string) => {
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
    } catch {
        return `£${amount.toFixed(2)}`;
    }
};

export function RefundDialog({
    open,
    onOpenChange,
    orderId,
    orderTotal,
    currency,
    tickets = [],
    onRefundComplete,
}: RefundDialogProps) {
    const [refundType, setRefundType] = useState<'full' | 'partial' | 'tickets'>('full');
    const [partialAmount, setPartialAmount] = useState('');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canRefundByTicket = tickets.length > 0;
    const refundTypes: Array<'full' | 'partial' | 'tickets'> = canRefundByTicket
        ? ['full', 'partial', 'tickets']
        : ['full', 'partial'];

    useEffect(() => {
        if (!canRefundByTicket && refundType === 'tickets') {
            setRefundType('partial');
            setSelectedTicketIds(new Set());
        }
    }, [canRefundByTicket, refundType]);

    const selectedTotal = useMemo(() => {
        return tickets
            .filter((t) => selectedTicketIds.has(t.id))
            .reduce((sum, t) => sum + t.price, 0);
    }, [tickets, selectedTicketIds]);

    const refundAmount = useMemo(() => {
        switch (refundType) {
            case 'full':
                return orderTotal;
            case 'partial':
                return parseFloat(partialAmount) || 0;
            case 'tickets':
                return selectedTotal;
            default:
                return 0;
        }
    }, [refundType, orderTotal, partialAmount, selectedTotal]);

    const toggleTicket = (ticketId: string) => {
        setSelectedTicketIds((prev) => {
            const next = new Set(prev);
            if (next.has(ticketId)) {
                next.delete(ticketId);
            } else {
                next.add(ticketId);
            }
            return next;
        });
    };

    const handleRefund = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            const refundParams: RefundIdempotencyParams = {};

            if (refundType === 'partial') {
                const amount = parseFloat(partialAmount);
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Please enter a valid refund amount');
                }
                if (amount > orderTotal) {
                    throw new Error('Refund amount cannot exceed order total');
                }
                refundParams.amount = amount;
            } else if (refundType === 'tickets') {
                if (!canRefundByTicket) {
                    throw new Error('Ticket-level refunds require ticket IDs');
                }
                if (selectedTicketIds.size === 0) {
                    throw new Error('Please select at least one ticket to refund');
                }
                refundParams.ticketIds = tickets
                    .filter((ticket) => selectedTicketIds.has(ticket.id))
                    .map((ticket) => ticket.id);
            }

            const body: { amount?: number; ticketIds?: string[]; idempotencyKey: string } = {
                ...refundParams,
                idempotencyKey: getStoredRefundIdempotencyKey(orderId, refundParams),
            };

            await api.post(`/api/v1/orders/${orderId}/refund`, body);
            clearStoredRefundIdempotencyKey(orderId, refundParams);
            onRefundComplete();
            onOpenChange(false);
        } catch (err) {
            const topUpUrl = getTopUpUrlFromError(err);
            if (topUpUrl) {
                setError('This refund needs an organiser top-up before it can be completed.');
                window.open(topUpUrl, '_blank', 'noopener,noreferrer');
            } else {
                setError(err instanceof Error ? err.message : 'Failed to process refund');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        if (!isProcessing) {
            setRefundType('full');
            setPartialAmount('');
            setSelectedTicketIds(new Set());
            setError(null);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Issue Refund
                    </DialogTitle>
                    <DialogDescription>
                        Choose how you want to refund this order. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Refund Type Selection */}
                    <div className="space-y-3">
                        <Label>Refund Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {refundTypes.map((type) => (
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
                            <p className="text-2xl font-bold">{formatCurrency(orderTotal, currency)}</p>
                            <p className="text-xs text-muted-foreground mt-1">All tickets will be revoked</p>
                        </div>
                    )}

                    {/* Partial Amount */}
                    {refundType === 'partial' && (
                        <div className="space-y-2">
                            <Label htmlFor="amount">Refund Amount</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    {currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}
                                </span>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={orderTotal}
                                    value={partialAmount}
                                    onChange={(e) => setPartialAmount(e.target.value)}
                                    className="pl-8"
                                    placeholder={`Max: ${orderTotal.toFixed(2)}`}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Tickets will remain valid after partial refund
                            </p>
                        </div>
                    )}

                    {/* Ticket Selection */}
                    {refundType === 'tickets' && (
                        <div className="space-y-3">
                            <Label>Select Tickets to Refund</Label>
                            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                                {tickets.map((ticket) => (
                                    <div
                                        key={ticket.id}
                                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                                        onClick={() => toggleTicket(ticket.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={selectedTicketIds.has(ticket.id)}
                                                onCheckedChange={() => toggleTicket(ticket.id)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Ticket className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{ticket.name || 'Ticket'}</span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium">
                                            {formatCurrency(ticket.price, currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {selectedTicketIds.size > 0 && (
                                <div className="flex justify-between text-sm font-medium">
                                    <span>{selectedTicketIds.size} ticket(s) selected</span>
                                    <span>{formatCurrency(selectedTotal, currency)}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRefund}
                        disabled={isProcessing || refundAmount <= 0}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            `Refund ${formatCurrency(refundAmount, currency)}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
