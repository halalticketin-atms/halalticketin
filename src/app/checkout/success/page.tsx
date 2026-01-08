'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Check, CheckCircle, Calendar, Loader2, Download, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetaPixel } from '@/hooks/useMetaPixel';
import { QRCodeCanvas } from 'qrcode.react';
import { getBackendErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

interface TicketInfo {
    id: string;
    ticketCode: string;
    ticketType: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
}

interface OrderStatus {
    orderId: string;
    status: string;
    isPending?: boolean;
    totalAmount: number;
    currency: string;
    organizerId: string;
    eventId: string;
    metaPixelId: string | null;
    tickets?: TicketInfo[];
}

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const orderId = searchParams.get('order_id');

    const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pollCount, setPollCount] = useState(0);
    const { track, canTrack } = useMetaPixel();
    const purchaseTrackedRef = useRef(false);
    const purchaseEventIdRef = useRef<string | null>(null);

    // Fetch order status with polling for pending orders
    useEffect(() => {
        const fetchOrderStatus = async () => {
            const id = orderId || sessionId;

            if (!id) {
                setLoading(false);
                return;
            }

            try {
                if (orderId) {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/${orderId}/status`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        setOrderStatus(data);

                        const pending = data.isPending ?? data.status === 'pending';
                        // If pending and haven't polled too many times, poll again
                        if (pending && pollCount < 10) {
                            setTimeout(() => setPollCount(c => c + 1), 2000);
                        }
                    } else {
                        const errorData = await response.json().catch(() => null);
                        setError(getBackendErrorMessage(errorData, 'Failed to load order details'));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch order status:', err);
                setError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderStatus();
    }, [orderId, sessionId, pollCount]);

    // Meta Pixel tracking
    useEffect(() => {
        if (!orderStatus) {
            return;
        }
        const pending = orderStatus.isPending ?? orderStatus.status === 'pending';
        if (orderStatus.status !== 'completed' || pending || !orderStatus.metaPixelId || !canTrack) {
            return;
        }

        const storageKey = orderStatus.orderId ? `ht_purchase_tracked:${orderStatus.orderId}` : null;

        if (typeof window !== 'undefined' && storageKey) {
            try {
                const alreadyTracked = window.localStorage.getItem(storageKey) === '1';
                if (alreadyTracked) {
                    purchaseTrackedRef.current = true;
                    return;
                }
            } catch {
                // Ignore storage errors
            }
        }

        if (purchaseTrackedRef.current) {
            return;
        }

        if (!purchaseEventIdRef.current && typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            purchaseEventIdRef.current = crypto.randomUUID();
        }

        const purchasePayload: Record<string, unknown> = {
            value: Number(orderStatus.totalAmount.toFixed(2)),
            currency: orderStatus.currency,
            content_type: 'product',
            num_items: orderStatus.tickets?.length ?? undefined
        };

        if (orderStatus.eventId) {
            purchasePayload.content_ids = [orderStatus.eventId];
        }

        const eventOptions = purchaseEventIdRef.current ? { eventId: purchaseEventIdRef.current } : undefined;

        track(orderStatus.metaPixelId, 'Purchase', purchasePayload, eventOptions);
        purchaseTrackedRef.current = true;

        // Clear checkout draft for this event
        if (orderStatus.eventId && typeof sessionStorage !== 'undefined') {
            try {
                sessionStorage.removeItem(`checkout_draft_${orderStatus.eventId}`);
            } catch {
                // Ignore storage errors
            }
        }

        if (typeof window !== 'undefined' && storageKey) {
            try {
                window.localStorage.setItem(storageKey, '1');
            } catch {
                // Ignore storage errors
            }
        }
    }, [canTrack, orderStatus, track]);

    const downloadQRCode = (ticketId: string, ticketCode: string) => {
        const canvas = document.getElementById(`qr-code-${ticketId}`) as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `ticket-${ticketCode}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        try {
            return new Intl.NumberFormat('en-IE', {
                style: 'currency',
                currency: currency.toUpperCase()
            }).format(amount);
        } catch {
            return `${currency} ${amount.toFixed(2)}`;
        }
    };

    // Step indicator component
    const StepIndicator = ({ currentStep }: { currentStep: number }) => {
        const steps = ['Information', 'Payment', 'Complete'];
        return (
            <div className="flex items-center justify-between mb-6">
                {steps.map((label, idx) => {
                    const stepNum = idx + 1;
                    const isActive = stepNum === currentStep;
                    const isCompleted = stepNum < currentStep;

                    return (
                        <div key={label} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2",
                                (isActive || isCompleted)
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-transparent border-muted-foreground/30 text-muted-foreground"
                            )}>
                                {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                            </div>
                            <span className={cn(
                                "text-xs font-medium transition-colors duration-300",
                                (isActive || isCompleted) ? "text-primary" : "text-muted-foreground"
                            )}>{label}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Processing your order...</p>
                </div>
            </div>
        );
    }

    const isPending = orderStatus ? (orderStatus.isPending ?? orderStatus.status === 'pending') : false;
    const isCompleted = orderStatus?.status === 'completed' && !isPending;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
            <div className="sm:max-w-[850px] w-[95vw] mx-auto">
                <div className="bg-card flex flex-col md:flex-row h-auto md:h-[540px] rounded-3xl overflow-hidden max-h-[calc(100dvh-2rem)] shadow-2xl border border-primary/10">

                    {/* LEFT PANEL: Success Message & Actions */}
                    <div className="w-full md:w-[320px] bg-primary/5 border-r border-border/50 p-6 flex flex-col relative overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

                        {/* Header */}
                        <div className="mb-6 relative z-10">
                            <Link href="/" className="inline-block relative h-8 w-24 mb-4 opacity-90 hover:opacity-100 transition-opacity">
                                <Image
                                    src="/images/HTlogocr.png"
                                    alt="Halal Ticketin"
                                    fill
                                    className="object-contain object-left"
                                />
                            </Link>
                        </div>

                        {/* Status Content */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                            {isCompleted && (
                                <>
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                        <CheckCircle className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Payment Successful!
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        Your tickets are ready.
                                    </p>
                                </>
                            )}

                            {isPending && (
                                <>
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-4">
                                        <Clock className="w-12 h-12 text-amber-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Processing...
                                    </h2>
                                    <p className="text-muted-foreground text-sm mb-4">
                                        Confirming your payment.
                                    </p>
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </>
                            )}

                            {error && (
                                <>
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
                                        <AlertCircle className="w-12 h-12 text-red-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Something went wrong
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        {error}
                                    </p>
                                </>
                            )}

                            {!orderStatus && !error && (
                                <>
                                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                        <CheckCircle className="w-12 h-12 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">
                                        Payment Processed
                                    </h2>
                                    <p className="text-muted-foreground text-sm">
                                        Confirmation email coming soon.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Total Footer */}
                        {orderStatus && (
                            <div className="mt-6 pt-4 border-t border-primary/10 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Paid</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(orderStatus.totalAmount, orderStatus.currency)}
                                    </span>
                                </div>
                                {orderStatus.orderId && (
                                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                                        Order #{orderStatus.orderId.slice(0, 8)}
                                    </p>
                                )}
                            </div>
                        )}

                    </div>

                    {/* RIGHT PANEL: Order Summary & Tickets */}
                    <div className="flex-1 flex flex-col bg-card relative p-6 md:p-8 overflow-hidden">
                        {/* Step Indicators */}
                        <StepIndicator currentStep={3} />

                        {/* Header */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">
                                Your Tickets
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Download your QR codes to present at the event
                            </p>
                        </div>

                        {/* Tickets with QR Codes - Scrollable */}
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                            {isCompleted && orderStatus?.tickets && orderStatus.tickets.length > 0 && (
                                <div className="space-y-3">
                                    {orderStatus.tickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            className="p-4 bg-muted/30 rounded-xl flex items-center justify-between group border border-border/50 hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground">{ticket.ticketType}</p>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {ticket.attendeeName || 'Guest'}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    {ticket.ticketCode}
                                                </p>
                                            </div>

                                            {/* Hidden QR Code Canvas */}
                                            <div style={{ display: 'none' }}>
                                                <QRCodeCanvas
                                                    id={`qr-code-${ticket.id}`}
                                                    value={ticket.ticketCode}
                                                    size={300}
                                                    level="H"
                                                    includeMargin
                                                />
                                            </div>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-4 shrink-0"
                                                onClick={() => downloadQRCode(ticket.id, ticket.ticketCode)}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                QR Code
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty state for pending/error */}
                            {!isCompleted && (
                                <div className="flex-1 flex items-center justify-center text-center py-12">
                                    <p className="text-muted-foreground text-sm">
                                        {isPending && 'Tickets will appear here once payment is confirmed...'}
                                        {error && 'Unable to load tickets'}
                                        {!orderStatus && !error && 'Loading tickets...'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border/30">
                            <Button asChild variant="outline" className="flex-1">
                                <Link href="/events">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Browse More Events
                                </Link>
                            </Button>
                            <Button asChild className="flex-1">
                                <Link href="/">
                                    Back to Home
                                </Link>
                            </Button>
                        </div>

                        {/* Help text */}
                        <p className="text-center text-xs text-muted-foreground mt-4">
                            Need help?{' '}
                            <Link href="/contact" className="text-primary hover:underline">
                                Contact us
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
