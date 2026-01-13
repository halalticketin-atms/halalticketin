'use client';

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
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
import { handleCheckout, CartItem, validatePromoCode, ValidatePromoResult, fetchUnlockedTickets, getCheckoutQuote, type CheckoutQuoteResponse, type TicketAttendeePayload } from '@/lib/checkout-api';
import { calculateFeePerTicket, formatCurrency, getCurrencySymbol, type FeeTier } from '@/lib/fees';
import { formatCreditSplitNote } from '@/lib/credit-notes';
import { calculateStripeProcessingFee } from '@/lib/stripe-fees';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { LIMITS_GBP, MAX_PER_ORDER, PROMO_CODE_MAX_LENGTH, PROMO_CODE_MIN_LENGTH, roundCurrencyLimit } from '@/lib/input-limits';
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
    embedMode?: 'checkout' | 'full';
}

// Per-ticket attendee info structure
interface TicketAttendee {
    name: string;
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

function normalizeFeeValue(value?: number | string | null): number | undefined {
    if (value === null || value === undefined) return undefined;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Ticket card component with quantity selection.
 */
function TicketCard({
    ticket,
    quantity,
    onQuantityChange,
    organizerFeeNote
}: {
    ticket: TicketLike;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
    organizerFeeNote?: string | null;
}) {
    const regularPrice = formatPrice(ticket.price, ticket.currency);
    const isFree = ticket.type === 'free' || regularPrice === 'Free';
    const perOrderLimit = ticket.maxPerOrder ?? MAX_PER_ORDER;
    const maxQty = Math.min(perOrderLimit, ticket.maxQuantity ?? perOrderLimit);

    // Check if early bird pricing is active
    const earlyBirdPrice = 'earlyBirdPrice' in ticket ? ticket.earlyBirdPrice : null;
    const earlyBirdEndDate = 'earlyBirdEndDate' in ticket ? ticket.earlyBirdEndDate : null;
    const now = new Date();
    const isEarlyBirdActive = !isFree && earlyBirdPrice && earlyBirdEndDate && now < new Date(earlyBirdEndDate);
    const displayPrice = isEarlyBirdActive ? formatPrice(earlyBirdPrice, ticket.currency) : regularPrice;

    return (
        <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
            <div className="flex-1">
                <h4 className="font-medium">{ticket.name}</h4>
                {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                    <p className={`font-semibold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                        {displayPrice}
                    </p>
                    {isEarlyBirdActive && (
                        <>
                            <span className="text-sm text-muted-foreground line-through">{regularPrice}</span>
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Early Bird</span>
                        </>
                    )}
                </div>
                {organizerFeeNote ? (
                    <p className="text-xs text-muted-foreground mt-1">{organizerFeeNote}</p>
                ) : null}
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

function DonationCard({
    ticket,
    amount,
    maxAmount,
    currencySymbol,
    onAmountChange,
}: {
    ticket: TicketLike;
    amount: number;
    maxAmount: number;
    currencySymbol: string;
    onAmountChange: (amount: number) => void;
}) {
    const handleChange = (value: string) => {
        if (value === '') {
            onAmountChange(0);
            return;
        }
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric >= 0) {
            onAmountChange(Math.min(numeric, maxAmount));
        }
    };

    return (
        <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                    <h4 className="font-medium">{ticket.name}</h4>
                    {ticket.description && (
                        <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
                    )}
                </div>
                {amount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => onAmountChange(0)}
                    >
                        Remove
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {currencySymbol}
                    </span>
                    <Input
                        type="number"
                        min="0"
                        max={maxAmount}
                        step="0.01"
                        value={amount.toString()}
                        onChange={(e) => handleChange(e.target.value)}
                        className="h-10 pl-6"
                    />
                </div>
            </div>
            <p className="text-xs text-muted-foreground">Set to 0 to remove the donation.</p>
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
    embedMode = 'full',
}: PublicEventPageContentProps) {
    const isEmbedCheckout = embedMode === 'checkout';
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const visibleTickets = useMemo(
        () => safeTickets.filter((ticket) => ('visibility' in ticket ? ticket.visibility !== 'hidden' : true)),
        [safeTickets],
    );
    const hiddenTickets = useMemo(
        () => safeTickets.filter((ticket) => 'visibility' in ticket && ticket.visibility === 'hidden'),
        [safeTickets],
    );
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
        if (!event?.organizerId || isPreview || isEmbedCheckout) return;
        fetchPublicOrganizerProfile(event.organizerId)
            .then(res => setOrganizerAvatar(res.organizer.avatarUrl))
            .catch(() => setOrganizerAvatar(null));
    }, [event?.organizerId, isPreview, isEmbedCheckout]);

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [donationAmount, setDonationAmount] = useState(0);
    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeAge, setAttendeeAge] = useState('');
    const [attendeeGender, setAttendeeGender] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [checkoutStep, setCheckoutStep] = useState(0);
    const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuoteResponse | null>(null);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    // Autofill user details - only runs once when user data first loads
    useEffect(() => {
        if (user) {
            if (user.name) {
                setAttendeeName(user.name);
            }
            if (user.email) {
                setAttendeeEmail(user.email);
            }
            if (user.gender) {
                setAttendeeGender(user.gender);
            }
            if (user.dateOfBirth) {
                const age = differenceInYears(new Date(), new Date(user.dateOfBirth));
                setAttendeeAge(age.toString());
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Only re-run if user changes (login/logout)

    // Attendee info mode states
    const [useSharedInfo, setUseSharedInfo] = useState(true);
    const [ticketAttendees, setTicketAttendees] = useState<TicketAttendee[]>([]);

    // Promo code state
    const [isValidatingPromo, setIsValidatingPromo] = useState(false);
    const [appliedPromo, setAppliedPromo] = useState<ValidatePromoResult | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);
    const [unlockedTickets, setUnlockedTickets] = useState<TicketLike[]>([]);

    const regularTickets = useMemo(
        () => visibleTickets.filter((ticket) => ticket.type !== 'donation'),
        [visibleTickets],
    );
    const regularUnlockedTickets = useMemo(
        () => unlockedTickets.filter((ticket) => ticket.type !== 'donation'),
        [unlockedTickets],
    );
    const donationTicket = useMemo(
        () => [...visibleTickets, ...unlockedTickets].find((ticket) => ticket.type === 'donation') ?? null,
        [visibleTickets, unlockedTickets],
    );
    const hasDonationOption = Boolean(donationTicket);
    const hasRegularTickets = regularTickets.length > 0 || regularUnlockedTickets.length > 0;

    useEffect(() => {
        if (!donationTicket) {
            setDonationAmount(0);
            return;
        }
        const defaultAmount = parseFloat(donationTicket.price ?? '0');
        setDonationAmount(Number.isFinite(defaultAmount) ? defaultAmount : 0);
    }, [donationTicket?.id]);

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
            if (typeof draft.donationAmount === 'number') {
                setDonationAmount(draft.donationAmount);
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
            donationAmount,
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
            toast.error('Preview mode: checkout is disabled.');
            return;
        }
        setIsCheckoutOpen(true);
    };

    // Helper to get effective price (early bird or regular)
    const getEffectivePrice = useCallback((t: TicketLike) => {
        const now = new Date();
        const earlyBirdPrice = 'earlyBirdPrice' in t ? t.earlyBirdPrice : null;
        const earlyBirdEndDate = 'earlyBirdEndDate' in t ? t.earlyBirdEndDate : null;
        const isEarlyBirdActive = earlyBirdPrice && earlyBirdEndDate && now < new Date(earlyBirdEndDate);
        return isEarlyBirdActive ? parseFloat(earlyBirdPrice) : parseFloat(t.price || '0');
    }, []);

    const getCartItemUnitPrice = useCallback((item: { ticket: TicketLike; quantity: number; subtotal: number }) => {
        if (item.ticket.type === 'donation') {
            return item.subtotal;
        }
        return getEffectivePrice(item.ticket);
    }, [getEffectivePrice]);

    // Calculate totals
    const ticketCartItems = useMemo(() => {
        const allTickets = [...regularTickets, ...regularUnlockedTickets];
        return allTickets
            .filter(t => (ticketQuantities[t.id] || 0) > 0)
            .map(t => ({
                ticket: t,
                quantity: ticketQuantities[t.id] || 0,
                subtotal: (ticketQuantities[t.id] || 0) * getEffectivePrice(t)
            }));
    }, [regularTickets, regularUnlockedTickets, ticketQuantities, getEffectivePrice]);

    const donationItem = useMemo(() => {
        if (!donationTicket) {
            return null;
        }
        if (!Number.isFinite(donationAmount) || donationAmount <= 0) {
            return null;
        }
        return {
            ticket: donationTicket,
            quantity: 1,
            subtotal: donationAmount
        };
    }, [donationAmount, donationTicket]);

    const cartItems = useMemo(
        () => (donationItem ? [...ticketCartItems, donationItem] : ticketCartItems),
        [donationItem, ticketCartItems],
    );

    const totalAmount = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.subtotal, 0)
        , [cartItems]);

    const totalTickets = useMemo(() =>
        ticketCartItems.reduce((sum, item) => sum + item.quantity, 0)
        , [ticketCartItems]);

    const paidTicketCount = useMemo(() =>
        cartItems.reduce((sum, item) => {
            const unitPrice = getCartItemUnitPrice(item);
            return unitPrice > 0 ? sum + item.quantity : sum;
        }, 0),
        [cartItems, getCartItemUnitPrice]
    );
    const hasSelections = totalTickets > 0 || donationAmount > 0;
    const itemCountForTracking = totalTickets + (donationAmount > 0 ? 1 : 0);

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

    const handleDonationChange = (amount: number) => {
        const clamped = Math.min(Math.max(amount, 0), maxDonationAmount);
        setDonationAmount(clamped);
        // Clear applied promo when donation amount changes
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
        const trimmedCode = promoCode.trim();
        if (trimmedCode.length < PROMO_CODE_MIN_LENGTH) {
            setPromoError(`Promo code must be at least ${PROMO_CODE_MIN_LENGTH} characters.`);
            return;
        }
        if (trimmedCode.length > PROMO_CODE_MAX_LENGTH) {
            setPromoError(`Promo code must be ${PROMO_CODE_MAX_LENGTH} characters or less.`);
            return;
        }

        setIsValidatingPromo(true);
        setPromoError(null);

        const promoItems = cartItems.map((item) => ({
            ticketTypeId: item.ticket.id,
            quantity: item.quantity,
            unitPrice: item.ticket.type === 'donation' ? item.subtotal : undefined
        }));
        const result = await validatePromoCode(event.id, trimmedCode, promoItems, totalAmount);

        if (result.valid) {
            setAppliedPromo(result);
            setPromoError(null);

            // Check if this promo reveals hidden tickets
            if (result.revealsHiddenTickets) {
                if (isPreview) {
                    const applicable = result.applicableTicketTypeIds ?? null;
                    const unlocked = applicable && applicable.length > 0
                        ? hiddenTickets.filter((ticket) => applicable.includes(ticket.id))
                        : hiddenTickets;
                    if (unlocked.length > 0) {
                        setUnlockedTickets(unlocked as TicketLike[]);
                        toast.success(`Unlocked ${unlocked.length} hidden ticket${unlocked.length === 1 ? '' : 's'}!`);
                    } else if (result.discountValue === '0' || result.discountValue === '0.00') {
                        setPromoError('Code is valid but no hidden tickets are currently available.');
                    }
                } else {
                    const unlocked = await fetchUnlockedTickets(event.slug || '', trimmedCode);
                    if (unlocked.length > 0) {
                        setUnlockedTickets(unlocked as TicketLike[]);
                        toast.success(`Unlocked ${unlocked.length} hidden ticket${unlocked.length === 1 ? '' : 's'}!`);
                    } else if (result.discountValue === '0' || result.discountValue === '0.00') {
                        // Reveal-only code but no tickets found
                        setPromoError('Code is valid but no hidden tickets are currently available.');
                    }
                }
            }
        } else {
            setAppliedPromo(null);
            setUnlockedTickets([]);
            setPromoError(result.message || 'Invalid promo code');
        }

        setIsValidatingPromo(false);
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setUnlockedTickets([]);
        setPromoCode('');
        setPromoError(null);
    };

    // Calculate final total after discount
    const discountAmount = appliedPromo?.discountAmount ? parseFloat(appliedPromo.discountAmount) : 0;
    const finalTotal = Math.max(0, totalAmount - discountAmount);
    const currencyCode = event?.currency || safeTickets[0]?.currency || 'GBP';
    const currencySymbol = getCurrencySymbol(currencyCode);
    const maxDonationAmount = useMemo(() => {
        const rate = rates[currencyCode.toUpperCase()] ?? 1;
        return roundCurrencyLimit(LIMITS_GBP.donation * rate);
    }, [currencyCode, rates]);

    const organizerFeeNotes = useMemo(() => {
        const notes = new Map<string, string>();
        if (!event) {
            return notes;
        }

        const eventOrganizerFee = normalizeFeeValue(event.customBookingFee);
        const allTickets = [...regularTickets, ...regularUnlockedTickets];

        for (const ticket of allTickets) {
            const ticketPriceValue = parseFloat(ticket.price ?? '0');
            if (!Number.isFinite(ticketPriceValue) || ticketPriceValue <= 0) {
                continue;
            }
            const ticketCustomFee = 'customFee' in ticket
                ? normalizeFeeValue(ticket.customFee)
                : undefined;
            const resolvedFee = ticketCustomFee ?? eventOrganizerFee;
            if (!resolvedFee || resolvedFee <= 0) {
                continue;
            }

            const noteCurrency = ticket.currency ?? currencyCode;
            notes.set(
                ticket.id,
                `Organizer fee: ${formatCurrency(resolvedFee, noteCurrency)} per ticket`
            );
        }

        return notes;
    }, [currencyCode, event, regularTickets, regularUnlockedTickets]);

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
        if (checkoutQuote) {
            return checkoutQuote.platformFee;
        }
        if (!event || paidTicketCount === 0 || finalTotal <= 0) {
            return 0;
        }

        const feeTier = (event.feeTier ?? 'payg') as FeeTier;
        if (feeTier === 'token') {
            return 0;
        }

        return cartItems.reduce((sum, item) => {
            const unitPrice = getCartItemUnitPrice(item);
            if (unitPrice <= 0) {
                return sum;
            }
            const ticketAbsorbFee = 'absorbFee' in item.ticket
                ? item.ticket.absorbFee ?? false
                : event.absorbFee ?? false;
            if (ticketAbsorbFee) {
                return sum;
            }

            const feePerTicket = calculateFeePerTicket(
                feeTier,
                item.ticket.currency ?? currencyCode,
                rates
            );

            return sum + feePerTicket * item.quantity;
        }, 0);
    }, [event, paidTicketCount, finalTotal, cartItems, getCartItemUnitPrice, currencyCode, rates, checkoutQuote]);

    const organizerFeeAmount = useMemo(() => {
        if (checkoutQuote) {
            return checkoutQuote.organizerFee;
        }
        if (!event || paidTicketCount === 0 || finalTotal <= 0) {
            return 0;
        }

        const feeTier = (event.feeTier ?? 'payg') as FeeTier;
        if (feeTier !== 'token') {
            return 0;
        }

        const eventOrganizerFee = normalizeFeeValue(event.customBookingFee) ?? 0;

        return cartItems.reduce((sum, item) => {
            const unitPrice = getCartItemUnitPrice(item);
            if (unitPrice <= 0) {
                return sum;
            }

            const ticketOrganizerFee = 'customFee' in item.ticket
                ? normalizeFeeValue(item.ticket.customFee)
                : undefined;
            const resolvedFee = ticketOrganizerFee ?? eventOrganizerFee;
            if (!resolvedFee || resolvedFee <= 0) {
                return sum;
            }

            return sum + resolvedFee * item.quantity;
        }, 0);
    }, [event, paidTicketCount, finalTotal, cartItems, getCartItemUnitPrice, checkoutQuote]);

    const hasOrganizerFeeOverride = useMemo(() => {
        if (!event || cartItems.length === 0) {
            return false;
        }

        return cartItems.some((item) => {
            if (item.ticket.type === 'donation') {
                return false;
            }
            const unitPrice = getCartItemUnitPrice(item);
            if (unitPrice <= 0) {
                return false;
            }
            const ticketCustomFee = 'customFee' in item.ticket
                ? normalizeFeeValue(item.ticket.customFee)
                : undefined;
            return ticketCustomFee !== undefined;
        });
    }, [event, cartItems, getCartItemUnitPrice]);

    const processingFeeAmount = useMemo(() => {
        if (checkoutQuote) {
            return checkoutQuote.processingFee;
        }
        const base = finalTotal + platformFeeAmount + organizerFeeAmount;
        if (base <= 0) {
            return 0;
        }
        return calculateStripeProcessingFee(base, currencyCode);
    }, [finalTotal, platformFeeAmount, organizerFeeAmount, currencyCode, checkoutQuote]);

    const grandTotal = checkoutQuote ? checkoutQuote.total : finalTotal + platformFeeAmount + organizerFeeAmount + processingFeeAmount;
    const creditsApplied = checkoutQuote?.creditsApplied ?? 0;
    const quotePaidTicketCount = checkoutQuote?.paidTicketCount ?? paidTicketCount;
    const creditSplitNote = formatCreditSplitNote(creditsApplied, quotePaidTicketCount);

    const organizerFeeDetails = useMemo(() => {
        const details = new Map<string, { feePerTicket: number; creditQuantity: number; quantity: number }>();
        if (!event || cartItems.length === 0 || creditsApplied <= 0) {
            return details;
        }

        const eventOrganizerFee = normalizeFeeValue(event.customBookingFee);
        let remainingCredits = creditsApplied;

        for (const item of cartItems) {
            if (item.ticket.type === 'donation') {
                continue;
            }
            const unitPrice = getCartItemUnitPrice(item);
            if (unitPrice <= 0 || remainingCredits <= 0) {
                continue;
            }

            const creditQuantity = Math.min(remainingCredits, item.quantity);
            remainingCredits -= creditQuantity;
            if (creditQuantity <= 0) {
                continue;
            }

            const ticketCustomFee = 'customFee' in item.ticket
                ? normalizeFeeValue(item.ticket.customFee)
                : undefined;
            const resolvedFee = ticketCustomFee ?? eventOrganizerFee;
            if (!resolvedFee || resolvedFee <= 0) {
                continue;
            }

            details.set(item.ticket.id, {
                feePerTicket: resolvedFee,
                creditQuantity,
                quantity: item.quantity
            });
        }

        return details;
    }, [cartItems, creditsApplied, event, getCartItemUnitPrice]);

    useEffect(() => {
        if (!event?.id) {
            setCheckoutQuote(null);
            return;
        }
        if (cartItems.length === 0) {
            setCheckoutQuote(null);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const quote = await getCheckoutQuote(event.id, {
                items: cartItems.map((item) => ({
                    ticketTypeId: item.ticket.id,
                    quantity: item.quantity,
                    unitPrice: item.ticket.type === 'donation' ? item.subtotal : undefined
                })),
                promoCode: appliedPromo?.code
            });
            if (!cancelled) {
                setCheckoutQuote(quote);
            }
        }, 150);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [event?.id, cartItems, appliedPromo?.code]);

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

    useEffect(() => {
        if (!isEmbedCheckout) return;
        const frame = window.requestAnimationFrame(() => {
            const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
            window.parent?.postMessage(
                {
                    source: 'ht-embed',
                    type: 'resize',
                    height,
                },
                '*',
            );
        });
        return () => window.cancelAnimationFrame(frame);
    }, [isEmbedCheckout, isCheckoutOpen, checkoutStep]);

    // Validate current step before advancing
    const validateCurrentStep = (): string | null => {
        if (stepType === 'buyer') {
            if (!attendeeName.trim()) return 'Please enter your name.';
            if (attendeeName.trim().length < 2) return 'Name must be at least 2 characters.';
            if (!attendeeEmail.trim()) return 'Please enter your email.';
            if (!attendeeAge.trim()) return 'Please enter your age.';
            if (!attendeeGender) return 'Please select your gender.';
            const ageNum = Number(attendeeAge);
            if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
                return 'Please enter a valid age (13-120).';
            }
        } else if (stepType === 'ticket' && currentTicketIndex >= 0) {
            const attendee = ticketAttendees[currentTicketIndex];
            if (!attendee?.name?.trim()) return `Please enter name for Ticket ${currentTicketIndex + 1}.`;
            if (attendee.name.trim().length < 2) return `Ticket ${currentTicketIndex + 1}: name must be at least 2 characters.`;
            if (!attendee?.age?.trim()) return `Please enter age for Ticket ${currentTicketIndex + 1}.`;
            if (!attendee?.gender) return `Please select gender for Ticket ${currentTicketIndex + 1}.`;
            const ageNum = Number(attendee.age);
            if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
                return `Please enter a valid age (13-120) for Ticket ${currentTicketIndex + 1}.`;
            }
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
        setHasAttemptedSubmit(true);
        const error = validateCurrentStep();
        if (error) {
            setCheckoutError(error);
            return;
        }
        setCheckoutError(null);
        setHasAttemptedSubmit(false);
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
        if (attendeeName.trim().length < 2) {
            return 'Name must be at least 2 characters.';
        }

        const buyerAgeNumber = Number(attendeeAge);
        if (Number.isNaN(buyerAgeNumber) || buyerAgeNumber < 13 || buyerAgeNumber > 120) {
            return 'Please enter a valid age (13-120).';
        }

        if (!hasSelections) {
            return 'Please select at least one ticket or donation.';
        }
        if (donationAmount > maxDonationAmount) {
            return `Donation amount cannot exceed ${currencySymbol}${maxDonationAmount.toFixed(2)}.`;
        }

        if (requiresPerTicket) {
            if (ticketAttendees.length !== totalTickets) {
                return 'Please add attendee information for each ticket.';
            }

            for (let i = 0; i < ticketAttendees.length; i += 1) {
                const attendee = ticketAttendees[i];
                if (!attendee.name.trim() || !attendee.gender || !attendee.age.trim()) {
                    return `Ticket ${i + 1}: attendee name, gender, and age are required.`;
                }
                if (attendee.name.trim().length < 2) {
                    return `Ticket ${i + 1}: name must be at least 2 characters.`;
                }

                const ageNumber = Number(attendee.age);
                if (Number.isNaN(ageNumber) || ageNumber < 13 || ageNumber > 120) {
                    return `Ticket ${i + 1}: please enter a valid age (13-120).`;
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
            toast.error('Preview mode: checkout is disabled.');
            return;
        }
        if (!event || !attendeeEmail || !hasSelections) return;

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
            quantity: item.quantity,
            unitPrice: item.ticket.type === 'donation' ? item.subtotal : undefined
        }));

        if (eventPixelId && itemCountForTracking > 0) {
            track(eventPixelId, 'InitiateCheckout', {
                value: Number(grandTotal.toFixed(2)),
                currency: currencyCode,
                num_items: itemCountForTracking,
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
                    gender: attendee.gender as 'male' | 'female',
                    age: attendee.age ? Math.floor(Number(attendee.age)) : undefined,
                    customAnswers: hasAnswers ? normalizedAnswers : undefined,
                };
            })
            : undefined;

        const result = await handleCheckout(
            event.id,
            {
                items,
                attendeeName: attendeeName.trim(),
                attendeeEmail: attendeeEmail.trim(),
                attendeeAge: Math.floor(buyerAgeNumber),
                attendeeGender: attendeeGender as 'male' | 'female',
                useSharedInfo: !requiresPerTicket && useSharedInfo,
                ticketAttendees: ticketAttendeePayload,
                promoCode: appliedPromo?.code || promoCode.trim() || undefined,
            },
            { redirectTarget: isEmbedCheckout ? 'top' : 'self' },
        );

        if (!result.success) {
            const errorMessage = result.error || 'Checkout failed. Please try again.';
            setCheckoutError(errorMessage);
            toast.error(errorMessage);
            setIsProcessing(false);
            return;
        }

        // If free order, redirect to success
        if (result.isFreeOrder && result.orderId) {
            clearDraft(); // Clear saved form draft
            const successUrl = `/checkout/success?order_id=${result.orderId}`;
            if (isEmbedCheckout && window.top) {
                window.top.location.href = successUrl;
            } else {
                window.location.href = successUrl;
            }
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
    const refundPolicyText = event?.refundPolicy?.trim() ?? '';

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
        <div className={cn(isEmbedCheckout ? 'bg-transparent' : 'min-h-screen bg-muted/30')}>
            {!isEmbedCheckout && (
                <>
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
                </>
            )}

            {/* Content */}
            <div className={cn('container', isEmbedCheckout ? 'py-6' : 'py-8')}>
                <div className={cn('grid gap-8', isEmbedCheckout ? 'grid-cols-1' : 'lg:grid-cols-3')}>
                    {/* Main Content */}
                    {!isEmbedCheckout && (
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
                                                        View organiser profile →
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

                        {/* Refund Policy - Subtle Footer */}
                        {refundPolicyText && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.4 }}
                                className="pt-8 mt-8 border-t border-border/40"
                            >
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Refund Policy</p>
                                <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-prose whitespace-pre-wrap">
                                    {refundPolicyText}
                                </p>
                            </motion.div>
                        )}
                    </div>
                    )}

                    {/* Sidebar - Tickets */}
                    <div className={cn(isEmbedCheckout ? 'w-full' : 'lg:col-span-1')}>
                        {isEmbedCheckout && (
                            <div className="mb-4 space-y-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets for</p>
                                <h1 className="text-2xl font-bold">{event.title || 'Untitled Event'}</h1>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    {eventDateTime.date && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-primary" />
                                            {eventDateTime.date}
                                        </span>
                                    )}
                                    {eventDateTime.time && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5 text-primary" />
                                            {eventDateTime.time}
                                            {eventDateTime.endTime ? ` - ${eventDateTime.endTime}` : ''}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        {event.locationType === 'online' ? (
                                            <Globe className="h-3.5 w-3.5 text-primary" />
                                        ) : (
                                            <MapPin className="h-3.5 w-3.5 text-primary" />
                                        )}
                                        {event.locationType === 'online'
                                            ? 'Online Event'
                                            : [event.venue, event.city].filter(Boolean).join(', ') || 'Location TBD'}
                                    </span>
                                </div>
                            </div>
                        )}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className={cn(isEmbedCheckout ? '' : 'sticky top-8')}
                        >
                            <Card className="overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="h-5 w-5" />
                                        Tickets
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {!hasRegularTickets && !hasDonationOption ? (
                                        <p className="text-muted-foreground text-center py-4">
                                            No tickets available yet.
                                        </p>
                                    ) : (
                                        <>
                                            {regularTickets.map((ticket) => (
                                                <TicketCard
                                                    key={ticket.id}
                                                    ticket={ticket}
                                                    quantity={ticketQuantities[ticket.id] || 0}
                                                    onQuantityChange={(qty) => handleQuantityChange(ticket.id, qty)}
                                                    organizerFeeNote={organizerFeeNotes.get(ticket.id)}
                                                />
                                            ))}

                                            {/* Unlocked Hidden Tickets */}
                                            {regularUnlockedTickets.length > 0 && (
                                                <div className="pt-4 mt-4 border-t border-dashed relative">
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs font-medium text-amber-600 flex items-center gap-1">
                                                        Unlocked Tickets
                                                    </div>
                                                    <div className="space-y-4 pt-2">
                                                        {regularUnlockedTickets.map((ticket) => (
                                                            <div key={ticket.id} className="relative">
                                                                <div className="absolute -left-1 top-4 w-1 h-8 bg-amber-500 rounded-r-full" />
                                                                <TicketCard
                                                                    ticket={ticket}
                                                                    quantity={ticketQuantities[ticket.id] || 0}
                                                                    onQuantityChange={(qty) => handleQuantityChange(ticket.id, qty)}
                                                                    organizerFeeNote={organizerFeeNotes.get(ticket.id)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {hasDonationOption && donationTicket && (
                                                <div className="pt-4 mt-4 border-t border-dashed relative">
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs font-medium text-emerald-600">
                                                        Donation
                                                    </div>
                                                    <div className="pt-2">
                                                        <DonationCard
                                                            ticket={donationTicket}
                                                            amount={donationAmount}
                                                            maxAmount={maxDonationAmount}
                                                            currencySymbol={currencySymbol}
                                                            onAmountChange={handleDonationChange}
                                                        />
                                                    </div>
                                                </div>
                                            )}
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
                                                minLength={PROMO_CODE_MIN_LENGTH}
                                                maxLength={PROMO_CODE_MAX_LENGTH}
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
                                                    disabled={!promoCode.trim() || isValidatingPromo}
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
                                            {organizerFeeAmount > 0 && (
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>{hasOrganizerFeeOverride ? 'Organizer fee (custom)' : 'Organizer fee'}</span>
                                                    <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {platformFeeAmount > 0 && (
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>Platform fee</span>
                                                    <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {processingFeeAmount > 0 && (
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>Processing fee</span>
                                                    <span>{currencySymbol}{processingFeeAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            <Separator />
                                            <div className="flex justify-between font-semibold">
                                                <span>Total</span>
                                                <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                                            </div>
                                            {finalTotal > 0 && platformFeeAmount === 0 && organizerFeeAmount === 0 && processingFeeAmount === 0 && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    No additional fees! 🎉
                                                </p>
                                            )}
                                            {finalTotal > 0 && platformFeeAmount === 0 && organizerFeeAmount === 0 && processingFeeAmount > 0 && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    Processing fee applies.
                                                </p>
                                            )}
                                            {finalTotal > 0 && platformFeeAmount === 0 && organizerFeeAmount > 0 && processingFeeAmount > 0 && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    Organizer fee and processing fee apply.
                                                </p>
                                            )}
                                            {creditSplitNote && (
                                                <p className="text-xs text-muted-foreground text-center">
                                                    {creditSplitNote}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full"
                                        size="lg"
                                        disabled={(!hasRegularTickets && !hasDonationOption) || !hasSelections}
                                        onClick={handleOpenCheckout}
                                    >
                                        <ShoppingCart className="h-4 w-4 mr-2" />
                                        {!hasRegularTickets && !hasDonationOption
                                            ? 'No Tickets Available'
                                            : !hasSelections
                                                ? hasDonationOption && !hasRegularTickets
                                                    ? 'Add Donation'
                                                    : 'Select Tickets'
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
                <DialogContent className="sm:max-w-[850px] w-[95vw] p-0 overflow-hidden border-0 bg-transparent shadow-2xl gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <div className="bg-card flex flex-col md:flex-row md:min-h-[540px] md:max-h-[85vh] rounded-3xl overflow-hidden max-h-[calc(100dvh-2rem)] shadow-2xl border border-primary/10">

                        {/* LEFT PANEL: Brand & Order Summary */}
                        <div className="w-full md:w-[340px] bg-primary/5 border-b md:border-b-0 md:border-r border-border/50 p-4 md:p-6 flex flex-col relative overflow-hidden group shrink-0 md:shrink">
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
                                {cartItems.filter(item => item.ticket.type !== 'donation').map(item => {
                                    const isDonation = item.ticket.type === 'donation';
                                    const feeDetail = !isDonation ? organizerFeeDetails.get(item.ticket.id) : undefined;
                                    const feeNote = feeDetail
                                        ? `Organizer fee: ${formatCurrency(feeDetail.feePerTicket, currencyCode)} per ticket` +
                                        (feeDetail.creditQuantity < feeDetail.quantity
                                            ? ` (applies to ${feeDetail.creditQuantity} of ${feeDetail.quantity})`
                                            : '')
                                        : null;
                                    return (
                                        <div key={item.ticket.id} className="flex justify-between items-start text-sm group/item">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{item.ticket.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {isDonation ? 'Donation' : `Qty: ${item.quantity}`}
                                                </span>
                                                {feeNote ? (
                                                    <span className="text-xs text-muted-foreground">{feeNote}</span>
                                                ) : null}
                                            </div>
                                            <span className="font-semibold text-foreground">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                                {hasDonationOption && donationTicket && (
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{donationTicket.name}</span>
                                            <span className="text-xs text-muted-foreground">Optional donation</span>
                                        </div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={maxDonationAmount}
                                                step="0.01"
                                                value={donationAmount.toString()}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '') {
                                                        handleDonationChange(0);
                                                        return;
                                                    }
                                                    const numeric = Number(value);
                                                    if (Number.isFinite(numeric) && numeric >= 0) {
                                                        handleDonationChange(Math.min(numeric, maxDonationAmount));
                                                    }
                                                }}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Fees & Discounts */}
                                <Separator className="my-3 bg-primary/10" />

                                {organizerFeeAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>{hasOrganizerFeeOverride ? 'Organizer fee (custom)' : 'Organizer fee'}</span>
                                        <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {platformFeeAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Platform fee</span>
                                        <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {processingFeeAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Processing fee</span>
                                        <span>{currencySymbol}{processingFeeAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {appliedPromo && discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600 font-medium my-1">
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {appliedPromo.code}</span>
                                        <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {creditSplitNote && (
                                    <p className="text-xs text-muted-foreground">
                                        {creditSplitNote}
                                    </p>
                                )}
                            </div>

                            {/* Total Footer */}
                            <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-primary/10 relative z-10">
                                <div className="flex justify-between items-center md:items-end">
                                    <span className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                                    <span className="text-2xl md:text-3xl font-bold text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL: Wizard Form */}
                        <div className="flex-1 flex flex-col bg-card relative min-h-0 overflow-hidden">
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
                            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-2 custom-scrollbar min-h-0">
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
                                                    <Label htmlFor="buyerName" className={cn("text-xs font-medium", hasAttemptedSubmit && !attendeeName.trim() ? "text-destructive" : "text-muted-foreground")}>Full Name</Label>
                                                    <Input
                                                        id="buyerName"
                                                        value={attendeeName}
                                                        onChange={(e) => setAttendeeName(e.target.value)}
                                                        disabled={isProcessing}
                                                        autoFocus={false}
                                                        minLength={2}
                                                        maxLength={80}
                                                        className={cn("h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors", hasAttemptedSubmit && !attendeeName.trim() && "border-destructive ring-1 ring-destructive/30")}
                                                    />
                                                    {hasAttemptedSubmit && !attendeeName.trim() && (
                                                        <p className="text-xs text-destructive">Please enter your name</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="buyerEmail" className={cn("text-xs font-medium", hasAttemptedSubmit && !attendeeEmail.trim() ? "text-destructive" : "text-muted-foreground")}>Email Address</Label>
                                                    <Input
                                                        id="buyerEmail"
                                                        type="email"
                                                        value={attendeeEmail}
                                                        onChange={(e) => setAttendeeEmail(e.target.value)}
                                                        disabled={isProcessing}
                                                        maxLength={254}
                                                        className={cn("h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors", hasAttemptedSubmit && !attendeeEmail.trim() && "border-destructive ring-1 ring-destructive/30")}
                                                    />
                                                    {hasAttemptedSubmit && !attendeeEmail.trim() && (
                                                        <p className="text-xs text-destructive">Please enter your email</p>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="buyerAge" className={cn("text-xs font-medium", hasAttemptedSubmit && (!attendeeAge.trim() || Number(attendeeAge) < 13 || Number(attendeeAge) > 120) ? "text-destructive" : "text-muted-foreground")}>Age</Label>
                                                        <Input
                                                            id="buyerAge"
                                                            type="number"
                                                            min="13"
                                                            max="120"
                                                            value={attendeeAge}
                                                            onChange={(e) => setAttendeeAge(e.target.value)}
                                                            disabled={isProcessing}
                                                            className={cn("h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors", hasAttemptedSubmit && (!attendeeAge.trim() || Number(attendeeAge) < 13 || Number(attendeeAge) > 120) && "border-destructive ring-1 ring-destructive/30")}
                                                        />
                                                        {hasAttemptedSubmit && (!attendeeAge.trim() || Number(attendeeAge) < 13 || Number(attendeeAge) > 120) && (
                                                            <p className="text-xs text-destructive">Enter age 13-120</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className={cn("text-xs font-medium", hasAttemptedSubmit && !attendeeGender ? "text-destructive" : "text-muted-foreground")}>Gender</Label>
                                                        <Select value={attendeeGender} onValueChange={setAttendeeGender} disabled={isProcessing}>
                                                            <SelectTrigger className={cn("h-10 bg-muted/30 border-input/60 focus:bg-background transition-colors", hasAttemptedSubmit && !attendeeGender && "border-destructive ring-1 ring-destructive/30")}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="male">Male</SelectItem>
                                                                <SelectItem value="female">Female</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {hasAttemptedSubmit && !attendeeGender && (
                                                            <p className="text-xs text-destructive">Required</p>
                                                        )}
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
                                                        value={ticketAttendees[currentTicketIndex].name}
                                                        onChange={(e) => {
                                                            const updated = [...ticketAttendees];
                                                            updated[currentTicketIndex] = { ...updated[currentTicketIndex], name: e.target.value };
                                                            setTicketAttendees(updated);
                                                        }}
                                                        disabled={isProcessing}
                                                        minLength={2}
                                                        maxLength={80}
                                                        className="h-10 bg-muted/30"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">Age</Label>
                                                        <Input
                                                            type="number"
                                                            value={ticketAttendees[currentTicketIndex].age}
                                                            onChange={(e) => {
                                                                const updated = [...ticketAttendees];
                                                                updated[currentTicketIndex] = { ...updated[currentTicketIndex], age: e.target.value };
                                                                setTicketAttendees(updated);
                                                            }}
                                                            disabled={isProcessing}
                                                            min="13"
                                                            max="120"
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
                                                                <SelectValue />
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
                                                                        maxLength={500}
                                                                        className="h-10 bg-muted/30"
                                                                    />
                                                                )}
                                                                {q.type === 'checkbox' && q.options && q.options.length > 0 ? (
                                                                    <div className="space-y-2">
                                                                        {q.options.map((opt) => {
                                                                            const currentAnswers = (ticketAttendees[currentTicketIndex].customAnswers[q.id] || '').split(',').filter(Boolean);
                                                                            const isChecked = currentAnswers.includes(opt);
                                                                            return (
                                                                                <label key={opt} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isChecked}
                                                                                        onChange={(e) => {
                                                                                            const updated = [...ticketAttendees];
                                                                                            let newAnswers: string[];
                                                                                            if (e.target.checked) {
                                                                                                newAnswers = [...currentAnswers, opt];
                                                                                            } else {
                                                                                                newAnswers = currentAnswers.filter(a => a !== opt);
                                                                                            }
                                                                                            updated[currentTicketIndex] = {
                                                                                                ...updated[currentTicketIndex],
                                                                                                customAnswers: { ...updated[currentTicketIndex].customAnswers, [q.id]: newAnswers.join(',') }
                                                                                            };
                                                                                            setTicketAttendees(updated);
                                                                                        }}
                                                                                        disabled={isProcessing}
                                                                                        className="h-4 w-4 rounded border-border"
                                                                                    />
                                                                                    {opt}
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : q.type === 'checkbox' && (
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
                                                                            <SelectValue />
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
                                                        {cartItems.map(item => {
                                                            const isDonation = item.ticket.type === 'donation';
                                                            const feeDetail = !isDonation ? organizerFeeDetails.get(item.ticket.id) : undefined;
                                                            const feeNote = feeDetail
                                                                ? `Organizer fee: ${formatCurrency(feeDetail.feePerTicket, currencyCode)} per ticket` +
                                                                (feeDetail.creditQuantity < feeDetail.quantity
                                                                    ? ` (applies to ${feeDetail.creditQuantity} of ${feeDetail.quantity})`
                                                                    : '')
                                                                : null;
                                                            return (
                                                                <div key={item.ticket.id} className="flex flex-col text-muted-foreground">
                                                                    <div className="flex justify-between">
                                                                        <span>{isDonation ? item.ticket.name : `${item.quantity}× ${item.ticket.name}`}</span>
                                                                        <span>{currencySymbol}{item.subtotal.toFixed(2)}</span>
                                                                    </div>
                                                                    {feeNote ? (
                                                                        <span className="text-xs text-muted-foreground">{feeNote}</span>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        })}
                                                        {appliedPromo && discountAmount > 0 && (
                                                            <div className="flex justify-between text-green-600">
                                                                <span>Discount ({appliedPromo.code})</span>
                                                                <span>−{currencySymbol}{discountAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {organizerFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>{hasOrganizerFeeOverride ? 'Organizer fee (custom)' : 'Organizer fee'}</span>
                                                                <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {platformFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>Platform fee</span>
                                                                <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {processingFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>Processing fee</span>
                                                                <span>{currencySymbol}{processingFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {creditSplitNote && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {creditSplitNote}
                                                            </p>
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
                            <div className="p-4 md:p-8 pt-3 md:pt-4 pb-4 md:pb-6 mt-auto shrink-0 border-t md:border-t-0 border-border/30">
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
