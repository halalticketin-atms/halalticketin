'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Upload,
    Ticket,
    Users,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Plus,
    Minus,
    Globe,
    Building,
    Check,
    Heart,
    Tag,
    Eye,
    EyeOff,
    Trash2,
    Loader2,
    ChevronDown,
    Settings2,
    X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LocationAutocomplete } from '@/components/events/LocationAutocomplete';

// Dynamic import to avoid SSR issues with Leaflet
const EventLocationMap = dynamic(
    () => import('@/components/events/EventLocationMap').then(mod => ({ default: mod.EventLocationMap })),
    { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">Loading map...</div> }
);
import {
    useEventDraft,
    type DraftEventInitial,
    type DraftFormData,
    type DraftTicketType,
    type DraftLocationType,
    type DraftPromoCode,
} from '@/hooks/useEventDraft';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { consumePendingDraft } from '@/utils/pending-draft-storage';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import {
    createEventDraft,
    createPromoCode,
    deletePromoCode,
    fetchEventPromoCodes,
    publishEvent,
    saveEventTickets,
    updateEventDraft,
    updatePromoCode as updatePromoCodeApi,
    type PromoCodeInput,
    type TicketInputPayload,
    type UpsertEventPayload,
} from '@/lib/events-api';
import { mapPromoCodeRecordsToDraft, mapTicketRecordsToDraft } from '@/lib/ticket-mappers';
import { ApiError } from '@/lib/api';
import { getBackendErrorDetails } from '@/lib/api-errors';
import { getUserFriendlyMessage, toast } from '@/lib/notifications';
import { getCurrencySymbol } from '@/lib/fees';
import { LIMITS_GBP, MAX_PER_ORDER, MAX_TICKET_QUANTITY, PROMO_CODE_MAX_LENGTH, PROMO_CODE_MIN_LENGTH, roundCurrencyLimit } from '@/lib/input-limits';
import { formatDateInTimeZone, formatTimeInTimeZone, toUtcIsoString } from '@/lib/timezone';
import { uploadEventBanner } from '@/lib/upload-api';
import { getCreditBalance } from '@/lib/credits-api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export const steps = [
    { id: 1, title: 'Basic Details', description: 'Title, description & image', icon: Sparkles },
    { id: 2, title: 'When', description: 'Date & time', icon: Calendar },
    { id: 3, title: 'Where', description: 'Location & venue', icon: MapPin },
    { id: 4, title: 'Tickets', description: 'Pricing & availability', icon: Ticket },
    { id: 5, title: 'Attendee Info', description: 'Registration settings', icon: Users },
];

const entryContextDefaults: Record<'scratch' | DraftEntrySource, EntryContext> = {
    scratch: {
        label: 'Start from scratch',
    },
    ai: {
        label: 'AI suggestion',
        description: 'Generated via the assistant. Double-check details before publishing.',
    },
    clone: {
        label: 'Cloned from event',
        description: 'Copied from a previous event. Update the schedule or tickets if needed.',
    },
    draft: {
        label: 'Draft in progress',
        description: 'Continue editing a saved draft without losing earlier work.',
    },
};

const refundPolicyOptions = [
    { value: 'No refunds within a week', label: 'No refunds within a week' },
    { value: 'No refunds within two weeks of the event', label: 'No refunds within two weeks of the event' },
    { value: 'No refunds', label: 'No refunds' },
    { value: 'Case by case basis', label: 'Case by case basis' },
];

const isDraftSource = (value: string | null): value is DraftEntrySource =>
    value === 'ai' || value === 'clone' || value === 'draft';

async function dataUrlToFile(dataUrl: string, fallbackName: string): Promise<File | null> {
    if (!dataUrl.startsWith('data:image/')) {
        return null;
    }
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/);
    const mimeType = blob.type || mimeMatch?.[1] || 'image/png';
    const extension = mimeType.split('/')[1] || 'png';
    return new File([blob], `${fallbackName}.${extension}`, { type: mimeType });
}

type EntryContext = {
    label: string;
    description?: string;
};

type TicketFieldErrors = {
    name?: string;
    maxPerOrder?: string;
    price?: string;
    quantity?: string;
    customFee?: string;
    earlyBirdPrice?: string;
    earlyBirdEndDate?: string;
};

type PromoFieldErrors = {
    code?: string;
    discountValue?: string;
    usageLimit?: string;
    validFrom?: string;
    validUntil?: string;
    applicableTicketTypeIds?: string;
    discountType?: string;
};


const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined | null) => (value ? UUID_REGEX.test(value) : false);

const mapPromoTicketTypeIds = (
    promoCodes: DraftPromoCode[],
    ticketIdMap: Map<string, string>
): DraftPromoCode[] => {
    if (ticketIdMap.size === 0) {
        return promoCodes;
    }

    return promoCodes.map((promo) => {
        if (!promo.applicableTicketTypeIds || promo.applicableTicketTypeIds.length === 0) {
            return promo;
        }

        const mappedIds = promo.applicableTicketTypeIds
            .map((id) => ticketIdMap.get(id) ?? id)
            .filter((id): id is string => isUuid(id));
        const uniqueIds = Array.from(new Set(mappedIds));

        return {
            ...promo,
            applicableTicketTypeIds: uniqueIds.length > 0 ? uniqueIds : null,
        };
    });
};

const locationTypeMap: Record<DraftLocationType, 'in_person' | 'online' | 'hybrid'> = {
    physical: 'in_person',
    online: 'online',
    hybrid: 'hybrid',
};

const mapLocationType = (value: DraftLocationType) => locationTypeMap[value] ?? 'in_person';

const toIsoString = (date?: string, time?: string | null, timeZone?: string) =>
    toUtcIsoString(date, time, timeZone);

const parseTimeToMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }
    return hours * 60 + minutes;
};

const buildEventPayload = (formData: DraftFormData): UpsertEventPayload => {
    const start = toIsoString(formData.date, formData.startTime, formData.timezone);
    const inferredEndDate = formData.isMultiDay ? formData.endDate || formData.date : formData.date;
    const end = toIsoString(inferredEndDate, formData.endTime, formData.timezone);
    const locationType = mapLocationType(formData.locationType);
    const isInPerson = locationType === 'in_person' || locationType === 'hybrid';
    const isOnline = locationType === 'online' || locationType === 'hybrid';

    return {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        startDatetime: start,
        endDatetime: end,
        timezone: formData.timezone || 'UTC',
        isMultiDay: formData.isMultiDay,
        locationType,
        venue: isInPerson ? formData.venue || null : null,
        address: isInPerson ? formData.address || null : null,
        city: isInPerson ? formData.city || null : null,
        country: null,
        onlineUrl: isOnline ? formData.onlineUrl || null : null,
        currency: formData.currency,
        refundPolicy: formData.refundPolicy.trim() ? formData.refundPolicy.trim() : null,
        isListedPublicly: formData.visibility === 'public',
        category: formData.categories.length > 0 ? formData.categories.join(',') : null,
        // absorbFee removed - now handled per-ticket
        attendeeInfoMode: formData.attendeeInfoMode,
        customQuestions: formData.customQuestions.length > 0
            ? formData.customQuestions.map((question) => ({
                ...question,
                options: question.type === 'select' || question.type === 'checkbox'
                    ? (Array.isArray(question.options) ? question.options : [])
                    : undefined,
            }))
            : null,
    };
};

const buildTicketPayloads = (
    tickets: DraftTicketType[],
    currency: string,
    timeZone: string,
    options?: { includeIds?: boolean },
): TicketInputPayload[] =>
    tickets.map((ticket, index) => {
        const parsedPrice = Number.parseFloat(ticket.price || '0');
        const priceValue = Number.isFinite(parsedPrice) ? parsedPrice : 0;
        const isDonation = ticket.type === 'donation';
        const isFree = !isDonation && (ticket.isFree || priceValue <= 0);
        const resolvedType = isDonation ? 'donation' : isFree ? 'free' : 'paid';
        const quantityValue = Number.isFinite(ticket.quantity) ? Math.max(ticket.quantity, 1) : 1;
        const maxPerOrderValue = Number.isFinite(ticket.maxPerOrder)
            ? Math.max(ticket.maxPerOrder, 1)
            : undefined;
        const shouldIncludeIds = options?.includeIds ?? true;
        const backendId = shouldIncludeIds && isUuid(ticket.id) ? ticket.id : undefined;

        // Early bird pricing
        const parsedEarlyBirdPrice = Number.parseFloat(ticket.earlyBirdPrice || '0');
        const earlyBirdPriceValue = !isDonation && ticket.hasEarlyBird && Number.isFinite(parsedEarlyBirdPrice) && parsedEarlyBirdPrice > 0
            ? parsedEarlyBirdPrice
            : null;
        const earlyBirdEndDateValue = !isDonation && ticket.hasEarlyBird && ticket.earlyBirdEndDate
            ? toIsoString(ticket.earlyBirdEndDate, '23:59', timeZone)
            : null;
        const trimmedCustomFee = ticket.customFee?.trim() ?? '';
        const parsedCustomFee = Number.parseFloat(trimmedCustomFee);
        const customFeeValue = !isDonation && !isFree && priceValue > 0 && trimmedCustomFee && Number.isFinite(parsedCustomFee)
            ? parsedCustomFee
            : null;

        return {
            id: backendId,
            name: isDonation ? 'Donation' : ticket.name.trim() || `Ticket ${index + 1}`,
            description: ticket.description.trim() ? ticket.description.trim() : null,
            price: resolvedType === 'free' ? 0 : priceValue,
            isFree: resolvedType === 'free',
            type: resolvedType,
            currency: currency,
            maxQuantity: isDonation ? undefined : quantityValue,
            maxPerOrder: isDonation ? 1 : maxPerOrderValue,
            visibility: isDonation ? 'public' : ticket.visibility,
            salesStart: ticket.salesStart ? toIsoString(ticket.salesStart, '00:00', timeZone) : null,
            salesEnd: ticket.salesEnd ? toIsoString(ticket.salesEnd, '23:59', timeZone) : null,
            absorbFee: ticket.absorbFee,
            customFee: customFeeValue,
            earlyBirdPrice: earlyBirdPriceValue,
            earlyBirdEndDate: earlyBirdEndDateValue,
        };
    });

const buildDuplicateTicketNameErrors = (tickets: DraftTicketType[]) => {
    const nameToIds = new Map<string, string[]>();

    tickets.forEach((ticket) => {
        const normalized = ticket.name.trim().toLowerCase();
        if (!normalized) {
            return;
        }
        const ids = nameToIds.get(normalized) ?? [];
        ids.push(ticket.id);
        nameToIds.set(normalized, ids);
    });

    const errors: Record<string, { name: string }> = {};
    nameToIds.forEach((ids) => {
        if (ids.length > 1) {
            ids.forEach((id) => {
                errors[id] = { name: 'Ticket name must be unique' };
            });
        }
    });

    return errors;
};

const mergeTicketNameErrors = (
    previous: Record<string, TicketFieldErrors>,
    nameErrors: Record<string, { name: string }>,
    activeTickets?: DraftTicketType[]
) => {
    const validIds = activeTickets ? new Set(activeTickets.map((ticket) => ticket.id)) : null;
    const next: Record<string, TicketFieldErrors> = {};

    Object.entries(previous).forEach(([id, errors]) => {
        if (!validIds || validIds.has(id)) {
            next[id] = { ...errors };
        }
    });

    Object.entries(nameErrors).forEach(([id, errors]) => {
        if (!validIds || validIds.has(id)) {
            next[id] = { ...next[id], ...errors };
        }
    });

    return next;
};

const deriveFieldErrorsFromMessages = (errors: string[]) => {
    const mapped: Record<string, string> = {};
    const unmatched: string[] = [];

    errors.forEach((message) => {
        const normalized = message.toLowerCase();
        let matched = false;

        if (normalized.includes('title is required')) {
            mapped.title = message;
            matched = true;
        }
        if (normalized.includes('start date and time are required')) {
            mapped.date = message;
            mapped.startTime = message;
            matched = true;
        }
        if (normalized.includes('end date and time are required')) {
            mapped.endDate = message;
            mapped.endTime = message;
            matched = true;
        }
        if (normalized.includes('end time must be after')) {
            mapped.endTime = message;
            matched = true;
        }
        if (normalized.includes('venue is required')) {
            mapped.venue = message;
            matched = true;
        }
        if (normalized.includes('online url is required')) {
            mapped.onlineUrl = message;
            matched = true;
        }
        if (normalized.includes('refund policy')) {
            mapped.refundPolicy = message;
            matched = true;
        }
        if (normalized.includes('currency is required')) {
            mapped.currency = message;
            matched = true;
        }
        if (normalized.includes('stripe') && normalized.includes('payment setup')) {
            mapped.tickets = message;
            matched = true;
        }
        if (normalized.includes('ticket type')) {
            mapped.tickets = message;
            matched = true;
        }

        if (!matched) {
            unmatched.push(message);
        }
    });

    return { fieldErrors: mapped, unmatched };
};

const getStepForFieldErrors = (errors: Record<string, string>) => {
    const keys = new Set(Object.keys(errors));
    const stepFields: Array<{ step: number; fields: string[] }> = [
        { step: 1, fields: ['title', 'description', 'bannerImageDataUrl', 'categories', 'visibility'] },
        { step: 2, fields: ['date', 'startTime', 'endDate', 'endTime', 'timezone'] },
        { step: 3, fields: ['locationType', 'venue', 'address', 'city', 'onlineUrl'] },
        { step: 4, fields: ['tickets', 'currency', 'refundPolicy'] },
        { step: 5, fields: ['attendeeInfoMode', 'customQuestions'] },
    ];

    for (const entry of stepFields) {
        if (entry.fields.some((field) => keys.has(field))) {
            return entry.step;
        }
    }

    return null;
};

const validatePublishForm = (formData: DraftFormData, tickets: DraftTicketType[]) => {
    const errors: Record<string, string> = {};
    const locationType = mapLocationType(formData.locationType);
    const isInPerson = locationType === 'in_person' || locationType === 'hybrid';
    const isOnline = locationType === 'online' || locationType === 'hybrid';

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
        errors.title = 'Title is required before publishing.';
    } else if (trimmedTitle.length < 3) {
        errors.title = 'Title must be at least 3 characters.';
    } else if (trimmedTitle.length > 75) {
        errors.title = 'Title must be 75 characters or less.';
    }

    if (!formData.currency) {
        errors.currency = 'Currency is required.';
    }

    if (!formData.date.trim()) {
        errors.date = 'Start date is required.';
    }

    if (!formData.startTime.trim()) {
        errors.startTime = 'Start time is required.';
    }

    if (formData.isMultiDay && !formData.endDate.trim()) {
        errors.endDate = 'End date is required for multi-day events.';
    }

    if (!formData.endTime.trim()) {
        errors.endTime = 'End time is required.';
    }

    const nowIso = new Date().toISOString();
    const todayInZone = formatDateInTimeZone(nowIso, formData.timezone);
    const nowTimeInZone = formatTimeInTimeZone(nowIso, formData.timezone);
    const nowMinutes = parseTimeToMinutes(nowTimeInZone);
    const startMinutes = parseTimeToMinutes(formData.startTime);

    if (formData.date && todayInZone) {
        if (formData.date < todayInZone) {
            errors.date = 'Start date must be today or later.';
        } else if (formData.date === todayInZone && startMinutes !== null && nowMinutes !== null) {
            if (startMinutes <= nowMinutes) {
                errors.startTime = 'Start time must be after the current time.';
            }
        }
    }

    const start = toIsoString(formData.date, formData.startTime, formData.timezone);
    const inferredEndDate = formData.isMultiDay ? formData.endDate || formData.date : formData.date;
    const end = toIsoString(inferredEndDate, formData.endTime, formData.timezone);
    if (start && end && new Date(end) <= new Date(start)) {
        errors.endTime = 'End time must be after the start time.';
    }

    if (isInPerson && !formData.venue.trim()) {
        errors.venue = 'Venue is required for in-person or hybrid events.';
    }

    if (isOnline && !formData.onlineUrl.trim()) {
        errors.onlineUrl = 'Online URL is required for online or hybrid events.';
    }

    if (tickets.length < 1) {
        errors.tickets = 'At least one ticket type must be configured before publishing.';
    }

    const trimmedRefundPolicy = formData.refundPolicy.trim();
    if (!trimmedRefundPolicy) {
        errors.refundPolicy = 'Select a refund policy before publishing.';
    } else if (trimmedRefundPolicy.length < 10) {
        errors.refundPolicy = 'Refund policy must be at least 10 characters.';
    } else if (trimmedRefundPolicy.length > 500) {
        errors.refundPolicy = 'Refund policy must be 500 characters or less.';
    }

    return errors;
};

export function EventWizard({
    mode = 'create',
    initialDraft,
    entryContext,
}: {
    mode?: 'create' | 'edit';
    initialDraft?: DraftEventInitial;
    entryContext?: EntryContext;
}) {
    const {
        currentStep,
        setCurrentStep,
        formData,
        setFormData,
        handleInputChange,
        tickets,
        setTickets,
        updateTicket: updateTicketBase,
        addTicket: addTicketBase,
        removeTicket: removeTicketBase,
        addDonationTicket: addDonationTicketBase,
        removeDonationTicket: removeDonationTicketBase,
        promoCodes,
        setPromoCodes,
        addPromoCode: addPromoCodeBase,
        updatePromoCode: updatePromoCodeBase,
        removePromoCode: removePromoCodeBase,
        nextStep,
        prevStep,
        progressPercentage,
    } = useEventDraft(initialDraft, steps.length);

    const { user, isLoading: authLoading } = useAuth();
    const { activeOrganizerId, organizers, isLoading: organizersLoading } = useOrganizers();
    const currentOrganizer = organizers.find(o => o.id === activeOrganizerId);
    const { rates, isLoading: isLoadingRates } = useExchangeRates();
    const appliedBannerRef = useRef<string | null>(null);
    const appliedBannerFileRef = useRef<string | null>(null);

    const [currencyRateSnapshot, setCurrencyRateSnapshot] = useState<number | null>(null);
    const [currencySnapshotCode, setCurrencySnapshotCode] = useState<string | null>(null);

    useEffect(() => {
        if (isLoadingRates) {
            return;
        }
        const currency = (formData.currency || 'GBP').toUpperCase();
        if (currencySnapshotCode !== currency) {
            setCurrencySnapshotCode(currency);
            setCurrencyRateSnapshot(rates[currency] ?? 1);
        }
    }, [currencySnapshotCode, formData.currency, isLoadingRates, rates]);

    const currencyCode = (formData.currency || 'GBP').toUpperCase();
    const rateSnapshot = currencyRateSnapshot ?? rates[currencyCode] ?? 1;
    const convertLimit = useCallback((amountGBP: number) => roundCurrencyLimit(amountGBP * rateSnapshot), [rateSnapshot]);
    const maxTicketPrice = convertLimit(LIMITS_GBP.ticketPrice);
    const maxDonationAmount = convertLimit(LIMITS_GBP.donation);
    const maxCustomFee = convertLimit(LIMITS_GBP.customFee);
    const maxPromoFixed = convertLimit(LIMITS_GBP.promoFixed);

    // Banner file upload state
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerWasRemoved, setBannerWasRemoved] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        appliedBannerRef.current = null;
        appliedBannerFileRef.current = null;
        setBannerWasRemoved(false);
    }, [initialDraft?.eventId]);

    // Sync currency from organizer default if likely untouched
    useEffect(() => {
        if (currentOrganizer?.defaultCurrency && (!initialDraft?.formData?.currency || initialDraft.formData.currency === 'GBP')) {
            setFormData(prev => ({ ...prev, currency: currentOrganizer.defaultCurrency! }));
        }
    }, [currentOrganizer?.defaultCurrency, initialDraft?.formData?.currency, setFormData]);

    // FIX: Populate poster preview from existing event's bannerImageDataUrl when editing
    useEffect(() => {
        const bannerUrl = initialDraft?.formData?.bannerImageDataUrl;
        const eventKey = initialDraft?.eventId ?? 'new';
        if (bannerWasRemoved) {
            return;
        }
        if (appliedBannerRef.current === eventKey) {
            return;
        }
        if (bannerUrl && !formData.bannerImageDataUrl) {
            setFormData(prev => ({
                ...prev,
                bannerImageDataUrl: bannerUrl
            }));
            appliedBannerRef.current = eventKey;
        }
    }, [bannerWasRemoved, formData.bannerImageDataUrl, initialDraft?.eventId, initialDraft?.formData?.bannerImageDataUrl, setFormData]);

    useEffect(() => {
        const bannerUrl = initialDraft?.formData?.bannerImageDataUrl;
        if (!bannerUrl || bannerWasRemoved || bannerFile) {
            return;
        }
        if (!bannerUrl.startsWith('data:image/')) {
            return;
        }
        if (appliedBannerFileRef.current === bannerUrl) {
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const restoredFile = await dataUrlToFile(bannerUrl, 'ai-poster');
                if (!restoredFile || cancelled) {
                    return;
                }
                setBannerFile(restoredFile);
                appliedBannerFileRef.current = bannerUrl;
            } catch (error) {
                console.warn('Failed to restore poster from AI draft:', error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [bannerFile, bannerWasRemoved, initialDraft?.formData?.bannerImageDataUrl]);

    // Location coordinates for map display
    const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [isCustomRefundPolicy, setIsCustomRefundPolicy] = useState(false);

    const router = useRouter();
    const pathname = usePathname();
    const authSearchParams = useSearchParams();
    const nextPath = useMemo(() => {
        const query = authSearchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [authSearchParams, pathname]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        }
    }, [authLoading, user, router, nextPath]);

    const [eventId, setEventId] = useState<string | null>(initialDraft?.eventId ?? null);
    const [eventStatus] = useState<'draft' | 'published' | 'cancelled' | 'archived' | null>(initialDraft?.eventStatus ?? null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [publishErrors, setPublishErrors] = useState<string[]>([]);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [ticketErrors, setTicketErrors] = useState<Record<string, TicketFieldErrors>>({});
    const [promoErrors, setPromoErrors] = useState<Record<string, PromoFieldErrors>>({});
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [ticketAdvancedOpen, setTicketAdvancedOpen] = useState<Record<string, boolean>>({});

    // Credit warning state
    const [isWarningOpen, setIsWarningOpen] = useState(false);
    const [organizerCredits, setOrganizerCredits] = useState<number | null>(null);
    const [publishCapacity, setPublishCapacity] = useState(0);
    const [creditBalance, setCreditBalance] = useState<number | null>(null);

    useEffect(() => {
        if (!activeOrganizerId) {
            setCreditBalance(null);
            return;
        }

        let cancelled = false;
        getCreditBalance(activeOrganizerId)
            .then((credits) => {
                if (!cancelled) {
                    setCreditBalance(credits.balance);
                }
            })
            .catch((error) => {
                console.error('Failed to fetch credit balance:', error);
                if (!cancelled) {
                    setCreditBalance(0);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [activeOrganizerId]);

    const hasCredits = (creditBalance ?? 0) > 0;
    const canUseCredits = currentOrganizer?.feeTier === 'token' || hasCredits;

    const handleBannerSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setActionError('Please select an image file');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setActionError('Image must be less than 10MB');
            return;
        }

        setBannerFile(file);
        setBannerWasRemoved(false);
        setActionError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setFormData(prev => ({ ...prev, bannerImageDataUrl: reader.result as string }));
            }
        };
        reader.readAsDataURL(file);
    }, [setFormData]);

    const removeBanner = useCallback(() => {
        setBannerFile(null);
        setBannerWasRemoved(true);
        setFormData(prev => ({ ...prev, bannerImageDataUrl: '' }));
        if (bannerInputRef.current) {
            bannerInputRef.current.value = '';
        }
    }, [setFormData]);

    const clearFieldErrors = useCallback((...fields: string[]) => {
        if (fields.length === 0) {
            setFieldErrors({});
            return;
        }

        setFieldErrors((prev) => {
            let updated = false;
            const next = { ...prev };
            fields.forEach((field) => {
                if (field && next[field]) {
                    delete next[field];
                    updated = true;
                }
            });
            return updated ? next : prev;
        });
    }, []);

    useEffect(() => {
        const normalized = formData.refundPolicy.trim();
        const isPreset = refundPolicyOptions.some((option) => option.value === normalized);
        if (isPreset) {
            setIsCustomRefundPolicy(false);
            return;
        }
        if (normalized) {
            setIsCustomRefundPolicy(true);
        }
    }, [formData.refundPolicy]);

    const refundPolicySelection = useMemo(() => {
        const normalized = formData.refundPolicy.trim();
        if (!normalized) return isCustomRefundPolicy ? 'custom' : '';
        const preset = refundPolicyOptions.find((option) => option.value === normalized);
        return preset ? preset.value : 'custom';
    }, [formData.refundPolicy, isCustomRefundPolicy]);

    const handleRefundPolicyChange = useCallback((value: string) => {
        if (value === 'custom') {
            setFormData((prev) => {
                const isPreset = refundPolicyOptions.some((option) => option.value === prev.refundPolicy.trim());
                return { ...prev, refundPolicy: isPreset ? '' : prev.refundPolicy };
            });
            setIsCustomRefundPolicy(true);
            clearFieldErrors('refundPolicy');
            return;
        }

        setFormData((prev) => ({
            ...prev,
            refundPolicy: value,
        }));
        setIsCustomRefundPolicy(false);
        clearFieldErrors('refundPolicy');
    }, [clearFieldErrors, setFormData, setIsCustomRefundPolicy]);

    const updateTicket = useCallback(
        <K extends keyof DraftTicketType>(id: string, field: K, value: DraftTicketType[K]) => {
            updateTicketBase(id, field, value);
            clearFieldErrors('tickets');
        },
        [clearFieldErrors, updateTicketBase],
    );

    const addTicket = useCallback(() => {
        addTicketBase();
        clearFieldErrors('tickets');
    }, [addTicketBase, clearFieldErrors]);

    const addDonationTicket = useCallback(() => {
        addDonationTicketBase();
        clearFieldErrors('tickets');
    }, [addDonationTicketBase, clearFieldErrors]);

    const removeTicket = useCallback(
        (id: string) => {
            removeTicketBase(id);
            clearFieldErrors('tickets');
            const nextTickets = tickets.filter((ticket) => ticket.id !== id);
            const nameErrors = buildDuplicateTicketNameErrors(nextTickets);
            setTicketErrors((prev) => mergeTicketNameErrors(prev, nameErrors, nextTickets));
        },
        [clearFieldErrors, removeTicketBase, tickets],
    );

    const removeDonationTicket = useCallback(() => {
        removeDonationTicketBase();
        clearFieldErrors('tickets');
    }, [clearFieldErrors, removeDonationTicketBase]);

    const clearTicketError = useCallback((id: string, field?: keyof TicketFieldErrors) => {
        setTicketErrors((prev) => {
            if (!prev[id]) {
                return prev;
            }

            if (!field) {
                const next = { ...prev };
                delete next[id];
                return next;
            }

            const next = {
                ...prev,
                [id]: { ...prev[id], [field]: undefined },
            };

            if (Object.values(next[id]).every((value) => !value)) {
                delete next[id];
                return next;
            }

            return next;
        });
    }, []);

    const donationTicket = useMemo(
        () => tickets.find((ticket) => ticket.type === 'donation') ?? null,
        [tickets],
    );
    const regularTickets = useMemo(
        () => tickets.filter((ticket) => ticket.type !== 'donation'),
        [tickets],
    );

    const clearPromoError = useCallback((id: string, field?: keyof PromoFieldErrors) => {
        setPromoErrors((prev) => {
            if (!prev[id]) {
                return prev;
            }

            if (!field) {
                const next = { ...prev };
                delete next[id];
                return next;
            }

            const next = {
                ...prev,
                [id]: { ...prev[id], [field]: undefined },
            };

            if (Object.values(next[id]).every((value) => !value)) {
                delete next[id];
                return next;
            }

            return next;
        });
    }, []);

    const updatePromoCode = useCallback(
        <K extends keyof DraftPromoCode>(id: string, field: K, value: DraftPromoCode[K]) => {
            updatePromoCodeBase(id, field, value);
            if (field === 'code' || field === 'discountValue' || field === 'usageLimit' || field === 'validFrom' || field === 'validUntil' || field === 'applicableTicketTypeIds' || field === 'discountType') {
                clearPromoError(id, field);
            }
        },
        [clearPromoError, updatePromoCodeBase],
    );

    const addPromoCode = useCallback(() => {
        addPromoCodeBase();
    }, [addPromoCodeBase]);

    const removePromoCode = useCallback(
        (id: string) => {
            removePromoCodeBase(id);
            clearPromoError(id);
        },
        [clearPromoError, removePromoCodeBase],
    );

    const handleFieldChange = useCallback(
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            handleInputChange(event);
            clearFieldErrors(event.target.name);
        },
        [clearFieldErrors, handleInputChange],
    );

    const serializedDraft = useMemo(
        () => JSON.stringify({ formData, tickets, promoCodes }),
        [formData, tickets, promoCodes],
    );
    const lastSavedSnapshotRef = useRef(serializedDraft);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        setHasUnsavedChanges(serializedDraft !== lastSavedSnapshotRef.current);
    }, [serializedDraft]);

    const markSnapshotAsSaved = useCallback(
        (override?: { formData?: DraftFormData; tickets?: DraftTicketType[]; promoCodes?: DraftPromoCode[] }) => {
            const snapshot = JSON.stringify({
                formData: override?.formData ?? formData,
                tickets: override?.tickets ?? tickets,
                promoCodes: override?.promoCodes ?? promoCodes,
            });
            lastSavedSnapshotRef.current = snapshot;
            setHasUnsavedChanges(false);
            setLastSavedAt(new Date());
        },
        [formData, promoCodes, tickets],
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !hasUnsavedChanges) {
            return;
        }

        const handler = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handler);
        return () => {
            window.removeEventListener('beforeunload', handler);
        };
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (hasUnsavedChanges) {
            setActionMessage(null);
        }
    }, [hasUnsavedChanges]);

    const headerTitle = mode === 'edit' ? 'Edit Event' : 'Create New Event';
    const dashboardHref = activeOrganizerId ? buildDashboardPath(activeOrganizerId) : '/dashboard';

    const saveDraft = useCallback(
        async (options?: { silent?: boolean }) => {
            if (isSaving) {
                return eventId;
            }

            if (!activeOrganizerId) {
                setActionError('Select or create an organiser before saving.');
                return null;
            }

            const trimmedTitle = formData.title.trim();
            if (trimmedTitle.length < 3) {
                setActionError('Event title must be at least 3 characters.');
                setFieldErrors({ title: 'Title must be at least 3 characters' });
                setCurrentStep(1); // Navigate to Basic Details step
                return null;
            }
            if (trimmedTitle.length > 75) {
                setActionError('Event title must be 75 characters or less.');
                setFieldErrors({ title: 'Title must be 75 characters or less' });
                setCurrentStep(1);
                return null;
            }

            setIsSaving(true);
            setActionError(null);
            if (!options?.silent) {
                setActionMessage(null);
            }

            try {
                const duplicateNameErrors = buildDuplicateTicketNameErrors(tickets);
                if (Object.keys(duplicateNameErrors).length > 0) {
                    setTicketErrors((prev) => mergeTicketNameErrors(prev, duplicateNameErrors, tickets));
                    setFieldErrors((prev) => ({ ...prev, tickets: 'Ticket name must be unique.' }));
                    setActionError('Ticket names must be unique.');
                    setCurrentStep(4);
                    return null;
                }

                const payload = buildEventPayload({ ...formData, title: trimmedTitle });
                if (bannerWasRemoved) {
                    payload.bannerImageUrl = null;
                }
                let nextEventId = eventId;

                if (!nextEventId) {
                    const response = await createEventDraft(activeOrganizerId, payload);
                    nextEventId = response.event.id;
                    setEventId(nextEventId);
                } else {
                    console.log('[DEBUG] Updating event:', nextEventId, 'with payload:', payload);
                    await updateEventDraft(nextEventId, payload);
                }

                const ticketPayloads = buildTicketPayloads(tickets, formData.currency, formData.timezone, {
                    includeIds: Boolean(nextEventId),
                });
                console.log('[DEBUG] Saving tickets for event:', nextEventId, 'payload:', ticketPayloads);
                const ticketResponse = await saveEventTickets(nextEventId, ticketPayloads);
                let normalizedTickets = tickets;
                const ticketIdMap = new Map<string, string>();
                if (ticketResponse.tickets && ticketResponse.tickets.length > 0) {
                    normalizedTickets = mapTicketRecordsToDraft(ticketResponse.tickets, formData.timezone);
                    setTickets(normalizedTickets);
                    const limit = Math.min(tickets.length, ticketResponse.tickets.length);
                    for (let i = 0; i < limit; i += 1) {
                        const previousId = tickets[i]?.id;
                        const nextId = ticketResponse.tickets[i]?.id;
                        if (previousId && nextId) {
                            ticketIdMap.set(previousId, nextId);
                        }
                    }
                }

                // Save promo codes (only if we have a valid event ID)
                let normalizedPromoCodes = promoCodes;
                if (ticketIdMap.size > 0) {
                    normalizedPromoCodes = mapPromoTicketTypeIds(promoCodes, ticketIdMap);
                    setPromoCodes(normalizedPromoCodes);
                }
                const nextPromoErrors: Record<string, PromoFieldErrors> = {};
                const promoApiErrors: Record<string, PromoFieldErrors> = {};
                let hasPromoApiErrors = false;
                let promoErrorMessage: string | null = null;
                const promoCurrencySymbol = getCurrencySymbol(formData.currency);

                for (const promo of normalizedPromoCodes) {
                    const code = promo.code.trim();
                    const discountValue = Number.parseFloat(promo.discountValue) || 0;
                    const isRevealOnlyCode = promo.revealsHiddenTickets === true;
                    const errors: { code?: string; discountValue?: string } = {};

                    if (!code) {
                        errors.code = 'Code is required.';
                    } else {
                        if (code.length < PROMO_CODE_MIN_LENGTH) {
                            errors.code = `Code must be at least ${PROMO_CODE_MIN_LENGTH} characters.`;
                        } else if (code.length > PROMO_CODE_MAX_LENGTH) {
                            errors.code = `Code must be ${PROMO_CODE_MAX_LENGTH} characters or less.`;
                        } else if (!/^[A-Z0-9-]+$/i.test(code)) {
                            errors.code = 'Code must be alphanumeric.';
                        }
                    }
                    // Only require positive discount for non-reveal codes
                    if (!isRevealOnlyCode && (!Number.isFinite(discountValue) || discountValue <= 0)) {
                        errors.discountValue = 'Discount must be greater than 0.';
                    }
                    if (!isRevealOnlyCode && promo.discountType === 'percentage' && discountValue > 100) {
                        errors.discountValue = 'Percentage discount cannot exceed 100.';
                    }
                    if (!isRevealOnlyCode && promo.discountType === 'fixed' && discountValue > maxPromoFixed) {
                        errors.discountValue = `Discount cannot exceed ${promoCurrencySymbol}${maxPromoFixed.toFixed(2)}.`;
                    }

                    if (errors.code || errors.discountValue) {
                        nextPromoErrors[promo.id] = errors;
                    }
                }

                const hasPromoValidationErrors = Object.keys(nextPromoErrors).length > 0;
                setPromoErrors(nextPromoErrors);

                if (hasPromoValidationErrors) {
                    setActionError('Fix promo code errors before saving.');
                    setCurrentStep(4);
                }

                if (normalizedPromoCodes.length > 0 && isUuid(nextEventId) && !hasPromoValidationErrors) {
                    const existingPromos = await fetchEventPromoCodes(nextEventId).catch(() => ({ promoCodes: [] }));
                    const existingIds = new Set(existingPromos.promoCodes.map(p => p.id));

                    for (const promo of normalizedPromoCodes) {
                        const discountValue = Number.parseFloat(promo.discountValue) || 0;
                        const isRevealOnlyCode = promo.revealsHiddenTickets && discountValue === 0;
                        // Skip if no code, or if it's a discount code with no valid discount
                        if (!promo.code.trim()) {
                            continue;
                        }
                        if (!isRevealOnlyCode && (!Number.isFinite(discountValue) || discountValue <= 0)) {
                            continue;
                        }

                        const promoInput: PromoCodeInput = {
                            code: promo.code.trim().toUpperCase(),
                            discountType: promo.discountType === 'fixed' ? 'amount' : 'percentage',
                            discountValue,
                            usageLimit: promo.usageLimit || null,
                            validFrom: promo.validFrom ? `${promo.validFrom}T00:00:00.000Z` : null,
                            validUntil: promo.validUntil ? `${promo.validUntil}T23:59:59.000Z` : null,
                            isActive: promo.isActive !== false,
                            revealsHiddenTickets: promo.revealsHiddenTickets ?? false,
                            applicableTicketTypeIds: promo.applicableTicketTypeIds ?? null,
                        };

                        try {
                            if (existingIds.has(promo.id)) {
                                await updatePromoCodeApi(nextEventId, promo.id, promoInput);
                            } else {
                                await createPromoCode(nextEventId, promoInput);
                            }
                        } catch (error) {
                            hasPromoApiErrors = true;
                            const details = error instanceof ApiError
                                ? getBackendErrorDetails<{
                                    fieldErrors?: Record<string, string[]>;
                                    formErrors?: string[];
                                }>(error.payload)
                                : undefined;
                            const fieldErrors = details?.fieldErrors ?? null;
                            const mapped: PromoFieldErrors = {};
                            if (fieldErrors) {
                                const fieldMap: Record<string, keyof PromoFieldErrors> = {
                                    code: 'code',
                                    discountValue: 'discountValue',
                                    usageLimit: 'usageLimit',
                                    validFrom: 'validFrom',
                                    validUntil: 'validUntil',
                                    applicableTicketTypeIds: 'applicableTicketTypeIds',
                                    discountType: 'discountType',
                                };
                                Object.entries(fieldErrors).forEach(([field, messages]) => {
                                    const message = messages?.[0];
                                    const mappedField = fieldMap[field];
                                    if (message && mappedField) {
                                        mapped[mappedField] = message;
                                    }
                                });
                            }

                            if (Object.keys(mapped).length === 0) {
                                const fallback = getUserFriendlyMessage(error);
                                mapped.code = fallback || 'Unable to save promo code.';
                            }

                            promoApiErrors[promo.id] = mapped;
                            if (!promoErrorMessage) {
                                promoErrorMessage = details?.formErrors?.[0] || getUserFriendlyMessage(error);
                            }
                        }
                    }

                    if (hasPromoApiErrors) {
                        setPromoErrors((prev) => ({ ...prev, ...promoApiErrors }));
                        setActionError(promoErrorMessage ?? 'Fix promo code errors before saving.');
                        setCurrentStep(4);
                    } else {
                        // Delete removed promo codes
                        const currentIds = new Set(normalizedPromoCodes.map(p => p.id));
                        for (const existing of existingPromos.promoCodes) {
                            if (!currentIds.has(existing.id)) {
                                try {
                                    await deletePromoCode(nextEventId, existing.id);
                                } catch (error) {
                                    hasPromoApiErrors = true;
                                    promoErrorMessage = promoErrorMessage ?? getUserFriendlyMessage(error);
                                    break;
                                }
                            }
                        }

                        if (hasPromoApiErrors) {
                            setActionError(promoErrorMessage ?? 'Unable to update promo codes.');
                            setCurrentStep(4);
                        } else {
                            // Refresh promo codes
                            const refreshed = await fetchEventPromoCodes(nextEventId).catch(() => ({ promoCodes: [] }));
                            normalizedPromoCodes = mapPromoCodeRecordsToDraft(refreshed.promoCodes);
                            setPromoCodes(normalizedPromoCodes);
                        }
                    }
                }

                // Upload banner image if a new file was selected
                if (bannerFile) {
                    try {
                        await uploadEventBanner(nextEventId, bannerFile);
                        setBannerFile(null); // Clear file after successful upload
                    } catch (uploadError) {
                        console.warn('Banner upload failed:', uploadError);
                        // Don't fail the draft save, just log a warning
                    }
                }

                setEventId(nextEventId);
                if (!hasPromoValidationErrors && !hasPromoApiErrors) {
                    markSnapshotAsSaved({ tickets: normalizedTickets, promoCodes: normalizedPromoCodes });
                    setFieldErrors({});
                    setPublishErrors([]);
                    setPromoErrors({});

                    if (!options?.silent) {
                        setActionMessage('Draft saved');
                    }
                } else {
                    setPublishErrors([]);
                }

                return nextEventId;
            } catch (error) {
                let overrideMessage: string | null = null;
                // Extract detailed field errors from backend
                if (error instanceof ApiError) {
                    const details = getBackendErrorDetails<{
                        fieldErrors?: Record<string, string[]>;
                        formErrors?: string[];
                    }>(error.payload);
                    if (details?.fieldErrors) {
                        // Map Zod field errors to our fieldErrors state
                        const mappedErrors: Record<string, string> = {};
                        const nextTicketErrors: Record<string, TicketFieldErrors> = {};
                        let firstMessage: string | null = null;
                        const ticketFieldMap: Record<string, keyof TicketFieldErrors> = {
                            name: 'name',
                            maxPerOrder: 'maxPerOrder',
                            price: 'price',
                            maxQuantity: 'quantity',
                            customFee: 'customFee',
                            earlyBirdPrice: 'earlyBirdPrice',
                            earlyBirdEndDate: 'earlyBirdEndDate',
                        };

                        const mapFieldError = (field: string, message: string) => {
                            if (field === 'startDatetime') {
                                mappedErrors.date = message;
                                mappedErrors.startTime = message;
                                return;
                            }
                            if (field === 'endDatetime') {
                                mappedErrors.endDate = message;
                                mappedErrors.endTime = message;
                                return;
                            }

                            const directFields = new Set([
                                'title',
                                'description',
                                'venue',
                                'address',
                                'city',
                                'onlineUrl',
                                'currency',
                                'refundPolicy',
                                'timezone',
                            ]);

                            if (directFields.has(field)) {
                                mappedErrors[field] = message;
                                return;
                            }

                            mappedErrors[field] = message;
                        };

                        for (const [field, messages] of Object.entries(details.fieldErrors)) {
                            if (!Array.isArray(messages) || messages.length === 0) {
                                continue;
                            }

                            const message = messages[0];
                            if (!firstMessage) {
                                firstMessage = message;
                            }

                            if (field === 'tickets') {
                                mappedErrors.tickets = message;
                                continue;
                            }

                            const ticketMatch = field.match(/^tickets\.(\d+)\.(\w+)$/);
                            if (ticketMatch) {
                                const index = Number(ticketMatch[1]);
                                const fieldName = ticketMatch[2];
                                const ticketId = tickets[index]?.id;
                                if (ticketId) {
                                    const current = nextTicketErrors[ticketId] ?? {};
                                    const mappedField = ticketFieldMap[fieldName];
                                    if (mappedField) {
                                        current[mappedField] = message;
                                    }
                                    nextTicketErrors[ticketId] = current;
                                    continue;
                                }
                            }

                            mapFieldError(field, message);
                        }

                        if (Object.keys(nextTicketErrors).length > 0) {
                            setTicketErrors((prev) => {
                                const next = { ...prev };
                                Object.entries(nextTicketErrors).forEach(([id, errors]) => {
                                    next[id] = { ...next[id], ...errors };
                                });
                                return next;
                            });
                            if (!mappedErrors.tickets && firstMessage) {
                                mappedErrors.tickets = firstMessage;
                            }
                            setCurrentStep(4);
                            overrideMessage = firstMessage ?? 'Fix the highlighted ticket fields.';
                        }

                        if (Object.keys(mappedErrors).length > 0) {
                            setFieldErrors(mappedErrors);
                            const nextStep = getStepForFieldErrors(mappedErrors);
                            if (nextStep) {
                                setCurrentStep(nextStep);
                            }
                            if (!overrideMessage && firstMessage) {
                                overrideMessage = firstMessage;
                            }
                        }
                    }

                    if (!overrideMessage && details?.formErrors?.length) {
                        overrideMessage = details.formErrors[0];
                    }
                }
                const message = overrideMessage ?? getUserFriendlyMessage(error) ?? 'Unable to save draft.';
                setActionError(message);
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [activeOrganizerId, bannerFile, bannerWasRemoved, eventId, formData, isSaving, markSnapshotAsSaved, maxPromoFixed, promoCodes, setCurrentStep, setPromoCodes, setTickets, tickets],
    );

    const handleSaveDraftClick = useCallback(async () => {
        await saveDraft();
    }, [saveDraft]);

    const executePublish = useCallback(async () => {
        setActionError(null);
        setActionMessage(null);
        setIsPublishing(true);
        setIsWarningOpen(false); // Close warning if open

        try {
            const savedEventId = await saveDraft({ silent: true });
            if (!savedEventId) {
                return;
            }

            await publishEvent(savedEventId, formData.visibility);
            setFieldErrors({});
            setPublishErrors([]);
            setActionMessage('Event published successfully. Redirecting...');
            markSnapshotAsSaved();
            const destination = activeOrganizerId
                ? `${buildDashboardPath(activeOrganizerId)}/events`
                : '/dashboard';
            router.push(destination);
        } catch (error) {
            if (error instanceof ApiError) {
                const details = getBackendErrorDetails<{
                    fieldErrors?: Record<string, string[]>;
                    formErrors?: string[];
                } | string[]>(error.payload);
                const errorMessage = getUserFriendlyMessage(error) || 'Unable to publish event.';
                const normalizedMessage = errorMessage.toLowerCase();

                if (Array.isArray(details) && details.length > 0) {
                    const { fieldErrors: mapped, unmatched } = deriveFieldErrorsFromMessages(details);
                    setFieldErrors(mapped);
                    setPublishErrors(unmatched);
                    const nextStep = getStepForFieldErrors(mapped);
                    if (nextStep) {
                        setCurrentStep(nextStep);
                    } else if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    const fallbackMessage =
                        unmatched.length === 0 && details.length > 0
                            ? 'Fix the highlighted fields below.'
                            : 'Unable to publish event.';
                    setActionError(
                        unmatched.length > 0 ? unmatched.join(' ') : fallbackMessage,
                    );
                } else if (details && !Array.isArray(details) && details.fieldErrors) {
                    const mappedErrors: Record<string, string> = {};
                    let firstMessage: string | null = null;
                    Object.entries(details.fieldErrors).forEach(([field, messages]) => {
                        if (!Array.isArray(messages) || messages.length === 0) {
                            return;
                        }
                        const message = messages[0];
                        if (!firstMessage) {
                            firstMessage = message;
                        }
                        if (field === 'startDatetime') {
                            mappedErrors.date = message;
                            mappedErrors.startTime = message;
                            return;
                        }
                        if (field === 'endDatetime') {
                            mappedErrors.endDate = message;
                            mappedErrors.endTime = message;
                            return;
                        }
                        if (field === 'tickets') {
                            mappedErrors.tickets = message;
                            return;
                        }
                        mappedErrors[field] = message;
                    });
                    setFieldErrors(mappedErrors);
                    setPublishErrors(details.formErrors ?? []);
                    const nextStep = getStepForFieldErrors(mappedErrors);
                    if (nextStep) {
                        setCurrentStep(nextStep);
                    } else if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    setActionError(firstMessage ?? details.formErrors?.[0] ?? errorMessage);
                } else {
                    setFieldErrors({});
                    setPublishErrors(normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')
                        ? [errorMessage]
                        : []);
                    if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    setActionError(errorMessage);
                }
            } else {
                setFieldErrors({});
                setPublishErrors([]);
                const message = getUserFriendlyMessage(error) || 'Unable to publish event.';
                setActionError(message);
            }
        } finally {
            setIsPublishing(false);
        }
    }, [activeOrganizerId, formData.visibility, markSnapshotAsSaved, router, saveDraft]);

    const handlePublishClick = useCallback(async () => {
        if (isPublishing) {
            return;
        }

        // Validate custom questions: dropdown/checkbox must have options
        const invalidQuestions = formData.customQuestions.filter(q =>
            (q.type === 'select' || q.type === 'checkbox') &&
            (!q.options || q.options.length === 0)
        );
        if (invalidQuestions.length > 0) {
            const questionLabels = invalidQuestions.map(q => q.label || 'Untitled').join(', ');
            setCurrentStep(5); // Go to Attendee Info step
            setActionError(`Please add options for: ${questionLabels}`);
            return;
        }
        const publishFieldErrors = validatePublishForm(formData, tickets);
        if (Object.keys(publishFieldErrors).length > 0) {
            setFieldErrors(publishFieldErrors);
            setPublishErrors([]);
            const nextStep = getStepForFieldErrors(publishFieldErrors);
            if (nextStep) {
                setCurrentStep(nextStep);
            }
            const firstMessage = Object.values(publishFieldErrors)[0];
            setActionError(firstMessage ?? 'Fix the highlighted fields below.');
            return;
        }

        // Credit check for token-tier behavior (credits available or token plan)
        if (canUseCredits && activeOrganizerId) {
            try {
                const credits = await getCreditBalance(activeOrganizerId);
                const totalCapacity = regularTickets.reduce((sum, t) => sum + (t.quantity || 0), 0);

                if (credits.balance < totalCapacity) {
                    setOrganizerCredits(credits.balance);
                    setPublishCapacity(totalCapacity);
                    setIsWarningOpen(true);
                    return;
                }
            } catch (err) {
                console.error('Failed to check credits:', err);
                // Fail safe: assume they can publish, backend will resolve credits.
            }
        }

        await executePublish();
    }, [activeOrganizerId, canUseCredits, executePublish, formData, isPublishing, tickets]);

    const handlePreviewClick = useCallback(async () => {
        // Save draft before previewing (silent save)
        const savedEventId = await saveDraft({ silent: true });
        if (savedEventId) {
            const previewUrl = `/events/${savedEventId}/preview?mode=draft`;
            const opened = window.open(previewUrl, '_blank');
            if (!opened) {
                toast.warning('Popup blocked. Allow popups to open the preview.');
            }
        } else {
            // If save failed, show error (saveDraft already sets actionError)
            setActionError('Please save the event before previewing.');
        }
    }, [saveDraft]);

    const isBusy = isSaving || isPublishing;
    const statusLabel = !activeOrganizerId
        ? 'Select or create an organiser to save progress.'
        : hasUnsavedChanges
            ? 'Unsaved changes'
            : lastSavedAt
                ? `Last saved ${lastSavedAt.toLocaleTimeString()}`
                : eventId
                    ? 'Draft saved'
                    : 'Not saved yet';
    const disableSaveButtons = !activeOrganizerId || isBusy;
    const disablePublishButtons = !activeOrganizerId || isPublishing;
    const isAlreadyPublished = eventStatus === 'published';
    const publishButtonLabel =
        isPublishing
            ? (isAlreadyPublished ? 'Updating...' : 'Publishing...')
            : isAlreadyPublished
                ? 'Update Event'
                : mode === 'edit'
                    ? 'Publish Changes'
                    : 'Publish Event';
    const saveButtonLabel = isSaving
        ? mode === 'edit'
            ? 'Saving changes...'
            : 'Saving draft...'
        : mode === 'edit'
            ? 'Update Draft'
            : 'Save Draft';
    const isGateLoading = authLoading || organizersLoading;

    if (isGateLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold">Loading your organizer access</h2>
                        <p className="text-muted-foreground">
                            Checking your account details...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Guard: Block non-organizers from accessing this page
    if (organizers.length === 0) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <Building className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-xl font-semibold">Organizer Account Required</h2>
                        <p className="text-muted-foreground">
                            You need to be an event organizer to create events. Please sign up as an organizer or contact support if you believe this is an error.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button variant="outline" asChild className="flex-1">
                                <Link href="/events">Browse Events</Link>
                            </Button>
                            <Button asChild className="flex-1">
                                <Link href="/register?role=organizer">Become an Organizer</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Top Header with Progress Bar */}
            <div className="sticky top-0 z-40 bg-background border-b">
                {/* Header Row */}
                <div className="container flex h-14 items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="shrink-0">
                        <Link href={dashboardHref}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-lg font-semibold truncate">
                                {headerTitle}
                            </h1>
                            {entryContext?.label ? (
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                    {entryContext.label}
                                </Badge>
                            ) : null}
                            {hasUnsavedChanges && activeOrganizerId ? (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                    Unsaved
                                </Badge>
                            ) : null}
                        </div>
                        {entryContext?.description ? (
                            <p className="hidden text-sm text-muted-foreground sm:block">
                                {entryContext.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        Step {currentStep} of {steps.length}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-muted">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Mobile Step Indicator */}
            <div className="lg:hidden border-b bg-background">
                <div className="container py-3">
                    <div className="flex items-center justify-between">
                        {steps.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className="flex flex-col items-center gap-1"
                            >
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${currentStep === step.id
                                        ? 'bg-primary text-primary-foreground'
                                        : currentStep > step.id
                                            ? 'bg-primary/20 text-primary'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                                </div>
                                <span className={`text-xs ${currentStep === step.id ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                    {step.title.split(' ')[0]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="container py-6 lg:py-10">
                <div className="flex gap-6 lg:gap-10 xl:gap-16">
                    {/* Sidebar Navigation - Desktop Only */}
                    <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
                        <div className="sticky top-24 space-y-3">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`w-full flex items-start gap-3 rounded-xl p-4 text-left transition-all ${currentStep === step.id
                                        ? 'bg-primary text-primary-foreground shadow-lg'
                                        : currentStep > step.id
                                            ? 'bg-primary/10 hover:bg-primary/15'
                                            : 'bg-card hover:bg-muted'
                                        }`}
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${currentStep === step.id
                                            ? 'bg-primary-foreground/20'
                                            : currentStep > step.id
                                                ? 'bg-primary/20 text-primary'
                                                : 'bg-muted'
                                            }`}
                                    >
                                        {currentStep > step.id ? (
                                            <Check className="h-4 w-4" />
                                        ) : (
                                            <step.icon className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium">{step.title}</p>
                                        <p className={`text-sm truncate ${currentStep === step.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                </button>
                            ))}

                            {/* Quick Actions */}
                            <div className="pt-6 space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 justify-center gap-2 text-base font-medium border-2"
                                    onClick={handlePreviewClick}
                                    disabled={disableSaveButtons}
                                >
                                    <Eye className="h-5 w-5" />
                                    Preview Event
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={formData.visibility}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                visibility: value as DraftFormData['visibility'],
                                            }))
                                        }
                                    >
                                        <SelectTrigger className="h-11 flex-1 bg-transparent border-2 border-border/50 hover:border-border transition-colors">
                                            <div className="flex items-center gap-2">
                                                {formData.visibility === 'public' ? (
                                                    <Globe className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className="font-medium">{formData.visibility === 'public' ? 'Public' : 'Private'}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="public">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    <span>Public</span>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="private">
                                                <div className="flex items-center gap-2">
                                                    <EyeOff className="h-4 w-4" />
                                                    <span>Private</span>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    className="w-full h-11 justify-center gap-2"
                                    onClick={handlePublishClick}
                                    disabled={disablePublishButtons}
                                >
                                    <Sparkles className="h-4 w-4" />
                                    {publishButtonLabel}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full justify-center text-muted-foreground"
                                    onClick={handleSaveDraftClick}
                                    disabled={disableSaveButtons}
                                >
                                    {saveButtonLabel}
                                </Button>
                                <div className="text-left">
                                    <p className="text-xs text-muted-foreground">{statusLabel}</p>
                                    {actionError ? (
                                        <p className="text-sm text-destructive mt-1">{actionError}</p>
                                    ) : actionMessage ? (
                                        <p className="text-sm text-muted-foreground mt-1">{actionMessage}</p>
                                    ) : null}
                                </div>
                                {publishErrors.length > 0 ? (
                                    <ul className="mt-2 text-sm text-destructive list-disc list-inside space-y-1">
                                        {publishErrors.map((error) => (
                                            <li key={error}>{error}</li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        <div className="max-w-2xl mx-auto lg:max-w-none lg:mx-0">
                            <AnimatePresence mode="wait">
                                {/* Step 1: Basic Details */}
                                {currentStep === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 lg:space-y-5"
                                    >
                                        <div>
                                            <h2 className="font-display text-xl lg:text-2xl font-bold">Tell us about your event</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Start with the basics - you can always edit later</p>
                                        </div>

                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                {/* Event Title */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                                                    <Input
                                                        id="title"
                                                        name="title"
                                                        placeholder="Give your event a catchy name"
                                                        value={formData.title}
                                                        onChange={handleFieldChange}
                                                        minLength={3}
                                                        maxLength={75}
                                                        className={cn(
                                                            'h-11',
                                                            fieldErrors.title ? 'border-destructive focus-visible:ring-destructive' : '',
                                                        )}
                                                    />
                                                    {fieldErrors.title ? (
                                                        <p className="text-xs text-destructive">{fieldErrors.title}</p>
                                                    ) : null}
                                                </div>

                                                {/* Description */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                                                    <textarea
                                                        id="description"
                                                        name="description"
                                                        placeholder="What's your event about?"
                                                        value={formData.description}
                                                        onChange={handleFieldChange}
                                                        rows={3}
                                                        maxLength={2500}
                                                        className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Category</Label>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {['Conference', 'Workshop', 'Iftar', 'Sisters', 'Youth', 'Charity', 'Education'].map((cat) => {
                                                            const isSelected = formData.categories.includes(cat);
                                                            return (
                                                                <Badge
                                                                    key={cat}
                                                                    variant={isSelected ? 'default' : 'outline'}
                                                                    className="cursor-pointer px-2.5 py-1 text-xs"
                                                                    onClick={() => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            categories: isSelected
                                                                                ? prev.categories.filter((c) => c !== cat)
                                                                                : [...prev.categories, cat],
                                                                        }));
                                                                    }}
                                                                >
                                                                    {cat}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-sm font-medium">Event Poster</Label>
                                                    <input
                                                        ref={bannerInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleBannerSelect}
                                                        className="hidden"
                                                        id="banner-upload"
                                                    />
                                                    <label
                                                        htmlFor="banner-upload"
                                                        className="relative flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 transition-all hover:border-primary/40 hover:bg-muted/30 group overflow-hidden aspect-[4/5] max-w-[280px]"
                                                    >
                                                        {formData.bannerImageDataUrl ? (
                                                            <>
                                                                <Image
                                                                    src={formData.bannerImageDataUrl}
                                                                    alt={formData.title || 'Event poster'}
                                                                    fill
                                                                    sizes="280px"
                                                                    className="object-cover"
                                                                    unoptimized
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        removeBanner();
                                                                    }}
                                                                    className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors z-10"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="text-center px-4">
                                                                <div className="mx-auto mb-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                                                    <Upload className="h-4 w-4" />
                                                                </div>
                                                                <p className="font-medium text-sm">Click to upload</p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">1080×1350px recommended</p>
                                                            </div>
                                                        )}
                                                    </label>
                                                </div>



                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 2: When */}
                                {currentStep === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 lg:space-y-5"
                                    >
                                        <div>
                                            <h2 className="font-display text-xl lg:text-2xl font-bold">When is your event?</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Set the date and time for your event</p>
                                        </div>

                                        {/* Date & Time Card */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Calendar className="h-5 w-5" />
                                                        <h3 className="font-semibold">Date & Time</h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor="multiday" className="text-sm text-muted-foreground">Multi-day event</Label>
                                                        <Switch
                                                            id="multiday"
                                                            checked={formData.isMultiDay}
                                                            onCheckedChange={(checked) => {
                                                                setFormData({ ...formData, isMultiDay: checked });
                                                                if (!checked) {
                                                                    clearFieldErrors('endDate');
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Date Selection */}
                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="date">Start Date *</Label>
                                                        <DatePicker
                                                            id="date"
                                                            name="date"
                                                            value={formData.date}
                                                            onChange={(value) => {
                                                                setFormData(prev => ({ ...prev, date: value }));
                                                                clearFieldErrors('date');
                                                            }}
                                                            placeholder="Select start date"
                                                            hasError={!!fieldErrors.date}
                                                            disablePast
                                                        />
                                                        {fieldErrors.date ? (
                                                            <p className="text-xs text-destructive">{fieldErrors.date}</p>
                                                        ) : null}
                                                    </div>
                                                    {formData.isMultiDay && (
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="endDate">End Date *</Label>
                                                            <DatePicker
                                                                id="endDate"
                                                                name="endDate"
                                                                value={formData.endDate}
                                                                onChange={(value) => {
                                                                    setFormData(prev => ({ ...prev, endDate: value }));
                                                                    clearFieldErrors('endDate');
                                                                }}
                                                                placeholder="Select end date"
                                                                hasError={!!fieldErrors.endDate}
                                                                minDate={formData.date ? new Date(formData.date) : undefined}
                                                                disablePast
                                                            />
                                                            {fieldErrors.endDate ? (
                                                                <p className="text-xs text-destructive">{fieldErrors.endDate}</p>
                                                            ) : null}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Time Selection */}
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="startTime">Start Time *</Label>
                                                        <TimePicker
                                                            id="startTime"
                                                            name="startTime"
                                                            value={formData.startTime}
                                                            onChange={(value) => {
                                                                setFormData(prev => ({ ...prev, startTime: value }));
                                                                clearFieldErrors('startTime');
                                                            }}
                                                            placeholder="Select start time"
                                                            hasError={!!fieldErrors.startTime}
                                                        />
                                                        {fieldErrors.startTime ? (
                                                            <p className="text-xs text-destructive">{fieldErrors.startTime}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="endTime">End Time *</Label>
                                                        <TimePicker
                                                            id="endTime"
                                                            name="endTime"
                                                            value={formData.endTime}
                                                            onChange={(value) => {
                                                                setFormData(prev => ({ ...prev, endTime: value }));
                                                                clearFieldErrors('endTime');
                                                            }}
                                                            placeholder="Select end time"
                                                            hasError={!!fieldErrors.endTime}
                                                        />
                                                        {fieldErrors.endTime ? (
                                                            <p className="text-xs text-destructive">{fieldErrors.endTime}</p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {/* Timezone */}
                                                <div className="space-y-1.5">
                                                    <Label>Timezone</Label>
                                                    <Select
                                                        value={formData.timezone}
                                                        onValueChange={(value) => {
                                                            setFormData({ ...formData, timezone: value });
                                                            clearFieldErrors('timezone');
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                'h-11',
                                                                fieldErrors.timezone ? 'border-destructive focus-visible:ring-destructive' : '',
                                                            )}
                                                        >
                                                            <SelectValue placeholder="Select timezone" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Europe/London">🇬🇧 London (GMT/BST)</SelectItem>
                                                            <SelectItem value="Europe/Paris">🇫🇷 Paris (CET)</SelectItem>
                                                            <SelectItem value="Europe/Berlin">🇩🇪 Berlin (CET)</SelectItem>
                                                            <SelectItem value="America/New_York">🇺🇸 New York (EST)</SelectItem>
                                                            <SelectItem value="America/Los_Angeles">🇺🇸 Los Angeles (PST)</SelectItem>
                                                            <SelectItem value="Asia/Dubai">🇦🇪 Dubai (GST)</SelectItem>
                                                            <SelectItem value="Asia/Riyadh">🇸🇦 Riyadh (AST)</SelectItem>
                                                            <SelectItem value="Asia/Karachi">🇵🇰 Karachi (PKT)</SelectItem>
                                                            <SelectItem value="Asia/Kuala_Lumpur">🇲🇾 Kuala Lumpur (MYT)</SelectItem>
                                                            <SelectItem value="Australia/Sydney">🇦🇺 Sydney (AEDT)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {fieldErrors.timezone ? (
                                                        <p className="text-xs text-destructive">{fieldErrors.timezone}</p>
                                                    ) : null}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 3: Where */}
                                {currentStep === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 lg:space-y-5"
                                    >
                                        <div>
                                            <h2 className="font-display text-xl lg:text-2xl font-bold">Where is your event?</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Help attendees find your event</p>
                                        </div>

                                        {/* Location Card */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                <div className="flex items-center gap-2 text-primary">
                                                    <MapPin className="h-5 w-5" />
                                                    <h3 className="font-semibold">Location</h3>
                                                </div>

                                                {/* Location Type Selector */}
                                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                                    {[
                                                        { value: 'physical', label: 'In Person', icon: Building },
                                                        { value: 'online', label: 'Online', icon: Globe },
                                                        { value: 'hybrid', label: 'Hybrid', icon: Users },
                                                    ].map((type) => (
                                                        <button
                                                            key={type.value}
                                                            onClick={() => {
                                                                setFormData({ ...formData, locationType: type.value as typeof formData.locationType });
                                                                clearFieldErrors('venue', 'onlineUrl');
                                                            }}
                                                            className={`flex flex-col items-center gap-1 rounded-lg border border-border/60 p-2.5 sm:p-3 transition-all ${formData.locationType === type.value
                                                                ? 'border-primary/70 bg-primary/5'
                                                                : 'hover:border-primary/40'
                                                                }`}
                                                        >
                                                            <type.icon className={`h-4 w-4 ${formData.locationType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                                                            <span className={`text-xs font-medium ${formData.locationType === type.value ? 'text-primary' : ''}`}>
                                                                {type.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Physical Location Fields */}
                                                {(formData.locationType === 'physical' || formData.locationType === 'hybrid') && (
                                                    <div className="space-y-3 pt-1.5">
                                                        {/* Location Autocomplete */}
                                                        <LocationAutocomplete
                                                            value={formData.venue || ''}
                                                            onSelect={(location) => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    venue: location.venue || location.displayName,
                                                                    address: location.address,
                                                                    city: location.city,
                                                                    latitude: location.lat,
                                                                    longitude: location.lon,
                                                                }));
                                                                setLocationCoords({ lat: location.lat, lon: location.lon });
                                                                clearFieldErrors('venue');
                                                            }}
                                                            label="Venue Location *"
                                                            placeholder="Search for Royal Dublin Society, etc..."
                                                            className=""
                                                        />
                                                        {fieldErrors.venue && (
                                                            <p className="text-xs text-destructive -mt-1">{fieldErrors.venue}</p>
                                                        )}

                                                        {/* Optional manual override fields */}
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="address">Address (optional override)</Label>
                                                                <Input
                                                                    id="address"
                                                                    name="address"
                                                                    placeholder="Street address"
                                                                    value={formData.address}
                                                                    onChange={handleFieldChange}
                                                                    maxLength={100}
                                                                    className="h-11"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="city">City</Label>
                                                                <Input
                                                                    id="city"
                                                                    name="city"
                                                                    placeholder="City"
                                                                    value={formData.city}
                                                                    onChange={handleFieldChange}
                                                                    maxLength={50}
                                                                    className="h-11"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Map Preview */}
                                                        {locationCoords ? (
                                                            <div className="space-y-1.5">
                                                                <Label>Location Preview</Label>
                                                                <EventLocationMap
                                                                    lat={locationCoords.lat}
                                                                    lon={locationCoords.lon}
                                                                    venueName={formData.venue || undefined}
                                                                    address={formData.address || undefined}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="h-24 sm:h-28 rounded-lg bg-muted/40 flex items-center justify-center border border-border/50">
                                                                <div className="text-center text-muted-foreground">
                                                                    <MapPin className="h-6 w-6 mx-auto mb-1" />
                                                                    <p className="text-xs sm:text-sm">Select a location to see map preview</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Online URL */}
                                                {(formData.locationType === 'online' || formData.locationType === 'hybrid') && (
                                                    <div className="space-y-1.5 pt-1.5">
                                                        <Label htmlFor="onlineUrl">Event Link</Label>
                                                        <Input
                                                            id="onlineUrl"
                                                            name="onlineUrl"
                                                            placeholder="https://zoom.us/j/..."
                                                            value={formData.onlineUrl}
                                                            onChange={handleFieldChange}
                                                            maxLength={500}
                                                            className={cn(
                                                                'h-11',
                                                                fieldErrors.onlineUrl ? 'border-destructive focus-visible:ring-destructive' : '',
                                                            )}
                                                        />
                                                        {fieldErrors.onlineUrl ? (
                                                            <p className="text-xs text-destructive">{fieldErrors.onlineUrl}</p>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 4: Tickets */}
                                {currentStep === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 lg:space-y-5"
                                    >
                                        <div>
                                            <h2 className="font-display text-xl lg:text-2xl font-bold">Set up your tickets</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Create one or more ticket types</p>
                                            {fieldErrors.tickets ? (
                                                <p className="text-xs text-destructive mt-1.5">{fieldErrors.tickets}</p>
                                            ) : null}
                                        </div>

                                        {/* Currency Selector */}
                                        <Card className="border-border/50 bg-card/80">
                                            <CardContent className="p-3 sm:p-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-sm font-medium">Ticket Currency</Label>
                                                        <p className="text-xs text-muted-foreground">
                                                            All ticket prices will be in this currency
                                                        </p>
                                                    </div>
                                                    <Select
                                                        value={formData.currency}
                                                        onValueChange={(value) => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                currency: value,
                                                            }));
                                                            clearFieldErrors('currency');
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                'w-[180px] h-10',
                                                                fieldErrors.currency ? 'border-destructive focus-visible:ring-destructive' : '',
                                                            )}
                                                        >
                                                            <SelectValue placeholder="Select currency" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="GBP">🇬🇧 GBP (£)</SelectItem>
                                                            <SelectItem value="USD">🇺🇸 USD ($)</SelectItem>
                                                            <SelectItem value="EUR">🇪🇺 EUR (€)</SelectItem>
                                                            <SelectItem value="CAD">🇨🇦 CAD (C$)</SelectItem>
                                                            <SelectItem value="AUD">🇦🇺 AUD (A$)</SelectItem>
                                                            <SelectItem value="AED">🇦🇪 AED (د.إ)</SelectItem>
                                                            <SelectItem value="SAR">🇸🇦 SAR (﷼)</SelectItem>
                                                            <SelectItem value="MYR">🇲🇾 MYR (RM)</SelectItem>
                                                            <SelectItem value="SGD">🇸🇬 SGD (S$)</SelectItem>
                                                            <SelectItem value="INR">🇮🇳 INR (₹)</SelectItem>
                                                            <SelectItem value="PKR">🇵🇰 PKR (₨)</SelectItem>
                                                            <SelectItem value="TRY">🇹🇷 TRY (₺)</SelectItem>
                                                            <SelectItem value="NGN">🇳🇬 NGN (₦)</SelectItem>
                                                            <SelectItem value="ZAR">🇿🇦 ZAR (R)</SelectItem>
                                                            <SelectItem value="EGP">🇪🇬 EGP (E£)</SelectItem>
                                                            <SelectItem value="IDR">🇮🇩 IDR (Rp)</SelectItem>
                                                            <SelectItem value="BDT">🇧🇩 BDT (৳)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {fieldErrors.currency ? (
                                                        <p className="text-xs text-destructive">{fieldErrors.currency}</p>
                                                    ) : null}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Refund Policy */}
                                        <Card className="border-border/50 bg-card/80">
                                            <CardContent className="p-3 sm:p-4 space-y-3">
                                                <div className="space-y-0.5">
                                                    <Label className="text-sm font-medium">Refund Policy</Label>
                                                    <p className="text-xs text-muted-foreground">
                                                        This will be shown on the public event page
                                                    </p>
                                                </div>
                                                <Select
                                                    value={refundPolicySelection || undefined}
                                                    onValueChange={handleRefundPolicyChange}
                                                >
                                                    <SelectTrigger className="h-10">
                                                        <SelectValue placeholder="Select a refund policy" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {refundPolicyOptions.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value="custom">Custom policy</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {refundPolicySelection === 'custom' && (
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="refundPolicy">Custom policy text</Label>
                                                        <Textarea
                                                            id="refundPolicy"
                                                            name="refundPolicy"
                                                            placeholder="Describe your refund terms for attendees"
                                                            value={formData.refundPolicy}
                                                            onChange={handleFieldChange}
                                                            minLength={10}
                                                            maxLength={500}
                                                            className="min-h-[90px] resize-none"
                                                        />
                                                    </div>
                                                )}
                                                {fieldErrors.refundPolicy ? (
                                                    <p className="text-xs text-destructive">{fieldErrors.refundPolicy}</p>
                                                ) : null}
                                            </CardContent>
                                        </Card>

                                        {/* Ticket Cards */}
                                        <div className="space-y-3">
                                            {regularTickets.map((ticket, index) => {
                                                const hasAdvancedErrors = Boolean(
                                                    ticketErrors[ticket.id]?.maxPerOrder
                                                    || ticketErrors[ticket.id]?.earlyBirdPrice
                                                    || ticketErrors[ticket.id]?.earlyBirdEndDate,
                                                );
                                                const isAdvancedOpen = hasAdvancedErrors || ticketAdvancedOpen[ticket.id];

                                                return (
                                                    <Card key={ticket.id} className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                                        <CardContent className="p-3 sm:p-4 lg:p-5">
                                                            <div className="flex items-center justify-between mb-4">
                                                                <div className="flex items-center gap-2 text-primary">
                                                                    <Ticket className="h-5 w-5" />
                                                                    <h3 className="font-semibold">Ticket {index + 1}</h3>
                                                                    {ticket.visibility === 'hidden' && (
                                                                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => updateTicket(ticket.id, 'visibility', ticket.visibility === 'public' ? 'hidden' : 'public')}
                                                                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                                                                        title={ticket.visibility === 'public' ? 'Hide ticket' : 'Show ticket'}
                                                                    >
                                                                        {ticket.visibility === 'public' ? <Eye className="h-4 w-4 text-muted-foreground" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                                                                    </button>
                                                                    {regularTickets.length > 1 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => removeTicket(ticket.id)}
                                                                            className="text-destructive hover:text-destructive h-8 w-8"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                {/* Name and Price */}
                                                                <div className="grid gap-3 sm:grid-cols-2">
                                                                    <div className="space-y-1.5">
                                                                        <Label>Ticket Name *</Label>
                                                                        <Input
                                                                            placeholder="e.g., General Admission"
                                                                            value={ticket.name}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                clearTicketError(ticket.id, 'name');
                                                                                updateTicket(ticket.id, 'name', value);
                                                                                const nextTickets = tickets.map((current) =>
                                                                                    current.id === ticket.id
                                                                                        ? { ...current, name: value }
                                                                                        : current,
                                                                                );
                                                                                const nameErrors = buildDuplicateTicketNameErrors(nextTickets);
                                                                                setTicketErrors((prev) => mergeTicketNameErrors(prev, nameErrors, nextTickets));
                                                                            }}
                                                                            minLength={2}
                                                                            maxLength={50}
                                                                            className={cn(
                                                                                'h-11',
                                                                                ticketErrors[ticket.id]?.name
                                                                                    ? 'border-destructive focus-visible:ring-destructive'
                                                                                    : '',
                                                                            )}
                                                                        />
                                                                        {ticketErrors[ticket.id]?.name ? (
                                                                            <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.name}</p>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label>Price ({getCurrencySymbol(formData.currency)})</Label>
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Label htmlFor={`free-${ticket.id}`} className="text-xs text-muted-foreground">Free</Label>
                                                                                <Switch
                                                                                    id={`free-${ticket.id}`}
                                                                                    checked={ticket.isFree}
                                                                                    onCheckedChange={(checked) => {
                                                                                        clearTicketError(ticket.id, 'price');
                                                                                        updateTicket(ticket.id, 'isFree', checked);
                                                                                        if (checked) updateTicket(ticket.id, 'price', '0');
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            type="number"
                                                                            placeholder="0.00"
                                                                            min="0"
                                                                            max={maxTicketPrice}
                                                                            step="0.01"
                                                                            value={ticket.price}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                // Prevent negative values
                                                                                if (value === '' || Number(value) >= 0) {
                                                                                    clearTicketError(ticket.id, 'price');
                                                                                    updateTicket(ticket.id, 'price', value);
                                                                                }
                                                                            }}
                                                                            className={cn(
                                                                                'h-11',
                                                                                ticketErrors[ticket.id]?.price ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                            )}
                                                                            disabled={ticket.isFree}
                                                                        />
                                                                        {ticketErrors[ticket.id]?.price ? (
                                                                            <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.price}</p>
                                                                        ) : null}
                                                                    </div>
                                                                    {canUseCredits && !ticket.isFree && parseFloat(ticket.price || '0') > 0 && (
                                                                        <div className="space-y-1.5">
                                                                            <Label>Organizer Fee ({getCurrencySymbol(formData.currency)})</Label>
                                                                            <Input
                                                                                type="number"
                                                                                placeholder="0.55"
                                                                                min="0"
                                                                                step="0.01"
                                                                                max={maxCustomFee}
                                                                                value={ticket.customFee ?? ''}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    if (value === '' || Number(value) >= 0) {
                                                                                        clearTicketError(ticket.id, 'customFee');
                                                                                        updateTicket(ticket.id, 'customFee', value);
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    'h-11',
                                                                                    ticketErrors[ticket.id]?.customFee ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                )}
                                                                            />
                                                                            {ticketErrors[ticket.id]?.customFee ? (
                                                                                <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.customFee}</p>
                                                                            ) : null}
                                                                            <p className="text-xs text-muted-foreground">Optional per-ticket organizer fee (paid to you).</p>
                                                                        </div>
                                                                    )}

                                                                    {/* Absorb Fee Toggle - subtle but visible */}
                                                                    {!canUseCredits && !ticket.isFree && parseFloat(ticket.price || '0') > 0 && (
                                                                        <div className="flex items-center justify-between gap-3 mt-2 p-2 rounded-lg bg-muted/30">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    {ticket.absorbFee ? 'You absorb fee' : 'Customer pays fee'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                    {ticket.absorbFee ? 'Absorb' : 'Pass on'}
                                                                                </span>
                                                                                <Switch
                                                                                    checked={ticket.absorbFee ?? false}
                                                                                    onCheckedChange={(checked) => updateTicket(ticket.id, 'absorbFee', checked)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Quantity */}
                                                                <div className="space-y-1.5">
                                                                    <Label>Total Quantity</Label>
                                                                    <div className="flex items-center gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-10 w-10 shrink-0"
                                                                            onClick={() => {
                                                                                clearTicketError(ticket.id, 'quantity');
                                                                                updateTicket(ticket.id, 'quantity', Math.max(1, ticket.quantity - 10));
                                                                            }}
                                                                        >
                                                                            <Minus className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={MAX_TICKET_QUANTITY}
                                                                            value={ticket.quantity || ''}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value.replace(/^0+(?=\d)/, '');
                                                                                clearTicketError(ticket.id, 'quantity');
                                                                                const parsed = Number.parseInt(val, 10);
                                                                                const nextValue = Number.isFinite(parsed)
                                                                                    ? Math.min(parsed, MAX_TICKET_QUANTITY)
                                                                                    : 0;
                                                                                updateTicket(ticket.id, 'quantity', nextValue);
                                                                            }}
                                                                            className={cn(
                                                                                'h-10 text-center font-semibold',
                                                                                ticketErrors[ticket.id]?.quantity ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                            )}
                                                                        />
                                                                        <Button
                                                                            variant="outline"
                                                                            size="icon"
                                                                            className="h-10 w-10 shrink-0"
                                                                            onClick={() => {
                                                                                clearTicketError(ticket.id, 'quantity');
                                                                                updateTicket(ticket.id, 'quantity', Math.min(MAX_TICKET_QUANTITY, ticket.quantity + 10));
                                                                            }}
                                                                        >
                                                                            <Plus className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    {ticketErrors[ticket.id]?.quantity ? (
                                                                        <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.quantity}</p>
                                                                    ) : null}
                                                                </div>

                                                                {/* Advanced Options Accordion */}
                                                                <Collapsible
                                                                    open={isAdvancedOpen}
                                                                    onOpenChange={(open) =>
                                                                        setTicketAdvancedOpen((prev) => ({
                                                                            ...prev,
                                                                            [ticket.id]: open,
                                                                        }))
                                                                    }
                                                                >
                                                                    <CollapsibleTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="w-full flex items-center justify-between text-muted-foreground hover:text-primary px-2 transition-colors group"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Settings2 className="h-4 w-4" />
                                                                                <span className="text-xs font-medium">Advanced options</span>
                                                                            </div>
                                                                            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                                                        </Button>
                                                                    </CollapsibleTrigger>
                                                                    <CollapsibleContent className="space-y-4 pt-3 mt-1">
                                                                        {/* Max Per Order */}
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-sm">Max Per Order</Label>
                                                                            <Input
                                                                                type="number"
                                                                                value={ticket.maxPerOrder || ''}
                                                                                onChange={(e) => {
                                                                                    const value = e.target.value;
                                                                                    if (value === '') {
                                                                                        updateTicket(ticket.id, 'maxPerOrder', 0);
                                                                                        clearTicketError(ticket.id, 'maxPerOrder');
                                                                                        return;
                                                                                    }
                                                                                    const numericValue = Number.parseInt(value, 10);
                                                                                    if (Number.isNaN(numericValue) || numericValue < 0) {
                                                                                        return;
                                                                                    }
                                                                                    updateTicket(ticket.id, 'maxPerOrder', numericValue);
                                                                                    if (numericValue >= 1) {
                                                                                        clearTicketError(ticket.id, 'maxPerOrder');
                                                                                    }
                                                                                }}
                                                                                onBlur={() => {
                                                                                    const maxPerOrderLimit = Math.min(MAX_PER_ORDER, Math.max(ticket.quantity, 1));
                                                                                    if (!ticket.maxPerOrder || ticket.maxPerOrder < 1) {
                                                                                        updateTicket(ticket.id, 'maxPerOrder', 1);
                                                                                        setTicketErrors((prev) => ({
                                                                                            ...prev,
                                                                                            [ticket.id]: {
                                                                                                ...prev[ticket.id],
                                                                                                maxPerOrder: "Can't be less than one.",
                                                                                            },
                                                                                        }));
                                                                                        return;
                                                                                    }
                                                                                    if (ticket.maxPerOrder > maxPerOrderLimit) {
                                                                                        updateTicket(ticket.id, 'maxPerOrder', maxPerOrderLimit);
                                                                                        setTicketErrors((prev) => ({
                                                                                            ...prev,
                                                                                            [ticket.id]: {
                                                                                                ...prev[ticket.id],
                                                                                                maxPerOrder: `Can't exceed ${maxPerOrderLimit}.`,
                                                                                            },
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                className={cn(
                                                                                    'h-9',
                                                                                    ticketErrors[ticket.id]?.maxPerOrder ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                )}
                                                                                min={1}
                                                                                max={Math.min(MAX_PER_ORDER, Math.max(ticket.quantity, 1))}
                                                                            />
                                                                            {ticketErrors[ticket.id]?.maxPerOrder ? (
                                                                                <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.maxPerOrder}</p>
                                                                            ) : null}
                                                                        </div>

                                                                        {/* Early Bird Toggle */}
                                                                        <div className="border border-border/50 rounded-lg p-3 space-y-3 bg-muted/20">
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                                                                    <Label className="text-sm font-medium">Early Bird Pricing</Label>
                                                                                </div>
                                                                                <Switch
                                                                                    checked={ticket.hasEarlyBird}
                                                                                    onCheckedChange={(checked) => {
                                                                                        updateTicket(ticket.id, 'hasEarlyBird', checked);
                                                                                        if (!checked) {
                                                                                            clearTicketError(ticket.id, 'earlyBirdPrice');
                                                                                            clearTicketError(ticket.id, 'earlyBirdEndDate');
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                            {ticket.hasEarlyBird && (
                                                                                <div className="grid gap-3 sm:grid-cols-2">
                                                                                    <div className="space-y-1.5">
                                                                                        <Label className="text-xs">Early Bird Price ({getCurrencySymbol(formData.currency)})</Label>
                                                                                        <Input
                                                                                            type="number"
                                                                                            placeholder="Discounted price"
                                                                                            min="0"
                                                                                            max={maxTicketPrice}
                                                                                            step="0.01"
                                                                                            value={ticket.earlyBirdPrice}
                                                                                            onChange={(e) => {
                                                                                                const value = e.target.value;
                                                                                                if (value === '' || Number(value) >= 0) {
                                                                                                    clearTicketError(ticket.id, 'earlyBirdPrice');
                                                                                                    updateTicket(ticket.id, 'earlyBirdPrice', value);
                                                                                                }
                                                                                            }}
                                                                                            className={cn(
                                                                                                'h-9',
                                                                                                ticketErrors[ticket.id]?.earlyBirdPrice ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                            )}
                                                                                        />
                                                                                        {ticketErrors[ticket.id]?.earlyBirdPrice ? (
                                                                                            <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.earlyBirdPrice}</p>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <div className="space-y-1.5">
                                                                                        <Label className="text-xs">Ends On</Label>
                                                                                        <DatePicker
                                                                                            value={ticket.earlyBirdEndDate}
                                                                                            onChange={(value) => {
                                                                                                clearTicketError(ticket.id, 'earlyBirdEndDate');
                                                                                                updateTicket(ticket.id, 'earlyBirdEndDate', value);
                                                                                            }}
                                                                                            placeholder="Select end date"
                                                                                            hasError={!!ticketErrors[ticket.id]?.earlyBirdEndDate}
                                                                                            className="h-9"
                                                                                        />
                                                                                        {ticketErrors[ticket.id]?.earlyBirdEndDate ? (
                                                                                            <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.earlyBirdEndDate}</p>
                                                                                        ) : null}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </CollapsibleContent>
                                                                </Collapsible>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>

                                        {/* Add Ticket Button */}
                                        <Button
                                            variant="outline"
                                            className="w-full h-10 border-dashed border-border/60 text-sm"
                                            onClick={addTicket}
                                        >
                                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                                            Add Another Ticket
                                        </Button>

                                        {/* Donation Section */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Heart className="h-5 w-5" />
                                                        <h3 className="font-semibold">Donation</h3>
                                                    </div>
                                                    {donationTicket ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={removeDonationTicket}
                                                            className="text-destructive hover:text-destructive h-8 w-8"
                                                            title="Remove donation"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" onClick={addDonationTicket}>
                                                            <Plus className="mr-1 h-3 w-3" />
                                                            Add Donation
                                                        </Button>
                                                    )}
                                                </div>

                                                {donationTicket ? (
                                                    <div className="space-y-4">
                                                        <div className="space-y-1.5">
                                                            <Label>What is this donation for?</Label>
                                                            <Input
                                                                placeholder="e.g., Supports the mosque renovation fund"
                                                                value={donationTicket.description}
                                                                onChange={(e) => {
                                                                    updateTicket(donationTicket.id, 'description', e.target.value);
                                                                }}
                                                                maxLength={250}
                                                                className="h-11"
                                                            />
                                                            <p className="text-xs text-muted-foreground">Shown to buyers during checkout.</p>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label>Default donation amount ({getCurrencySymbol(formData.currency)})</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                max={maxDonationAmount}
                                                                placeholder="0"
                                                                value={donationTicket.price}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '' || Number(value) >= 0) {
                                                                        clearTicketError(donationTicket.id, 'price');
                                                                        updateTicket(donationTicket.id, 'price', value);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    'h-11',
                                                                    ticketErrors[donationTicket.id]?.price ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                )}
                                                            />
                                                            {ticketErrors[donationTicket.id]?.price ? (
                                                                <p className="text-xs text-destructive">{ticketErrors[donationTicket.id]?.price}</p>
                                                            ) : (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Buyers can change or remove this amount at checkout.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Add an optional donation to your event checkout.
                                                    </p>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Promo Codes Section */}
                                        <Card className="mt-4 border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <Tag className="h-5 w-5" />
                                                        <h3 className="font-semibold">Promo Codes</h3>
                                                    </div>
                                                    <Button variant="outline" size="sm" onClick={addPromoCode}>
                                                        <Plus className="mr-1 h-3 w-3" />
                                                        Add Code
                                                    </Button>
                                                </div>

                                                {promoCodes.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm">No promo codes yet</p>
                                                        <p className="text-xs">Add a code to offer discounts</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {promoCodes.map((promo) => {
                                                            const promoError = promoErrors[promo.id];

                                                            return (
                                                                <div key={promo.id} className="border rounded-xl p-4 space-y-4">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="space-y-1">
                                                                            <Input
                                                                                placeholder="CODE2024"
                                                                                value={promo.code}
                                                                                onChange={(e) => updatePromoCode(promo.id, 'code', e.target.value.toUpperCase())}
                                                                                minLength={PROMO_CODE_MIN_LENGTH}
                                                                                maxLength={PROMO_CODE_MAX_LENGTH}
                                                                                autoCapitalize="characters"
                                                                                className={cn(
                                                                                    'h-10 w-40 font-mono uppercase',
                                                                                    promoError?.code ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                )}
                                                                            />
                                                                            {promoError?.code ? (
                                                                                <p className="text-xs text-destructive">{promoError.code}</p>
                                                                            ) : null}
                                                                        </div>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => removePromoCode(promo.id)}
                                                                            className="text-destructive hover:text-destructive h-8 w-8"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                    {/* Reveals Hidden Tickets Toggle - First */}
                                                                    {(() => {
                                                                        const isExistingPromo = isUuid(promo.id);
                                                                        const isLocked = isExistingPromo && !promo.revealsHiddenTickets;
                                                                        return (
                                                                            <div className={cn(
                                                                                "flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50",
                                                                                isLocked && "opacity-60"
                                                                            )}>
                                                                                <div className="space-y-0.5">
                                                                                    <Label className="text-sm font-medium">Unlock Hidden Tickets</Label>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        {isLocked
                                                                                            ? "Cannot change type on saved codes - create a new code instead"
                                                                                            : "This code reveals hidden ticket types"
                                                                                        }
                                                                                    </p>
                                                                                </div>
                                                                                <Switch
                                                                                    checked={promo.revealsHiddenTickets ?? false}
                                                                                    disabled={isLocked}
                                                                                    onCheckedChange={(checked) => {
                                                                                        updatePromoCode(promo.id, 'revealsHiddenTickets', checked);
                                                                                        if (checked) {
                                                                                            updatePromoCode(promo.id, 'discountValue', '0');
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Show hidden tickets selector when reveal mode is ON */}
                                                                    {promo.revealsHiddenTickets && (
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm font-medium">Select Hidden Tickets to Reveal</Label>
                                                                            <div
                                                                                className={cn(
                                                                                    'space-y-2 rounded-lg border p-2',
                                                                                    promoError?.applicableTicketTypeIds
                                                                                        ? 'border-destructive'
                                                                                        : 'border-transparent',
                                                                                )}
                                                                            >
                                                                                {regularTickets.filter(t => t.visibility === 'hidden').length === 0 ? (
                                                                                    <p className="text-xs text-muted-foreground py-3 text-center">
                                                                                        No hidden tickets. Create a ticket with visibility set to &quot;Hidden&quot; first.
                                                                                    </p>
                                                                                ) : (
                                                                                    regularTickets.filter(t => t.visibility === 'hidden').map((ticket) => {
                                                                                        const isSelected = promo.applicableTicketTypeIds?.includes(ticket.id) ?? false;
                                                                                        return (
                                                                                            <div
                                                                                                key={ticket.id}
                                                                                                onClick={() => {
                                                                                                    const current = promo.applicableTicketTypeIds ?? [];
                                                                                                    const updated = isSelected
                                                                                                        ? current.filter(id => id !== ticket.id)
                                                                                                        : [...current, ticket.id];
                                                                                                    updatePromoCode(promo.id, 'applicableTicketTypeIds', updated.length > 0 ? updated : null);
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                                                                                                    isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                                                                                )}
                                                                                            >
                                                                                                <div className={cn(
                                                                                                    "h-4 w-4 rounded border flex items-center justify-center",
                                                                                                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                                                                                )}>
                                                                                                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                                                                                </div>
                                                                                                <span className="text-sm">{ticket.name || 'Untitled Ticket'}</span>
                                                                                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto">Hidden</span>
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                )}
                                                                            </div>
                                                                            {promoError?.applicableTicketTypeIds ? (
                                                                                <p className="text-xs text-destructive">{promoError.applicableTicketTypeIds}</p>
                                                                            ) : null}
                                                                        </div>
                                                                    )}

                                                                    {/* Discount fields - only show when NOT in reveal mode */}
                                                                    {!promo.revealsHiddenTickets && (
                                                                        <>
                                                                            <div className="grid gap-4 sm:grid-cols-3">
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm">Discount Type</Label>
                                                                                    <Select
                                                                                        value={promo.discountType}
                                                                                        onValueChange={(val) => updatePromoCode(promo.id, 'discountType', val as 'fixed' | 'percentage')}
                                                                                    >
                                                                                        <SelectTrigger
                                                                                            className={cn(
                                                                                                'h-10',
                                                                                                promoError?.discountType ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                            )}
                                                                                        >
                                                                                            <SelectValue />
                                                                                        </SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                                                            <SelectItem value="fixed">Fixed Amount ({getCurrencySymbol(formData.currency)})</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                    {promoError?.discountType ? (
                                                                                        <p className="text-xs text-destructive">{promoError.discountType}</p>
                                                                                    ) : null}
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm">Discount Value</Label>
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            type="number"
                                                                                            placeholder="10"
                                                                                            min={promo.discountType === 'percentage' ? 1 : 0.01}
                                                                                            max={promo.discountType === 'percentage' ? 100 : maxPromoFixed}
                                                                                            step={promo.discountType === 'percentage' ? 1 : 0.01}
                                                                                            value={promo.discountValue}
                                                                                            onChange={(e) => {
                                                                                                const value = e.target.value;
                                                                                                if (value === '' || Number(value) >= 0) {
                                                                                                    updatePromoCode(promo.id, 'discountValue', value);
                                                                                                }
                                                                                            }}
                                                                                            className={cn(
                                                                                                'h-10 pr-8',
                                                                                                promoError?.discountValue ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                            )}
                                                                                        />
                                                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                                                            {promo.discountType === 'percentage' ? '%' : getCurrencySymbol(formData.currency)}
                                                                                        </span>
                                                                                    </div>
                                                                                    {promoError?.discountValue ? (
                                                                                        <p className="text-xs text-destructive">{promoError.discountValue}</p>
                                                                                    ) : null}
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    <Label className="text-sm">Usage Limit</Label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        placeholder="Unlimited"
                                                                                        value={promo.usageLimit || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value.replace(/^0+(?=\d)/, '');
                                                                                            updatePromoCode(promo.id, 'usageLimit', parseInt(val) || 0);
                                                                                        }}
                                                                                        className={cn(
                                                                                            'h-10',
                                                                                            promoError?.usageLimit ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                        )}
                                                                                    />
                                                                                    {promoError?.usageLimit ? (
                                                                                        <p className="text-xs text-destructive">{promoError.usageLimit}</p>
                                                                                    ) : null}
                                                                                </div>
                                                                            </div>

                                                                            {/* Applies to Specific Tickets - only for discount codes */}
                                                                            {regularTickets.length > 1 && (
                                                                                <div className="space-y-2 pt-2">
                                                                                    <Label className="text-sm font-medium">Applies to Tickets</Label>
                                                                                    <p className="text-xs text-muted-foreground mb-2">
                                                                                        Leave empty to apply to all tickets
                                                                                    </p>
                                                                                    <div
                                                                                        className={cn(
                                                                                            'space-y-2 rounded-lg border p-2',
                                                                                            promoError?.applicableTicketTypeIds
                                                                                                ? 'border-destructive'
                                                                                                : 'border-transparent',
                                                                                        )}
                                                                                    >
                                                                                        {regularTickets.map((ticket) => {
                                                                                            const isSelected = promo.applicableTicketTypeIds?.includes(ticket.id) ?? false;
                                                                                            return (
                                                                                                <div
                                                                                                    key={ticket.id}
                                                                                                    onClick={() => {
                                                                                                        const current = promo.applicableTicketTypeIds ?? [];
                                                                                                        const updated = isSelected
                                                                                                            ? current.filter(id => id !== ticket.id)
                                                                                                            : [...current, ticket.id];
                                                                                                        updatePromoCode(promo.id, 'applicableTicketTypeIds', updated.length > 0 ? updated : null);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                                                                                                        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                                                                                                    )}
                                                                                                >
                                                                                                    <div className={cn(
                                                                                                        "h-4 w-4 rounded border flex items-center justify-center",
                                                                                                        isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                                                                                                    )}>
                                                                                                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                                                                                    </div>
                                                                                                    <span className="text-sm">{ticket.name || 'Untitled Ticket'}</span>
                                                                                                    {ticket.visibility === 'hidden' && (
                                                                                                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Hidden</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                    {promoError?.applicableTicketTypeIds ? (
                                                                                        <p className="text-xs text-destructive">{promoError.applicableTicketTypeIds}</p>
                                                                                    ) : null}
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    )}

                                                                    {/* Valid dates - always shown */}
                                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm">Valid From</Label>
                                                                            <DatePicker
                                                                                value={promo.validFrom}
                                                                                onChange={(value) => updatePromoCode(promo.id, 'validFrom', value)}
                                                                                placeholder="Select start date"
                                                                                hasError={!!promoError?.validFrom}
                                                                            />
                                                                            {promoError?.validFrom ? (
                                                                                <p className="text-xs text-destructive">{promoError.validFrom}</p>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label className="text-sm">Valid Until</Label>
                                                                            <DatePicker
                                                                                value={promo.validUntil}
                                                                                onChange={(value) => updatePromoCode(promo.id, 'validUntil', value)}
                                                                                placeholder="Select end date"
                                                                                hasError={!!promoError?.validUntil}
                                                                                minDate={promo.validFrom ? new Date(promo.validFrom) : undefined}
                                                                            />
                                                                            {promoError?.validUntil ? (
                                                                                <p className="text-xs text-destructive">{promoError.validUntil}</p>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}</CardContent>
                                        </Card>
                                    </motion.div>
                                )}

                                {/* Step 5: Attendee Info */}
                                {currentStep === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4 lg:space-y-5"
                                    >
                                        <div>
                                            <h2 className="font-display text-xl lg:text-2xl font-bold">Attendee Information</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Configure how you collect attendee details at checkout</p>
                                        </div>

                                        {/* Attendee Collection Mode */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                <div>
                                                    <Label className="text-sm font-medium">Collection Mode</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">Choose how attendee info is collected during checkout</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div
                                                        onClick={() => setFormData(prev => ({ ...prev, attendeeInfoMode: 'buyer_choice' }))}
                                                        className={cn(
                                                            "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                                                            formData.attendeeInfoMode === 'buyer_choice'
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                                            formData.attendeeInfoMode === 'buyer_choice' ? "border-primary" : "border-muted-foreground"
                                                        )}>
                                                            {formData.attendeeInfoMode === 'buyer_choice' && (
                                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium">Let buyer choose</p>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Buyers can use their info for all tickets or add details for each attendee. Best for general admission events.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div
                                                        onClick={() => setFormData(prev => ({ ...prev, attendeeInfoMode: 'per_ticket' }))}
                                                        className={cn(
                                                            "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                                                            formData.attendeeInfoMode === 'per_ticket'
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                                            formData.attendeeInfoMode === 'per_ticket' ? "border-primary" : "border-muted-foreground"
                                                        )}>
                                                            {formData.attendeeInfoMode === 'per_ticket' && (
                                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium">Require info for each ticket</p>
                                                            <p className="text-sm text-muted-foreground mt-1">
                                                                Collect name, email, gender and age for every ticket. Best for conferences or reserved seating.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Default Fields Info */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                <div>
                                                    <Label className="text-sm font-medium">Default Fields</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">These fields are always collected from attendees</p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                        <Check className="h-4 w-4 text-primary" />
                                                        <span className="text-sm">Full Name</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                        <Check className="h-4 w-4 text-primary" />
                                                        <span className="text-sm">Email</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                        <Check className="h-4 w-4 text-primary" />
                                                        <span className="text-sm">Gender</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                        <Check className="h-4 w-4 text-primary" />
                                                        <span className="text-sm">Age</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Custom Questions */}
                                        <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-sm">
                                            <CardContent className="p-3 sm:p-4 lg:p-5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <Label className="text-sm font-medium">Custom Questions</Label>
                                                        <p className="text-xs text-muted-foreground mt-1">Add additional questions for attendees (max 10)</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            if (formData.customQuestions.length >= 10) return;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                customQuestions: [
                                                                    ...prev.customQuestions,
                                                                    {
                                                                        id: `q-${Date.now()}`,
                                                                        label: '',
                                                                        type: 'text',
                                                                        required: false,
                                                                    }
                                                                ]
                                                            }));
                                                        }}
                                                        disabled={formData.customQuestions.length >= 10}
                                                    >
                                                        <Plus className="h-4 w-4 mr-1" />
                                                        Add Question
                                                    </Button>
                                                </div>

                                                {formData.customQuestions.length === 0 ? (
                                                    <div className="text-center py-8 border border-dashed rounded-lg">
                                                        <p className="text-sm text-muted-foreground">No custom questions added</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Add Question&rdquo; to collect more info</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {formData.customQuestions.map((question, index) => (
                                                            <div key={question.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                                                                <div className="flex-1 space-y-2">
                                                                    <Input
                                                                        placeholder="Question label"
                                                                        value={question.label}
                                                                        onChange={(e) => {
                                                                            const updated = [...formData.customQuestions];
                                                                            updated[index] = { ...updated[index], label: e.target.value };
                                                                            setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                        }}
                                                                        className="h-9"
                                                                    />
                                                                    <div className="flex items-center gap-3">
                                                                        <Select
                                                                            value={question.type}
                                                                            onValueChange={(value) => {
                                                                                const updated = [...formData.customQuestions];
                                                                                const newType = value as 'text' | 'select' | 'checkbox';
                                                                                updated[index] = {
                                                                                    ...updated[index],
                                                                                    type: newType,
                                                                                    // Initialize options array when switching to select/checkbox
                                                                                    options: (newType === 'select' || newType === 'checkbox')
                                                                                        ? (updated[index].options ?? [])
                                                                                        : undefined
                                                                                };
                                                                                setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                            }}
                                                                        >
                                                                            <SelectTrigger className="w-32 h-8">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="text">Text</SelectItem>
                                                                                <SelectItem value="select">Dropdown</SelectItem>
                                                                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        <label className="flex items-center gap-2 text-sm">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={question.required}
                                                                                onChange={(e) => {
                                                                                    const updated = [...formData.customQuestions];
                                                                                    updated[index] = { ...updated[index], required: e.target.checked };
                                                                                    setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                                }}
                                                                                className="rounded border-muted-foreground"
                                                                            />
                                                                            Required
                                                                        </label>
                                                                    </div>
                                                                    {/* Options input for dropdown/checkbox types */}
                                                                    {(question.type === 'select' || question.type === 'checkbox') && (
                                                                        <div className="space-y-2 pt-2">
                                                                            <Label className="text-xs text-muted-foreground">
                                                                                Options
                                                                            </Label>
                                                                            {/* Display existing options as chips */}
                                                                            {(question.options?.length ?? 0) > 0 && (
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {question.options?.map((opt, optIndex) => (
                                                                                        <div
                                                                                            key={optIndex}
                                                                                            className="flex items-center gap-1 pl-2.5 pr-1 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                                                                                        >
                                                                                            <span>{opt}</span>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => {
                                                                                                    const updated = [...formData.customQuestions];
                                                                                                    const newOptions = [...(updated[index].options ?? [])];
                                                                                                    newOptions.splice(optIndex, 1);
                                                                                                    updated[index] = { ...updated[index], options: newOptions };
                                                                                                    setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                                                }}
                                                                                                className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                                                                                            >
                                                                                                <X className="h-3 w-3" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                            {/* Add new option input */}
                                                                            <div className="flex items-center gap-2">
                                                                                <Input
                                                                                    placeholder="Type an option and press Enter"
                                                                                    className="h-8 text-sm flex-1"
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.preventDefault();
                                                                                            const input = e.currentTarget;
                                                                                            const value = input.value.trim();
                                                                                            if (value) {
                                                                                                const updated = [...formData.customQuestions];
                                                                                                const currentOptions = updated[index].options ?? [];
                                                                                                if (!currentOptions.includes(value)) {
                                                                                                    updated[index] = { ...updated[index], options: [...currentOptions, value] };
                                                                                                    setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                                                }
                                                                                                input.value = '';
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                />
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="h-8 px-3"
                                                                                    onClick={(e) => {
                                                                                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                                                                        const value = input?.value?.trim();
                                                                                        if (value) {
                                                                                            const updated = [...formData.customQuestions];
                                                                                            const currentOptions = updated[index].options ?? [];
                                                                                            if (!currentOptions.includes(value)) {
                                                                                                updated[index] = { ...updated[index], options: [...currentOptions, value] };
                                                                                                setFormData(prev => ({ ...prev, customQuestions: updated }));
                                                                                            }
                                                                                            input.value = '';
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                                                    Add
                                                                                </Button>
                                                                            </div>
                                                                            {(question.options?.length ?? 0) === 0 && (
                                                                                <p className="text-xs text-amber-600">
                                                                                    Add at least one option for attendees to choose from
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                                    onClick={() => {
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            customQuestions: prev.customQuestions.filter(q => q.id !== question.id)
                                                                        }));
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Mobile Visibility Selector */}
                            <div className="lg:hidden mt-6 flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                                <span className="text-xs text-muted-foreground">Visibility:</span>
                                <div className="flex rounded-lg overflow-hidden border border-border/50">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, visibility: 'public' }))}
                                        className={cn(
                                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                                            formData.visibility === 'public'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-card hover:bg-muted'
                                        )}
                                    >
                                        <Globe className="h-3 w-3" />
                                        Public
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, visibility: 'private' }))}
                                        className={cn(
                                            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                                            formData.visibility === 'private'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-card hover:bg-muted'
                                        )}
                                    >
                                        <EyeOff className="h-3 w-3" />
                                        Private
                                    </button>
                                </div>
                            </div>

                            {/* Navigation Footer */}
                            <div className="mt-8 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={prevStep}
                                    disabled={currentStep === 1}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Back</span>
                                </Button>

                                <div className="flex gap-2 sm:gap-3">
                                    {/* Preview button - always visible on mobile like desktop */}
                                    <Button
                                        variant="outline"
                                        className="lg:hidden gap-2"
                                        onClick={handlePreviewClick}
                                        disabled={disableSaveButtons}
                                    >
                                        <Eye className="h-4 w-4" />
                                        Preview
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="lg:hidden"
                                        onClick={handleSaveDraftClick}
                                        disabled={disableSaveButtons}
                                    >
                                        {saveButtonLabel}
                                    </Button>
                                    {currentStep < steps.length ? (
                                        <Button onClick={nextStep} className="gap-2 px-4 sm:px-6">
                                            Continue
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            className="gap-2 px-4 sm:px-6"
                                            onClick={handlePublishClick}
                                            disabled={disablePublishButtons}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            <span className="hidden sm:inline">{publishButtonLabel}</span>
                                            <span className="sm:hidden">Publish</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Insufficient Credits</DialogTitle>
                        <DialogDescription>
                            Your total ticket capacity ({publishCapacity}) exceeds your available credits ({organizerCredits}).
                            Credits will be used until they run out, then tickets will switch to the platform fee and organizer fees won&apos;t apply.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsWarningOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href={`${buildDashboardPath(activeOrganizerId || '')}/billing/purchase`}>
                                Top Up Credits
                            </Link>
                        </Button>
                        <Button onClick={executePublish}>
                            Publish Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}

export default function CreateEventPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-muted/30 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
            <CreateEventContent />
        </Suspense>
    );
}

function CreateEventContent() {
    const searchParams = useSearchParams();
    const sourceParam = (searchParams.get('source') as DraftEntrySource | null) ?? null;
    const [initialDraft, setInitialDraft] = useState<DraftEventInitial | undefined>(undefined);
    const [entryContext, setEntryContext] = useState<EntryContext>(entryContextDefaults.scratch);
    const [wizardKey, setWizardKey] = useState('scratch');
    const appliedSourceRef = useRef<string | null>(null);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isDraftSource(sourceParam)) {
            appliedSourceRef.current = null;
            setInitialDraft(undefined);
            setEntryContext(entryContextDefaults.scratch);
            setWizardKey('scratch');
            return;
        }

        if (appliedSourceRef.current === sourceParam) {
            return;
        }

        appliedSourceRef.current = sourceParam;
        const pending = consumePendingDraft();

        if (pending && pending.source === sourceParam) {
            setInitialDraft(pending.draft);
            setEntryContext({
                label: pending.meta?.label ?? entryContextDefaults[sourceParam].label,
                description: pending.meta?.description ?? entryContextDefaults[sourceParam].description,
            });
            setWizardKey(`${sourceParam}-${pending.meta?.key ?? sourceParam}`);
        } else {
            setInitialDraft(undefined);
            setEntryContext({
                label: 'Start from scratch',
                description: 'We could not load that draft, so you can continue manually.',
            });
            setWizardKey(`scratch-${sourceParam}`);
        }
    }, [sourceParam]);
    /* eslint-enable react-hooks/set-state-in-effect */

    return (
        <EventWizard
            key={wizardKey}
            mode="create"
            initialDraft={initialDraft}
            entryContext={entryContext}
        />
    );
}
