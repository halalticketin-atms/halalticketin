'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { PAYG_FEE_GBP, CHARITY_FEE_GBP } from '@/lib/fees';


interface FeeBreakdownProps {
    ticketPrice: number;
    ticketCount: number;
    currency?: string;
    feeTier?: 'payg' | 'token' | 'charity';
    absorbFee: boolean;
    onAbsorbFeeChange: (value: boolean) => void;
    customBookingFee?: number;
}

export function FeeBreakdown({
    ticketPrice,
    ticketCount,
    currency = 'GBP',
    feeTier = 'payg',
    absorbFee,
    onAbsorbFeeChange,
    customBookingFee
}: FeeBreakdownProps) {
    const breakdown = useMemo(() => {
        const subtotal = ticketPrice * ticketCount;

        // Calculate fee based on tier
        let feePerTicket: number;
        if (feeTier === 'token' && customBookingFee !== undefined) {
            feePerTicket = customBookingFee;
        } else if (feeTier === 'charity') {
            feePerTicket = CHARITY_FEE_GBP;
        } else {
            feePerTicket = PAYG_FEE_GBP;
        }

        const platformFee = feePerTicket * ticketCount;

        // What customer pays
        const customerPays = absorbFee ? subtotal : subtotal + platformFee;

        // What organizer receives
        const organizerReceives = subtotal - platformFee;

        return {
            subtotal,
            platformFee,
            customerPays,
            organizerReceives,
            feePerTicket
        };
    }, [ticketPrice, ticketCount, feeTier, absorbFee, customBookingFee]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    // Don't show for free tickets
    if (ticketPrice === 0) {
        return null;
    }

    return (
        <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 space-y-4">
                {/* Fee Toggle */}
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="absorb-fee" className="text-sm font-medium cursor-pointer">
                            Absorb platform fee
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {absorbFee
                                ? 'You pay the fee – customers see the ticket price only'
                                : 'Customers pay the fee on top of ticket price'
                            }
                        </p>
                    </div>
                    <Switch
                        id="absorb-fee"
                        checked={absorbFee}
                        onCheckedChange={onAbsorbFeeChange}
                    />
                </div>

                {/* Fee Breakdown Table */}
                <div className="space-y-2 pt-2 border-t">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ticket price × {ticketCount}</span>
                        <span>{formatCurrency(breakdown.subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                            Platform fee
                            <span className="text-xs">({formatCurrency(breakdown.feePerTicket)}/ticket)</span>
                        </span>
                        <span className={absorbFee ? 'text-destructive' : ''}>
                            {absorbFee ? '-' : '+'}{formatCurrency(breakdown.platformFee)}
                        </span>
                    </div>

                    <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-medium">
                            <span>Customer pays</span>
                            <span className="text-lg">{formatCurrency(breakdown.customerPays)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                            <span>You receive</span>
                            <span>{formatCurrency(breakdown.organizerReceives)}</span>
                        </div>
                    </div>
                </div>

                {/* Info Note */}
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-background/50 rounded-lg p-3">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                        {feeTier === 'charity'
                            ? `Charity rate: £${CHARITY_FEE_GBP.toFixed(2)} per ticket (requires verified charity status)`
                            : feeTier === 'token'
                                ? 'Using your purchased credits for reduced fees'
                                : `Standard rate: £${PAYG_FEE_GBP.toFixed(2)} per ticket. Buy credits to reduce fees.`
                        }
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
