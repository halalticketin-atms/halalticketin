'use client';

import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { fetchPublicOrganizerProfile } from '@/lib/organizers-api';
import { motion, AnimatePresence } from 'motion/react';
import {
    Calendar,
    Clock,
    MapPin,
    Globe,
    Share2,
    Ticket,
    Loader2,
    AlertCircle,
    ArrowLeft,
    Plus,
    Minus,
    ShoppingCart,
    Tag,
    ArrowRight,
    Check,
    Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useMetaPixel } from '@/hooks/useMetaPixel';
import type { EventRecord, PublicEventRecord, PublicTicketRecord, TicketRecord } from '@/lib/events-api';
import { handleCheckout, CartItem, validatePromoCode, ValidatePromoResult, type TicketAttendeePayload } from '@/lib/checkout-api';
import { showError } from '@/lib/errors';
import { calculatePlatformFee, getCurrencySymbol, type FeeTier } from '@/lib/fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useOptionalAuth } from '@/context/auth-context';
import { differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShareDialog } from '@/components/share/ShareDialog';
import { toast } from '@/lib/notifications';

// Dynamic import to avoid SSR issues with Leaflet
const EventLocationMap = dynamic(
    () => import('@/components/events/EventLocationMap').then(mod => ({ default: mod.EventLocationMap })),
    { ssr: false, loading: () => <div className="h-[300px] rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">Loading map...</div> }
);

type EventLike = EventRecord | PublicEventRecord;
type TicketLike = PublicTicketRecord | TicketRecord;

interface PublicEventPageContentProps {
    event: EventLike | null;
    tickets: TicketLike[];
    isLoading: boolean;
    error: string | null;
    isPreview?: boolean;
    organizerNameOverride?: string | null;
}

// Per-ticket attendee info structure
interface TicketAttendee {
    name: string;
    email: string;
    gender: 'male' | 'female' | '';
    age: string;
    customAnswers: Record<string, string>;
}

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
    ticket: TicketLike;
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

export function PublicEventPageContent({
    event,
    tickets,
    isLoading,
    error,
    isPreview = false,
    organizerNameOverride = null,
}: PublicEventPageContentProps) {
    const { rates } = useExchangeRates();
    const { track } = useMetaPixel();
    const eventPixelId =
        !isPreview && event && 'metaPixelId' in event ? event.metaPixelId : null;
    const organizerName =
        organizerNameOverride ?? (event && 'organizerName' in event ? event.organizerName : null);

    const auth = useOptionalAuth();
    const user = auth?.user;

    // Fetch organizer profile for avatar
    const [organizerAvatar, setOrganizerAvatar] = useState<string | null>(null);
    useEffect(() => {
        if (!event?.organizerId || isPreview) return;
        fetchPublicOrganizerProfile(event.organizerId)
            .then(res => setOrganizerAvatar(res.organizer.avatarUrl))
            .catch(() => setOrganizerAvatar(null));
    }, [event?.organizerId, isPreview]);

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeAge, setAttendeeAge] = useState('');
    const [attendeeGender, setAttendeeGender] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [checkoutStep, setCheckoutStep] = useState(0);

    // Autofill user details
    useEffect(() => {
        if (user) {
            if (!attendeeName && user.name) {
                setAttendeeName(user.name);
            }
            if (!attendeeEmail && user.email) {
                setAttendeeEmail(user.email);
            }
            if (!attendeeGender && user.gender) {
                setAttendeeGender(user.gender);
            }
            if (!attendeeAge && user.dateOfBirth) {
                const age = differenceInYears(new Date(), new Date(user.dateOfBirth));
                setAttendeeAge(age.toString());
            }
        }
    }, [user, attendeeName, attendeeEmail, attendeeGender, attendeeAge]);

    // Attendee info mode states
    const [useSharedInfo, setUseSharedInfo] = useState(true);
    const [ticketAttendees, setTicketAttendees] = useState<TicketAttendee[]>([]);

    // Promo code state
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResult | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);

    // --- Checkout Draft Persistence ---
    const DRAFT_KEY = event?.id ? `checkout_draft_${event.id}` : null;
    const DRAFT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

    // Restore draft from sessionStorage on mount
    useEffect(() => {
        if (!DRAFT_KEY || !event) return;

        try {
            const stored = sessionStorage.getItem(DRAFT_KEY);
            if (!stored) return;

            const draft = JSON.parse(stored);
            const savedAt = draft.savedAt || 0;

            // Check if draft is still valid (< 30 min old)
            if (Date.now() - savedAt > DRAFT_EXPIRY_MS) {
                sessionStorage.removeItem(DRAFT_KEY);
                return;
            }

            // Restore form state (only if fields are empty to not overwrite user input)
            if (draft.ticketQuantities && Object.keys(ticketQuantities).length === 0) {
                setTicketQuantities(draft.ticketQuantities);
            }
            if (draft.attendeeName && !attendeeName) {
                setAttendeeName(draft.attendeeName);
            }
            if (draft.attendeeEmail && !attendeeEmail) {
                setAttendeeEmail(draft.attendeeEmail);
            }
            if (draft.attendeeGender && !attendeeGender) {
                setAttendeeGender(draft.attendeeGender);
            }
            if (draft.attendeeAge && !attendeeAge) {
                setAttendeeAge(draft.attendeeAge);
            }
            if (draft.ticketAttendees && ticketAttendees.length === 0) {
                setTicketAttendees(draft.ticketAttendees);
            }
            if (draft.promoCode && !promoCode) {
                setPromoCode(draft.promoCode);
            }
            if (draft.useSharedInfo !== undefined) {
                setUseSharedInfo(draft.useSharedInfo);
            }
        } catch {
            // Ignore parse errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [DRAFT_KEY, event?.id]);

    // Save draft to sessionStorage
    const saveDraft = () => {
        if (!DRAFT_KEY) return;

        const draft = {
            ticketQuantities,
            attendeeName,
            attendeeEmail,
            attendeeGender,
            attendeeAge,
            ticketAttendees,
            promoCode,
            useSharedInfo,
            savedAt: Date.now()
        };

        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch {
            // Ignore storage errors
        }
    };

    // Clear draft (call after successful order)
    const clearDraft = () => {
        if (DRAFT_KEY) {
            sessionStorage.removeItem(DRAFT_KEY);
        }
    };

    const handleOpenCheckout = () => {
        if (isPreview) {
            showError('Preview mode: checkout is disabled.');
            return;
        }
        setIsCheckoutOpen(true);
    };

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

    const customQuestionCount = event?.customQuestions?.length ?? 0;
    const forcePerTicket = customQuestionCount > 0;
    const requiresPerTicket = useMemo(() => {
        if (!event || totalTickets === 0) {
            return false;
        }
        if (forcePerTicket) {
            return true;
        }
        if (event.attendeeInfoMode === 'per_ticket') {
            return true;
        }
        return event.attendeeInfoMode === 'buyer_choice' && !useSharedInfo;
    }, [event, forcePerTicket, totalTickets, useSharedInfo]);

    useEffect(() => {
        if (forcePerTicket && useSharedInfo) {
            startTransition(() => setUseSharedInfo(false));
        }
    }, [forcePerTicket, useSharedInfo]);

    const handleQuantityChange = (ticketId: string, quantity: number) => {
        setTicketQuantities(prev => ({
            ...prev,
            [ticketId]: quantity
        }));
        // Clear applied promo when quantities change
        setAppliedPromo(null);
        setPromoError(null);
    };

    // Sync ticketAttendees array with total ticket count
    useEffect(() => {
        if (!requiresPerTicket || totalTickets === 0) {
            startTransition(() => setTicketAttendees([]));
            return;
        }

        startTransition(() => {
            setTicketAttendees((prev) => {
                if (prev.length === totalTickets) return prev;

                const newAttendees: TicketAttendee[] = [];
                for (let i = 0; i < totalTickets; i++) {
                    newAttendees.push(prev[i] || {
                        name: '',
                        email: '',
                        gender: '',
                        age: '',
                        customAnswers: {},
                    });
                }
                return newAttendees;
            });
        });
    }, [requiresPerTicket, totalTickets]);

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
        if (!event || totalTickets === 0 || finalTotal <= 0) {
            return 0;
        }

        const feeTier = (event.feeTier ?? 'payg') as FeeTier;
        const rawCustomBookingFee = event.customBookingFee;
        const customBookingFee =
            rawCustomBookingFee === null || rawCustomBookingFee === undefined
                ? undefined
                : typeof rawCustomBookingFee === 'string'
                    ? parseFloat(rawCustomBookingFee)
                    : rawCustomBookingFee;

        const { totalFee } = calculatePlatformFee({
            feeTier,
            ticketCount: totalTickets,
            currency: currencyCode,
            customBookingFee,
            exchangeRates: rates
        });

        return event.absorbFee ? 0 : totalFee;
    }, [event, totalTickets, currencyCode, rates, finalTotal]);

    const grandTotal = finalTotal + platformFeeAmount;

    // Step-based checkout: Step 0 = Buyer, Step 1..N = Tickets (if per-ticket), Final = Confirm
    const totalCheckoutSteps = requiresPerTicket ? 1 + totalTickets + 1 : 2;
    const stepType: 'buyer' | 'ticket' | 'confirm' =
        checkoutStep === 0 ? 'buyer'
            : checkoutStep <= totalTickets && requiresPerTicket ? 'ticket'
                : 'confirm';
    const currentTicketIndex = stepType === 'ticket' ? checkoutStep - 1 : -1;

    // Reset step when modal closes
    useEffect(() => {
        if (!isCheckoutOpen) {
            setCheckoutStep(0);
        }
    }, [isCheckoutOpen]);

    // Validate current step before advancing
    const validateCurrentStep = (): string | null => {
        if (stepType === 'buyer') {
            if (!attendeeName.trim()) return 'Please enter your name.';
            if (!attendeeEmail.trim()) return 'Please enter your email.';
            if (!attendeeAge.trim()) return 'Please enter your age.';
            if (!attendeeGender) return 'Please select your gender.';
            const ageNum = Number(attendeeAge);
            if (Number.isNaN(ageNum) || ageNum <= 0) return 'Please enter a valid age.';
        } else if (stepType === 'ticket' && currentTicketIndex >= 0) {
            const attendee = ticketAttendees[currentTicketIndex];
            if (!attendee?.name?.trim()) return `Please enter name for Ticket ${currentTicketIndex + 1}.`;
            if (!attendee?.age?.trim()) return `Please enter age for Ticket ${currentTicketIndex + 1}.`;
            if (!attendee?.gender) return `Please select gender for Ticket ${currentTicketIndex + 1}.`;
            const ageNum = Number(attendee.age);
            if (Number.isNaN(ageNum) || ageNum <= 0) return `Please enter a valid age for Ticket ${currentTicketIndex + 1}.`;
            // Check custom questions
            if (event?.customQuestions?.length) {
                for (const q of event.customQuestions) {
                    if (q.required) {
                        const answer = attendee.customAnswers[q.id];
                        if (!answer || answer === '') {
                            return `Please answer "${q.label}" for Ticket ${currentTicketIndex + 1}.`;
                        }
                    }
                }
            }
        }
        return null;
    };

    const handleNextStep = () => {
        const error = validateCurrentStep();
        if (error) {
            setCheckoutError(error);
            return;
        }
        setCheckoutError(null);
        setCheckoutStep(s => Math.min(s + 1, totalCheckoutSteps - 1));
    };

    const handlePrevStep = () => {
        setCheckoutError(null);
        setCheckoutStep(s => Math.max(s - 1, 0));
    };

    const validateCheckout = (): string | null => {
        if (!attendeeName.trim() || !attendeeEmail.trim() || !attendeeGender || !attendeeAge.trim()) {
            return 'Please provide your name, email, age, and gender.';
        }

        const buyerAgeNumber = Number(attendeeAge);
        if (Number.isNaN(buyerAgeNumber) || buyerAgeNumber <= 0) {
            return 'Please enter a valid age.';
        }

        if (totalTickets === 0) {
            return 'Please select at least one ticket.';
        }

        if (requiresPerTicket) {
            if (ticketAttendees.length !== totalTickets) {
                return 'Please add attendee information for each ticket.';
            }

            for (let i = 0; i < ticketAttendees.length; i += 1) {
                const attendee = ticketAttendees[i];
                // Email is optional for attendees (will fallback to buyer email)
                if (!attendee.name.trim() || !attendee.gender || !attendee.age.trim()) {
                    return `Ticket ${i + 1}: attendee name, gender, and age are required.`;
                }

                const ageNumber = Number(attendee.age);
                if (Number.isNaN(ageNumber) || ageNumber <= 0) {
                    return `Ticket ${i + 1}: please enter a valid age.`;
                }

                if (event?.customQuestions?.length) {
                    for (const question of event.customQuestions) {
                        if (!question.required) continue;
                        const answer = attendee.customAnswers[question.id];
                        if (answer === undefined || answer === null || answer === '') {
                            return `Ticket ${i + 1}: please answer "${question.label}".`;
                        }
                    }
                }
            }
        }

        return null;
    };

    const handleProceedToCheckout = async () => {
        if (isPreview) {
            showError('Preview mode: checkout is disabled.');
            return;
        }
        if (!event || !attendeeEmail || totalTickets === 0) return;

        setIsProcessing(true);
        setCheckoutError(null);

        const validationMessage = validateCheckout();
        if (validationMessage) {
            setCheckoutError(validationMessage);
            setIsProcessing(false);
            return;
        }

        // Save form draft before redirecting to Stripe
        saveDraft();

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

        const buyerAgeNumber = Number(attendeeAge);

        const ticketAttendeePayload: TicketAttendeePayload[] | undefined = requiresPerTicket
            ? ticketAttendees.map((attendee) => {
                const normalizedAnswers = Object.entries(attendee.customAnswers).reduce<Record<string, string>>((acc, [key, value]) => {
                    if (value !== undefined && value !== null && value !== '') {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
                const hasAnswers = Object.keys(normalizedAnswers).length > 0;

                return {
                    name: attendee.name.trim(),
                    email: attendee.email.trim() || attendeeEmail.trim(), // Fallback to buyer email
                    gender: attendee.gender as 'male' | 'female',
                    age: attendee.age ? Math.floor(Number(attendee.age)) : undefined,
                    customAnswers: hasAnswers ? normalizedAnswers : undefined,
                };
            })
            : undefined;

        const result = await handleCheckout(event.id, {
            items,
            attendeeName: attendeeName.trim(),
            attendeeEmail: attendeeEmail.trim(),
            attendeeAge: Math.floor(buyerAgeNumber),
            attendeeGender: attendeeGender as 'male' | 'female',
            useSharedInfo: !requiresPerTicket && useSharedInfo,
            ticketAttendees: ticketAttendeePayload,
            promoCode: appliedPromo?.code || promoCode.trim() || undefined,
        });

        if (!result.success) {
            const errorMessage = result.error || 'Checkout failed. Please try again.';
            setCheckoutError(errorMessage);
            showError(errorMessage);
            setIsProcessing(false);
            return;
        }

        // If free order, redirect to success
        if (result.isFreeOrder && result.orderId) {
            clearDraft(); // Clear saved form draft
            window.location.href = `/checkout/success?order_id=${result.orderId}`;
        }
        // Paid orders: clearDraft is handled by success page (draft auto-expires anyway)
    };

    const startDatetime = event?.startDatetime ?? null;
    const endDatetime = event?.endDatetime ?? null;
    const eventEndTimestamp = endDatetime
        ? new Date(endDatetime).getTime()
        : startDatetime
            ? new Date(startDatetime).getTime()
            : null;
    const isPastEvent = !isPreview && eventEndTimestamp !== null && Date.now() > eventEndTimestamp;
    const hasShownPastToast = useRef(false);

    useEffect(() => {
        if (!isPastEvent || hasShownPastToast.current) return;
        hasShownPastToast.current = true;
        toast.info('Event has ended', {
            description: 'This event is no longer available. It has already happened.',
        });
    }, [isPastEvent]);

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
            <ShareDialog
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                title={event.title || 'Event'}
                text={organizerName ? `Hosted by ${organizerName}` : undefined}
            />
            {/* Hero Section - Poster with Blurred Background */}
            <div className="relative">
                {/* Blurred Background Layer */}
                <div className="relative h-[400px] sm:h-[450px] md:h-[500px] overflow-hidden">
                    {event.bannerImageUrl ? (
                        <>
                            {/* Blurred, zoomed background */}
                            <div className="absolute inset-0 scale-110">
                                <Image
                                    src={event.bannerImageUrl}
                                    alt=""
                                    fill
                                    className="object-cover blur-xl"
                                    priority
                                />
                            </div>
                            {/* Dark overlay for better contrast */}
                            <div className="absolute inset-0 bg-black/50" />
                        </>
                    ) : (
                        /* Solid gradient fallback when no image */
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    )}

                    {/* Centered Sharp Poster */}
                    <div className="absolute inset-0 flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10"
                        >
                            {event.bannerImageUrl ? (
                                <Image
                                    src={event.bannerImageUrl}
                                    alt={event.title || 'Event'}
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                                    <Calendar className="h-16 w-16 text-white/40" />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Back Button */}
                    <div className="absolute top-4 left-4 z-10">
                        <Button variant="secondary" size="sm" asChild className="backdrop-blur-sm bg-black/30 border-white/10 text-white hover:bg-black/50">
                            <Link href="/events">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Events
                            </Link>
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <FavoriteButton eventId={event.id} size="sm" />
                        <Button
                            variant="secondary"
                            size="icon"
                            className="backdrop-blur-sm bg-black/30 border-white/10 text-white hover:bg-black/50"
                            onClick={() => setIsShareOpen(true)}
                            aria-label="Share event"
                        >
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
                        {/* Title */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="font-display text-3xl sm:text-4xl font-bold">
                                {event.title || 'Untitled Event'}
                            </h1>
                        </motion.div>

                        {/* Organizer Card - Prominent Design */}
                        {organizerName && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.05 }}
                            >
                                <Link href={`/organizers/${event.organizerId}`}>
                                    <Card className="group hover:border-primary/50 transition-all duration-300 hover:shadow-lg cursor-pointer bg-gradient-to-br from-primary/5 to-transparent">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                {/* Organizer Avatar */}
                                                <div
                                                    className={cn(
                                                        "relative h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300 overflow-hidden",
                                                        organizerAvatar ? "bg-transparent" : "bg-gradient-to-br from-primary to-primary/60"
                                                    )}
                                                >
                                                    {organizerAvatar ? (
                                                        <Image
                                                            src={organizerAvatar}
                                                            alt={organizerName}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <span>{organizerName.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                                                        Event Organizer
                                                    </p>
                                                    <p className="font-semibold text-lg group-hover:text-primary transition-colors truncate">
                                                        {organizerName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground group-hover:underline">
                                                        View organizer profile →
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            </motion.div>
                        )}

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
                                    <CardContent className="pt-6 space-y-4">
                                        <div className="flex items-start gap-4">
                                            <MapPin className="h-6 w-6 text-primary shrink-0 mt-1" />
                                            <div className="flex-1">
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

                                        {/* Interactive Map (if coordinates available) */}
                                        {event.latitude && event.longitude ? (
                                            <div className="space-y-2">
                                                <EventLocationMap
                                                    lat={event.latitude}
                                                    lon={event.longitude}
                                                    venueName={event.venue || undefined}
                                                    address={event.address || undefined}
                                                />
                                            </div>
                                        ) : null}

                                        {/* Get Directions Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            asChild
                                        >
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                    [event.venue, event.address, event.city, event.country]
                                                        .filter(Boolean)
                                                        .join(', ')
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Navigation className="h-4 w-4 mr-2" />
                                                Get Directions
                                            </a>
                                        </Button>
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
                                <CardHeader>
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
                                        onClick={handleOpenCheckout}
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


                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Checkout Dialog - Multi-step wizard with softer styling */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-[850px] w-[95vw] p-0 overflow-hidden border-0 bg-transparent shadow-2xl gap-0">
                    <div className="bg-card flex flex-col md:flex-row h-auto md:h-[540px] rounded-3xl overflow-hidden max-h-[calc(100dvh-2rem)] shadow-2xl border border-primary/10">

                        {/* LEFT PANEL: Brand & Order Summary */}
                        <div className="w-full md:w-[340px] bg-primary/5 border-r border-border/50 p-6 flex flex-col relative overflow-hidden group">
                            {/* Decorative background accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-700 group-hover:opacity-70" />
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
                                <h3 className="text-xl font-display font-bold text-foreground leading-tight">
                                    Order Summary
                                </h3>
                                {(event?.title) && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{event.title}</p>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative z-10 custom-scrollbar">
                                {cartItems.map(item => (
                                    <div key={item.ticket.id} className="flex justify-between items-start text-sm group/item">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{item.ticket.name}</span>
                                            <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                                        </div>
                                        <span className="font-semibold text-foreground">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                                    </div>
                                ))}

                                {/* Fees & Discounts */}
                                <Separator className="my-3 bg-primary/10" />

                                {platformFeeAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Fees</span>
                                        <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {appliedPromo && discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600 font-medium my-1">
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {appliedPromo.code}</span>
                                        <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total Footer */}
                            <div className="mt-6 pt-4 border-t border-primary/10 relative z-10">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Total</span>
                                    <span className="text-3xl font-bold text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Wizard Form */}
                        <div className="flex-1 flex flex-col bg-card relative">
                            {/* Wizard Header */}
                            <div className="px-8 pt-6 pb-2">
                                {/* Step Indicators */}
                                <div className="flex items-center justify-between mb-6">
                                    {['Information', 'Payment', 'Complete'].map((label, idx) => {
                                        // Logic to map current detailed step to these 3 high level buckets
                                        // Information: Buyer & Ticket steps
                                        // Payment: Confirm step (simulated for visual)
                                        // Complete: (Future)

                                        const isActive =
                                            idx === 0 ? stepType !== 'confirm'
                                                : idx === 1 ? stepType === 'confirm'
                                                    : false;

                                        const isCompleted =
                                            idx === 0 ? stepType === 'confirm'
                                                : false;

                                        return (
                                            <div key={label} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2",
                                                    (isActive || isCompleted)
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "bg-transparent border-muted-foreground/30 text-muted-foreground"
                                                )}>
                                                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                <span className={cn(
                                                    "text-xs font-medium transition-colors duration-300",
                                                    (isActive || isCompleted) ? "text-primary" : "text-muted-foreground"
                                                )}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <DialogTitle className="sr-only">Checkout</DialogTitle>
                            </div>

                            {/* Scrollable Form Area */}
                            <div className="flex-1 overflow-y-auto px-8 py-2 custom-scrollbar">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={checkoutStep}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-5"
                                    >
                                        {/* Step Title */}
                                        <div className="mb-4">
                                            <h4 className="text-lg font-bold text-foreground">
                                                {stepType === 'buyer' && 'Contact Information'}
                                                {stepType === 'ticket' && `Ticket ${currentTicketIndex + 1} Details`}
                                                {stepType === 'confirm' && 'Payment Details'}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {stepType === 'buyer' && 'Where should we send your tickets?'}
                                                {stepType === 'ticket' && `Information for ${ticketAttendees[currentTicketIndex]?.name || 'attendee'}`}
                                                {stepType === 'confirm' && 'Select your preferred payment method'}
                                            </p>
                                        </div>

                                        {/* Buyer Details Step */}
                                        {stepType === 'buyer' && (
                                            <>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="buyerName" className="text-xs font-medium text-muted-foreground">Full Name</Label>
                                                    <Input
                                                        id="buyerName"
                                                        placeholder="Salahuddin Al-Ayyubi"
                                                        value={attendeeName}
                                                        onChange={(e) => setAttendeeName(e.target.value)}
                                                        disabled={isProcessing}
                                                        className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="buyerEmail" className="text-xs font-medium text-muted-foreground">Email Address</Label>
                                                    <Input
                                                        id="buyerEmail"
                                                        type="email"
                                                        placeholder="salahuddin@example.com"
                                                        value={attendeeEmail}
                                                        onChange={(e) => setAttendeeEmail(e.target.value)}
                                                        disabled={isProcessing}
                                                        className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="buyerAge" className="text-xs font-medium text-muted-foreground">Age</Label>
                                                        <Input
                                                            id="buyerAge"
                                                            type="number"
                                                            placeholder="25"
                                                            min="1"
                                                            max="120"
                                                            value={attendeeAge}
                                                            onChange={(e) => setAttendeeAge(e.target.value)}
                                                            disabled={isProcessing}
                                                            className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                                                        <Select value={attendeeGender} onValueChange={setAttendeeGender} disabled={isProcessing}>
                                                            <SelectTrigger className="h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="male">Male</SelectItem>
                                                                <SelectItem value="female">Female</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                {/* Shared Info Toggle */}
                                                {event?.attendeeInfoMode === 'buyer_choice' && totalTickets > 1 && !forcePerTicket && (
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <input
                                                            type="checkbox"
                                                            id="useSharedInfo"
                                                            checked={useSharedInfo}
                                                            onChange={(e) => setUseSharedInfo(e.target.checked)}
                                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                                            disabled={isProcessing}
                                                        />
                                                        <label htmlFor="useSharedInfo" className="text-xs text-muted-foreground cursor-pointer select-none">
                                                            Save time: use this info for all tickets
                                                        </label>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Ticket Step (Same as before but styled) */}
                                        {stepType === 'ticket' && currentTicketIndex >= 0 && ticketAttendees[currentTicketIndex] && (
                                            <>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground">Attendee Name</Label>
                                                    <Input
                                                        placeholder="Name"
                                                        value={ticketAttendees[currentTicketIndex].name}
                                                        onChange={(e) => {
                                                            const updated = [...ticketAttendees];
                                                            updated[currentTicketIndex] = { ...updated[currentTicketIndex], name: e.target.value };
                                                            setTicketAttendees(updated);
                                                        }}
                                                        disabled={isProcessing}
                                                        className="h-10 bg-muted/30"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">Age</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="25"
                                                            value={ticketAttendees[currentTicketIndex].age}
                                                            onChange={(e) => {
                                                                const updated = [...ticketAttendees];
                                                                updated[currentTicketIndex] = { ...updated[currentTicketIndex], age: e.target.value };
                                                                setTicketAttendees(updated);
                                                            }}
                                                            disabled={isProcessing}
                                                            className="h-10 bg-muted/30"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                                                        <Select
                                                            value={ticketAttendees[currentTicketIndex].gender}
                                                            onValueChange={(value) => {
                                                                const updated = [...ticketAttendees];
                                                                updated[currentTicketIndex] = { ...updated[currentTicketIndex], gender: value as 'male' | 'female' };
                                                                setTicketAttendees(updated);
                                                            }}
                                                            disabled={isProcessing}
                                                        >
                                                            <SelectTrigger className="h-10 bg-muted/30">
                                                                <SelectValue placeholder="Select" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="male">Male</SelectItem>
                                                                <SelectItem value="female">Female</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                {/* Customer questions */}
                                                {event?.customQuestions && event.customQuestions.length > 0 && (
                                                    <div className="space-y-3 pt-2 border-t border-border/50 mt-2">
                                                        {event.customQuestions.map((q) => (
                                                            <div key={q.id} className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">
                                                                    {q.label}{q.required && <span className="text-destructive ml-0.5">*</span>}
                                                                </Label>
                                                                {q.type === 'text' && (
                                                                    <Input
                                                                        placeholder={q.label}
                                                                        value={ticketAttendees[currentTicketIndex].customAnswers[q.id] || ''}
                                                                        onChange={(e) => {
                                                                            const updated = [...ticketAttendees];
                                                                            updated[currentTicketIndex] = {
                                                                                ...updated[currentTicketIndex],
                                                                                customAnswers: { ...updated[currentTicketIndex].customAnswers, [q.id]: e.target.value }
                                                                            };
                                                                            setTicketAttendees(updated);
                                                                        }}
                                                                        disabled={isProcessing}
                                                                        className="h-10 bg-muted/30"
                                                                    />
                                                                )}
                                                                {q.type === 'checkbox' && (
                                                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={ticketAttendees[currentTicketIndex].customAnswers[q.id] === 'true'}
                                                                            onChange={(e) => {
                                                                                const updated = [...ticketAttendees];
                                                                                updated[currentTicketIndex] = {
                                                                                    ...updated[currentTicketIndex],
                                                                                    customAnswers: { ...updated[currentTicketIndex].customAnswers, [q.id]: e.target.checked ? 'true' : 'false' }
                                                                                };
                                                                                setTicketAttendees(updated);
                                                                            }}
                                                                            disabled={isProcessing}
                                                                            className="h-4 w-4 rounded border-border"
                                                                        />
                                                                        Yes
                                                                    </label>
                                                                )}
                                                                {q.type === 'select' && q.options && (
                                                                    <Select
                                                                        value={ticketAttendees[currentTicketIndex].customAnswers[q.id] || ''}
                                                                        onValueChange={(value) => {
                                                                            const updated = [...ticketAttendees];
                                                                            updated[currentTicketIndex] = {
                                                                                ...updated[currentTicketIndex],
                                                                                customAnswers: { ...updated[currentTicketIndex].customAnswers, [q.id]: value }
                                                                            };
                                                                            setTicketAttendees(updated);
                                                                        }}
                                                                        disabled={isProcessing}
                                                                    >
                                                                        <SelectTrigger className="h-10 bg-muted/30">
                                                                            <SelectValue placeholder="Select..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {q.options.map((opt) => (
                                                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Confirm/Payment Simulation Step */}
                                        {stepType === 'confirm' && (
                                            <div className="space-y-4">
                                                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Total</span>
                                                        <span className="text-2xl font-bold text-foreground">{currencySymbol}{grandTotal.toFixed(2)}</span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {cartItems.map(item => (
                                                            <div key={item.ticket.id} className="flex justify-between text-muted-foreground">
                                                                <span>{item.quantity}× {item.ticket.name}</span>
                                                                <span>{currencySymbol}{item.subtotal.toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                        {appliedPromo && discountAmount > 0 && (
                                                            <div className="flex justify-between text-green-600">
                                                                <span>Discount ({appliedPromo.code})</span>
                                                                <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {platformFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>Service fee</span>
                                                                <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Buyer</p>
                                                    <p className="font-medium text-foreground">{attendeeName}</p>
                                                    <p className="text-sm text-muted-foreground">{attendeeEmail}</p>
                                                </div>

                                                {requiresPerTicket && ticketAttendees.length > 0 && (
                                                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Attendees</p>
                                                        <div className="space-y-1.5">
                                                            {ticketAttendees.map((att, i) => (
                                                                <p key={i} className="text-sm text-foreground">
                                                                    <span className="text-muted-foreground">Ticket {i + 1}:</span> {att.name}
                                                                </p>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                {checkoutError && (
                                    <div className="mt-4 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                                        <p className="font-semibold">Checkout error</p>
                                        <p>{checkoutError}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer Navigation */}
                            <div className="p-8 pt-4 pb-6 mt-auto">
                                {stepType !== 'confirm' ? (
                                    <Button
                                        className="w-full h-11 text-base shadow-lg shadow-primary/20"
                                        onClick={handleNextStep}
                                        disabled={isProcessing}
                                    >
                                        Continue
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20"
                                        onClick={handleProceedToCheckout}
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            `Pay ${currencySymbol}${grandTotal.toFixed(2)} Now`
                                        )}
                                    </Button>
                                )}

                                {checkoutStep > 0 && (
                                    <button
                                        onClick={handlePrevStep}
                                        disabled={isProcessing}
                                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
                                    >
                                        Go Back
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
