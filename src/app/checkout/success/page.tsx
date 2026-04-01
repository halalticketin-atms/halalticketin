'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    Check,
    CheckCircle,
    Calendar,
    Loader2,
    Download,
    AlertCircle,
    Clock,
    Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetaPixel } from '@/hooks/useMetaPixel';
import { useMarketingConsentRequirement } from '@/hooks/useMarketingConsentRequirement';
import { QRCodeCanvas } from 'qrcode.react';
import { getBackendErrorMessage } from '@/lib/api-errors';
import { copyShareUrl } from '@/lib/share';
import { cn } from '@/lib/utils';

interface TicketInfo {
    id: string;
    ticketCode: string;
    ticketType: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
    giftStatus?: 'pending_claim' | 'claimed' | 'expired' | null;
    giftClaimUrl?: string | null;
}

interface OrderStatus {
    orderId: string;
    status: string;
    isPending?: boolean;
    totalAmount: number;
    currency: string;
    organizerId: string;
    eventId: string;
    organizerName: string | null;
    organizerContactEmail: string | null;
    metaPixelId: string | null;
    metaEventId?: string | null;
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

    useMarketingConsentRequirement(Boolean(orderStatus?.metaPixelId));

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

        if (!purchaseEventIdRef.current) {
            purchaseEventIdRef.current = orderStatus.metaEventId ?? null;
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
                if (orderStatus.orderId) {
                    sessionStorage.removeItem(`checkout_email_${orderStatus.orderId}`);
                }
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

    const copyGiftClaimUrl = async (url: string) => {
        await copyShareUrl(url, 'Gift claim link copied');
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
    const giftTickets = orderStatus?.tickets?.filter((ticket) => Boolean(ticket.giftStatus)) ?? [];
    const ownedTickets = orderStatus?.tickets?.filter((ticket) => !ticket.giftStatus) ?? [];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:flex md:items-center md:justify-center md:p-8 dark:from-slate-900 dark:to-slate-800">
            <div className="sm:max-w-[850px] w-[95vw] mx-auto">
                <div className="bg-card flex flex-col rounded-3xl border border-primary/10 shadow-2xl md:max-h-[calc(100dvh-4rem)] md:flex-row md:overflow-hidden">

                    {/* LEFT PANEL: Success Message & Actions */}
                    <div className="relative flex w-full flex-col overflow-hidden border-b border-border/50 bg-primary/5 p-5 sm:p-6 md:w-[320px] md:border-b-0 md:border-r">
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
                        <div className="relative z-10 flex flex-col items-center justify-center py-3 text-center md:flex-1 md:py-0">
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
                    <div className="relative flex flex-1 flex-col bg-card p-5 sm:p-6 md:overflow-y-auto md:p-8">
                        {/* Step Indicators */}
                        <StepIndicator currentStep={3} />

                        {/* Header */}
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-foreground">
                                Ticket Summary
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Download your QR codes and manage any gifted tickets from this order
                            </p>
                        </div>

                        {/* Tickets with QR Codes - Scrollable */}
                        <div className="md:min-h-0 md:flex-1">
                            {isCompleted && giftTickets.length > 0 && (
                                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
                                    <p className="font-medium text-foreground">Gifted tickets</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Share each pending claim link with its recipient. Claimed gifts stay listed here so you can track their status.
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {giftTickets.map((ticket) => (
                                            <div
                                                key={`${ticket.id}-gift`}
                                                className="rounded-lg bg-background/80 p-3 text-sm"
                                            >
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground">{ticket.ticketType}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {ticket.attendeeName || ticket.attendeeEmail || 'Recipient details pending'}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                                            ticket.giftStatus === 'claimed'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                : ticket.giftStatus === 'expired'
                                                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                                                  : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                                                        )}
                                                    >
                                                        {ticket.giftStatus === 'claimed'
                                                            ? 'Claimed'
                                                            : ticket.giftStatus === 'expired'
                                                              ? 'Expired'
                                                              : 'Awaiting claim'}
                                                    </span>
                                                </div>

                                                {ticket.giftClaimUrl ? (
                                                    <div className="mt-3 rounded-lg border border-border/60 bg-background p-3">
                                                        <p className="break-all text-xs text-muted-foreground">
                                                            {ticket.giftClaimUrl}
                                                        </p>
                                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="sm:w-auto"
                                                                onClick={() => copyGiftClaimUrl(ticket.giftClaimUrl!)}
                                                            >
                                                                <Copy className="mr-2 h-4 w-4" />
                                                                Copy link
                                                            </Button>
                                                            <Button variant="ghost" size="sm" asChild className="sm:w-auto">
                                                                <a
                                                                    href={ticket.giftClaimUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    Open link
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="mt-3 text-xs text-muted-foreground">
                                                        {ticket.giftStatus === 'claimed'
                                                            ? 'This gifted ticket has already been claimed.'
                                                            : 'This gift link is no longer active.'}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isCompleted && ownedTickets.length > 0 && (
                                <div className="space-y-3">
                                    {ownedTickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:bg-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
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
                                                className="h-11 w-full shrink-0 border-primary/20 bg-background hover:bg-primary/5 sm:ml-4 sm:h-9 sm:w-auto"
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
                        <div className="mt-4 space-y-3 text-center">
                            {orderStatus?.organizerContactEmail ? (
                                <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm">
                                    <p className="font-medium text-foreground">Questions about this event?</p>
                                    <p className="mt-1 text-muted-foreground">
                                        Contact {orderStatus.organizerName || 'the organiser'}
                                    </p>
                                    <a
                                        href={`mailto:${orderStatus.organizerContactEmail}`}
                                        className="mt-2 inline-block text-primary hover:underline"
                                    >
                                        {orderStatus.organizerContactEmail}
                                    </a>
                                </div>
                            ) : null}
                            <p className="text-center text-xs text-muted-foreground">
                                Need help?{' '}
                                <Link href="/contact" className="text-primary hover:underline">
                                    Contact us
                                </Link>
                            </p>
                        </div>
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
