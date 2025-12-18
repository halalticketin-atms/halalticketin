'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Calendar,
    Clock,
    MapPin,
    Globe,
    Users,
    Share2,
    Heart,
    Ticket,
    Loader2,
    AlertCircle,
    ArrowLeft,
    Plus,
    Minus,
    ShoppingCart,
    Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { useMetaPixel } from '@/hooks/useMetaPixel';
import { PublicTicketRecord } from '@/lib/events-api';
import { handleCheckout, CartItem, validatePromoCode, ValidatePromoResult } from '@/lib/checkout-api';
import { showError } from '@/lib/errors';
import { calculatePlatformFee, getCurrencySymbol, type FeeTier } from '@/lib/fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';

/**
 * Format a price for display.
 */
function formatPrice(price: string | null, currency: string): string {
    if (!price || price === '0' || price === '0.00') {
        return 'Free';
    }
    const num = parseFloat(price);
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;
    return `${symbol}${num.toFixed(2)}`;
}

/**
 * Ticket card component with quantity selection.
 */
function TicketCard({
    ticket,
    quantity,
    onQuantityChange
}: {
    ticket: PublicTicketRecord;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
}) {
    const price = formatPrice(ticket.price, ticket.currency);
    const isFree = ticket.type === 'free' || price === 'Free';
    const maxQty = ticket.maxQuantity || 10;

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex-1">
                <h4 className="font-medium">{ticket.name}</h4>
                {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                )}
                <p className={`font-semibold mt-1 ${isFree ? 'text-green-600' : 'text-primary'}`}>
                    {price}
                </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                    disabled={quantity === 0}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                    disabled={quantity >= maxQty}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default function EventDetailsPage() {
    const params = useParams();
    const slug = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const { event, tickets, isLoading, error } = usePublicEvent(slug ?? null);
    const { rates } = useExchangeRates();
    const { track } = useMetaPixel();
    const eventPixelId = event?.metaPixelId ?? null;

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeAge, setAttendeeAge] = useState('');
    const [attendeeGender, setAttendeeGender] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // Promo code state
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResult | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);

    // Calculate totals
    const cartItems = useMemo(() => {
        return tickets
            .filter(t => (ticketQuantities[t.id] || 0) > 0)
            .map(t => ({
                ticket: t,
                quantity: ticketQuantities[t.id] || 0,
                subtotal: (ticketQuantities[t.id] || 0) * parseFloat(t.price || '0')
            }));
    }, [tickets, ticketQuantities]);

    const totalAmount = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.subtotal, 0)
        , [cartItems]);

    const totalTickets = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.quantity, 0)
        , [cartItems]);

    const handleQuantityChange = (ticketId: string, quantity: number) => {
        setTicketQuantities(prev => ({
            ...prev,
            [ticketId]: quantity
        }));
        // Clear applied promo when quantities change
        setAppliedPromo(null);
        setPromoError(null);
    };

    const handleApplyPromo = async () => {
        if (!event || !promoCode.trim()) return;

        setIsValidatingPromo(true);
        setPromoError(null);

        const result = await validatePromoCode(event.id, promoCode.trim(), totalAmount);

        setIsValidatingPromo(false);

        if (result.valid) {
            setAppliedPromo(result);
            setPromoError(null);
        } else {
            setAppliedPromo(null);
            setPromoError(result.message || 'Invalid promo code');
        }
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setPromoCode('');
        setPromoError(null);
    };

    // Calculate final total after discount
    const discountAmount = appliedPromo?.discountAmount ? parseFloat(appliedPromo.discountAmount) : 0;
    const finalTotal = Math.max(0, totalAmount - discountAmount);
    const currencyCode = event?.currency || tickets[0]?.currency || 'GBP';
    const currencySymbol = getCurrencySymbol(currencyCode);

    useEffect(() => {
        if (!eventPixelId) {
            return;
        }

        const pageParams =
            typeof window !== 'undefined'
                ? {
                      page_path: window.location.pathname
                  }
                : undefined;

        track(eventPixelId, 'PageView', pageParams);

        const viewContentPayload: Record<string, unknown> = {
            currency: currencyCode,
            content_type: 'product'
        };
        if (event?.id) {
            viewContentPayload.content_ids = [event.id];
        }
        if (event?.title) {
            viewContentPayload.content_name = event.title;
        }

        track(eventPixelId, 'ViewContent', viewContentPayload);
    }, [eventPixelId, event?.id, event?.title, currencyCode, track]);

    const platformFeeAmount = useMemo(() => {
        if (!event || totalTickets === 0) {
            return 0;
        }

        const feeTier = (event.feeTier ?? 'payg') as FeeTier;
        const customBookingFee = event.customBookingFee ? parseFloat(event.customBookingFee) : undefined;

        const { totalFee } = calculatePlatformFee({
            feeTier,
            ticketCount: totalTickets,
            currency: currencyCode,
            customBookingFee,
            exchangeRates: rates
        });

        return event.absorbFee ? 0 : totalFee;
    }, [event, totalTickets, currencyCode, rates]);

    const grandTotal = finalTotal + platformFeeAmount;

    const handleProceedToCheckout = async () => {
        if (!event || !attendeeEmail || totalTickets === 0) return;

        setIsProcessing(true);
        setCheckoutError(null);

        const items: CartItem[] = cartItems.map(item => ({
            ticketTypeId: item.ticket.id,
            quantity: item.quantity
        }));

        if (eventPixelId && totalTickets > 0) {
            track(eventPixelId, 'InitiateCheckout', {
                value: Number(finalTotal.toFixed(2)),
                currency: currencyCode,
                num_items: totalTickets,
                content_ids: event?.id ? [event.id] : undefined,
                content_type: 'product'
            });
        }

        const result = await handleCheckout(event.id, {
            items,
            attendeeName,
            attendeeEmail,
            attendeeAge,
            attendeeGender,
            promoCode: appliedPromo?.code || promoCode.trim() || undefined,
        });

        if (!result.success) {
            const errorMessage = result.error || 'Checkout failed. Please try again.';
            setCheckoutError(errorMessage);
            showError(new Error(errorMessage));
            setIsProcessing(false);
            return;
        }

        // If free order, redirect to success
        if (result.isFreeOrder && result.orderId) {
            window.location.href = `/checkout/success?order_id=${result.orderId}`;
        }
        // Paid orders will redirect via the handleCheckout function
    };

    const startDatetime = event?.startDatetime ?? null;
    const endDatetime = event?.endDatetime ?? null;

    // Format event date/time
    const eventDateTime = useMemo(() => {
        if (!startDatetime) {
            return { date: 'Date TBD', time: '', endTime: '' };
        }
        const start = new Date(startDatetime);
        const end = endDatetime ? new Date(endDatetime) : null;

        const date = start.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const time = start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const endTime = end
            ? end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '';

        return { date, time, endTime };
    }, [startDatetime, endDatetime]);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading event details...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !event) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-2xl rounded-3xl border bg-background p-8 text-center shadow-lg"
                >
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h1 className="mt-3 font-display text-3xl font-bold">
                        Event not found
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {error || "This event doesn't exist or is no longer available."}
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Button asChild>
                            <Link href="/events">Browse Events</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/">Go Home</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Hero Section */}
            <div className="relative">
                {/* Banner Image */}
                <div className="relative h-64 sm:h-80 md:h-96 bg-muted">
                    {event.bannerImageUrl ? (
                        <Image
                            src={event.bannerImageUrl}
                            alt={event.title || 'Event'}
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Calendar className="h-16 w-16 text-primary/40" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Back Button */}
                    <div className="absolute top-4 left-4">
                        <Button variant="secondary" size="sm" asChild className="backdrop-blur-sm">
                            <Link href="/events">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Events
                            </Link>
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2">
                        <Button variant="secondary" size="icon" className="backdrop-blur-sm">
                            <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="secondary" size="icon" className="backdrop-blur-sm">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container py-8">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Title and Organizer */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="font-display text-3xl sm:text-4xl font-bold">
                                {event.title || 'Untitled Event'}
                            </h1>
                            {event.organizerName && (
                                <p className="mt-2 text-muted-foreground">
                                    Hosted by <span className="font-medium text-foreground">{event.organizerName}</span>
                                </p>
                            )}
                        </motion.div>

                        {/* Date, Time, Location Info */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-5 w-5 text-primary" />
                                <span>{eventDateTime.date}</span>
                            </div>
                            {eventDateTime.time && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-5 w-5 text-primary" />
                                    <span>
                                        {eventDateTime.time}
                                        {eventDateTime.endTime && ` - ${eventDateTime.endTime}`}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-muted-foreground">
                                {event.locationType === 'online' ? (
                                    <>
                                        <Globe className="h-5 w-5 text-primary" />
                                        <span>Online Event</span>
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="h-5 w-5 text-primary" />
                                        <span>
                                            {event.venue && `${event.venue}, `}
                                            {event.city || 'Location TBD'}
                                        </span>
                                    </>
                                )}
                            </div>
                        </motion.div>

                        <Separator />

                        {/* Description */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <h2 className="text-xl font-semibold mb-4">About this event</h2>
                            {event.description ? (
                                <div className="prose prose-neutral dark:prose-invert max-w-none">
                                    <p className="text-muted-foreground whitespace-pre-wrap">
                                        {event.description}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-muted-foreground italic">
                                    No description available for this event.
                                </p>
                            )}
                        </motion.div>

                        {/* Location Details */}
                        {event.locationType !== 'online' && (event.venue || event.address) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                            >
                                <h2 className="text-xl font-semibold mb-4">Location</h2>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                                            <div>
                                                {event.venue && (
                                                    <p className="font-medium">{event.venue}</p>
                                                )}
                                                {event.address && (
                                                    <p className="text-muted-foreground">{event.address}</p>
                                                )}
                                                {event.city && (
                                                    <p className="text-muted-foreground">
                                                        {event.city}{event.country && `, ${event.country}`}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </div>

                    {/* Sidebar - Tickets */}
                    <div className="lg:col-span-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="sticky top-8"
                        >
                            <Card className="overflow-hidden">
                                <CardHeader className="bg-primary/5">
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="h-5 w-5" />
                                        Tickets
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {tickets.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">
                                            No tickets available yet.
                                        </p>
                                    ) : (
                                        <>
                                            {tickets.map((ticket) => (
                                                <TicketCard
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                    quantity={ticketQuantities[ticket.id] || 0}
                                                    onQuantityChange={(qty) => handleQuantityChange(ticket.id, qty)}
                                                />
                                            ))}
                                        </>
                                    )}

                                    <Separator />

                                    {/* Promo Code Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="promoCodeInput" className="flex items-center gap-2 text-sm">
                                            <Tag className="h-4 w-4" />
                                            Promo Code
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="promoCodeInput"
                                                type="text"
                                                placeholder="Enter code"
                                                value={promoCode}
                                                onChange={(e) => {
                                                    setPromoCode(e.target.value.toUpperCase());
                                                    if (appliedPromo) {
                                                        setAppliedPromo(null);
                                                    }
                                                }}
                                                disabled={isValidatingPromo || !!appliedPromo}
                                                className="flex-1"
                                            />
                                            {appliedPromo ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleRemovePromo}
                                                >
                                                    Remove
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleApplyPromo}
                                                    disabled={!promoCode.trim() || isValidatingPromo || totalAmount === 0}
                                                >
                                                    {isValidatingPromo ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        'Apply'
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                        {promoError && (
                                            <p className="text-xs text-red-600">{promoError}</p>
                                        )}
                                        {appliedPromo && (
                                            <p className="text-xs text-green-600 flex items-center gap-1">
                                                ✓ Code applied: {appliedPromo.discountType === 'percentage'
                                                    ? `${appliedPromo.discountValue}% off`
                                                    : `${currencySymbol}${appliedPromo.discountValue} off`}
                                            </p>
                                        )}
                                    </div>

                                    {totalTickets > 0 && (
                                        <div className="space-y-2 bg-primary/5 p-3 rounded-lg">
                                            <div className="flex justify-between text-sm">
                                                <span>{totalTickets} ticket{totalTickets > 1 ? 's' : ''}</span>
                                                <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
                                            </div>
                                            {appliedPromo && discountAmount > 0 && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Discount ({appliedPromo.code})</span>
                                                    <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {platformFeeAmount > 0 && (
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>Service fee</span>
                                                    <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between font-semibold">
                                                <span>Total</span>
                                                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                                            </div>
                                            {event?.absorbFee && finalTotal > 0 && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    No additional fees! 🎉
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        disabled={tickets.length === 0 || totalTickets === 0}
                                        onClick={() => setIsCheckoutOpen(true)}
                                    >
                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                        {tickets.length === 0
                                            ? 'No Tickets Available'
                                            : totalTickets === 0
                                                ? 'Select Tickets'
                                                : 'Proceed to Checkout'
                                        }
                                    </Button>


                                </CardContent>
                            </Card>

                            {/* Attendees placeholder */}
                            <Card className="mt-4">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            Be the first to register!
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-transparent border-none shadow-none text-white">
                    <div className="bg-gradient-to-br from-[#02AAB0] to-[#00CDAC] p-8 rounded-[1.5rem] shadow-2xl border border-white/20 min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                        {/* Decorative subtle patterns - Matte effect with reduced opacity */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-30" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none opacity-30" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 h-full">
                            {/* Left Column - Details */}
                            <div className="flex flex-col justify-between space-y-6">
                                <div>
                                    <DialogHeader className="mb-4 text-left p-0">
                                        <DialogTitle className="flex items-center gap-3 text-3xl font-bold text-white tracking-wide">
                                            <ShoppingCart className="h-8 w-8 text-white/90" />
                                            Checkout
                                        </DialogTitle>
                                        <DialogDescription className="text-white/80 text-lg">
                                            Complete your order securely.
                                        </DialogDescription>
                                    </DialogHeader>

                                    {/* Order Summary Compact */}
                                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-md border border-white/20 mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium opacity-90 text-sm uppercase tracking-wider">Total</span>
                                            <span className="text-2xl font-bold">{currencySymbol}{grandTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="space-y-1">
                                            {cartItems.map(item => (
                                                <div key={item.ticket.id} className="flex justify-between text-white/80 text-sm">
                                                    <span>{item.quantity}x {item.ticket.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden md:block mt-8">
                                    <div className="relative h-12 w-32 transition-all filter brightness-[1.1] contrast-[1.1] drop-shadow-sm">
                                        <Image
                                            src="/images/HTlogocr.png"
                                            alt="Halal Ticketin"
                                            fill
                                            className="object-contain object-left-bottom"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Form */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 flex flex-col justify-center">
                                <div className="space-y-4">
                                    {/* Name */}
                                    <div className="space-y-1">
                                        <Label htmlFor="name" className="text-white/90 text-xs uppercase tracking-wider pl-1">Name on Ticket</Label>
                                        <Input
                                            id="name"
                                            placeholder="J. Appleseed"
                                            value={attendeeName}
                                            onChange={(e) => setAttendeeName(e.target.value)}
                                            disabled={isProcessing}
                                            className="bg-black/10 border-white/20 text-white placeholder:text-white/40 focus:bg-black/20 focus:border-white/50 h-10 transition-all"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1">
                                        <Label htmlFor="email" className="text-white/90 text-xs uppercase tracking-wider pl-1">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            value={attendeeEmail}
                                            onChange={(e) => setAttendeeEmail(e.target.value)}
                                            disabled={isProcessing}
                                            className="bg-black/10 border-white/20 text-white placeholder:text-white/40 focus:bg-black/20 focus:border-white/50 h-10 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Age */}
                                        <div className="space-y-1">
                                            <Label htmlFor="age" className="text-white/90 text-xs uppercase tracking-wider pl-1">Age</Label>
                                            <Input
                                                id="age"
                                                type="number"
                                                placeholder="25"
                                                min="0"
                                                max="120"
                                                value={attendeeAge}
                                                onChange={(e) => setAttendeeAge(e.target.value)}
                                                disabled={isProcessing}
                                                className="bg-black/10 border-white/20 text-white placeholder:text-white/40 focus:bg-black/20 focus:border-white/50 h-10 transition-all"
                                            />
                                        </div>

                                        {/* Gender */}
                                        <div className="space-y-1">
                                            <Label className="text-white/90 text-xs uppercase tracking-wider pl-1">Gender</Label>
                                            <Select value={attendeeGender} onValueChange={setAttendeeGender} disabled={isProcessing}>
                                                <SelectTrigger className="bg-black/10 border-white/20 text-white focus:ring-white/50 h-10">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {checkoutError && (
                                        <div className="text-xs text-red-200 bg-red-900/40 p-2 rounded border border-red-500/30">
                                            {checkoutError}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full bg-white text-teal-600 hover:bg-white/90 font-bold text-lg h-12 rounded-lg shadow-lg mt-2"
                                        onClick={handleProceedToCheckout}
                                        disabled={!attendeeEmail || !attendeeName || !attendeeAge || !attendeeGender || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            `Pay ${currencySymbol}${grandTotal.toFixed(2)}`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
