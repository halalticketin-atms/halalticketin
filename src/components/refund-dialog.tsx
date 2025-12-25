'use client';

import { useState, useMemo } from 'react';
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

interface TicketInfo {
    id: string;
    name: string | null;
    price: number;
    selected: boolean;
}

interface RefundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    orderTotal: number;
    currency: string;
    items: Array<{ id: string; name: string | null; quantity: number; unitPrice: number }>;
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
    items,
    onRefundComplete,
}: RefundDialogProps) {
    const [refundType, setRefundType] = useState<'full' | 'partial' | 'tickets'>('full');
    const [partialAmount, setPartialAmount] = useState('');
    const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Flatten items to individual tickets for selection
    const tickets: TicketInfo[] = useMemo(() => {
        const result: TicketInfo[] = [];
        items.forEach((item) => {
            for (let i = 0; i < item.quantity; i++) {
                result.push({
                    id: `${item.id}-${i}`,
                    name: item.name,
                    price: item.unitPrice,
                    selected: selectedTicketIds.has(`${item.id}-${i}`),
                });
            }
        });
        return result;
    }, [items, selectedTicketIds]);

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
            const body: { amount?: number; ticketIds?: string[] } = {};

            if (refundType === 'partial') {
                const amount = parseFloat(partialAmount);
                if (isNaN(amount) || amount <= 0) {
                    throw new Error('Please enter a valid refund amount');
                }
                if (amount > orderTotal) {
                    throw new Error('Refund amount cannot exceed order total');
                }
                body.amount = amount;
            } else if (refundType === 'tickets') {
                if (selectedTicketIds.size === 0) {
                    throw new Error('Please select at least one ticket to refund');
                }
                body.amount = selectedTotal;
                // Note: ticketIds would be actual database IDs in production
                // For now, we just use the amount approach
            }

            await api.post(`/orders/${orderId}/refund`, body);
            onRefundComplete();
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process refund');
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
            <DialogContent className="sm:max-w-md">
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
