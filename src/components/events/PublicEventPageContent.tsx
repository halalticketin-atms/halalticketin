'use client';

import { useCallback, useEffect, useMemo, useRef, useState, startTransition, type FormEvent } from 'react';
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
    Mail,
    Lock,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useMarketingConsentRequirement } from '@/hooks/useMarketingConsentRequirement';
import { useCookieConsent } from '@/context/cookie-consent-context';
import { getMetaTrackingContext } from '@/lib/meta-tracking';
import type { EventRecord, PublicEventRecord, PublicTicketRecord, TicketRecord } from '@/lib/events-api';
import { contactOrganizerByEventSlug } from '@/lib/events-api';
import { handleCheckout, CartItem, validatePromoCode, ValidatePromoResult, fetchUnlockedTickets, getCheckoutQuote, type CheckoutQuoteResponse, type TicketAttendeePayload } from '@/lib/checkout-api';
import { formatCurrency, getCurrencySymbol } from '@/lib/fees';
import { formatCreditSplitNote } from '@/lib/credit-notes';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { LIMITS_GBP, MAX_PER_ORDER, PROMO_CODE_MAX_LENGTH, PROMO_CODE_MIN_LENGTH, roundCurrencyLimit } from '@/lib/input-limits';
import { useOptionalAuth } from '@/context/auth-context';
import { differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { ShareDialog } from '@/components/share/ShareDialog';
import { toast } from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';
import { getAuthToken } from '@/lib/api';
import {
    normalizeCheckoutTicketAttendee,
    serializeCheckoutTicketAttendee,
    validateCheckoutTicketAttendee,
    type CheckoutTicketAttendeeForm,
} from '@/lib/checkout-ticket-attendees';
import {
    getPublicOrganizerContactFormError,
    isPublicOrganizerContactFormValid,
    normalizePublicOrganizerContactForm,
} from '@/lib/public-organizer-contact';

// Dynamic import to avoid SSR issues with Leaflet
const EventLocationMap = dynamic(
    () => import('@/components/events/EventLocationMap').then(mod => ({ default: mod.EventLocationMap })),
    { ssr: false, loading: () => <div className="h-[300px] rounded-lg bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">Loading map...</div> }
);

type EventLike = EventRecord | PublicEventRecord;
type TicketLike = PublicTicketRecord | TicketRecord;
type TicketSoldOutReason = 'event_capacity' | 'ticket_capacity' | null;

const QUOTE_CACHE_TTL_MS = 30000;
const QUOTE_MAX_AGE_MS = 120000;
const DONATION_QUOTE_DEBOUNCE_MS = 500;
const QUOTE_AGE_TICK_MS = 10000;
const INITIATE_CHECKOUT_QUOTE_WAIT_MS = 2000;

interface PublicEventPageContentProps {
    event: EventLike | null;
    tickets: TicketLike[];
    isLoading: boolean;
    error: string | null;
    isPreview?: boolean;
    organizerNameOverride?: string | null;
    embedMode?: 'checkout' | 'full';
    accessStatus?: 'required' | 'denied' | null;
    accessMessage?: string | null;
    accessCode?: string | null;
    onAccessSubmit?: (code: string) => void;
}

type TicketAttendee = CheckoutTicketAttendeeForm;

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

function buildInitiateCheckoutSignature(
    eventId: string | null | undefined,
    cartItems: Array<{ ticket: TicketLike; quantity: number; subtotal: number }>,
    options: {
        accessCode?: string | null;
        currency: string;
        promoCode?: string | null;
    }
) {
    if (!eventId || cartItems.length === 0) {
        return null;
    }

    const items = [...cartItems]
        .map((item) => ({
            id: item.ticket.id,
            quantity: item.quantity,
            subtotal: Number(item.subtotal.toFixed(2)),
            unitPrice: Number((item.subtotal / item.quantity).toFixed(2)),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
        eventId,
        items,
        currency: options.currency.toUpperCase(),
        promoCode: options.promoCode?.toUpperCase() ?? '',
        accessCode: options.accessCode ?? '',
    });
}

function buildMetaContents(
    cartItems: Array<{ ticket: TicketLike; quantity: number; subtotal: number }>,
    getUnitPrice: (item: { ticket: TicketLike; quantity: number; subtotal: number }) => number,
) {
    return cartItems
        .map((item) => ({
            id: item.ticket.id,
            quantity: item.quantity,
            item_price: Number(getUnitPrice(item).toFixed(2)),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Ticket card component with quantity selection.
 */
function TicketCard({
    ticket,
    quantity,
    onQuantityChange,
    organizerFeeNote,
    soldOut = false,
    soldOutReason = null,
}: {
    ticket: TicketLike;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
    organizerFeeNote?: string | null;
    soldOut?: boolean;
    soldOutReason?: TicketSoldOutReason;
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
    const soldOutMessage = soldOutReason === 'event_capacity' ? 'Event sold out' : 'Ticket sold out';

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-3 p-4 border rounded-lg transition-colors",
                soldOut ? "border-muted bg-muted/40 opacity-70" : "hover:border-primary/50",
            )}
            aria-disabled={soldOut}
        >
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium break-words">{ticket.name}</h4>
                    {soldOut ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-rose-700">
                            Sold out
                        </span>
                    ) : null}
                </div>
                {ticket.description && (
                    <p className="text-sm text-muted-foreground mt-1 break-words">{ticket.description}</p>
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
                {soldOut ? (
                    <p className="text-xs font-medium text-rose-700 mt-1">{soldOutMessage}</p>
                ) : null}
                {organizerFeeNote ? (
                    <p className="text-xs text-muted-foreground mt-1">{organizerFeeNote}</p>
                ) : null}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
                    disabled={quantity === 0 || soldOut}
                >
                    <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                    disabled={soldOut || quantity >= maxQty}
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
    onRemove,
}: {
    ticket: TicketLike;
    amount: number | null;
    maxAmount: number;
    currencySymbol: string;
    onAmountChange: (amount: number | null) => void;
    onRemove: () => void;
}) {
    const handleChange = (value: string) => {
        if (value === '') {
            onAmountChange(null);
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
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium break-words">{ticket.name}</h4>
                    {ticket.description && (
                        <p className="text-sm text-muted-foreground mt-1 break-words">{ticket.description}</p>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={onRemove}
                >
                    Remove
                </Button>
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
                        value={amount === null ? '' : amount.toString()}
                        onChange={(e) => handleChange(e.target.value)}
                        className="h-10 pl-6"
                    />
                </div>
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
    embedMode = 'full',
    accessStatus = null,
    accessMessage = null,
    accessCode = null,
    onAccessSubmit,
}: PublicEventPageContentProps) {
    const isEmbedCheckout = embedMode === 'checkout';
    const [accessCodeInput, setAccessCodeInput] = useState('');

    const handleAccessSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!onAccessSubmit) {
            return;
        }
        const trimmed = accessCodeInput.trim();
        if (!trimmed) {
            return;
        }
        onAccessSubmit(trimmed);
    }, [accessCodeInput, onAccessSubmit]);
    const safeTickets = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);
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
    const { marketingAllowed } = useCookieConsent();
    const eventPixelId =
        !isPreview && event && 'metaPixelId' in event ? event.metaPixelId : null;
    const organizerName =
        organizerNameOverride ?? (event && 'organizerName' in event ? event.organizerName : null);
    const canContactOrganizer =
        !isPreview && event && 'canContactOrganizer' in event ? Boolean(event.canContactOrganizer) : false;

    useMarketingConsentRequirement(Boolean(eventPixelId));

    const auth = useOptionalAuth();
    const user = auth?.user;
    const [previewToken, setPreviewToken] = useState<string | null>(null);

    useEffect(() => {
        if (!isPreview) {
            setPreviewToken(null);
            return;
        }

        const cachedToken = getAuthToken();
        if (cachedToken) {
            setPreviewToken(cachedToken);
        }

        let cancelled = false;
        getSupabase()
            .auth
            .getSession()
            .then(({ data }) => {
                if (!cancelled) {
                    setPreviewToken(data.session?.access_token ?? null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setPreviewToken(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [isPreview, user?.id]);

    // Fetch organizer profile for avatar
    const [organizerAvatar, setOrganizerAvatar] = useState<string | null>(null);
    useEffect(() => {
        if (!event?.organizerId || isEmbedCheckout) return;
        fetchPublicOrganizerProfile(event.organizerId)
            .then(res => setOrganizerAvatar(res.organizer.avatarUrl))
            .catch(() => setOrganizerAvatar(null));
    }, [event?.organizerId, isEmbedCheckout]);

    // Checkout state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isPosterViewerOpen, setIsPosterViewerOpen] = useState(false);
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactMessage, setContactMessage] = useState('');
    const [contactTrap, setContactTrap] = useState('');
    const [contactFormStartedAt, setContactFormStartedAt] = useState<number | null>(null);
    const [isContactSubmitting, setIsContactSubmitting] = useState(false);
    const [contactError, setContactError] = useState<string | null>(null);
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [donationAmount, setDonationAmount] = useState<number | null>(null);
    const [donationQuoteAmount, setDonationQuoteAmount] = useState<number | null>(null);
    const [isDonationActive, setIsDonationActive] = useState(false);
    const [attendeeName, setAttendeeName] = useState('');
    const [attendeeEmail, setAttendeeEmail] = useState('');
    const [attendeeAge, setAttendeeAge] = useState('');
    const [attendeeGender, setAttendeeGender] = useState('');
    const [promoCode, setPromoCode] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [checkoutStep, setCheckoutStep] = useState(0);
    const [checkoutQuote, setCheckoutQuote] = useState<CheckoutQuoteResponse | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [hasQuoteError, setHasQuoteError] = useState(false);
    const [quoteErrorMessage, setQuoteErrorMessage] = useState<string | null>(null);
    const [quoteCooldownUntil, setQuoteCooldownUntil] = useState<number | null>(null);
    const [, setCooldownTick] = useState(0);
    const [quoteAgeTick, setQuoteAgeTick] = useState(0);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const quoteCacheRef = useRef(new Map<string, { quote: CheckoutQuoteResponse; cachedAt: number }>());
    const lastQuoteSignatureRef = useRef<string | null>(null);
    const lastQuoteAtRef = useRef<number | null>(null);
    const quoteRequestIdRef = useRef(0);
    const promoValidationSignatureRef = useRef<string | null>(null);
    const donationDebounceRef = useRef<number | null>(null);
    const initiateCheckoutTimeoutRef = useRef<number | null>(null);
    const [pendingInitiateCheckout, setPendingInitiateCheckout] = useState<{
        signature: string;
        fallbackValue: number;
    } | null>(null);

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

    useEffect(() => {
        if (!isContactDialogOpen) {
            return;
        }

        setContactError(null);
        setContactFormStartedAt(Date.now());
        const defaultName = typeof user?.name === 'string' ? user.name : '';
        if (defaultName.trim()) {
            setContactName((current) => (current.trim() ? current : defaultName));
        }
        const defaultEmail = typeof user?.email === 'string' ? user.email : '';
        if (defaultEmail.trim()) {
            setContactEmail((current) => (current.trim() ? current : defaultEmail));
        }
    }, [isContactDialogOpen, user?.email, user?.name]);

    const resetContactForm = useCallback(() => {
        setContactName('');
        setContactEmail('');
        setContactMessage('');
        setContactTrap('');
        setContactFormStartedAt(null);
        setContactError(null);
    }, []);

    const canSubmitContactForm = isPublicOrganizerContactFormValid({
        name: contactName,
        email: contactEmail,
        message: contactMessage,
    });

    const handleContactOrganizerSubmit = useCallback(async (submitEvent: FormEvent<HTMLFormElement>) => {
        submitEvent.preventDefault();
        if (!event?.slug) {
            return;
        }

        const normalizedForm = normalizePublicOrganizerContactForm({
            name: contactName,
            email: contactEmail,
            message: contactMessage,
        });
        const validationError = getPublicOrganizerContactFormError(normalizedForm);
        if (validationError) {
            setContactError(validationError);
            return;
        }

        setContactError(null);
        setIsContactSubmitting(true);
        try {
            await contactOrganizerByEventSlug(
                event.slug,
                {
                    name: normalizedForm.name,
                    email: normalizedForm.email,
                    message: normalizedForm.message,
                    preferredContactMethod: contactTrap,
                    formStartedAt: contactFormStartedAt ?? Date.now(),
                },
                accessCode ? { accessCode } : undefined,
            );
            setIsContactDialogOpen(false);
            resetContactForm();
            toast.success(
                "Your message has been sent. If you don't hear back, check your spam folder for the organiser's reply."
            );
        } catch (submitError) {
            const fallbackMessage = 'We could not send your message right now. Please try again.';
            const apiMessage = submitError instanceof Error ? submitError.message : fallbackMessage;
            setContactError(apiMessage || fallbackMessage);
        } finally {
            setIsContactSubmitting(false);
        }
    }, [
        accessCode,
        contactEmail,
        contactFormStartedAt,
        contactMessage,
        contactName,
        contactTrap,
        event?.slug,
        resetContactForm,
    ]);

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
    const soldOutStateByTicketId = useMemo(() => {
        const allTickets = [...visibleTickets, ...unlockedTickets];
        return new Map<string, { isSoldOut: boolean; soldOutReason: TicketSoldOutReason }>(
            allTickets.map((ticket) => [
                ticket.id,
                {
                    isSoldOut: Boolean(ticket.isSoldOut),
                    soldOutReason: ticket.soldOutReason ?? null,
                },
            ]),
        );
    }, [unlockedTickets, visibleTickets]);

    const donationDefaultAmount = useMemo(() => {
        if (!donationTicket) {
            return 0;
        }
        const parsed = parseFloat(donationTicket.price ?? '0');
        return Number.isFinite(parsed) ? parsed : 0;
    }, [donationTicket]);

    useEffect(() => {
        if (!donationTicket) {
            if (donationDebounceRef.current) {
                window.clearTimeout(donationDebounceRef.current);
                donationDebounceRef.current = null;
            }
            setDonationAmount(null);
            setDonationQuoteAmount(null);
            setIsDonationActive(false);
            return;
        }
        setIsDonationActive(true);
        setDonationAmount((prev) => {
            if (prev !== null) {
                return prev;
            }
            return donationDefaultAmount;
        });
        setDonationQuoteAmount((prev) => {
            if (prev !== null) {
                return prev;
            }
            return donationDefaultAmount;
        });
    }, [donationTicket, donationDefaultAmount]);

    useEffect(() => {
        if (donationAmount === donationQuoteAmount) {
            return;
        }
        if (donationDebounceRef.current) {
            window.clearTimeout(donationDebounceRef.current);
        }
        donationDebounceRef.current = window.setTimeout(() => {
            setDonationQuoteAmount(donationAmount);
            donationDebounceRef.current = null;
        }, DONATION_QUOTE_DEBOUNCE_MS);
        return () => {
            if (donationDebounceRef.current) {
                window.clearTimeout(donationDebounceRef.current);
                donationDebounceRef.current = null;
            }
        };
    }, [donationAmount, donationQuoteAmount]);

    // --- Checkout Draft Persistence ---
    const DRAFT_KEY = event?.id ? `checkout_draft_${event.id}` : null;
    const INITIATE_CHECKOUT_STORAGE_KEY = event?.id ? `ht_initiate_checkout:${event.id}` : null;
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
                setTicketAttendees(
                    Array.isArray(draft.ticketAttendees)
                        ? draft.ticketAttendees.map((attendee: Partial<TicketAttendee>) =>
                            ({
                                ...normalizeCheckoutTicketAttendee(attendee),
                                giftDeliveryMode: undefined,
                                email: '',
                            })
                        )
                        : []
                );
            }
            if (draft.promoCode && !promoCode) {
                setPromoCode(draft.promoCode);
            }
            if (draft.useSharedInfo !== undefined) {
                setUseSharedInfo(draft.useSharedInfo);
            }
            if (draft.donationAmount === null) {
                setDonationAmount(null);
                setDonationQuoteAmount(null);
                setIsDonationActive(false);
            } else if (typeof draft.donationAmount === 'number') {
                setDonationAmount(draft.donationAmount);
                setDonationQuoteAmount(draft.donationAmount);
                setIsDonationActive(true);
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

    const wasInitiateCheckoutTracked = useCallback((signature: string) => {
        try {
            const stored = sessionStorage.getItem(INITIATE_CHECKOUT_STORAGE_KEY ?? '');
            const parsed = stored ? (JSON.parse(stored) as string[]) : [];
            return Array.isArray(parsed) && parsed.includes(signature);
        } catch {
            return false;
        }
    }, [INITIATE_CHECKOUT_STORAGE_KEY]);

    const markInitiateCheckoutTracked = useCallback((signature: string) => {
        try {
            const stored = sessionStorage.getItem(INITIATE_CHECKOUT_STORAGE_KEY ?? '');
            const parsed = stored ? (JSON.parse(stored) as string[]) : [];
            const next = Array.isArray(parsed) ? [...new Set([...parsed, signature])] : [signature];
            sessionStorage.setItem(INITIATE_CHECKOUT_STORAGE_KEY ?? '', JSON.stringify(next));
        } catch {
            // Ignore sessionStorage errors.
        }
    }, [INITIATE_CHECKOUT_STORAGE_KEY]);

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
        if (!donationTicket || donationAmount === null) {
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

    const quoteItems = useMemo<CartItem[]>(() => {
        const items: CartItem[] = ticketCartItems.map((item) => ({
            ticketTypeId: item.ticket.id,
            quantity: item.quantity
        }));
        if (donationTicket && donationQuoteAmount !== null && Number.isFinite(donationQuoteAmount) && donationQuoteAmount > 0) {
            items.push({
                ticketTypeId: donationTicket.id,
                quantity: 1,
                unitPrice: donationQuoteAmount
            });
        }
        return items;
    }, [ticketCartItems, donationTicket, donationQuoteAmount]);

    const totalAmount = useMemo(() =>
        cartItems.reduce((sum, item) => sum + item.subtotal, 0)
        , [cartItems]);

    const ticketSubtotal = useMemo(() =>
        ticketCartItems.reduce((sum, item) => sum + item.subtotal, 0)
        , [ticketCartItems]);

    const donationSubtotal = donationItem?.subtotal ?? 0;
    const shouldShowDonationInCheckoutSummary = donationSubtotal > 0;

    const totalTickets = useMemo(() =>
        ticketCartItems.reduce((sum, item) => sum + item.quantity, 0)
        , [ticketCartItems]);

    const ticketFlowSelections = useMemo(
        () =>
            ticketCartItems.flatMap((item) =>
                Array.from({ length: item.quantity }, () => ({
                    ticket: item.ticket,
                    canGift: getCartItemUnitPrice(item) > 0,
                }))
            ),
        [ticketCartItems, getCartItemUnitPrice]
    );

    const paidTicketCount = useMemo(() =>
        ticketCartItems.reduce((sum, item) => {
            const unitPrice = getCartItemUnitPrice(item);
            return unitPrice > 0 ? sum + item.quantity : sum;
        }, 0),
        [ticketCartItems, getCartItemUnitPrice]
    );
    const resolvedDonationAmount = donationAmount ?? 0;
    const hasSelections = totalTickets > 0 || resolvedDonationAmount > 0;
    const itemCountForTracking = totalTickets + (resolvedDonationAmount > 0 ? 1 : 0);
    const isDonationQuotePending = donationAmount !== donationQuoteAmount;
    const addToCartTimeoutRef = useRef<number | null>(null);
    const lastAddToCartSignatureRef = useRef<string | null>(null);

    const cooldownRemaining = quoteCooldownUntil
        ? Math.max(0, Math.ceil((quoteCooldownUntil - Date.now()) / 1000))
        : 0;
    const isRateLimited = cooldownRemaining > 0;

    const buildQuoteSignature = (promoCodeValue?: string | null) => {
        if (!event?.id || quoteItems.length === 0) {
            return null;
        }
        const normalizedItems = [...quoteItems]
            .sort((a, b) => a.ticketTypeId.localeCompare(b.ticketTypeId))
            .map((item) => ({
                ticketTypeId: item.ticketTypeId,
                quantity: item.quantity,
                unitPrice: item.unitPrice ?? null
            }));
        return JSON.stringify({
            eventId: event.id,
            items: normalizedItems,
            promoCode: promoCodeValue?.toUpperCase() ?? '',
            accessCode: accessCode ?? ''
        });
    };

    const quoteSignature = buildQuoteSignature(appliedPromo?.code);

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
        const soldOutState = soldOutStateByTicketId.get(ticketId);
        if (soldOutState?.isSoldOut) {
            setTicketQuantities(prev => {
                if ((prev[ticketId] ?? 0) === 0) {
                    return prev;
                }
                return {
                    ...prev,
                    [ticketId]: 0
                };
            });
            setPromoError(null);
            return;
        }

        setTicketQuantities(prev => ({
            ...prev,
            [ticketId]: quantity
        }));
        setPromoError(null);
    };

    useEffect(() => {
        setTicketQuantities(prev => {
            let changed = false;
            const next = { ...prev };

            for (const [ticketId, quantity] of Object.entries(prev)) {
                if (quantity > 0 && soldOutStateByTicketId.get(ticketId)?.isSoldOut) {
                    next[ticketId] = 0;
                    changed = true;
                }
            }

            return changed ? next : prev;
        });
    }, [soldOutStateByTicketId]);

    const handleDonationChange = (amount: number | null) => {
        if (amount === null || !Number.isFinite(amount)) {
            if (donationDebounceRef.current) {
                window.clearTimeout(donationDebounceRef.current);
                donationDebounceRef.current = null;
            }
            setDonationAmount(null);
            setDonationQuoteAmount(null);
            setPromoError(null);
            return;
        }
        const clamped = Math.min(Math.max(amount, 0), maxDonationAmount);
        setDonationAmount(clamped);
        setPromoError(null);
    };

    const handleAddDonation = () => {
        setIsDonationActive(true);
        handleDonationChange(donationDefaultAmount);
    };

    const handleRemoveDonation = () => {
        if (donationDebounceRef.current) {
            window.clearTimeout(donationDebounceRef.current);
            donationDebounceRef.current = null;
        }
        setIsDonationActive(false);
        setDonationAmount(null);
        setDonationQuoteAmount(null);
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
                    const normalized = prev[i]
                        ? normalizeCheckoutTicketAttendee(prev[i])
                        : normalizeCheckoutTicketAttendee();
                    newAttendees.push({
                        ...normalized,
                        giftDeliveryMode: undefined,
                        email: '',
                    });
                }
                return newAttendees;
            });
        });
    }, [requiresPerTicket, ticketFlowSelections, totalTickets]);

    const handleApplyPromo = async () => {
        if (!event || !promoCode.trim()) return;
        const previewAccessToken = isPreview ? previewToken ?? getAuthToken() ?? undefined : undefined;
        if (isPreview && !previewAccessToken) {
            setPromoError('Promo code validation is temporarily unavailable in preview.');
            return;
        }
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
        const result = await validatePromoCode(
            event.id,
            trimmedCode,
            promoItems,
            totalAmount,
            accessCode ?? undefined,
            previewAccessToken
        );

        if (result.valid) {
            setAppliedPromo(result);
            promoValidationSignatureRef.current = buildQuoteSignature(trimmedCode);
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
                        setAppliedPromo(null);
                        promoValidationSignatureRef.current = null;
                        setPromoError('Code is valid but no hidden tickets are currently available.');
                    }
                } else {
                    const unlocked = await fetchUnlockedTickets(
                        event.slug || '',
                        trimmedCode,
                        accessCode ?? undefined
                    );
                    if (unlocked && unlocked.length > 0) {
                        setUnlockedTickets(unlocked as TicketLike[]);
                        toast.success(`Unlocked ${unlocked.length} hidden ticket${unlocked.length === 1 ? '' : 's'}!`);
                    } else if (unlocked && (result.discountValue === '0' || result.discountValue === '0.00')) {
                        setAppliedPromo(null);
                        promoValidationSignatureRef.current = null;
                        // Reveal-only code but no tickets found
                        setPromoError('Code is valid but no hidden tickets are currently available.');
                    } else if (!unlocked) {
                        toast.error('Promo code applied, but hidden tickets could not be loaded. Please try again.');
                    }
                }
            }
        } else {
            setAppliedPromo(null);
            setUnlockedTickets([]);
            promoValidationSignatureRef.current = null;
            setPromoError(result.message || 'Invalid promo code');
        }

        setIsValidatingPromo(false);
    };

    const handleRemovePromo = () => {
        setAppliedPromo(null);
        setUnlockedTickets([]);
        setPromoCode('');
        promoValidationSignatureRef.current = null;
        setPromoError(null);
    };

    // Calculate final total after discount
    const appliedPromoDiscountAmount = appliedPromo?.discountAmount ? parseFloat(appliedPromo.discountAmount) : 0;
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
                `Organiser fee: ${formatCurrency(resolvedFee, noteCurrency)} per ticket`
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

    useEffect(() => {
        if (!hasSelections || cartItems.length === 0) {
            lastAddToCartSignatureRef.current = null;
            return;
        }

        if (!eventPixelId || isDonationQuotePending) {
            return;
        }

        const signature = JSON.stringify({
            items: cartItems.map((item) => ({
                id: item.ticket.id,
                quantity: item.quantity,
                subtotal: Number(item.subtotal.toFixed(2))
            })),
            currency: currencyCode
        });

        if (signature === lastAddToCartSignatureRef.current) {
            return;
        }

        if (addToCartTimeoutRef.current !== null) {
            window.clearTimeout(addToCartTimeoutRef.current);
        }

        addToCartTimeoutRef.current = window.setTimeout(() => {
            const contents = buildMetaContents(cartItems, getCartItemUnitPrice);

            track(eventPixelId, 'AddToCart', {
                value: Number(totalAmount.toFixed(2)),
                currency: currencyCode,
                num_items: itemCountForTracking,
                content_ids: event?.id ? [event.id] : undefined,
                content_type: 'product',
                contents
            });

            lastAddToCartSignatureRef.current = signature;
        }, 1200);

        return () => {
            if (addToCartTimeoutRef.current !== null) {
                window.clearTimeout(addToCartTimeoutRef.current);
            }
        };
    }, [
        cartItems,
        currencyCode,
        event?.id,
        eventPixelId,
        getCartItemUnitPrice,
        hasSelections,
        isDonationQuotePending,
        itemCountForTracking,
        totalAmount,
        track
    ]);

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

    const hasQuoteSnapshot = Boolean(checkoutQuote);
    const quoteAgeMs = lastQuoteAtRef.current ? Date.now() - lastQuoteAtRef.current : null;
    const quoteTooOld = hasQuoteSnapshot && quoteAgeMs !== null && quoteAgeMs > QUOTE_MAX_AGE_MS;
    const quoteFresh = hasQuoteSnapshot
        && quoteSignature === lastQuoteSignatureRef.current
        && !quoteTooOld
        && !isDonationQuotePending;
    const activeQuote = quoteFresh ? checkoutQuote : null;
    const initiateCheckoutSignature = buildInitiateCheckoutSignature(event?.id, cartItems, {
        accessCode,
        currency: currencyCode,
        promoCode: appliedPromo?.code ?? null,
    });
    const hasQuote = Boolean(activeQuote);
    const quoteSubtotal = activeQuote?.subtotal ?? totalAmount;
    const isPromoDiscountPendingForCurrentSelection =
        !activeQuote
        && Boolean(appliedPromo)
        && promoValidationSignatureRef.current !== null
        && promoValidationSignatureRef.current === quoteSignature;
    const quoteDiscountAmount = activeQuote?.discount ?? (isPromoDiscountPendingForCurrentSelection ? appliedPromoDiscountAmount : 0);
    const platformFeeAmount = activeQuote?.platformFee ?? 0;
    const organizerFeeAmount = activeQuote?.organizerFee ?? 0;
    const processingFeeAmount = activeQuote?.processingFee ?? 0;
    const processingFeeVatAmount = activeQuote?.processingFeeVat ?? 0;
    const hasProcessingFeeRow = processingFeeAmount > 0 || processingFeeVatAmount > 0;
    const processingFeeLabel = processingFeeVatAmount > 0
        ? 'Processing fee + 23% VAT'
        : 'Processing fee';
    const processingFeeDisplay = processingFeeVatAmount > 0
        ? `${currencySymbol}${processingFeeAmount.toFixed(2)} + ${currencySymbol}${processingFeeVatAmount.toFixed(2)}`
        : `${currencySymbol}${processingFeeAmount.toFixed(2)}`;
    const grandTotal = activeQuote?.total ?? 0;
    const discountedSubtotal = Math.max(0, quoteSubtotal - quoteDiscountAmount);
    const creditsApplied = activeQuote?.creditsApplied ?? 0;
    const quotePaidTicketCount = activeQuote?.paidTicketCount ?? paidTicketCount;
    const creditSplitNote = activeQuote
        ? formatCreditSplitNote(creditsApplied, quotePaidTicketCount)
        : null;
    const isQuoteBlocked = hasSelections && !quoteFresh;
    const isQuoteUpdating = (isQuoteLoading || isDonationQuotePending || quoteTooOld) && !isRateLimited;
    const quoteStatusLabel = isRateLimited
        ? `Retrying in ${cooldownRemaining}s`
        : isQuoteUpdating
            ? 'Calculating...'
            : 'Unable to calculate totals';
    const quoteTotalLabel = hasQuote
        ? `${currencySymbol}${grandTotal.toFixed(2)}`
        : quoteStatusLabel;

    const getFreshInitiateCheckoutTotal = useCallback((signature: string): number | null => {
        if (isDonationQuotePending || !initiateCheckoutSignature || signature !== initiateCheckoutSignature) {
            return null;
        }

        if (activeQuote) {
            return activeQuote.total;
        }

        const cached = quoteSignature ? quoteCacheRef.current.get(quoteSignature) : null;
        if (cached && Date.now() - cached.cachedAt <= QUOTE_MAX_AGE_MS) {
            return cached.quote.total;
        }

        return null;
    }, [activeQuote, initiateCheckoutSignature, isDonationQuotePending, quoteSignature]);

    const sendInitiateCheckout = useCallback((signature: string, value: number) => {
        if (!eventPixelId) {
            return;
        }

        track(eventPixelId, 'InitiateCheckout', {
            value: Number(value.toFixed(2)),
            currency: currencyCode,
            num_items: itemCountForTracking,
            content_ids: event?.id ? [event.id] : undefined,
            content_type: 'product',
            contents: buildMetaContents(cartItems, getCartItemUnitPrice),
        });
        markInitiateCheckoutTracked(signature);
        setPendingInitiateCheckout(null);
    }, [
        cartItems,
        currencyCode,
        event?.id,
        eventPixelId,
        getCartItemUnitPrice,
        itemCountForTracking,
        markInitiateCheckoutTracked,
        track,
    ]);

    const handleOpenCheckout = useCallback(() => {
        if (isPreview) {
            toast.error('Preview mode: checkout is disabled.');
            return;
        }

        const signature = initiateCheckoutSignature;
        if (eventPixelId && signature && itemCountForTracking > 0 && !wasInitiateCheckoutTracked(signature)) {
            const quotedTotal = getFreshInitiateCheckoutTotal(signature);
            if (quotedTotal !== null) {
                sendInitiateCheckout(signature, quotedTotal);
            } else {
                setPendingInitiateCheckout({
                    signature,
                    fallbackValue: Number(totalAmount.toFixed(2)),
                });
            }
        }

        setIsCheckoutOpen(true);
    }, [
        eventPixelId,
        getFreshInitiateCheckoutTotal,
        initiateCheckoutSignature,
        isPreview,
        itemCountForTracking,
        sendInitiateCheckout,
        totalAmount,
        wasInitiateCheckoutTracked,
    ]);

    useEffect(() => {
        if (!pendingInitiateCheckout || !eventPixelId || itemCountForTracking <= 0) {
            return;
        }

        if (wasInitiateCheckoutTracked(pendingInitiateCheckout.signature)) {
            setPendingInitiateCheckout(null);
            return;
        }

        if (pendingInitiateCheckout.signature !== initiateCheckoutSignature) {
            setPendingInitiateCheckout(null);
            return;
        }

        const quotedTotal = getFreshInitiateCheckoutTotal(pendingInitiateCheckout.signature);
        if (quotedTotal !== null) {
            sendInitiateCheckout(pendingInitiateCheckout.signature, quotedTotal);
            return;
        }

        if (initiateCheckoutTimeoutRef.current !== null) {
            window.clearTimeout(initiateCheckoutTimeoutRef.current);
        }

        initiateCheckoutTimeoutRef.current = window.setTimeout(() => {
            sendInitiateCheckout(pendingInitiateCheckout.signature, pendingInitiateCheckout.fallbackValue);
            initiateCheckoutTimeoutRef.current = null;
        }, INITIATE_CHECKOUT_QUOTE_WAIT_MS);

        return () => {
            if (initiateCheckoutTimeoutRef.current !== null) {
                window.clearTimeout(initiateCheckoutTimeoutRef.current);
                initiateCheckoutTimeoutRef.current = null;
            }
        };
    }, [
        eventPixelId,
        getFreshInitiateCheckoutTotal,
        initiateCheckoutSignature,
        itemCountForTracking,
        pendingInitiateCheckout,
        sendInitiateCheckout,
        wasInitiateCheckoutTracked,
    ]);
    const quoteStatusMessage = isRateLimited
        ? `Too many requests. Retrying in ${cooldownRemaining}s.`
        : isQuoteUpdating
            ? 'Updating totals...'
            : hasQuoteError
                ? (quoteErrorMessage || 'Unable to calculate totals. Please wait or adjust your selection.')
                : null;
    const promoNoDiscountMessage = hasSelections && quoteFresh && quoteDiscountAmount === 0 && unlockedTickets.length === 0;

    const organizerFeeDetails = useMemo(() => {
        const details = new Map<string, { feePerTicket: number; creditQuantity: number; quantity: number }>();
        if (!activeQuote || cartItems.length === 0 || activeQuote.lineAllocations.length === 0) {
            return details;
        }

        for (const item of cartItems) {
            if (item.ticket.type === 'donation') {
                continue;
            }

            const allocation = activeQuote.lineAllocations.reduce((acc, line) => {
                if (line.ticketTypeId !== item.ticket.id) {
                    return acc;
                }
                acc.creditQuantity += line.creditCoveredQuantity;
                acc.quantity += line.requestedQuantity;
                acc.feePerTicket = Math.max(acc.feePerTicket, line.organizerFeePerCreditUnit);
                return acc;
            }, { feePerTicket: 0, creditQuantity: 0, quantity: 0 });

            if (allocation.creditQuantity <= 0 || allocation.feePerTicket <= 0) {
                continue;
            }

            details.set(item.ticket.id, allocation);
        }

        return details;
    }, [activeQuote, cartItems]);

    useEffect(() => {
        if (!quoteCooldownUntil) {
            return;
        }
        const interval = window.setInterval(() => setCooldownTick((tick) => tick + 1), 1000);
        return () => window.clearInterval(interval);
    }, [quoteCooldownUntil]);

    useEffect(() => {
        if (!checkoutQuote) {
            return;
        }
        const interval = window.setInterval(() => setQuoteAgeTick((tick) => tick + 1), QUOTE_AGE_TICK_MS);
        return () => window.clearInterval(interval);
    }, [checkoutQuote]);

    useEffect(() => {
        if (quoteCooldownUntil && cooldownRemaining <= 0) {
            setQuoteCooldownUntil(null);
        }
    }, [quoteCooldownUntil, cooldownRemaining]);

    useEffect(() => {
        if (!event?.id || !hasSelections) {
            setCheckoutQuote(null);
            setIsQuoteLoading(false);
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            lastQuoteSignatureRef.current = null;
            lastQuoteAtRef.current = null;
            return;
        }
        if (!quoteSignature || quoteItems.length === 0) {
            setIsQuoteLoading(isDonationQuotePending);
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            return;
        }

        const previewAccessToken = isPreview ? previewToken ?? getAuthToken() ?? undefined : undefined;
        if (isPreview && !previewAccessToken) {
            setCheckoutQuote(null);
            setIsQuoteLoading(false);
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            return;
        }

        const isSameSignature = quoteSignature === lastQuoteSignatureRef.current && checkoutQuote;
        const lastQuoteAt = lastQuoteAtRef.current ?? 0;
        const quoteAgeMs = Date.now() - lastQuoteAt;
        const isQuoteStale = isSameSignature && quoteAgeMs > QUOTE_MAX_AGE_MS;
        if (isSameSignature && !isQuoteStale) {
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            return;
        }

        const cached = quoteCacheRef.current.get(quoteSignature);
        if (cached && Date.now() - cached.cachedAt <= QUOTE_CACHE_TTL_MS) {
            setCheckoutQuote(cached.quote);
            setIsQuoteLoading(false);
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            lastQuoteSignatureRef.current = quoteSignature;
            lastQuoteAtRef.current = cached.cachedAt;
            return;
        }

        if (quoteCooldownUntil && Date.now() < quoteCooldownUntil) {
            setIsQuoteLoading(false);
            setHasQuoteError(false);
            setQuoteErrorMessage(null);
            return;
        }

        setIsQuoteLoading(true);
        setHasQuoteError(false);
        setQuoteErrorMessage(null);

        const requestId = ++quoteRequestIdRef.current;
        const shouldRequestImmediately = pendingInitiateCheckout?.signature === quoteSignature;
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            const result = await getCheckoutQuote(event.id, {
                items: quoteItems,
                promoCode: appliedPromo?.code
            }, {
                accessCode: accessCode ?? undefined,
                accessToken: previewAccessToken
            });

            if (cancelled || quoteRequestIdRef.current !== requestId) {
                return;
            }

            setIsQuoteLoading(false);
            if (result.quote) {
                const cachedAt = Date.now();
                quoteCacheRef.current.set(quoteSignature, { quote: result.quote, cachedAt });
                lastQuoteSignatureRef.current = quoteSignature;
                lastQuoteAtRef.current = cachedAt;
                setCheckoutQuote(result.quote);
                setHasQuoteError(false);
                setQuoteErrorMessage(null);
                return;
            }

            if (result.error?.code === 'RATE_LIMIT_EXCEEDED' && result.error.retryAfter) {
                setQuoteCooldownUntil(Date.now() + result.error.retryAfter * 1000);
                setHasQuoteError(false);
                setQuoteErrorMessage(null);
                return;
            }

            if ((result.error?.adjustedItems && result.error.adjustedItems.length > 0) || (result.error?.unavailableTypes && result.error.unavailableTypes.length > 0)) {
                const nextQuantities: Record<string, number> = { ...ticketQuantities };
                let changed = false;

                for (const item of result.error.adjustedItems ?? []) {
                    const current = nextQuantities[item.ticketTypeId] ?? 0;
                    if (current !== item.quantity) {
                        nextQuantities[item.ticketTypeId] = item.quantity;
                        changed = true;
                    }
                }

                for (const ticketTypeId of result.error.unavailableTypes ?? []) {
                    const current = nextQuantities[ticketTypeId] ?? 0;
                    if (current !== 0) {
                        nextQuantities[ticketTypeId] = 0;
                        changed = true;
                    }
                }

                if (changed) {
                    setTicketQuantities(nextQuantities);
                    setAppliedPromo(null);
                    promoValidationSignatureRef.current = null;
                    setPromoError(null);
                    setHasQuoteError(false);
                    setQuoteErrorMessage(null);
                    const adjustmentMessage = result.error.message || 'Ticket quantities were adjusted to match availability.';
                    toast.error(adjustmentMessage);
                    return;
                }
            }

            setHasQuoteError(true);
            setCheckoutQuote(null);
            const backendIssues = result.error?.issues?.join(' ');
            setQuoteErrorMessage(backendIssues || result.error?.message || 'Unable to calculate totals. Please wait or adjust your selection.');
        }, shouldRequestImmediately ? 0 : 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [
        event?.id,
        hasSelections,
        quoteItems,
        quoteSignature,
        isDonationQuotePending,
        appliedPromo?.code,
        accessCode,
        pendingInitiateCheckout?.signature,
        isPreview,
        previewToken,
        checkoutQuote,
        quoteCooldownUntil,
        quoteAgeTick,
        ticketQuantities
    ]);

    // Step-based checkout: Step 0 = Buyer, Step 1..N = Tickets (if per-ticket), Final = Confirm
    const totalCheckoutSteps = requiresPerTicket ? 1 + totalTickets + 1 : 2;
    const stepType: 'buyer' | 'ticket' | 'confirm' =
        checkoutStep === 0 ? 'buyer'
            : checkoutStep <= totalTickets && requiresPerTicket ? 'ticket'
                : 'confirm';
    const currentTicketIndex = stepType === 'ticket' ? checkoutStep - 1 : -1;
    const currentTicketAttendee =
        stepType === 'ticket' && currentTicketIndex >= 0 ? ticketAttendees[currentTicketIndex] : null;
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
            return validateCheckoutTicketAttendee({
                attendee,
                ticketIndex: currentTicketIndex,
                questions: event?.customQuestions ?? undefined,
                allowGifting: false,
            });
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
        if (donationAmount !== null && donationAmount > maxDonationAmount) {
            return `Donation amount cannot exceed ${currencySymbol}${maxDonationAmount.toFixed(2)}.`;
        }

        if (requiresPerTicket) {
            if (ticketAttendees.length !== totalTickets) {
                return 'Please add attendee information for each ticket.';
            }

            for (let i = 0; i < ticketAttendees.length; i += 1) {
                const attendeeError = validateCheckoutTicketAttendee({
                    attendee: ticketAttendees[i],
                    ticketIndex: i,
                    questions: event?.customQuestions ?? undefined,
                    allowGifting: false,
                });
                if (attendeeError) {
                    return attendeeError;
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

        const latestQuoteAge = lastQuoteAtRef.current ? Date.now() - lastQuoteAtRef.current : null;
        const isLatestQuoteTooOld = latestQuoteAge !== null && latestQuoteAge > QUOTE_MAX_AGE_MS;
        const isQuoteReady = Boolean(checkoutQuote)
            && quoteSignature === lastQuoteSignatureRef.current
            && !isDonationQuotePending
            && !isLatestQuoteTooOld;

        if (!isQuoteReady) {
            setCheckoutError('Calculating totals. Please wait a moment and try again.');
            setIsProcessing(false);
            return;
        }

        const buyerAgeNumber = Number(attendeeAge);

        const ticketAttendeePayload: TicketAttendeePayload[] | undefined = requiresPerTicket
            ? ticketAttendees.map((attendee) => serializeCheckoutTicketAttendee(attendee))
            : undefined;

        const result = await handleCheckout(
            event.id,
            {
                items: quoteItems,
                attendeeName: attendeeName.trim(),
                attendeeEmail: attendeeEmail.trim(),
                attendeeAge: Math.floor(buyerAgeNumber),
                attendeeGender: attendeeGender as 'male' | 'female',
                useSharedInfo: !requiresPerTicket && useSharedInfo,
                ticketAttendees: ticketAttendeePayload,
                promoCode: appliedPromo?.code || undefined,
                tracking: getMetaTrackingContext(marketingAllowed),
            },
            { redirectTarget: isEmbedCheckout ? 'top' : 'self', accessCode: accessCode ?? undefined },
        );

        if (!result.success) {
            if (result.adjustedItems && result.adjustedItems.length > 0) {
                setTicketQuantities((prev) => {
                    const next = { ...prev };
                    for (const item of result.adjustedItems ?? []) {
                        next[item.ticketTypeId] = item.quantity;
                    }
                    return next;
                });
                setAppliedPromo(null);
                promoValidationSignatureRef.current = null;
                setPromoError(null);
                const errorMessage = result.error || 'Ticket quantities were adjusted to match availability. Please review and try again.';
                setCheckoutError(errorMessage);
                toast.error(errorMessage);
                setIsProcessing(false);
                return;
            }

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
    const showAccessGate = Boolean(accessStatus) && Boolean(onAccessSubmit);
    const accessSubmitting = isLoading && showAccessGate;
    const accessTitle = accessStatus === 'denied' ? 'Access code incorrect' : 'Access code required';
    const accessDescription =
        accessStatus === 'denied'
            ? accessMessage || 'The access code you entered is not valid. Try again.'
            : accessMessage || 'Enter the access code to view this event.';

    // Loading state
    if (showAccessGate) {
        return (
            <div className={cn(isEmbedCheckout ? 'bg-transparent' : 'min-h-screen bg-muted/30', 'flex items-center justify-center px-4')}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="max-w-lg w-full rounded-3xl border bg-background p-8 text-center shadow-lg"
                >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                        <Lock className="h-6 w-6" />
                    </div>
                    <h1 className="mt-4 font-display text-2xl font-bold">{accessTitle}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{accessDescription}</p>
                    <form onSubmit={handleAccessSubmit} className="mt-6 space-y-3">
                        <div className="space-y-1.5 text-left">
                            <Label htmlFor="accessCode" className="text-xs uppercase tracking-wide text-muted-foreground">Access code</Label>
                            <Input
                                id="accessCode"
                                type="password"
                                value={accessCodeInput}
                                onChange={(event) => setAccessCodeInput(event.target.value)}
                                placeholder="Enter access code"
                                className={cn(
                                    'h-11',
                                    accessStatus === 'denied' ? 'border-destructive focus-visible:ring-destructive' : ''
                                )}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full gap-2"
                            disabled={!accessCodeInput.trim() || accessSubmitting}
                        >
                            {accessSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Unlock event
                        </Button>
                    </form>
                    <p className="mt-4 text-xs text-muted-foreground">
                        Don&apos;t have the code? Contact the organiser for access.
                    </p>
                </motion.div>
            </div>
        );
    }

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
        <div className={cn(isEmbedCheckout ? 'bg-transparent' : 'min-h-screen bg-muted/30', 'overflow-x-hidden')}>
            {!isEmbedCheckout && (
                <>
                    <ShareDialog
                        open={isShareOpen}
                        onOpenChange={setIsShareOpen}
                        title={event.title || 'Event'}
                        text={organizerName ? `Hosted by ${organizerName}` : undefined}
                    />
                    <Dialog
                        open={isContactDialogOpen}
                        onOpenChange={(open) => {
                            setIsContactDialogOpen(open);
                            if (!open && !isContactSubmitting) {
                                resetContactForm();
                            }
                        }}
                    >
                        <DialogContent className="sm:max-w-lg">
                            <DialogTitle>Contact organiser</DialogTitle>
                            <form className="space-y-4" onSubmit={handleContactOrganizerSubmit}>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-organizer-name">Your name</Label>
                                    <Input
                                        id="contact-organizer-name"
                                        value={contactName}
                                        onChange={(inputEvent) => setContactName(inputEvent.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={80}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-organizer-email">Your email</Label>
                                    <Input
                                        id="contact-organizer-email"
                                        type="email"
                                        value={contactEmail}
                                        onChange={(inputEvent) => setContactEmail(inputEvent.target.value)}
                                        placeholder="you@example.com"
                                        maxLength={254}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contact-organizer-message">Message</Label>
                                    <Textarea
                                        id="contact-organizer-message"
                                        value={contactMessage}
                                        onChange={(inputEvent) => setContactMessage(inputEvent.target.value)}
                                        placeholder="Write your message to the organiser"
                                        minLength={20}
                                        maxLength={2000}
                                        rows={6}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Replies will come from the organiser directly.
                                    </p>
                                </div>
                                <div className="hidden" aria-hidden="true">
                                    <Label htmlFor="contact-organizer-preferred-method">
                                        Preferred contact method
                                    </Label>
                                    <Input
                                        id="contact-organizer-preferred-method"
                                        value={contactTrap}
                                        onChange={(inputEvent) => setContactTrap(inputEvent.target.value)}
                                        tabIndex={-1}
                                        autoComplete="off"
                                    />
                                </div>
                                {contactError ? (
                                    <p className="text-sm text-destructive">{contactError}</p>
                                ) : null}
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsContactDialogOpen(false);
                                            resetContactForm();
                                        }}
                                        disabled={isContactSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isContactSubmitting || !canSubmitContactForm}
                                    >
                                        {isContactSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send message'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                    {event.bannerImageUrl && (
                        <Dialog
                            open={isPosterViewerOpen}
                            onOpenChange={setIsPosterViewerOpen}
                        >
                            <DialogContent
                                showCloseButton={false}
                                className="!top-0 !left-0 !translate-x-0 !translate-y-0 h-[100dvh] max-h-[100dvh] w-screen max-w-screen rounded-none border-0 bg-black/95 p-0 gap-0 overflow-auto"
                            >
                                <DialogTitle className="sr-only">Event poster</DialogTitle>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsPosterViewerOpen(false)}
                                    className="absolute right-3 top-[max(env(safe-area-inset-top),0.75rem)] z-30 h-10 w-10 rounded-full border border-[var(--brand-cyan)]/60 bg-black/70 text-[var(--brand-cyan)] hover:bg-black/85 hover:text-[var(--brand-cyan)]"
                                    aria-label="Close poster viewer"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                                <div className="flex min-h-full min-w-full items-center justify-center p-4 sm:p-6">
                                    <div className="relative h-[calc(100dvh-2rem)] w-[min(100vw-2rem,900px)]">
                                        <Image
                                            src={event.bannerImageUrl}
                                            alt={event.title || 'Event poster'}
                                            fill
                                            className="rounded-lg object-contain"
                                            sizes="100vw"
                                        />
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {/* Hero Section - Poster with Blurred Background */}
                    <div className="relative">
                        {/* Blurred Background Layer */}
                        <div className="relative h-[460px] sm:h-[500px] md:h-[520px] overflow-hidden">
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
                                        <button
                                            type="button"
                                            onClick={() => setIsPosterViewerOpen(true)}
                                            className="group relative block h-full w-full"
                                            aria-label="Open event poster in fullscreen"
                                        >
                                            <Image
                                                src={event.bannerImageUrl}
                                                alt={event.title || 'Event'}
                                                fill
                                                className="object-cover"
                                                priority
                                            />
                                        </button>
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
                        <div className="lg:col-span-2 min-w-0 space-y-8">
                            {/* Title */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <h1 className="font-display text-3xl sm:text-4xl font-bold break-words">
                                    {event.title || 'Untitled Event'}
                                </h1>
                            </motion.div>

                            {/* Organizer Card - Prominent Design */}
                            {organizerName && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.05 }}
                                    className="space-y-3"
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
                                                            Event Organiser
                                                        </p>
                                                        <p className="font-semibold text-lg leading-snug break-words group-hover:text-primary transition-colors">
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

                                    {canContactOrganizer ? (
                                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact organiser</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Questions about this event? Send a message to the organiser.
                                                    </p>
                                                </div>
                                                <Button
                                                    className="shrink-0"
                                                    onClick={() => setIsContactDialogOpen(true)}
                                                >
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Contact organiser
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </motion.div>
                            )}

                            {/* Date, Time, Location Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="flex flex-wrap gap-4"
                            >
                                <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    <span className="break-words">{eventDateTime.date}</span>
                                </div>
                                {eventDateTime.time && (
                                    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                        <Clock className="h-5 w-5 text-primary" />
                                        <span className="break-words">
                                            {eventDateTime.time}
                                            {eventDateTime.endTime && ` - ${eventDateTime.endTime}`}
                                        </span>
                                    </div>
                                )}
                                <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                    {event.locationType === 'online' ? (
                                        <>
                                            <Globe className="h-5 w-5 text-primary" />
                                            <span className="break-words">Online Event</span>
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-5 w-5 text-primary" />
                                            <span className="break-words">
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
                                                <div className="flex-1 min-w-0">
                                                    {event.venue && (
                                                        <p className="font-medium break-words">{event.venue}</p>
                                                    )}
                                                    {event.address && (
                                                        <p className="text-muted-foreground break-words">{event.address}</p>
                                                    )}
                                                    {event.city && (
                                                        <p className="text-muted-foreground break-words">
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
                    <div className={cn(isEmbedCheckout ? 'w-full' : 'lg:col-span-1', 'min-w-0')}>
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
                            className={cn(isEmbedCheckout ? '' : 'lg:sticky lg:top-8')}
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
                                                    soldOut={soldOutStateByTicketId.get(ticket.id)?.isSoldOut ?? false}
                                                    soldOutReason={soldOutStateByTicketId.get(ticket.id)?.soldOutReason ?? null}
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
                                                                    soldOut={soldOutStateByTicketId.get(ticket.id)?.isSoldOut ?? false}
                                                                    soldOutReason={soldOutStateByTicketId.get(ticket.id)?.soldOutReason ?? null}
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
                                                        {!isDonationActive ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={handleAddDonation}
                                                            >
                                                                Add donation
                                                            </Button>
                                                        ) : (
                                                            <DonationCard
                                                                ticket={donationTicket}
                                                                amount={donationAmount}
                                                                maxAmount={maxDonationAmount}
                                                                currencySymbol={currencySymbol}
                                                                onAmountChange={handleDonationChange}
                                                                onRemove={handleRemoveDonation}
                                                            />
                                                        )}
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
                                                        promoValidationSignatureRef.current = null;
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
                                            <p className={cn(
                                                'text-xs flex items-center gap-1',
                                                promoNoDiscountMessage ? 'text-amber-600' : 'text-green-600'
                                            )}>
                                                {promoNoDiscountMessage
                                                    ? 'Code valid for this event, but no discount applies to this selection'
                                                    : `${quoteDiscountAmount > 0
                                                        ? (appliedPromo.discountType === 'percentage'
                                                            ? `✓ Code applied: ${appliedPromo.discountValue}% off`
                                                            : `✓ Code applied: ${currencySymbol}${appliedPromo.discountValue} off`)
                                                        : unlockedTickets.length > 0
                                                            ? '✓ Code applied: hidden tickets unlocked'
                                                            : hasSelections
                                                                ? '✓ Code applied: updating discount...'
                                                                : appliedPromo.revealsHiddenTickets
                                                                    ? '✓ Code applied: hidden tickets will unlock if available'
                                                                    : appliedPromo.applicableTicketTypeIds?.length
                                                                        ? '✓ Code applied: will apply to eligible tickets in your basket'
                                                                        : '✓ Code applied: will apply to tickets in your basket'}`}
                                            </p>
                                        )}
                                    </div>

                                    {hasSelections && (
                                        <div className="space-y-2 bg-primary/5 p-3 rounded-lg">
                                            {totalTickets > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span>{totalTickets} ticket{totalTickets > 1 ? 's' : ''}</span>
                                                    <span>{currencySymbol}{ticketSubtotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {donationSubtotal > 0 && (
                                                <div className="flex justify-between text-sm">
                                                    <span>Donation</span>
                                                    <span>{currencySymbol}{donationSubtotal.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {appliedPromo && quoteDiscountAmount > 0 && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Discount ({appliedPromo.code})</span>
                                                    <span>-{currencySymbol}{quoteDiscountAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {hasQuote ? (
                                                <>
                                                    {organizerFeeAmount > 0 && (
                                                        <div className="flex justify-between text-sm text-muted-foreground">
                                                            <span>{hasOrganizerFeeOverride ? 'Organiser fee (custom)' : 'Organiser fee'}</span>
                                                            <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {platformFeeAmount > 0 && (
                                                        <div className="flex justify-between text-sm text-muted-foreground">
                                                            <span>Platform fee</span>
                                                            <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    {hasProcessingFeeRow && (
                                                        <div className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                                                            <span className="min-w-0">{processingFeeLabel}</span>
                                                            <span className="shrink-0 text-right whitespace-nowrap">{processingFeeDisplay}</span>
                                                        </div>
                                                    )}
                                                    <Separator />
                                                    <div className="flex justify-between font-semibold">
                                                        <span>Total</span>
                                                        <span>{currencySymbol}{grandTotal.toFixed(2)}</span>
                                                    </div>
                                                    {quoteFresh && discountedSubtotal > 0 && platformFeeAmount === 0 && organizerFeeAmount === 0 && processingFeeAmount === 0 && (
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            No additional fees! 🎉
                                                        </p>
                                                    )}
                                                    {quoteFresh && discountedSubtotal > 0 && platformFeeAmount === 0 && organizerFeeAmount === 0 && processingFeeAmount > 0 && processingFeeVatAmount === 0 && (
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            Processing fee applies.
                                                        </p>
                                                    )}
                                                    {quoteFresh && discountedSubtotal > 0 && platformFeeAmount === 0 && organizerFeeAmount > 0 && processingFeeAmount > 0 && processingFeeVatAmount === 0 && (
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            Organiser fee and processing fee apply.
                                                        </p>
                                                    )}
                                                    {creditSplitNote && (
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            {creditSplitNote}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <Separator />
                                                    <div className="flex justify-between font-semibold text-muted-foreground">
                                                        <span>Total</span>
                                                        <span>{quoteStatusLabel}</span>
                                                    </div>
                                                    {quoteStatusMessage && (
                                                        <p className="text-xs text-muted-foreground text-center">
                                                            {quoteStatusMessage}
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        type="button"
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
                <DialogContent
                    showCloseButton={false}
                    className="w-[calc(100vw-2rem)] sm:w-[95vw] sm:max-w-[850px] p-0 overflow-hidden border-0 bg-transparent shadow-none gap-0 max-h-[calc(100dvh-2rem)] !top-1/2 !translate-y-[-50%]"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="relative bg-card flex min-h-0 max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-primary/10 shadow-2xl md:min-h-[540px] md:max-h-[85vh] md:flex-row md:rounded-3xl">
                        <button
                            type="button"
                            aria-label="Close checkout"
                            onClick={() => setIsCheckoutOpen(false)}
                            className="absolute top-2 right-2 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-muted-foreground shadow-sm ring-1 ring-black/5 transition-colors hover:text-foreground active:scale-[0.98] md:top-3 md:right-3"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* LEFT PANEL: Brand & Order Summary */}
                        <div className="w-full max-h-[38dvh] min-w-0 md:max-h-none md:w-[340px] bg-primary/5 border-b md:border-b-0 md:border-r border-border/50 p-3.5 md:p-6 flex flex-col relative overflow-hidden group shrink-0 md:shrink">
                            {/* Decorative background accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none transition-opacity duration-700 group-hover:opacity-70" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none" />

                            {/* Header */}
                            <div className="mb-4 md:mb-6 relative z-10">
                                <Link href="/" className="inline-block relative h-7 w-24 md:h-8 mb-3 md:mb-4 opacity-90 hover:opacity-100 transition-opacity">
                                    <Image
                                        src="/images/HTlogocr.png"
                                        alt="Halal Ticketin"
                                        fill
                                        className="object-contain object-left"
                                    />
                                </Link>
                                <h3 className="text-lg md:text-xl font-display font-bold text-foreground leading-tight">
                                    Order Summary
                                </h3>
                                {(event?.title) && (
                                    <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-1">{event.title}</p>
                                )}
                            </div>

                            {/* Items List */}
                            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-2.5 md:space-y-3 relative z-10 custom-scrollbar">
                                {cartItems.filter(item => item.ticket.type !== 'donation').map(item => {
                                    const isDonation = item.ticket.type === 'donation';
                                    const feeDetail = !isDonation ? organizerFeeDetails.get(item.ticket.id) : undefined;
                                    const feeNote = feeDetail
                                        ? `Organiser fee: ${formatCurrency(feeDetail.feePerTicket, currencyCode)} per ticket` +
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
                                {shouldShowDonationInCheckoutSummary && donationTicket && (
                                    <div className="flex justify-between items-start text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{donationTicket.name}</span>
                                            <span className="text-xs text-muted-foreground">Optional donation</span>
                                        </div>
                                        <span className="font-semibold text-foreground">{currencySymbol}{donationSubtotal.toFixed(2)}</span>
                                    </div>
                                )}

                                {/* Fees & Discounts */}
                                <Separator className="my-3 bg-primary/10" />

                                {(totalTickets > 0 || donationSubtotal > 0) && (
                                    <div className="space-y-2">
                                        {totalTickets > 0 && (
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>{totalTickets} ticket{totalTickets > 1 ? 's' : ''}</span>
                                                <span>{currencySymbol}{ticketSubtotal.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {donationSubtotal > 0 && (
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>Donation</span>
                                                <span>{currencySymbol}{donationSubtotal.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {hasQuote ? (
                                    <>
                                        {organizerFeeAmount > 0 && (
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>{hasOrganizerFeeOverride ? 'Organiser fee (custom)' : 'Organiser fee'}</span>
                                                <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {platformFeeAmount > 0 && (
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>Platform fee</span>
                                                <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {hasProcessingFeeRow && (
                                            <div className="flex items-start justify-between gap-3 text-sm text-muted-foreground">
                                                <span className="min-w-0">{processingFeeLabel}</span>
                                                <span className="shrink-0 text-right whitespace-nowrap">{processingFeeDisplay}</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Total</span>
                                        <span>{quoteStatusLabel}</span>
                                    </div>
                                )}

                                {appliedPromo && quoteDiscountAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-emerald-600 font-medium my-1">
                                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {appliedPromo.code}</span>
                                        <span>−{currencySymbol}{quoteDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {creditSplitNote && (
                                    <p className="text-xs text-muted-foreground">
                                        {creditSplitNote}
                                    </p>
                                )}
                            </div>

                            {/* Total Footer */}
                            <div className="mt-3 md:mt-6 pt-2.5 md:pt-4 border-t border-primary/10 relative z-10">
                                <div className="flex justify-between items-center md:items-end">
                                    <span className="text-[11px] md:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                                    <span
                                        className={cn(
                                            'text-xl md:text-3xl font-bold text-primary',
                                            !hasQuote && 'text-sm md:text-base text-muted-foreground font-medium'
                                        )}
                                    >
                                        {quoteTotalLabel}
                                    </span>
                                </div>
                                {quoteStatusMessage && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {quoteStatusMessage}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Wizard Form */}
                        <div className="flex-1 min-w-0 flex flex-col bg-card relative min-h-0 overflow-hidden">
                            {/* Wizard Header */}
                            <div className="px-4 pt-4 pb-1.5 md:px-8 md:pt-6 md:pb-2">
                                {/* Step Indicators */}
                                <div className="flex items-center justify-between mb-4 md:mb-6">
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
                                            <div key={label} className="flex flex-col items-center gap-1.5 md:gap-2 relative z-10 flex-1">
                                                <div className={cn(
                                                    "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold transition-all duration-300 border-2",
                                                    (isActive || isCompleted)
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "bg-transparent border-muted-foreground/30 text-muted-foreground"
                                                )}>
                                                    {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                <span className={cn(
                                                    "text-[11px] md:text-xs font-medium transition-colors duration-300",
                                                    (isActive || isCompleted) ? "text-primary" : "text-muted-foreground"
                                                )}>{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <DialogTitle className="sr-only">Checkout</DialogTitle>
                            </div>

                            {/* Scrollable Form Area */}
                            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-2 md:py-2.5 custom-scrollbar min-h-0">
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
                                            <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                                                <h4 className="min-w-0 text-base md:text-lg font-bold text-foreground">
                                                    {stepType === 'buyer' && 'Contact Information'}
                                                    {stepType === 'ticket' && `Ticket ${currentTicketIndex + 1} Details`}
                                                    {stepType === 'confirm' && 'Payment Details'}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {stepType === 'buyer' && 'Where should we send your tickets?'}
                                                {stepType === 'ticket' && 'Provide attendee information for this ticket.'}
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
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                                {event?.attendeeInfoMode === 'buyer_choice' && totalTickets > 0 && !forcePerTicket && (
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
                                                            {totalTickets > 1
                                                                ? 'Save time: use this info for all tickets'
                                                                : 'Save time: use this info for this ticket'}
                                                        </label>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Ticket Step (Same as before but styled) */}
                                        {stepType === 'ticket' && currentTicketIndex >= 0 && currentTicketAttendee && (
                                            <>
                                                    <>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-medium text-muted-foreground">Attendee Name</Label>
                                                            <Input
                                                                value={currentTicketAttendee.name}
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
                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">Age</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={currentTicketAttendee.age}
                                                                    onChange={(e) => {
                                                                        const updated = [...ticketAttendees];
                                                                        updated[currentTicketIndex] = { ...updated[currentTicketIndex], age: e.target.value };
                                                                        setTicketAttendees(updated);
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    min="0"
                                                                    max="120"
                                                                    className="h-10 bg-muted/30"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">Gender</Label>
                                                                <Select
                                                                    value={currentTicketAttendee.gender}
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
                                                                                value={currentTicketAttendee.customAnswers[q.id] || ''}
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
                                                                                    const currentAnswers = (currentTicketAttendee.customAnswers[q.id] || '').split(',').filter(Boolean);
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
                                                                                    checked={currentTicketAttendee.customAnswers[q.id] === 'true'}
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
                                                                                value={currentTicketAttendee.customAnswers[q.id] || ''}
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
                                            </>
                                        )}

                                        {/* Confirm/Payment Simulation Step */}
                                        {stepType === 'confirm' && (
                                            <div className="space-y-4">
                                                <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Total</span>
                                                        <span
                                                            className={cn(
                                                                'text-2xl font-bold text-foreground',
                                                                !hasQuote && 'text-sm font-medium text-muted-foreground'
                                                            )}
                                                        >
                                                            {quoteTotalLabel}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5 text-sm">
                                                        {cartItems.map(item => {
                                                            const isDonation = item.ticket.type === 'donation';
                                                            const feeDetail = !isDonation ? organizerFeeDetails.get(item.ticket.id) : undefined;
                                                            const feeNote = feeDetail
                                                                ? `Organiser fee: ${formatCurrency(feeDetail.feePerTicket, currencyCode)} per ticket` +
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
                                                        {appliedPromo && quoteDiscountAmount > 0 && (
                                                            <div className="flex justify-between text-green-600">
                                                                <span>Discount ({appliedPromo.code})</span>
                                                                <span>−{currencySymbol}{quoteDiscountAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {hasQuote && organizerFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>{hasOrganizerFeeOverride ? 'Organiser fee (custom)' : 'Organiser fee'}</span>
                                                                <span>{currencySymbol}{organizerFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {hasQuote && platformFeeAmount > 0 && (
                                                            <div className="flex justify-between text-muted-foreground">
                                                                <span>Platform fee</span>
                                                                <span>{currencySymbol}{platformFeeAmount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        {hasQuote && hasProcessingFeeRow && (
                                                            <div className="flex items-start justify-between gap-3 text-muted-foreground">
                                                                <span className="min-w-0">{processingFeeLabel}</span>
                                                                <span className="shrink-0 text-right whitespace-nowrap">{processingFeeDisplay}</span>
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
                                                                    <span className="text-muted-foreground">Ticket {i + 1}:</span>{' '}
                                                                    {att.name}
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
                            <div className="px-3.5 md:px-8 pb-3.5 md:pb-6 pt-2.5 md:pt-4 mt-auto shrink-0 border-t md:border-t-0 border-border/30">
                                {stepType !== 'confirm' ? (
                                    <Button
                                        type="button"
                                        className="w-full h-10 md:h-11 text-sm md:text-base shadow-lg shadow-primary/20"
                                        onClick={handleNextStep}
                                        disabled={isProcessing}
                                    >
                                        Continue
                                        <ArrowRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        className="w-full h-10 md:h-11 text-sm md:text-base font-bold shadow-lg shadow-primary/20"
                                        onClick={handleProceedToCheckout}
                                        disabled={isProcessing || isQuoteBlocked}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : isRateLimited ? (
                                            `Retry in ${cooldownRemaining}s`
                                        ) : isQuoteUpdating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Calculating...
                                            </>
                                        ) : isQuoteBlocked ? (
                                            'Totals unavailable'
                                        ) : (
                                            `Pay ${currencySymbol}${grandTotal.toFixed(2)} Now`
                                        )}
                                    </Button>
                                )}

                                {checkoutStep > 0 && (
                                    <button
                                        onClick={handlePrevStep}
                                        disabled={isProcessing}
                                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 md:mt-4 transition-colors"
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
