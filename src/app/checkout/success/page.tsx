'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Calendar, MapPin, Ticket, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMetaPixel } from '@/hooks/useMetaPixel';

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
    const { track, canTrack } = useMetaPixel();
    const purchaseTrackedRef = useRef(false);
    const purchaseEventIdRef = useRef<string | null>(null);

    useEffect(() => {
        const fetchOrderStatus = async () => {
            // Try to get order ID from URL or session
            const id = orderId || sessionId;

            if (!id) {
                setLoading(false);
                return;
            }

            try {
                // If we have an orderId, poll for status
                if (orderId) {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/orders/${orderId}/status`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        setOrderStatus(data);
                    }
                }
                // If only sessionId, the webhook will have processed it
                // We'd need to look up the order by session ID (not implemented yet)
            } catch (err) {
                console.error('Failed to fetch order status:', err);
                setError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderStatus();
    }, [orderId, sessionId]);

    useEffect(() => {
        if (!orderStatus || orderStatus.status !== 'completed' || !orderStatus.metaPixelId || !canTrack) {
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
                // Ignore storage errors (e.g., disabled cookies) and continue
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

        if (typeof window !== 'undefined' && storageKey) {
            try {
                window.localStorage.setItem(storageKey, '1');
            } catch {
                // Ignore storage errors
            }
        }
    }, [canTrack, orderStatus, track]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Processing your order...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
            <div className="max-w-2xl mx-auto px-4 py-16">
                {/* Success Icon */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Payment Successful!
                    </h1>
                    <p className="text-gray-600">
                        Thank you for your purchase. Your tickets are ready.
                    </p>
                </div>

                {/* Order Details */}
                {orderStatus && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b">
                            <div>
                                <p className="text-sm text-gray-500">Order ID</p>
                                <p className="font-mono text-sm">{orderStatus.orderId}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total Paid</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {orderStatus.currency} {orderStatus.totalAmount.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Tickets */}
                        {orderStatus.tickets && orderStatus.tickets.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Ticket className="w-5 h-5" />
                                    Your Tickets ({orderStatus.tickets.length})
                                </h3>
                                <div className="space-y-3">
                                    {orderStatus.tickets.map((ticket) => (
                                        <div
                                            key={ticket.id}
                                            className="p-4 bg-gray-50 rounded-xl"
                                        >
                                            <p className="font-medium text-gray-900">{ticket.ticketType}</p>
                                            <p className="text-sm text-gray-500 font-mono break-all">
                                                {ticket.ticketCode}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* No order data - still show success */}
                {!orderStatus && !error && (
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
                        <p className="text-gray-600 mb-4">
                            Your payment has been processed successfully.
                        </p>
                        <p className="text-sm text-gray-500">
                            You will receive a confirmation email with your tickets shortly.
                        </p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-6">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/events">
                            <Calendar className="w-5 h-5 mr-2" />
                            Browse More Events
                        </Link>
                    </Button>
                    <Button asChild size="lg">
                        <Link href="/">
                            <MapPin className="w-5 h-5 mr-2" />
                            Back to Home
                        </Link>
                    </Button>
                </div>

                {/* Help text */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    Need help? Contact us at{' '}
                    <a href="mailto:support@halalticketing.com" className="text-primary hover:underline">
                        support@halalticketing.com
                    </a>
                </p>
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
