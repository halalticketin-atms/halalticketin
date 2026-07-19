'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, Reorder } from 'motion/react';
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
    Lock,
    Trash2,
    Loader2,
    ChevronDown,
    Settings2,
    Code,
    FileText,
    Info,
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { LocationAutocomplete } from '@/components/events/LocationAutocomplete';
import { MainStepTabs, MainStepSidebar, SectionNavSidebar, SectionNavChips } from '@/components/events/wizard';
import { EmbedCheckoutSnippet } from '@/components/events/EmbedCheckoutSnippet';
import { AiDraftReviewPanel } from '@/components/events/AiDraftReviewPanel';
import { CustomQuestionLibraryDialog } from '@/components/events/CustomQuestionLibraryDialog';
import { CustomQuestionRow, QUESTION_ACCENTS } from '@/components/events/CustomQuestionRow';

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
import { consumePendingDraft, type DraftEntrySource } from '@/utils/pending-draft-storage';
import {
    resolveDraftEntryContext,
    type DraftEntryContext,
} from '@/lib/ai/draft-entry-context';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import {
    createEventDraft,
    fetchEventDetails,
    createPromoCode,
    deletePromoCode,
    fetchEventPromoCodes,
    publishEvent,
    saveEventTickets,
    updateEventDraft,
    updatePromoCode as updatePromoCodeApi,
    type PromoCodeInput,
    type CustomQuestionLibraryItem,
    type UpsertEventPayload,
} from '@/lib/events-api';
import { buildDraftFromEventRecord, mapPromoCodeRecordsToDraft, mapTicketRecordsToDraft } from '@/lib/ticket-mappers';
import { ApiError } from '@/lib/api';
import { getBackendErrorDetails } from '@/lib/api-errors';
import { getUserFriendlyMessage, toast } from '@/lib/notifications';
import { getCurrencySymbol } from '@/lib/fees';
import { LIMITS_GBP, MAX_PER_ORDER, MAX_PROMO_CODES_PER_EVENT, MAX_TICKET_QUANTITY, PROMO_CODE_MAX_LENGTH, PROMO_CODE_MIN_LENGTH, roundCurrencyLimit } from '@/lib/input-limits';
import { getTicketSavePlan, serializeTicketPayloadsForSave } from '@/lib/ticket-save';
import { formatDateInTimeZone, formatTimeInTimeZone, toUtcIsoString } from '@/lib/timezone';
import { uploadEventBanner } from '@/lib/upload-api';
import { getCreditBalance } from '@/lib/credits-api';
import { clearEventEditRecovery, getEventEditRecoverySavedAt, writeEventEditRecovery } from '@/lib/event-edit-recovery';
import { getWizardErrorTarget } from '@/lib/event-wizard-sections';
import { validateMinimumAttendeeAge } from '@/lib/event-minimum-age';
import { isNewerServerTimestamp, shouldApplyForegroundRefresh } from '@/lib/foreground-refresh';
import {
    hasEligibleWaitlistTicket,
    shouldStageTicketsBeforePublishedWaitlistEnable,
} from '@/lib/event-waitlist-validation';
import {
    updateLocationTextField,
    validateEventLocation,
    type EventLocationFields,
} from '@/lib/event-location-validation';
import {
    addLibraryQuestions,
    createCustomQuestionId,
    MAX_CUSTOM_QUESTIONS,
    MAX_CUSTOM_QUESTION_LABEL_LENGTH,
    moveCustomQuestion,
} from '@/lib/custom-question-library';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isSavedTicketId = (id: string) => UUID_REGEX.test(id);

type SubStepConfig = { id: string; label: string };
type MainStepConfig = {
    id: number;
    title: string;
    description: string;
    icon: typeof FileText;
    subSteps: SubStepConfig[];
};

export const mainSteps: MainStepConfig[] = [
    {
        id: 1,
        title: 'Event Details',
        description: 'Title, description & image',
        icon: FileText,
        subSteps: [
            { id: 'title', label: 'Title & Category' },
            { id: 'description', label: 'Description' },
            { id: 'poster', label: 'Poster Upload' },
            { id: 'visibility', label: 'Visibility' },
        ],
    },
    {
        id: 2,
        title: 'Schedule',
        description: 'Date & time',
        icon: Calendar,
        subSteps: [
            { id: 'date', label: 'Date Selection' },
            { id: 'time', label: 'Time' },
        ],
    },
    {
        id: 3,
        title: 'Venue',
        description: 'Location & venue',
        icon: MapPin,
        subSteps: [
            { id: 'location', label: 'Location' },
        ],
    },
    {
        id: 4,
        title: 'Tickets',
        description: 'Pricing & availability',
        icon: Ticket,
        subSteps: [
            { id: 'currency', label: 'Currency' },
            { id: 'ticketTypes', label: 'Ticket Types' },
            { id: 'donations', label: 'Donations' },
            { id: 'promoCodes', label: 'Promo Codes' },
            { id: 'refundPolicy', label: 'Refund Policy' },
            { id: 'attendeeInfo', label: 'Attendee Info' },
        ],
    },
    {
        id: 5,
        title: 'Embed',
        description: 'Website integration',
        icon: Code,
        subSteps: [
            { id: 'widget', label: 'Checkout Widget' },
        ],
    },
];

// Legacy steps array for backwards compatibility with existing logic
export const steps = mainSteps.map(step => ({
    id: step.id,
    title: step.title,
    description: step.description,
    icon: step.icon,
}));

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

type TicketFieldErrors = {
    name?: string;
    minPerOrder?: string;
    maxPerOrder?: string;
    price?: string;
    quantity?: string;
    customFee?: string;
    salesStart?: string;
    salesEnd?: string;
    earlyBirdPrice?: string;
    earlyBirdEndDate?: string;
};

const validateLiveTicketFields = (tickets: DraftTicketType[]) => {
    const ticketErrors: Record<string, TicketFieldErrors> = {};
    let firstMessage: string | null = null;

    tickets.forEach((ticket) => {
        if (ticket.type === 'donation') return;
        const errors: TicketFieldErrors = {};
        const addError = (field: keyof TicketFieldErrors, message: string) => {
            errors[field] = message;
            firstMessage ??= message;
        };

        const price = ticket.price.trim();
        if (!ticket.isFree && (price.length === 0 || !Number.isFinite(Number(price)) || Number(price) < 0)) {
            addError('price', 'Enter a valid price for this paid ticket.');
        }
        if (!Number.isInteger(ticket.quantity) || ticket.quantity < 1) {
            addError('quantity', 'Enter a ticket quantity of at least 1.');
        }
        if (!Number.isInteger(ticket.minPerOrder) || ticket.minPerOrder < 0) {
            addError('minPerOrder', 'Enter a minimum per order, or turn the limit off.');
        }
        if (!Number.isInteger(ticket.maxPerOrder) || ticket.maxPerOrder < 0) {
            addError('maxPerOrder', 'Enter a maximum per order, or turn the limit off.');
        } else if (
            ticket.maxPerOrder > 0
            && ticket.minPerOrder > 0
            && ticket.maxPerOrder < ticket.minPerOrder
        ) {
            addError('maxPerOrder', 'Maximum per order must not be lower than the minimum.');
        }

        if (Object.keys(errors).length > 0) ticketErrors[ticket.id] = errors;
    });

    return {
        fieldErrors: firstMessage ? { tickets: firstMessage } : {},
        ticketErrors,
    };
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

const parseLocalDateInput = (date?: string): Date | undefined => {
    if (!date) {
        return undefined;
    }

    const [year, month, day] = date.split('-').map(Number);
    if ([year, month, day].some((value) => Number.isNaN(value))) {
        return undefined;
    }

    return new Date(year, month - 1, day);
};

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
    const isPrivate = formData.visibility === 'private';
    const accessCodeEnabled = isPrivate && formData.accessCodeEnabled;
    const accessCode = formData.accessCode.trim();

    return {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        totalCapacity: formData.totalCapacity,
        startDatetime: start,
        endDatetime: end,
        timezone: formData.timezone || 'UTC',
        isMultiDay: formData.isMultiDay,
        locationType,
        venue: isInPerson ? formData.venue || null : null,
        address: isInPerson ? formData.address || null : null,
        city: isInPerson ? formData.city || null : null,
        latitude: isInPerson ? formData.latitude ?? null : null,
        longitude: isInPerson ? formData.longitude ?? null : null,
        country: isInPerson ? (formData.country.trim() ? formData.country.trim() : null) : null,
        onlineUrl: isOnline ? formData.onlineUrl || null : null,
        currency: formData.currency,
        refundPolicy: formData.refundPolicy.trim() ? formData.refundPolicy.trim() : null,
        isListedPublicly: formData.visibility === 'public',
        isPubliclyAccessible: true,
        accessPassword: accessCodeEnabled && accessCode ? accessCode : undefined,
        clearAccessPassword: !accessCodeEnabled,
        category: formData.categories.length > 0 ? formData.categories.join(',') : null,
        // absorbFee removed - now handled per-ticket
        waitlistEnabled: formData.waitlistEnabled,
        attendeeInfoMode: formData.attendeeInfoMode,
        minimumAttendeeAge: typeof formData.minimumAttendeeAge === 'number'
            ? formData.minimumAttendeeAge
            : undefined,
        customQuestions: formData.customQuestions.length > 0
            ? formData.customQuestions.map((question) => ({
                ...question,
                options: question.type === 'select' || question.type === 'checkbox'
                    ? (Array.isArray(question.options) ? question.options : [])
                    : undefined,
                ageValidation: question.type === 'date' && question.ageValidation === true ? true : undefined,
            }))
            : null,
    };
};

const buildTicketSalesWindowErrors = (
    tickets: DraftTicketType[],
    timeZone: string,
): Record<string, TicketFieldErrors> => {
    const errors: Record<string, TicketFieldErrors> = {};

    tickets.forEach((ticket) => {
        if (ticket.type === 'donation') {
            return;
        }

        const salesStartDate = ticket.salesStart.trim();
        const salesStartTime = ticket.salesStartTime.trim();
        const salesEndDate = ticket.salesEnd.trim();
        const salesEndTime = ticket.salesEndTime.trim();
        const ticketErrors: TicketFieldErrors = {};

        const hasSalesStartDate = salesStartDate.length > 0;
        const hasSalesStartTime = salesStartTime.length > 0;
        const hasSalesEndDate = salesEndDate.length > 0;
        const hasSalesEndTime = salesEndTime.length > 0;

        if (hasSalesStartDate !== hasSalesStartTime) {
            ticketErrors.salesStart = 'Set both sales start date and time.';
        }

        if (hasSalesEndDate !== hasSalesEndTime) {
            ticketErrors.salesEnd = 'Set both sales end date and time.';
        }

        if (!ticketErrors.salesStart && !ticketErrors.salesEnd && hasSalesStartDate && hasSalesEndDate) {
            const salesStartIso = toIsoString(salesStartDate, salesStartTime, timeZone);
            const salesEndIso = toIsoString(salesEndDate, salesEndTime, timeZone);
            if (!salesStartIso || !salesEndIso || new Date(salesEndIso) <= new Date(salesStartIso)) {
                ticketErrors.salesEnd = 'Sales end must be after sales start.';
            }
        }

        if (Object.keys(ticketErrors).length > 0) {
            errors[ticket.id] = ticketErrors;
        }
    });

    return errors;
};

const getTicketSalesWindowWarning = (
    ticket: DraftTicketType,
    timeZone: string,
): string | null => {
    if (ticket.type === 'donation') {
        return null;
    }

    const salesEndDate = ticket.salesEnd.trim();
    const salesEndTime = ticket.salesEndTime.trim();
    if (!salesEndDate || !salesEndTime) {
        return null;
    }

    const salesEndIso = toIsoString(salesEndDate, salesEndTime, timeZone);
    if (!salesEndIso) {
        return null;
    }

    if (new Date(salesEndIso) < new Date()) {
        return 'Sales end is in the past. This ticket is currently closed to buyers.';
    }

    return null;
};

const buildPromoValidityErrors = (
    promoCodes: DraftPromoCode[],
    timeZone?: string,
): Record<string, PromoFieldErrors> => {
    const errors: Record<string, PromoFieldErrors> = {};

    promoCodes.forEach((promo) => {
        const validFromDate = promo.validFrom.trim();
        const validFromTime = promo.validFromTime.trim();
        const validUntilDate = promo.validUntil.trim();
        const validUntilTime = promo.validUntilTime.trim();
        const promoErrors: PromoFieldErrors = {};

        if (!validFromDate && validFromTime) {
            promoErrors.validFrom = 'Choose a valid-from date before setting a time.';
        }

        if (!validUntilDate && validUntilTime) {
            promoErrors.validUntil = 'Choose a valid-until date before setting a time.';
        }

        if (!promoErrors.validFrom && !promoErrors.validUntil && validFromDate && validUntilDate) {
            const validFromIso = buildPromoValidityIso(validFromDate, validFromTime, false, timeZone);
            const validUntilIso = buildPromoValidityIso(validUntilDate, validUntilTime, true, timeZone);
            if (!validFromIso || !validUntilIso || new Date(validUntilIso) <= new Date(validFromIso)) {
                promoErrors.validUntil = 'Valid until must be after valid from.';
            }
        }

        if (Object.keys(promoErrors).length > 0) {
            errors[promo.id] = promoErrors;
        }
    });

    return errors;
};

const buildPromoValidityIso = (
    date: string,
    time: string,
    isEndBoundary: boolean,
    timeZone?: string,
) => {
    const trimmedDate = date.trim();
    if (!trimmedDate) {
        return null;
    }

    const trimmedTime = time.trim();
    if (trimmedTime) {
        return toIsoString(trimmedDate, trimmedTime, timeZone);
    }

    return toIsoString(trimmedDate, isEndBoundary ? '23:59' : '00:00', timeZone);
};

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

/**
 * Check if a step's required fields are filled out.
 * Returns true if all minimum required fields for the step have valid values.
 */
const isStepComplete = (
    stepId: number,
    formData: DraftFormData,
    tickets: DraftTicketType[],
    persistedLocation?: EventLocationFields,
): boolean => {
    switch (stepId) {
        case 1:
            // Step 1: Title is required (min 3 chars)
            return formData.title.trim().length >= 3;

        case 2:
            // Step 2: Date and times are required
            if (!formData.date.trim() || !formData.startTime.trim() || !formData.endTime.trim()) {
                return false;
            }
            // Multi-day events require end date
            if (formData.isMultiDay && !formData.endDate.trim()) {
                return false;
            }
            return true;

        case 3:
            return Object.keys(validateEventLocation(formData, {
                persistedPublishedLocation: persistedLocation,
            })).length === 0;

        case 4:
            // Step 4: Currency and at least one ticket required
            if (!formData.currency) return false;
            if (!formData.totalCapacity || formData.totalCapacity < 1) return false;
            if (validateMinimumAttendeeAge(formData.minimumAttendeeAge)) return false;
            if (tickets.length < 1) return false;
            return true;

        case 5:
            // Step 5 (Embed): No required fields
            return true;

        default:
            return false;
    }
};

const validatePublishForm = (
    formData: DraftFormData,
    tickets: DraftTicketType[],
    hasExistingAccessCode: boolean,
    persistedLocation?: EventLocationFields,
) => {
    const errors: Record<string, string> = {};
    const isPrivate = formData.visibility === 'private';

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

    if (!formData.totalCapacity || formData.totalCapacity < 1) {
        errors.totalCapacity = 'Total event capacity is required.';
    }

    const minimumAgeError = validateMinimumAttendeeAge(formData.minimumAttendeeAge);
    if (minimumAgeError) {
        errors.minimumAttendeeAge = minimumAgeError;
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

    Object.assign(errors, validateEventLocation(formData, {
        persistedPublishedLocation: persistedLocation,
    }));

    if (tickets.length < 1) {
        errors.tickets = 'At least one ticket type must be configured before publishing.';
    }

    if (formData.waitlistEnabled && !hasEligibleWaitlistTicket(tickets)) {
        errors.waitlistEnabled = 'Enable waitlist for at least one public, non-donation ticket.';
        errors.tickets = errors.tickets ?? 'Choose a public ticket type that accepts waitlist signups.';
    }

    const trimmedRefundPolicy = formData.refundPolicy.trim();
    if (!trimmedRefundPolicy) {
        errors.refundPolicy = 'Select a refund policy before publishing.';
    } else if (trimmedRefundPolicy.length < 10) {
        errors.refundPolicy = 'Refund policy must be at least 10 characters.';
    } else if (trimmedRefundPolicy.length > 500) {
        errors.refundPolicy = 'Refund policy must be 500 characters or less.';
    }

    if (isPrivate && formData.accessCodeEnabled) {
        const trimmedAccessCode = formData.accessCode.trim();
        if (!trimmedAccessCode && !hasExistingAccessCode) {
            errors.accessCode = 'Add an access code or disable access protection.';
        } else if (trimmedAccessCode && trimmedAccessCode.length < 4) {
            errors.accessCode = 'Access code must be at least 4 characters.';
        } else if (trimmedAccessCode && trimmedAccessCode.length > 128) {
            errors.accessCode = 'Access code must be 128 characters or less.';
        }
    }

    const liveTicketValidation = validateLiveTicketFields(tickets);
    Object.assign(errors, liveTicketValidation.fieldErrors);

    return { fieldErrors: errors, ticketErrors: liveTicketValidation.ticketErrors };
};

const PARTIAL_SAVE_PROMO_MESSAGE =
    'Event details were saved, but promo code changes need fixing. Your unsaved changes are protected in this browser tab until you save again.';

const buildPartialSaveErrorMessage = (detail?: string | null) =>
    detail
        ? `${detail} Event details were saved, and your unsaved changes are protected in this browser tab until you save again.`
        : 'Event details were saved, but some changes still need fixing. Your unsaved changes are protected in this browser tab until you save again.';

export function EventWizard({
    mode = 'create',
    initialDraft,
    entryContext,
    embedCheckout,
    recoveryNotice,
    persistedLocation,
    serverUpdatedAt,
}: {
    mode?: 'create' | 'edit';
    initialDraft?: DraftEventInitial;
    entryContext?: DraftEntryContext;
    embedCheckout?: {
        slug: string;
        isPublic: boolean;
        status: 'draft' | 'published' | 'cancelled' | 'archived' | null;
    };
    recoveryNotice?: {
        onDiscard: () => void;
    };
    persistedLocation?: EventLocationFields;
    serverUpdatedAt?: string | null;
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
        progressPercentage,
    } = useEventDraft(initialDraft, steps.length);

    // In-page section navigation state (former sub-steps are now anchored sections)
    const [activeSection, setActiveSection] = useState<string>(
        initialDraft?.currentSubStep ?? mainSteps[0]?.subSteps[0]?.id ?? '',
    );
    const [ticketArchiveConfirmId, setTicketArchiveConfirmId] = useState<string | null>(null);
    // Section to scroll to once the target main step has rendered (error nav, resumed drafts)
    const pendingSectionRef = useRef<string | null>(initialDraft?.currentSubStep ?? null);
    const wizardShellRef = useRef<HTMLDivElement>(null);
    const wizardHeaderRef = useRef<HTMLDivElement>(null);

    // Get current main step config
    const currentMainStep = useMemo(
        () => mainSteps.find(s => s.id === currentStep) || mainSteps[0],
        [currentStep]
    );

    // Derived data for MainStepTabs navigation component
    const mainStepTabsData = useMemo(
        () => mainSteps.map(step => ({
            id: step.id,
            title: step.title,
            icon: step.icon,
            isCurrent: step.id === currentStep,
            isComplete: step.id < currentStep && isStepComplete(step.id, formData, tickets, persistedLocation),
            hasWarning: false,
        })),
        [currentStep, formData, persistedLocation, tickets]
    );

    // Current step's sections for the section navs
    const currentSections = useMemo(
        () => currentMainStep.subSteps.map(sub => ({
            id: sub.id,
            label: sub.label,
        })),
        [currentMainStep.subSteps]
    );

    // SectionNavSidebar renders nothing for single-section steps, so the sticky
    // footer's left inset must shrink to just the main step rail to stay aligned
    const hasSectionRail = currentSections.length >= 2;

    // Navigation handlers
    const handleMainStepClick = useCallback((stepId: number) => {
        setCurrentStep(stepId);
    }, [setCurrentStep]);

    const scrollToSection = useCallback((sectionId: string) => {
        document.getElementById(`section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);

    // Navigate to a specific step and scroll to one of its sections (useful for error navigation)
    const navigateToStepWithSubStep = useCallback((stepId: number, sectionId?: string) => {
        if (currentStep === stepId) {
            if (sectionId) {
                scrollToSection(sectionId);
            }
            return;
        }
        pendingSectionRef.current = sectionId ?? null;
        setCurrentStep(stepId);
    }, [currentStep, scrollToSection, setCurrentStep]);

    const goToStepForErrors = useCallback((errors: Record<string, string>) => {
        const target = getWizardErrorTarget(errors);
        if (target) {
            navigateToStepWithSubStep(target.step, target.section);
        }
    }, [navigateToStepWithSubStep]);

    // Continue/Back move between the five main pages
    const handleContinue = useCallback(() => {
        nextStep();
    }, [nextStep]);

    const handleBack = useCallback(() => {
        setCurrentStep(currentStep - 1);
    }, [currentStep, setCurrentStep]);

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
    const hasCurrencyUserOverrideRef = useRef(false);
    const saveDraftPromiseRef = useRef<Promise<string | null> | null>(null);

    useEffect(() => {
        appliedBannerRef.current = null;
        appliedBannerFileRef.current = null;
        setBannerWasRemoved(false);
    }, [initialDraft?.eventId]);

    useEffect(() => {
        hasCurrencyUserOverrideRef.current = false;
    }, [initialDraft?.eventId, currentOrganizer?.id]);

    useEffect(() => {
        setHasExistingAccessCode(initialDraft?.formData?.accessCodeEnabled ?? false);
    }, [initialDraft?.eventId, initialDraft?.formData?.accessCodeEnabled]);


    // Sync currency from organizer default if likely untouched
    useEffect(() => {
        if (!currentOrganizer?.defaultCurrency) {
            return;
        }
        if (hasCurrencyUserOverrideRef.current) {
            return;
        }
        if (initialDraft?.formData?.currency) {
            return;
        }
        setFormData((prev) => {
            if (prev.currency === currentOrganizer.defaultCurrency) {
                return prev;
            }
            return { ...prev, currency: currentOrganizer.defaultCurrency! };
        });
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

    useEffect(() => {
        const lat = formData.latitude;
        const lon = formData.longitude;
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lon);

        if (!hasCoords) {
            if (locationCoords) {
                setLocationCoords(null);
            }
            return;
        }

        if (!locationCoords || locationCoords.lat !== lat || locationCoords.lon !== lon) {
            setLocationCoords({ lat: lat as number, lon: lon as number });
        }
    }, [formData.latitude, formData.longitude, locationCoords]);

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
    const [draftEmbedSlug, setDraftEmbedSlug] = useState<string | null>(embedCheckout?.slug ?? null);
    const [draftEmbedStatus, setDraftEmbedStatus] = useState<'draft' | 'published' | 'cancelled' | 'archived' | null>(
        embedCheckout?.status ?? initialDraft?.eventStatus ?? null,
    );

    // Track if this was a new event (no initial ID) to trigger redirect after first save
    const wasNewEventRef = useRef(!initialDraft?.eventId);
    const hasRedirectedRef = useRef(false);

    // Redirect to edit page after first save in create mode (ensures persistence)
    useEffect(() => {
        if (
            mode === 'create' &&
            wasNewEventRef.current &&
            eventId &&
            !hasRedirectedRef.current
        ) {
            hasRedirectedRef.current = true;
            // Use replace to update URL without breaking browser back button
            router.replace(`/events/${eventId}/edit`);
        }
    }, [mode, eventId, router]);

    const [hasExistingAccessCode, setHasExistingAccessCode] = useState<boolean>(
        initialDraft?.formData?.accessCodeEnabled ?? false,
    );
    const lastSavedTicketPayloadRef = useRef<string | null>(
        mode === 'edit' && !recoveryNotice
            ? serializeTicketPayloadsForSave(
                tickets,
                formData.currency,
                formData.timezone,
                initialDraft?.eventId ?? null,
            )
            : null,
    );
    const lastSavedWaitlistEnabledRef = useRef(
        initialDraft?.formData?.waitlistEnabled ?? false,
    );

    useEffect(() => {
        if (initialDraft?.eventId && eventId !== initialDraft.eventId) {
            setEventId(initialDraft.eventId);
        }
    }, [eventId, initialDraft?.eventId]);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [, setActionMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [, setPublishErrors] = useState<string[]>([]);
    const [isNavigatingToOrganizerSettings, setIsNavigatingToOrganizerSettings] = useState(false);
    const [hasOrganizerContactPublishBlocker, setHasOrganizerContactPublishBlocker] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [ticketErrors, setTicketErrors] = useState<Record<string, TicketFieldErrors>>({});
    const [promoErrors, setPromoErrors] = useState<Record<string, PromoFieldErrors>>({});
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const [ticketAdvancedOpen, setTicketAdvancedOpen] = useState<Record<string, boolean>>({});
    const [ticketAdvancedTab, setTicketAdvancedTab] = useState<Record<string, 'limits' | 'sales' | 'earlybird'>>({});
    const [ticketOpenMap, setTicketOpenMap] = useState<Record<string, boolean>>({});
    const [showAccessCode, setShowAccessCode] = useState(false);
    const initialTicketOpenAppliedRef = useRef(false);
    const capacityOverrideRef = useRef(formData.totalCapacity > 0);

    // Ref for scrolling to top of content area
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const shell = wizardShellRef.current;
        const header = wizardHeaderRef.current;
        if (!shell || !header) return;

        const updateOffset = () => {
            shell.style.setProperty('--event-wizard-sticky-offset', `${Math.ceil(header.getBoundingClientRect().height)}px`);
        };

        updateOffset();
        window.addEventListener('resize', updateOffset);

        if (typeof ResizeObserver === 'undefined') {
            return () => {
                window.removeEventListener('resize', updateOffset);
            };
        }

        const observer = new ResizeObserver(updateOffset);
        observer.observe(header);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateOffset);
        };
    }, []);

    // On step change (and mount), jump to a pending section or to the top
    useEffect(() => {
        const pendingSection = pendingSectionRef.current;
        pendingSectionRef.current = null;
        const target = pendingSection ? document.getElementById(`section-${pendingSection}`) : null;
        if (target) {
            target.scrollIntoView({ block: 'start' });
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [currentStep]);

    // Scroll spy: highlight the section closest to the top of the viewport
    useEffect(() => {
        const sectionIds = currentMainStep.subSteps.map((sub) => sub.id);
        setActiveSection((current) => sectionIds.includes(current) ? current : sectionIds[0] ?? '');

        let frame = 0;
        const update = () => {
            frame = 0;
            const stickyOffset = Number.parseFloat(wizardShellRef.current?.style.getPropertyValue('--event-wizard-sticky-offset') ?? '60');
            const activeThreshold = (Number.isFinite(stickyOffset) ? stickyOffset : 60) + 80;
            let current = sectionIds[0];
            for (const id of sectionIds) {
                const el = document.getElementById(`section-${id}`);
                if (el && el.getBoundingClientRect().top <= activeThreshold) {
                    current = id;
                }
            }
            // At the very bottom, the last section counts as active even if short
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
                current = sectionIds[sectionIds.length - 1];
            }
            setActiveSection(current);
        };
        frame = window.requestAnimationFrame(update);

        if (sectionIds.length < 2) {
            return () => {
                if (frame) {
                    window.cancelAnimationFrame(frame);
                }
            };
        }

        const onScroll = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(update);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [currentStep, currentMainStep.subSteps]);

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
        if (formData.visibility !== 'public' || !formData.accessCodeEnabled) {
            return;
        }
        setFormData((prev) => ({
            ...prev,
            accessCodeEnabled: false,
            accessCode: ''
        }));
        setHasExistingAccessCode(false);
        clearFieldErrors('accessCode');
    }, [clearFieldErrors, formData.accessCodeEnabled, formData.visibility, setFormData]);

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
            setTicketOpenMap((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
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

    const removeTicketConfirmed = useCallback(
        (id: string) => {
            removeTicketBase(id);
            clearFieldErrors('tickets');
            const nextTickets = tickets.filter((ticket) => ticket.id !== id);
            const nameErrors = buildDuplicateTicketNameErrors(nextTickets);
            setTicketErrors((prev) => mergeTicketNameErrors(prev, nameErrors, nextTickets));
            setTicketOpenMap((prev) => {
                if (!Object.prototype.hasOwnProperty.call(prev, id)) {
                    return prev;
                }
                const next = { ...prev };
                delete next[id];
                return next;
            });
        },
        [clearFieldErrors, removeTicketBase, tickets],
    );
    const removeTicket = useCallback(
        (id: string) => {
            if (isSavedTicketId(id)) {
                setTicketArchiveConfirmId(id);
                return;
            }
            removeTicketConfirmed(id);
        },
        [removeTicketConfirmed],
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

    useEffect(() => {
        if (capacityOverrideRef.current) {
            return;
        }
        const totalFromTickets = regularTickets.reduce((sum, ticket) => sum + (ticket.quantity || 0), 0);
        if (totalFromTickets !== formData.totalCapacity) {
            setFormData((prev) => ({
                ...prev,
                totalCapacity: totalFromTickets,
            }));
        }
    }, [formData.totalCapacity, regularTickets, setFormData]);

    const activePromoCount = useMemo(
        () => promoCodes.filter((promo) => promo.isActive !== false).length,
        [promoCodes],
    );
    const promoLimitReached = activePromoCount >= MAX_PROMO_CODES_PER_EVENT;
    const ticketErrorIds = useMemo(() => Object.keys(ticketErrors), [ticketErrors]);
    const ticketHeaderStyles = useMemo(() => ([
        {
            header: 'bg-emerald-50/80 border-l-emerald-400',
            badge: 'bg-emerald-100 text-emerald-700',
            accent: 'text-emerald-600',
        },
        {
            header: 'bg-sky-50/80 border-l-sky-400',
            badge: 'bg-sky-100 text-sky-700',
            accent: 'text-sky-600',
        },
        {
            header: 'bg-amber-50/80 border-l-amber-400',
            badge: 'bg-amber-100 text-amber-700',
            accent: 'text-amber-600',
        },
        {
            header: 'bg-rose-50/80 border-l-rose-400',
            badge: 'bg-rose-100 text-rose-700',
            accent: 'text-rose-600',
        },
        {
            header: 'bg-teal-50/80 border-l-teal-400',
            badge: 'bg-teal-100 text-teal-700',
            accent: 'text-teal-600',
        },
        {
            header: 'bg-orange-50/80 border-l-orange-400',
            badge: 'bg-orange-100 text-orange-700',
            accent: 'text-orange-600',
        },
    ]), []);

    useEffect(() => {
        setTicketOpenMap((prev) => {
            let changed = false;
            const next = { ...prev };
            const currentIds = new Set(tickets.map((ticket) => ticket.id));

            Object.keys(next).forEach((id) => {
                if (!currentIds.has(id)) {
                    delete next[id];
                    changed = true;
                }
            });

            if (!initialTicketOpenAppliedRef.current && tickets.length > 0) {
                tickets.forEach((ticket, index) => {
                    if (next[ticket.id] === undefined) {
                        next[ticket.id] = index === 0;
                        changed = true;
                    }
                });
                initialTicketOpenAppliedRef.current = true;
                return changed ? next : prev;
            }

            tickets.forEach((ticket) => {
                if (next[ticket.id] === undefined) {
                    next[ticket.id] = true;
                    changed = true;
                }
            });

            return changed ? next : prev;
        });
    }, [tickets]);

    useEffect(() => {
        if (ticketErrorIds.length === 0) {
            return;
        }
        setTicketOpenMap((prev) => {
            let changed = false;
            const next = { ...prev };
            ticketErrorIds.forEach((id) => {
                if (next[id] !== true) {
                    next[id] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [ticketErrorIds]);

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
            const errorField =
                field === 'validFromTime'
                    ? 'validFrom'
                    : field === 'validUntilTime'
                        ? 'validUntil'
                        : field;
            if (errorField === 'code' || errorField === 'discountValue' || errorField === 'usageLimit' || errorField === 'validFrom' || errorField === 'validUntil' || errorField === 'applicableTicketTypeIds' || errorField === 'discountType') {
                clearPromoError(id, errorField);
            }
        },
        [clearPromoError, updatePromoCodeBase],
    );

    const addPromoCode = useCallback(() => {
        if (promoLimitReached) {
            toast.warning(`You can add up to ${MAX_PROMO_CODES_PER_EVENT} active promo codes per event.`);
            return;
        }
        addPromoCodeBase();
    }, [addPromoCodeBase, promoLimitReached]);

    const removePromoCode = useCallback(
        (id: string) => {
            removePromoCodeBase(id);
            clearPromoError(id);
        },
        [clearPromoError, removePromoCodeBase],
    );

    const handleFieldChange = useCallback(
        (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = event.target;
            if (name === 'address' || name === 'city') {
                setFormData((current) => updateLocationTextField(current, name, value));
            } else {
                handleInputChange(event);
            }
            clearFieldErrors(event.target.name);
        },
        [clearFieldErrors, handleInputChange, setFormData],
    );

    const serializedDraft = useMemo(
        () => JSON.stringify({ formData, tickets, promoCodes }),
        [formData, tickets, promoCodes],
    );
    const lastSavedSnapshotRef = useRef(recoveryNotice ? '' : serializedDraft);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const hasUnsavedChangesRef = useRef(false);
    const foregroundRequestVersionRef = useRef(0);
    const saveGenerationRef = useRef(0);
    const isSavingRef = useRef(false);
    const lastServerUpdatedAtRef = useRef<string | null>(serverUpdatedAt ?? null);
    const [serverChangeDraft, setServerChangeDraft] = useState<DraftEventInitial | null>(null);

    useEffect(() => {
        lastServerUpdatedAtRef.current = serverUpdatedAt ?? null;
    }, [serverUpdatedAt]);

    useEffect(() => {
        const nextHasUnsavedChanges = serializedDraft !== lastSavedSnapshotRef.current;
        hasUnsavedChangesRef.current = nextHasUnsavedChanges;
        setHasUnsavedChanges(nextHasUnsavedChanges);
    }, [serializedDraft]);

    const persistEditRecovery = useCallback((options?: {
        eventId?: string | null;
        tickets?: DraftTicketType[];
        promoCodes?: DraftPromoCode[];
        savedAt?: number;
        force?: boolean;
    }) => {
        const snapshotEventId = options?.eventId ?? eventId;
        const snapshotTickets = options?.tickets ?? tickets;
        const snapshotPromoCodes = options?.promoCodes ?? promoCodes;
        const snapshot = JSON.stringify({
            formData,
            tickets: snapshotTickets,
            promoCodes: snapshotPromoCodes,
        });
        const isDirty = snapshot !== lastSavedSnapshotRef.current;
        if (mode !== 'edit' || !snapshotEventId || (!options?.force && !isDirty)) {
            return;
        }

        writeEventEditRecovery(snapshotEventId, {
            eventId: snapshotEventId,
            savedAt: options?.savedAt ?? Date.now(),
            currentStep,
            currentSubStep: activeSection,
            draft: {
                eventId: snapshotEventId,
                eventStatus: eventStatus ?? undefined,
                formData,
                tickets: snapshotTickets,
                promoCodes: snapshotPromoCodes,
                currentStep,
                currentSubStep: activeSection,
            },
        });
    }, [activeSection, currentStep, eventId, eventStatus, formData, mode, promoCodes, tickets]);

    useEffect(() => {
        persistEditRecovery();
    }, [persistEditRecovery]);

    useEffect(() => {
        if (mode !== 'edit') {
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                persistEditRecovery();
            }
        };
        const handlePageHide = () => {
            persistEditRecovery();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [mode, persistEditRecovery]);

    const markSnapshotAsSaved = useCallback(
        (override?: {
            formData?: DraftFormData;
            tickets?: DraftTicketType[];
            promoCodes?: DraftPromoCode[];
            eventId?: string | null;
        }) => {
            const snapshotFormData = override?.formData ?? formData;
            const snapshotTickets = override?.tickets ?? tickets;
            const snapshotPromoCodes = override?.promoCodes ?? promoCodes;
            const snapshotEventId = override?.eventId ?? eventId;
            const snapshot = JSON.stringify({
                formData: snapshotFormData,
                tickets: snapshotTickets,
                promoCodes: snapshotPromoCodes,
            });
            lastSavedSnapshotRef.current = snapshot;
            lastSavedWaitlistEnabledRef.current = snapshotFormData.waitlistEnabled;
            lastSavedTicketPayloadRef.current = serializeTicketPayloadsForSave(
                snapshotTickets,
                snapshotFormData.currency,
                snapshotFormData.timezone,
                snapshotEventId,
            );
            if (snapshotEventId) {
                clearEventEditRecovery(snapshotEventId);
            }
            setHasUnsavedChanges(false);
            hasUnsavedChangesRef.current = false;
            setLastSavedAt(new Date());
        },
        [eventId, formData, promoCodes, tickets],
    );

    const applyForegroundDraft = useCallback((draft: DraftEventInitial) => {
        setFormData((current) => ({ ...current, ...draft.formData }));
        setTickets(draft.tickets ?? []);
        setPromoCodes(draft.promoCodes ?? []);
        setHasExistingAccessCode(draft.formData?.accessCodeEnabled ?? false);
        markSnapshotAsSaved({
            formData: { ...formData, ...draft.formData },
            tickets: draft.tickets ?? [],
            promoCodes: draft.promoCodes ?? [],
            eventId: draft.eventId ?? eventId,
        });
    }, [eventId, formData, markSnapshotAsSaved, setFormData, setPromoCodes, setTickets]);

    const refreshEditorOnForeground = useCallback(async () => {
        if (mode !== 'edit' || !eventId || isSavingRef.current) return;
        const requestVersion = ++foregroundRequestVersionRef.current;
        const saveGenerationAtStart = saveGenerationRef.current;
        try {
            const [eventResponse, promoResponse] = await Promise.all([
                fetchEventDetails(eventId),
                fetchEventPromoCodes(eventId),
            ]);
            if (!shouldApplyForegroundRefresh({
                requestVersion,
                currentRequestVersion: foregroundRequestVersionRef.current,
                saveGenerationAtStart,
                currentSaveGeneration: saveGenerationRef.current,
                saveInProgress: isSavingRef.current,
            })) return;

            const nextUpdatedAt = eventResponse.event.updatedAt;
            if (!isNewerServerTimestamp(lastServerUpdatedAtRef.current, nextUpdatedAt)) return;
            const nextDraft = buildDraftFromEventRecord(
                eventResponse.event,
                eventResponse.tickets,
                promoResponse.promoCodes,
            );
            lastServerUpdatedAtRef.current = nextUpdatedAt;
            if (hasUnsavedChangesRef.current) {
                setServerChangeDraft(nextDraft);
                return;
            }
            applyForegroundDraft(nextDraft);
        } catch {
            // Foreground refresh is advisory. Preserve the current editor and retry next focus.
        }
    }, [applyForegroundDraft, eventId, mode]);

    useEffect(() => {
        if (mode !== 'edit') return;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') void refreshEditorOnForeground();
        };
        const handleFocus = () => void refreshEditorOnForeground();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
        };
    }, [mode, refreshEditorOnForeground]);

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
        async (options?: { silent?: boolean; blockOnPromoErrors?: boolean }) => {
            if (saveDraftPromiseRef.current) {
                return saveDraftPromiseRef.current;
            }

            const runSave = async (): Promise<string | null> => {
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
                    navigateToStepWithSubStep(1, 'title');
                    return null;
                }
                if (trimmedTitle.length > 75) {
                    setActionError('Event title must be 75 characters or less.');
                    setFieldErrors({ title: 'Title must be 75 characters or less' });
                    navigateToStepWithSubStep(1, 'title');
                    return null;
                }

                const minimumAgeError = validateMinimumAttendeeAge(formData.minimumAttendeeAge);
                if (minimumAgeError) {
                    setActionError(minimumAgeError);
                    setFieldErrors((current) => ({
                        ...current,
                        minimumAttendeeAge: minimumAgeError,
                    }));
                    navigateToStepWithSubStep(4, 'attendeeInfo');
                    return null;
                }

                if (eventStatus === 'published') {
                    const liveValidation = validatePublishForm(
                        formData,
                        tickets,
                        hasExistingAccessCode,
                        persistedLocation,
                    );
                    const liveFieldErrors = liveValidation.fieldErrors;
                    setTicketErrors(liveValidation.ticketErrors);
                    if (Object.keys(liveFieldErrors).length > 0) {
                        setFieldErrors(liveFieldErrors);
                        setPublishErrors([]);
                        goToStepForErrors(liveFieldErrors);
                        const errorMessage = Object.values(liveFieldErrors)[0]
                            ?? 'Fix the highlighted fields before updating this event.';
                        setActionError(errorMessage);
                        if (!options?.silent) {
                            toast.error(errorMessage);
                        }
                        return null;
                    }
                }

                // Invalidate any foreground read that began before or during this save.
                saveGenerationRef.current += 1;
                isSavingRef.current = true;
                setIsSaving(true);
                setActionError(null);
                setHasOrganizerContactPublishBlocker(false);
                if (!options?.silent) {
                    setActionMessage(null);
                }

                let persistedEventUpdatedAt: string | null = null;
                let persistedEventId: string | null = eventId;
                let eventWasPersisted = false;

                try {
                    const duplicateNameErrors = buildDuplicateTicketNameErrors(tickets);
                    if (Object.keys(duplicateNameErrors).length > 0) {
                        setTicketErrors((prev) => mergeTicketNameErrors(prev, duplicateNameErrors, tickets));
                        setFieldErrors((prev) => ({ ...prev, tickets: 'Ticket name must be unique.' }));
                        setActionError('Ticket names must be unique.');
                        navigateToStepWithSubStep(4, 'ticketTypes');
                        return null;
                    }

                    const ticketSalesWindowErrors = buildTicketSalesWindowErrors(tickets, formData.timezone);
                    if (Object.keys(ticketSalesWindowErrors).length > 0) {
                        setTicketErrors((prev) => {
                            const next = { ...prev };
                            Object.entries(ticketSalesWindowErrors).forEach(([id, errors]) => {
                                next[id] = { ...next[id], ...errors };
                            });
                            return next;
                        });
                        setFieldErrors((prev) => ({ ...prev, tickets: 'Fix ticket sales window errors.' }));
                        setActionError('Fix ticket sales window errors before saving.');
                        navigateToStepWithSubStep(4, 'ticketTypes');
                        return null;
                    }

                    const payload = buildEventPayload({ ...formData, title: trimmedTitle });
                    if (bannerWasRemoved) {
                        payload.bannerImageUrl = null;
                    }
                    let nextEventId = eventId;
                    let normalizedTickets = tickets;
                    const ticketIdMap = new Map<string, string>();
                    let ticketsSavedBeforeEvent = false;
                    let ticketSavePlan: ReturnType<typeof getTicketSavePlan> | null = nextEventId
                        ? getTicketSavePlan({
                            tickets,
                            currency: formData.currency,
                            timeZone: formData.timezone,
                            existingEventId: nextEventId,
                            lastSavedSerializedPayload: lastSavedTicketPayloadRef.current,
                        })
                        : null;

                    const persistTickets = async (
                        targetEventId: string,
                        plan: ReturnType<typeof getTicketSavePlan>,
                    ) => {
                        console.log('[DEBUG] Saving tickets for event:', targetEventId, 'payload:', plan.payloads);
                        const ticketResponse = await saveEventTickets(targetEventId, plan.payloads);
                        if (ticketResponse.tickets && ticketResponse.tickets.length > 0) {
                            normalizedTickets = mapTicketRecordsToDraft(ticketResponse.tickets, formData.timezone);
                            setTickets(normalizedTickets);
                            const limit = Math.min(tickets.length, ticketResponse.tickets.length);
                            for (let i = 0; i < limit; i += 1) {
                                const previousId = tickets[i]?.id;
                                const savedTicketId = ticketResponse.tickets[i]?.id;
                                if (previousId && savedTicketId) {
                                    ticketIdMap.set(previousId, savedTicketId);
                                }
                            }
                        }
                    };

                    if (
                        nextEventId
                        && ticketSavePlan
                        && shouldStageTicketsBeforePublishedWaitlistEnable({
                            eventStatus,
                            previousWaitlistEnabled: lastSavedWaitlistEnabledRef.current,
                            nextWaitlistEnabled: formData.waitlistEnabled,
                            ticketsNeedSave: ticketSavePlan.shouldSave,
                        })
                    ) {
                        await persistTickets(nextEventId, ticketSavePlan);
                        ticketsSavedBeforeEvent = true;
                        eventWasPersisted = true;
                    }

                    if (!nextEventId) {
                        if (mode === 'edit') {
                            setActionError('Unable to determine which event to update. Please refresh and try again.');
                            return null;
                        }
                        const response = await createEventDraft(activeOrganizerId, payload);
                        nextEventId = response.event.id;
                        persistedEventId = nextEventId;
                        persistedEventUpdatedAt = response.event.updatedAt;
                        lastServerUpdatedAtRef.current = persistedEventUpdatedAt;
                        eventWasPersisted = true;
                        setEventId(nextEventId);
                        setDraftEmbedSlug(response.event.slug ?? null);
                        setDraftEmbedStatus(response.event.status ?? 'draft');
                    } else {
                        console.log('[DEBUG] Updating event:', nextEventId, 'with payload:', payload);
                        const response = await updateEventDraft(nextEventId, payload);
                        persistedEventId = nextEventId;
                        persistedEventUpdatedAt = response.event.updatedAt;
                        lastServerUpdatedAtRef.current = persistedEventUpdatedAt;
                        eventWasPersisted = true;
                        setDraftEmbedSlug(response.event.slug ?? null);
                        setDraftEmbedStatus(response.event.status ?? 'draft');
                    }

                    const accessCodeShouldPersist =
                        formData.visibility === 'private' &&
                        formData.accessCodeEnabled &&
                        (formData.accessCode.trim().length > 0 || hasExistingAccessCode);
                    setHasExistingAccessCode(accessCodeShouldPersist);

                    ticketSavePlan ??= getTicketSavePlan({
                        tickets,
                        currency: formData.currency,
                        timeZone: formData.timezone,
                        existingEventId: nextEventId,
                        lastSavedSerializedPayload: lastSavedTicketPayloadRef.current,
                    });

                    if (ticketSavePlan.shouldSave && !ticketsSavedBeforeEvent) {
                        await persistTickets(nextEventId, ticketSavePlan);
                    }

                    // Save promo codes (only if we have a valid event ID)
                    let normalizedPromoCodes = promoCodes;
                    if (ticketIdMap.size > 0) {
                        normalizedPromoCodes = mapPromoTicketTypeIds(promoCodes, ticketIdMap);
                        setPromoCodes(normalizedPromoCodes);
                    }
                    const nextPromoErrors = buildPromoValidityErrors(normalizedPromoCodes, formData.timezone);
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
                            nextPromoErrors[promo.id] = {
                                ...(nextPromoErrors[promo.id] ?? {}),
                                ...errors,
                            };
                        }
                    }

                    const hasPromoValidationErrors = Object.keys(nextPromoErrors).length > 0;
                    setPromoErrors(nextPromoErrors);

                    if (hasPromoValidationErrors) {
                        setActionError(PARTIAL_SAVE_PROMO_MESSAGE);
                        navigateToStepWithSubStep(4, 'promoCodes');
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
                                validFrom: buildPromoValidityIso(promo.validFrom, promo.validFromTime, false, formData.timezone),
                                validFromHasTime: promo.validFromTime.trim().length > 0,
                                validUntil: buildPromoValidityIso(promo.validUntil, promo.validUntilTime, true, formData.timezone),
                                validUntilHasTime: promo.validUntilTime.trim().length > 0,
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
                            setActionError(buildPartialSaveErrorMessage(promoErrorMessage ?? 'Fix promo code errors before saving.'));
                            navigateToStepWithSubStep(4, 'promoCodes');
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
                                setActionError(buildPartialSaveErrorMessage(promoErrorMessage ?? 'Unable to update promo codes.'));
                                navigateToStepWithSubStep(4, 'promoCodes');
                            } else {
                                // Refresh promo codes
                                const refreshed = await fetchEventPromoCodes(nextEventId).catch(() => ({ promoCodes: [] }));
                                normalizedPromoCodes = mapPromoCodeRecordsToDraft(refreshed.promoCodes, formData.timezone);
                                setPromoCodes(normalizedPromoCodes);
                            }
                        }
                    }

                    const hasPromoIssues = hasPromoValidationErrors || hasPromoApiErrors;
                    const persistPartialSaveRecovery = () => {
                        persistEditRecovery({
                            eventId: nextEventId,
                            tickets: normalizedTickets,
                            promoCodes: normalizedPromoCodes,
                            savedAt: getEventEditRecoverySavedAt(persistedEventUpdatedAt),
                            force: true,
                        });
                    };

                    if (options?.blockOnPromoErrors && hasPromoIssues) {
                        persistPartialSaveRecovery();
                        setPublishErrors([]);
                        return null;
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
                        markSnapshotAsSaved({
                            eventId: nextEventId,
                            tickets: normalizedTickets,
                            promoCodes: normalizedPromoCodes,
                        });
                        setFieldErrors({});
                        setPublishErrors([]);
                        setPromoErrors({});

                        if (!options?.silent) {
                            setActionMessage('Draft saved');
                        }
                    } else {
                        persistPartialSaveRecovery();
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
                                salesStart: 'salesStart',
                                salesEnd: 'salesEnd',
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
                                navigateToStepWithSubStep(4, 'ticketTypes');
                                overrideMessage = firstMessage ?? 'Fix the highlighted ticket fields.';
                            }

                            if (Object.keys(mappedErrors).length > 0) {
                                setFieldErrors(mappedErrors);
                                goToStepForErrors(mappedErrors);
                                if (!overrideMessage && firstMessage) {
                                    overrideMessage = firstMessage;
                                }
                            }
                        }

                        if (!overrideMessage && details?.formErrors?.length) {
                            overrideMessage = details.formErrors[0];
                        }
                    }
                    if (eventWasPersisted) {
                        persistEditRecovery({
                            eventId: persistedEventId,
                            savedAt: getEventEditRecoverySavedAt(persistedEventUpdatedAt),
                            force: true,
                        });
                    }
                    const message = eventWasPersisted
                        ? buildPartialSaveErrorMessage(overrideMessage ?? getUserFriendlyMessage(error))
                        : overrideMessage ?? getUserFriendlyMessage(error) ?? 'Unable to save draft.';
                    setActionError(message);
                    return null;
                } finally {
                    saveGenerationRef.current += 1;
                    isSavingRef.current = false;
                    setIsSaving(false);
                }
            };

            const savePromise = runSave();
            saveDraftPromiseRef.current = savePromise;
            try {
                return await savePromise;
            } finally {
                if (saveDraftPromiseRef.current === savePromise) {
                    saveDraftPromiseRef.current = null;
                }
            }
        },
        [activeOrganizerId, bannerFile, bannerWasRemoved, eventId, eventStatus, formData, goToStepForErrors, hasExistingAccessCode, isSaving, markSnapshotAsSaved, maxPromoFixed, mode, navigateToStepWithSubStep, persistEditRecovery, persistedLocation, promoCodes, setPromoCodes, setTickets, tickets],
    );

    const handleSaveDraftClick = useCallback(async () => {
        await saveDraft();
    }, [saveDraft]);

    const needsOrganizerContactEmailFix = useMemo(
        () => hasOrganizerContactPublishBlocker || Boolean(actionError?.toLowerCase().includes('organizer contact email')),
        [actionError, hasOrganizerContactPublishBlocker],
    );

    const handleSaveDraftAndOpenOrganizerSettings = useCallback(async () => {
        if (isNavigatingToOrganizerSettings || isSaving || isPublishing) {
            return;
        }

        setIsNavigatingToOrganizerSettings(true);
        try {
            const savedEventId = await saveDraft({ silent: true, blockOnPromoErrors: true });
            if (!savedEventId) {
                return;
            }

            const settingsParams = new URLSearchParams({
                tab: 'organizer-profile',
                focus: 'org-reply-to',
                returnTo: `/events/${savedEventId}/edit`,
            });
            const settingsHref = `/settings?${settingsParams.toString()}`;

            toast.info('Draft saved. Add your organizer contact email in Settings, then publish again.', {
                duration: 6000,
            });

            router.push(settingsHref);
            window.setTimeout(() => {
                if (!window.location.pathname.startsWith('/settings')) {
                    window.location.assign(settingsHref);
                }
            }, 500);
        } finally {
            setIsNavigatingToOrganizerSettings(false);
        }
    }, [isNavigatingToOrganizerSettings, isPublishing, isSaving, router, saveDraft]);

    const executePublish = useCallback(async () => {
        setActionError(null);
        setActionMessage(null);
        setIsWarningOpen(false); // Close warning if open
        const isUpdatingPublishedEvent = mode === 'edit' && eventStatus === 'published';

        const organizerContactEmail = currentOrganizer?.replyToEmail?.trim() ?? '';
        if (!organizerContactEmail) {
            const missingContactMessage =
                'Add an organizer contact email in Organizer Settings before publishing so attendees can reach you.';
            setHasOrganizerContactPublishBlocker(true);
            setFieldErrors({});
            setPublishErrors([missingContactMessage]);
            setActionError(missingContactMessage);
            return;
        }

        setIsPublishing(true);
        setHasOrganizerContactPublishBlocker(false);

        try {
            const savedEventId = await saveDraft({ silent: true, blockOnPromoErrors: true });
            if (!savedEventId) {
                return;
            }

            const publishResult = await publishEvent(savedEventId, formData.visibility);
            setFieldErrors({});
            setPublishErrors([]);
            setActionMessage(
                isUpdatingPublishedEvent
                    ? 'Event updated successfully. Redirecting...'
                    : 'Event published successfully. Redirecting...',
            );
            markSnapshotAsSaved();

            // Build success page URL with event details
            const eventSlug = publishResult?.event?.slug || draftEmbedSlug || savedEventId;
            const successParams = new URLSearchParams();
            successParams.set('slug', eventSlug);
            successParams.set('title', formData.title.trim());
            if (formData.date) successParams.set('date', formData.date);
            if (formData.startTime) successParams.set('time', formData.startTime);
            if (formData.venue) successParams.set('venue', formData.venue);
            if (formData.city) successParams.set('city', formData.city);
            if (formData.visibility === 'private') successParams.set('private', 'true');
            if (activeOrganizerId) successParams.set('organizer', activeOrganizerId);
            if (isUpdatingPublishedEvent) successParams.set('mode', 'updated');

            const successUrl = `/events/published?${successParams.toString()}`;
            router.push(successUrl);
        } catch (error) {
            if (error instanceof ApiError) {
                const details = getBackendErrorDetails<{
                    fieldErrors?: Record<string, string[]>;
                    formErrors?: string[];
                } | string[]>(error.payload);
                const errorMessage = getUserFriendlyMessage(error) || 'Unable to publish event.';
                const normalizedMessage = errorMessage.toLowerCase();
                const hasOrganizerContactMessage = (message?: string | null) =>
                    Boolean(message?.toLowerCase().includes('organizer contact email'));
                const hasOrganizerContactIssueFromDetails = Array.isArray(details)
                    ? details.some((item) => hasOrganizerContactMessage(item))
                    : Boolean(
                        details?.formErrors?.some((item) => hasOrganizerContactMessage(item)) ||
                        Object.values(details?.fieldErrors ?? {}).some((messages) =>
                            messages?.some((item) => hasOrganizerContactMessage(item)),
                        ),
                    );
                if (hasOrganizerContactIssueFromDetails || hasOrganizerContactMessage(errorMessage)) {
                    setHasOrganizerContactPublishBlocker(true);
                }

                if (Array.isArray(details) && details.length > 0) {
                    const { fieldErrors: mapped, unmatched } = deriveFieldErrorsFromMessages(details);
                    setFieldErrors(mapped);
                    setPublishErrors(unmatched);
                    goToStepForErrors(mapped);
                    if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
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
                    goToStepForErrors(mappedErrors);
                    if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    setActionError(firstMessage ?? details.formErrors?.[0] ?? errorMessage);
                    // Show toast for visibility (especially on mobile)
                    toast.error(firstMessage ?? details.formErrors?.[0] ?? errorMessage);
                } else if (
                    details &&
                    !Array.isArray(details) &&
                    Array.isArray(details.formErrors) &&
                    details.formErrors.length > 0
                ) {
                    const firstFormError = details.formErrors[0];
                    setFieldErrors({});
                    setPublishErrors(details.formErrors);
                    if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    setActionError(firstFormError);
                    toast.error(firstFormError);
                } else {
                    setFieldErrors({});
                    // Don't duplicate - only use actionError for single messages
                    setPublishErrors([]);
                    if (normalizedMessage.includes('stripe') && normalizedMessage.includes('payment')) {
                        setCurrentStep(4);
                    }
                    setActionError(errorMessage);
                    // Show toast for visibility (especially on mobile)
                    toast.error(errorMessage);
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
    }, [
        activeOrganizerId,
        draftEmbedSlug,
        eventStatus,
        formData.city,
        formData.date,
        formData.startTime,
        formData.title,
        formData.venue,
        formData.visibility,
        currentOrganizer?.replyToEmail,
        goToStepForErrors,
        markSnapshotAsSaved,
        mode,
        router,
        saveDraft,
        setCurrentStep,
    ]);

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
            navigateToStepWithSubStep(4, 'attendeeInfo');
            setActionError(`Please add options for: ${questionLabels}`);
            return;
        }
        const publishValidation = validatePublishForm(
            formData,
            tickets,
            hasExistingAccessCode,
            persistedLocation,
        );
        const publishFieldErrors = publishValidation.fieldErrors;
        setTicketErrors(publishValidation.ticketErrors);
        if (Object.keys(publishFieldErrors).length > 0) {
            setFieldErrors(publishFieldErrors);
            setPublishErrors([]);
            goToStepForErrors(publishFieldErrors);
            const firstMessage = Object.values(publishFieldErrors)[0];
            const errorMsg = firstMessage ?? 'Fix the highlighted fields below.';
            setActionError(errorMsg);
            // Show toast for visibility (especially on mobile)
            toast.error(errorMsg);
            return;
        }

        // Credit check for token-tier behavior (credits available or token plan)
        if (canUseCredits && activeOrganizerId) {
            try {
                const credits = await getCreditBalance(activeOrganizerId);
                const totalCapacity = formData.totalCapacity || 0;
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
    }, [activeOrganizerId, canUseCredits, executePublish, formData, goToStepForErrors, hasExistingAccessCode, isPublishing, navigateToStepWithSubStep, persistedLocation, tickets]);

    const handlePreviewClick = useCallback(async () => {
        if (eventStatus === 'published') {
            const liveValidation = validatePublishForm(
                formData,
                tickets,
                hasExistingAccessCode,
                persistedLocation,
            );
            const liveFieldErrors = liveValidation.fieldErrors;
            setTicketErrors(liveValidation.ticketErrors);
            if (Object.keys(liveFieldErrors).length > 0) {
                setFieldErrors(liveFieldErrors);
                setPublishErrors([]);
                goToStepForErrors(liveFieldErrors);
                setActionError(
                    Object.values(liveFieldErrors)[0]
                    ?? 'Fix the highlighted fields before previewing this event.',
                );
                return;
            }
        }

        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            toast.warning('Popup blocked. Allow popups to open the preview.');
            return;
        }

        previewWindow.document.title = 'Loading preview...';
        previewWindow.document.body.innerHTML = '<p style="font-family: sans-serif; padding: 16px;">Loading preview...</p>';

        // Track if this is a new event being saved for the first time
        const wasNewEvent = !eventId && mode === 'create';

        // Save draft before previewing (silent save)
        const savedEventId = await saveDraft({ silent: true });
        if (savedEventId) {
            const previewUrl = `/events/${savedEventId}/preview?mode=draft`;
            if (!previewWindow.closed) {
                previewWindow.location.href = previewUrl;
            }

            // For new events in create mode, navigate to edit page so if
            // the component remounts, it fetches the draft from the backend
            if (wasNewEvent) {
                router.replace(`/events/${savedEventId}/edit`);
            }
        } else {
            // If save failed, show error (saveDraft already sets actionError)
            previewWindow.close();
            setActionError('Please save the event before previewing.');
        }
    }, [eventId, eventStatus, formData, goToStepForErrors, hasExistingAccessCode, mode, persistedLocation, router, saveDraft, tickets]);

    const isBusy = isSaving || isPublishing || isNavigatingToOrganizerSettings;
    const isPrivate = formData.visibility === 'private';
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
    const embedSlug = draftEmbedSlug ?? embedCheckout?.slug ?? null;
    const embedStatus = draftEmbedStatus ?? embedCheckout?.status ?? (eventId ? 'draft' : null);
    const embedIsPublic = embedCheckout?.isPublic ?? true;
    const embedCanCopy = Boolean(embedSlug);
    const embedIsLive = embedStatus === 'published' && embedIsPublic;
    const publishButtonLabel =
        isPublishing
            ? (isAlreadyPublished ? 'Updating...' : 'Publishing...')
            : isAlreadyPublished
                ? 'Update event'
                : 'Publish event';
    const isGateLoading = authLoading || organizersLoading;

    if (isGateLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold">Loading your organiser access</h2>
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
                        <h2 className="text-xl font-semibold">Organiser Account Required</h2>
                        <p className="text-muted-foreground">
                            You need to be an event organiser to create events. Please sign up as an organiser or contact support if you believe this is an error.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button variant="outline" asChild className="flex-1">
                                <Link href="/events">Browse Events</Link>
                            </Button>
                            <Button asChild className="flex-1">
                                <Link href="/register?role=organizer">Become an Organiser</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div ref={wizardShellRef} className="min-h-screen -mt-[var(--nav-safe-offset)] bg-muted/30 [--event-wizard-sticky-offset:60px]">
            <style>{'html, body { overflow-x: clip !important; }'}</style>
            {/* Top Header with Progress Bar */}
            <div ref={wizardHeaderRef} className="sticky top-0 z-[60] bg-background border-b">
                {/* Header Row */}
                <div className="flex min-h-14 items-center gap-3 px-4 py-2.5 sm:h-14 sm:gap-4 sm:py-0 lg:px-0">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 lg:w-[18rem] lg:flex-none lg:pl-8 xl:w-[22rem] xl:pl-10">
                        <Button variant="ghost" size="icon" asChild className="shrink-0 self-start sm:self-center mt-0.5 sm:mt-0">
                            <Link href={dashboardHref}>
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="min-w-0">
                            {/* Mobile: Stack title and badges vertically | Desktop: Single row */}
                            <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                                <h1 className="font-display text-base sm:text-lg font-semibold leading-tight">
                                    {headerTitle}
                                </h1>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {entryContext?.label ? (
                                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 h-5 sm:h-auto">
                                            {entryContext.label}
                                        </Badge>
                                    ) : null}
                                    {hasUnsavedChanges && activeOrganizerId ? (
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 h-5 sm:h-auto">
                                            Unsaved
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            {entryContext?.description ? (
                                <p className="hidden text-sm text-muted-foreground sm:block">
                                    {entryContext.description}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="hidden min-w-0 flex-1 sm:flex">
                        <div className="w-full px-6 xl:px-8">
                            <div className="mx-auto flex w-full max-w-6xl items-center justify-end text-sm text-muted-foreground">
                                Step {currentStep} of {steps.length}
                            </div>
                        </div>
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
                {entryContext?.source === 'ai' && entryContext.aiReview ? (
                    <AiDraftReviewPanel
                        review={entryContext.aiReview}
                        onReviewDetails={() => navigateToStepWithSubStep(1, 'title')}
                        onReviewTickets={() => navigateToStepWithSubStep(4, 'ticketTypes')}
                        onReviewPolicies={() => navigateToStepWithSubStep(4, 'refundPolicy')}
                    />
                ) : null}
                {recoveryNotice ? (
                    <div className="border-t border-amber-200/70 bg-amber-50 text-amber-950">
                        <div className="container flex flex-col gap-2 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <p className="min-w-0 leading-snug">
                                Unsaved changes restored. Save or discard them.
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={recoveryNotice.onDiscard}
                                className="h-8 justify-start px-0 text-amber-900 hover:bg-amber-100 hover:text-amber-950 sm:px-3"
                            >
                                Discard
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Main Step Tabs - Horizontal navigation */}
            <MainStepTabs
                steps={mainStepTabsData}
                onStepClick={handleMainStepClick}
                className="lg:hidden"
            />

            {/* Mobile section jump links */}
            <SectionNavChips
                sections={currentSections}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
            />

            {/* Main Layout - bottom padding keeps content clear of the fixed action footer */}
            <div className="container pt-8 pb-24 lg:flex lg:max-w-none lg:items-stretch lg:p-0 lg:pb-20">
                    {/* Main step rail - Desktop Only */}
                    <MainStepSidebar
                        steps={mainStepTabsData}
                        onStepClick={handleMainStepClick}
                    />

                    {/* Section rail - Desktop Only */}
                    <SectionNavSidebar
                        sections={currentSections}
                        activeSection={activeSection}
                        onSectionClick={scrollToSection}
                    />

                    {/* Main Content */}
                    <main ref={mainContentRef} className="min-w-0 flex-1 rounded-2xl border border-border/50 bg-card/50 p-4 sm:p-6 lg:rounded-none lg:border-0 lg:bg-background/40 lg:p-6 xl:p-8">
                        <div className="mx-auto max-w-2xl lg:max-w-6xl">
                                {/* Step 1: Event Details */}
                                {currentStep === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-10 lg:space-y-12"
                                    >
                                        {/* Section: Title & Category */}
                                        <section id="section-title" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">What&apos;s your event called?</h2>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6 space-y-5">
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
                                                        {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
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
                                                </div>
                                        </section>

                                        {/* Section: Description */}
                                        <section id="section-description" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Describe your event</h2>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                                                        <textarea
                                                            id="description"
                                                            name="description"
                                                            placeholder="What's your event about? Share key details, agenda, and what attendees will gain..."
                                                            value={formData.description}
                                                            onChange={handleFieldChange}
                                                            rows={8}
                                                            maxLength={2500}
                                                            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                                        />
                                                        <p className="text-xs text-muted-foreground text-right">{formData.description.length}/2500</p>
                                                    </div>
                                                </div>
                                        </section>

                                        {/* Section: Poster Upload */}
                                        <section id="section-poster" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Add an event poster</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Upload an eye-catching image for your event</p>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6">
                                                    <div className="space-y-3">
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
                                                            className="relative flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 transition-all hover:border-primary/40 hover:bg-muted/30 group overflow-hidden aspect-[4/5] max-w-[min(320px,26vh)] mx-auto"
                                                        >
                                                            {formData.bannerImageDataUrl ? (
                                                                <>
                                                                    <Image
                                                                        src={formData.bannerImageDataUrl}
                                                                        alt={formData.title || 'Event poster'}
                                                                        fill
                                                                        sizes="320px"
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
                                                                <div className="text-center px-4 py-12">
                                                                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                                                                        <Upload className="h-6 w-6" />
                                                                    </div>
                                                                    <p className="font-medium">Click to upload</p>
                                                                    <p className="mt-1 text-sm text-muted-foreground">1080×1350px recommended</p>
                                                                </div>
                                                            )}
                                                        </label>
                                                    </div>
                                                </div>
                                        </section>

                                        {/* Section: Visibility */}
                                        <section id="section-visibility" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Who can see your event?</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Choose visibility and access settings</p>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6 space-y-5">
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData((prev) => ({ ...prev, visibility: 'public' }))}
                                                            className={cn(
                                                                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                                                                formData.visibility === 'public'
                                                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                                                    : 'border-border/60 bg-background hover:border-primary/40'
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                'flex h-10 w-10 items-center justify-center rounded-full',
                                                                formData.visibility === 'public' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                                            )}>
                                                                <Globe className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Public</p>
                                                                <p className="text-xs text-muted-foreground">Visible in event listings</p>
                                                            </div>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData((prev) => ({ ...prev, visibility: 'private' }))}
                                                            className={cn(
                                                                'flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                                                                formData.visibility === 'private'
                                                                    ? 'border-slate-400/60 bg-slate-100/70 ring-2 ring-slate-300/40'
                                                                    : 'border-border/60 bg-background hover:border-slate-300/70'
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                'flex h-10 w-10 items-center justify-center rounded-full',
                                                                formData.visibility === 'private' ? 'bg-slate-200 text-slate-700' : 'bg-muted text-muted-foreground'
                                                            )}>
                                                                <EyeOff className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Private</p>
                                                                <p className="text-xs text-muted-foreground">Share by link only</p>
                                                            </div>
                                                        </button>
                                                    </div>

                                                    {isPrivate && (
                                                        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                                                    <span className="text-sm font-medium">Require access code</span>
                                                                </div>
                                                                <Switch
                                                                    checked={formData.accessCodeEnabled}
                                                                    onCheckedChange={(checked) => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            accessCodeEnabled: checked,
                                                                            accessCode: checked ? prev.accessCode : ''
                                                                        }));
                                                                        if (!checked) {
                                                                            setHasExistingAccessCode(false);
                                                                        }
                                                                        clearFieldErrors('accessCode');
                                                                    }}
                                                                />
                                                            </div>
                                                            {formData.accessCodeEnabled && (
                                                                <div className="space-y-1.5">
                                                                    <Label htmlFor="accessCode">Access code</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            id="accessCode"
                                                                            name="accessCode"
                                                                            type={showAccessCode ? 'text' : 'password'}
                                                                            placeholder={hasExistingAccessCode
                                                                                ? 'Leave blank to keep current code'
                                                                                : 'Create an access code'}
                                                                            value={formData.accessCode}
                                                                            onChange={handleFieldChange}
                                                                            className={cn(
                                                                                'h-11 pr-10',
                                                                                fieldErrors.accessCode ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                            )}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setShowAccessCode(!showAccessCode)}
                                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                                            aria-label={showAccessCode ? 'Hide access code' : 'Show access code'}
                                                                        >
                                                                            {showAccessCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                        </button>
                                                                    </div>
                                                                    {fieldErrors.accessCode && <p className="text-xs text-destructive">{fieldErrors.accessCode}</p>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                        </section>
                                    </motion.div>
                                )}

                                {/* Step 2: Schedule */}
                                {currentStep === 2 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-10 lg:space-y-12"
                                    >
                                        {/* Section: Date Selection */}
                                        <section id="section-date" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">When is your event?</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Select the date(s) for your event</p>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6 space-y-5">
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
                                                                hasError={!!fieldErrors.date}
                                                                disablePast
                                                            />
                                                            {fieldErrors.date && <p className="text-xs text-destructive">{fieldErrors.date}</p>}
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
                                                                    hasError={!!fieldErrors.endDate}
                                                                    minDate={parseLocalDateInput(formData.date)}
                                                                    disablePast
                                                                />
                                                                {fieldErrors.endDate && <p className="text-xs text-destructive">{fieldErrors.endDate}</p>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Settings Card */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label htmlFor="multiday" className="text-sm font-medium">Multi-day event</Label>
                                                            <p className="text-xs text-muted-foreground">Toggle this if your event spans multiple days</p>
                                                        </div>
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
                                        </section>

                                        {/* Section: Time & Timezone */}
                                        <section id="section-time" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Set the time</h2>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6 space-y-5">
                                                    <div className="grid gap-4 sm:grid-cols-2">
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
                                                                hasError={!!fieldErrors.startTime}
                                                            />
                                                            {fieldErrors.startTime && <p className="text-xs text-destructive">{fieldErrors.startTime}</p>}
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
                                                                hasError={!!fieldErrors.endTime}
                                                            />
                                                            {fieldErrors.endTime && <p className="text-xs text-destructive">{fieldErrors.endTime}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-border/40">
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
                                                        {fieldErrors.timezone && <p className="text-xs text-destructive">{fieldErrors.timezone}</p>}
                                                    </div>
                                                </div>
                                        </section>
                                    </motion.div>
                                )}

                                {/* Step 3: Venue */}
                                {currentStep === 3 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-10 lg:space-y-12"
                                    >
                                        {/* Section: Location (only section for Venue) */}
                                        <section id="section-location" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Where is your event?</h2>
                                                </div>

                                                {/* Location Card */}
                                                <div className="rounded-xl border border-border/60 bg-card/50">
                                                    <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5 flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-primary" />
                                                        <h3 className="text-sm font-medium text-foreground">Location</h3>
                                                    </div>
                                                    <div className="p-4 space-y-4">

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
                                                                            country: location.country,
                                                                            latitude: location.lat,
                                                                            longitude: location.lon,
                                                                        }));
                                                                        setLocationCoords({ lat: location.lat, lon: location.lon });
                                                                        clearFieldErrors('venue');
                                                                    }}
                                                                    onInputChange={(nextValue) => {
                                                                        setFormData(prev => updateLocationTextField(
                                                                            prev,
                                                                            'venue',
                                                                            nextValue,
                                                                        ));
                                                                        if (!nextValue || locationCoords) {
                                                                            setLocationCoords(null);
                                                                        }
                                                                        clearFieldErrors('venue', 'address', 'city');
                                                                    }}
                                                                    label="Venue Location *"
                                                                    placeholder="Search for Location"
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
                                                                        {fieldErrors.address ? (
                                                                            <p className="text-xs text-destructive">{fieldErrors.address}</p>
                                                                        ) : null}
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
                                                                        {fieldErrors.city ? (
                                                                            <p className="text-xs text-destructive">{fieldErrors.city}</p>
                                                                        ) : null}
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
                                                    </div>
                                                </div>
                                        </section>
                                    </motion.div>
                                )}

                                {/* Step 4: Tickets */}
                                {currentStep === 4 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-10 lg:space-y-12"
                                    >
                                        {/* Section: Currency */}
                                        <section id="section-currency" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Set ticket currency</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Select the currency for your ticket prices</p>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6">
                                                    <div className="space-y-1.5">
                                                        <Label>Ticket Currency</Label>
                                                        <Select
                                                            value={formData.currency}
                                                            onValueChange={(value) => {
                                                                hasCurrencyUserOverrideRef.current = true;
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    currency: value,
                                                                }));
                                                                clearFieldErrors('currency');
                                                            }}
                                                        >
                                                            <SelectTrigger
                                                                className={cn(
                                                                    'h-11',
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
                                                        {fieldErrors.currency && <p className="text-xs text-destructive">{fieldErrors.currency}</p>}
                                                        <p className="text-xs text-muted-foreground">This applies to all ticket types</p>
                                                    </div>
                                                </div>
                                        </section>

                                        {/* Section: Ticket Types */}
                                        <section id="section-ticketTypes" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Set up your tickets</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Create one or more ticket types</p>
                                                    {fieldErrors.tickets && <p className="text-xs text-destructive mt-1.5">{fieldErrors.tickets}</p>}
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden p-4 sm:p-6">
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="totalCapacity">Total event capacity</Label>
                                                        <Input
                                                            id="totalCapacity"
                                                            name="totalCapacity"
                                                            type="number"
                                                            min={1}
                                                            max={MAX_TICKET_QUANTITY}
                                                            value={formData.totalCapacity ? String(formData.totalCapacity) : ''}
                                                            onChange={(e) => {
                                                                capacityOverrideRef.current = true;
                                                                const parsed = Number.parseInt(e.target.value, 10);
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    totalCapacity: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0,
                                                                }));
                                                                clearFieldErrors('totalCapacity');
                                                            }}
                                                            className={cn(
                                                                'h-11',
                                                                fieldErrors.totalCapacity ? 'border-destructive focus-visible:ring-destructive' : '',
                                                            )}
                                                        />
                                                        {fieldErrors.totalCapacity ? (
                                                            <p className="text-xs text-destructive">{fieldErrors.totalCapacity}</p>
                                                        ) : null}
                                                        <p className="text-xs text-muted-foreground">
                                                            This is the combined limit across all ticket types.
                                                        </p>
                                                    </div>
                                                    <div className="mt-5 rounded-lg border border-border/70 bg-background/80 p-4">
                                                        <div className="mb-3">
                                                            <h3 className="text-sm font-semibold text-foreground">Waitlist</h3>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                Collect interested buyers when public tickets sell out.
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <Label htmlFor="waitlistEnabled" className="leading-5">
                                                                Enable waitlist for sold-out tickets
                                                            </Label>
                                                            <Switch
                                                                id="waitlistEnabled"
                                                                checked={formData.waitlistEnabled}
                                                                onCheckedChange={(checked) => {
                                                                    setFormData((prev) => ({ ...prev, waitlistEnabled: checked }));
                                                                    clearFieldErrors('waitlistEnabled');
                                                                }}
                                                            />
                                                        </div>
                                                        {fieldErrors.waitlistEnabled ? (
                                                            <p className="mt-2 text-xs text-destructive">{fieldErrors.waitlistEnabled}</p>
                                                        ) : null}
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            Use the ticket settings below to choose which ticket types are open for waitlist signups.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {regularTickets.map((ticket, index) => {
                                                        const hasAdvancedErrors = Boolean(
                                                            ticketErrors[ticket.id]?.minPerOrder
                                                            || ticketErrors[ticket.id]?.maxPerOrder
                                                            || ticketErrors[ticket.id]?.salesStart
                                                            || ticketErrors[ticket.id]?.salesEnd
                                                            || ticketErrors[ticket.id]?.earlyBirdPrice
                                                            || ticketErrors[ticket.id]?.earlyBirdEndDate,
                                                        );
                                                        const isAdvancedOpen = hasAdvancedErrors || ticketAdvancedOpen[ticket.id];
                                                        // Determine which tab to show based on errors (auto-switch to tab with error)
                                                        const errorTab: 'limits' | 'sales' | 'earlybird' | null = hasAdvancedErrors
                                                            ? ((ticketErrors[ticket.id]?.minPerOrder || ticketErrors[ticket.id]?.maxPerOrder) ? 'limits'
                                                                : (ticketErrors[ticket.id]?.salesStart || ticketErrors[ticket.id]?.salesEnd) ? 'sales'
                                                                    : (ticketErrors[ticket.id]?.earlyBirdPrice || ticketErrors[ticket.id]?.earlyBirdEndDate) ? 'earlybird'
                                                                        : null)
                                                            : null;
                                                        const activeAdvancedTab = errorTab ?? ticketAdvancedTab[ticket.id] ?? 'limits';
                                                        const headerStyle = ticketHeaderStyles[index % ticketHeaderStyles.length];
                                                        const trimmedName = ticket.name.trim();
                                                        const displayName = trimmedName || `Ticket ${index + 1}`;
                                                        const isTicketOpen = ticketOpenMap[ticket.id] ?? index === 0;
                                                        const toggleTicketOpen = (open: boolean) => {
                                                            setTicketOpenMap((prev) => (prev[ticket.id] === open ? prev : { ...prev, [ticket.id]: open }));
                                                        };

                                                        return (
                                                            <Collapsible
                                                                key={ticket.id}
                                                                open={isTicketOpen}
                                                                onOpenChange={toggleTicketOpen}
                                                            >
                                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                                    <div
                                                                        className={cn(
                                                                            'px-4 py-3 border-b border-border/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-l-4 text-foreground transition-all duration-200',
                                                                            headerStyle.header,
                                                                        )}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => toggleTicketOpen(!isTicketOpen)}
                                                                            className="flex items-center gap-3 text-left w-full sm:w-auto hover:opacity-80 transition-opacity"
                                                                        >
                                                                            <div className={cn('p-2 rounded-lg bg-background/50 shadow-sm ring-1 ring-black/5', headerStyle.accent.replace('text-', 'text-'))}>
                                                                                <Ticket className={cn('h-5 w-5', headerStyle.accent)} />
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <div className="flex items-center gap-2">
                                                                                    <h3 className="font-semibold text-base">{displayName}</h3>
                                                                                    {trimmedName ? (
                                                                                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 h-5', headerStyle.badge)}>
                                                                                            #{index + 1}
                                                                                        </Badge>
                                                                                    ) : null}
                                                                                </div>
                                                                                {trimmedName ? (
                                                                                    <span className="text-xs text-muted-foreground">Ticket {index + 1}</span>
                                                                                ) : null}
                                                                            </div>
                                                                        </button>
                                                                        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-2">
                                                                            {/* Visibility Toggle - Dual segmented control */}
                                                                            <div className="flex items-center rounded-lg border border-border/60 overflow-hidden text-xs font-medium shadow-sm">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateTicket(ticket.id, 'visibility', 'public')}
                                                                                    className={cn(
                                                                                        'flex items-center gap-1.5 px-3 py-1.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-inset active:scale-95',
                                                                                        ticket.visibility === 'public'
                                                                                            ? 'bg-emerald-100 text-emerald-700 shadow-inner'
                                                                                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground cursor-pointer'
                                                                                    )}
                                                                                >
                                                                                    <Check className="h-3.5 w-3.5" />
                                                                                    Visible
                                                                                </button>
                                                                                <div className="w-px h-5 bg-border/60" />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => updateTicket(ticket.id, 'visibility', 'hidden')}
                                                                                    className={cn(
                                                                                        'flex items-center gap-1.5 px-3 py-1.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset active:scale-95',
                                                                                        ticket.visibility === 'hidden'
                                                                                            ? 'bg-amber-100 text-amber-700 shadow-inner'
                                                                                            : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground cursor-pointer'
                                                                                    )}
                                                                                >
                                                                                    <Lock className="h-3.5 w-3.5" />
                                                                                    Hidden
                                                                                </button>
                                                                            </div>
                                                                            {regularTickets.length > 1 && (
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => removeTicket(ticket.id)}
                                                                                    className="text-destructive hover:text-destructive h-8 w-8"
                                                                                    aria-label={isSavedTicketId(ticket.id) ? 'Archive ticket type' : 'Remove ticket type'}
                                                                                    title={isSavedTicketId(ticket.id) ? 'Archive ticket type' : 'Remove ticket type'}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            )}
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => toggleTicketOpen(!isTicketOpen)}
                                                                                className="h-8 w-8"
                                                                                aria-label={isTicketOpen ? 'Collapse ticket' : 'Expand ticket'}
                                                                            >
                                                                                <ChevronDown
                                                                                    className={cn(
                                                                                        'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                                                                        isTicketOpen && 'rotate-180',
                                                                                    )}
                                                                                />
                                                                            </Button>
                                                                        </div>
                                                                    </div>

                                                                    <CollapsibleContent
                                                                        className="p-4 space-y-4"
                                                                        onFocusCapture={() => toggleTicketOpen(true)}
                                                                    >
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
                                                                                    aria-label="Ticket price"
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
                                                                                    <Label>Organiser Fee ({getCurrencySymbol(formData.currency)})</Label>
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
                                                                                    <p className="text-xs text-muted-foreground">Optional per-ticket organiser fee (paid to you).</p>
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
                                                                                    aria-label="Ticket quantity"
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

                                                                        {formData.waitlistEnabled ? (
                                                                            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3">
                                                                                <Checkbox
                                                                                    id={`waitlist-${ticket.id}`}
                                                                                    checked={ticket.waitlistEnabled ?? true}
                                                                                    onCheckedChange={(checked) => {
                                                                                        updateTicket(ticket.id, 'waitlistEnabled', checked === true);
                                                                                        clearFieldErrors('waitlistEnabled');
                                                                                    }}
                                                                                />
                                                                                <div className="space-y-1">
                                                                                    <Label htmlFor={`waitlist-${ticket.id}`} className="text-sm font-medium">
                                                                                        Include this ticket in the waitlist
                                                                                    </Label>
                                                                                    <p className="text-xs text-muted-foreground">
                                                                                        Turn off for ticket types that should not accept waitlist signups.
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ) : null}

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
                                                                            <CollapsibleContent className="pt-4 mt-2 space-y-4">
                                                                                {/* Tab pills */}
                                                                                <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
                                                                                    {[
                                                                                        { key: 'limits' as const, label: 'Order Limits', hasError: !!(ticketErrors[ticket.id]?.minPerOrder || ticketErrors[ticket.id]?.maxPerOrder) },
                                                                                        { key: 'sales' as const, label: 'Sales Window', hasError: !!(ticketErrors[ticket.id]?.salesStart || ticketErrors[ticket.id]?.salesEnd) },
                                                                                        { key: 'earlybird' as const, label: 'Early Bird', hasError: !!(ticketErrors[ticket.id]?.earlyBirdPrice || ticketErrors[ticket.id]?.earlyBirdEndDate) },
                                                                                    ].map((tab) => (
                                                                                        <button
                                                                                            key={tab.key}
                                                                                            type="button"
                                                                                            className={cn(
                                                                                                'flex-1 text-[13px] font-semibold py-2 px-3 rounded-lg transition-all duration-200 relative',
                                                                                                activeAdvancedTab === tab.key
                                                                                                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200/60 dark:bg-background dark:text-emerald-400 dark:ring-emerald-800/40'
                                                                                                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/40',
                                                                                            )}
                                                                                            onClick={() => setTicketAdvancedTab((prev) => ({ ...prev, [ticket.id]: tab.key }))}
                                                                                        >
                                                                                            {tab.label}
                                                                                            {tab.hasError && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-destructive ring-2 ring-background" />}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>

                                                                                {/* Tab content container */}
                                                                                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">

                                                                                    {/* Order Limits tab */}
                                                                                    {activeAdvancedTab === 'limits' && (
                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                            {/* Min Per Order */}
                                                                                            <div className="space-y-2.5">
                                                                                                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/40 border border-border/30">
                                                                                                    <Label className="text-xs font-medium">Min Per Order</Label>
                                                                                                    <Switch
                                                                                                        checked={ticket.minPerOrder !== 0}
                                                                                                        onCheckedChange={(checked) => {
                                                                                                            clearTicketError(ticket.id, 'minPerOrder');
                                                                                                            if (checked) {
                                                                                                                updateTicket(ticket.id, 'minPerOrder', 1);
                                                                                                            } else {
                                                                                                                updateTicket(ticket.id, 'minPerOrder', 0);
                                                                                                            }
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                {ticket.minPerOrder !== 0 ? (
                                                                                                    <>
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        aria-label="Minimum per order"
                                                                                                        value={ticket.minPerOrder > 0 ? ticket.minPerOrder : ''}
                                                                                                        onChange={(e) => {
                                                                                                            clearTicketError(ticket.id, 'minPerOrder');
                                                                                                            const value = e.target.value;
                                                                                                            if (value === '') {
                                                                                                                updateTicket(ticket.id, 'minPerOrder', -1);
                                                                                                                return;
                                                                                                            }
                                                                                                            const numericValue = Number.parseInt(value, 10);
                                                                                                            if (Number.isNaN(numericValue) || numericValue < 0) {
                                                                                                                return;
                                                                                                            }
                                                                                                            const maxLimit = ticket.maxPerOrder > 0 ? ticket.maxPerOrder : MAX_PER_ORDER;
                                                                                                            updateTicket(ticket.id, 'minPerOrder', Math.min(numericValue, maxLimit));
                                                                                                        }}
                                                                                                        onBlur={() => {
                                                                                                            if (ticket.minPerOrder < 1) {
                                                                                                                updateTicket(ticket.id, 'minPerOrder', 1);
                                                                                                            }
                                                                                                        }}
                                                                                                        className={cn(
                                                                                                            'h-9',
                                                                                                            ticketErrors[ticket.id]?.minPerOrder ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                                        )}
                                                                                                        min={1}
                                                                                                        max={ticket.maxPerOrder > 0 ? ticket.maxPerOrder : MAX_PER_ORDER}
                                                                                                    />
                                                                                                    {ticketErrors[ticket.id]?.minPerOrder ? (
                                                                                                        <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.minPerOrder}</p>
                                                                                                    ) : null}
                                                                                                    </>
                                                                                                ) : null}
                                                                                            </div>
                                                                                            {/* Max Per Order */}
                                                                                            <div className="space-y-2.5">
                                                                                                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/40 border border-border/30">
                                                                                                    <Label className="text-xs font-medium">Max Per Order</Label>
                                                                                                    <Switch
                                                                                                        checked={ticket.maxPerOrder !== 0}
                                                                                                        onCheckedChange={(checked) => {
                                                                                                            if (checked) {
                                                                                                                updateTicket(ticket.id, 'maxPerOrder', 15);
                                                                                                            } else {
                                                                                                                updateTicket(ticket.id, 'maxPerOrder', 0);
                                                                                                                clearTicketError(ticket.id, 'maxPerOrder');
                                                                                                            }
                                                                                                        }}
                                                                                                    />
                                                                                                </div>
                                                                                                {ticket.maxPerOrder !== 0 ? (
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        aria-label="Maximum per order"
                                                                                                        value={ticket.maxPerOrder > 0 ? ticket.maxPerOrder : ''}
                                                                                                        onChange={(e) => {
                                                                                                            const value = e.target.value;
                                                                                                            if (value === '') {
                                                                                                                updateTicket(ticket.id, 'maxPerOrder', -1);
                                                                                                                return;
                                                                                                            }
                                                                                                            const numericValue = Number.parseInt(value, 10);
                                                                                                            if (Number.isNaN(numericValue) || numericValue < 0) {
                                                                                                                return;
                                                                                                            }
                                                                                                            updateTicket(ticket.id, 'maxPerOrder', Math.min(numericValue, MAX_PER_ORDER));
                                                                                                            if (numericValue >= 1) {
                                                                                                                clearTicketError(ticket.id, 'maxPerOrder');
                                                                                                            }
                                                                                                        }}
                                                                                                        onBlur={() => {
                                                                                                            if (ticket.maxPerOrder < 1) {
                                                                                                                updateTicket(ticket.id, 'maxPerOrder', 15);
                                                                                                            }
                                                                                                        }}
                                                                                                        className={cn(
                                                                                                            'h-9',
                                                                                                            ticketErrors[ticket.id]?.maxPerOrder ? 'border-destructive focus-visible:ring-destructive' : '',
                                                                                                        )}
                                                                                                        min={ticket.minPerOrder > 0 ? ticket.minPerOrder : 1}
                                                                                                        max={MAX_PER_ORDER}
                                                                                                    />
                                                                                                ) : null}
                                                                                                {ticketErrors[ticket.id]?.maxPerOrder ? (
                                                                                                    <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.maxPerOrder}</p>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Sales Window tab */}
                                                                                    {activeAdvancedTab === 'sales' && (
                                                                                        <div className="space-y-4">
                                                                                            <div className="flex items-center justify-between gap-3">
                                                                                                <p className="text-[13px] text-muted-foreground">Leave empty to keep this ticket always on sale.</p>
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    size="sm"
                                                                                                    variant="ghost"
                                                                                                    className="h-7 px-2 text-xs"
                                                                                                    onClick={() => {
                                                                                                        updateTicket(ticket.id, 'salesStart', '');
                                                                                                        updateTicket(ticket.id, 'salesStartTime', '');
                                                                                                        updateTicket(ticket.id, 'salesEnd', '');
                                                                                                        updateTicket(ticket.id, 'salesEndTime', '');
                                                                                                        clearTicketError(ticket.id, 'salesStart');
                                                                                                        clearTicketError(ticket.id, 'salesEnd');
                                                                                                    }}
                                                                                                >
                                                                                                    Clear
                                                                                                </Button>
                                                                                            </div>
                                                                                            <div className="grid gap-4 sm:grid-cols-2">
                                                                                                <div className="space-y-2">
                                                                                                    <Label className="text-xs font-medium">Sales Start</Label>
                                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                                        <DatePicker
                                                                                                            value={ticket.salesStart}
                                                                                                            onChange={(value) => {
                                                                                                                clearTicketError(ticket.id, 'salesStart');
                                                                                                                updateTicket(ticket.id, 'salesStart', value);
                                                                                                            }}
                                                                                                            placeholder="Start date"
                                                                                                            hasError={!!ticketErrors[ticket.id]?.salesStart}
                                                                                                            className="h-9"
                                                                                                        />
                                                                                                        <TimePicker
                                                                                                            value={ticket.salesStartTime}
                                                                                                            onChange={(value) => {
                                                                                                                clearTicketError(ticket.id, 'salesStart');
                                                                                                                updateTicket(ticket.id, 'salesStartTime', value);
                                                                                                            }}
                                                                                                            placeholder="Start time"
                                                                                                            hasError={!!ticketErrors[ticket.id]?.salesStart}
                                                                                                            className="h-9"
                                                                                                        />
                                                                                                    </div>
                                                                                                    {ticketErrors[ticket.id]?.salesStart ? (
                                                                                                        <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.salesStart}</p>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                                <div className="space-y-2">
                                                                                                    <Label className="text-xs font-medium">Sales End</Label>
                                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                                        <DatePicker
                                                                                                            value={ticket.salesEnd}
                                                                                                            onChange={(value) => {
                                                                                                                clearTicketError(ticket.id, 'salesEnd');
                                                                                                                updateTicket(ticket.id, 'salesEnd', value);
                                                                                                            }}
                                                                                                            placeholder="End date"
                                                                                                            hasError={!!ticketErrors[ticket.id]?.salesEnd}
                                                                                                            minDate={parseLocalDateInput(ticket.salesStart)}
                                                                                                            className="h-9"
                                                                                                        />
                                                                                                        <TimePicker
                                                                                                            value={ticket.salesEndTime}
                                                                                                            onChange={(value) => {
                                                                                                                clearTicketError(ticket.id, 'salesEnd');
                                                                                                                updateTicket(ticket.id, 'salesEndTime', value);
                                                                                                            }}
                                                                                                            placeholder="End time"
                                                                                                            hasError={!!ticketErrors[ticket.id]?.salesEnd}
                                                                                                            className="h-9"
                                                                                                        />
                                                                                                    </div>
                                                                                                    {ticketErrors[ticket.id]?.salesEnd ? (
                                                                                                        <p className="text-xs text-destructive">{ticketErrors[ticket.id]?.salesEnd}</p>
                                                                                                    ) : null}
                                                                                                </div>
                                                                                            </div>
                                                                                            {(() => {
                                                                                                const warning = getTicketSalesWindowWarning(ticket, formData.timezone);
                                                                                                return warning ? (
                                                                                                    <p className="text-xs text-amber-700">{warning}</p>
                                                                                                ) : null;
                                                                                            })()}
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Early Bird tab */}
                                                                                    {activeAdvancedTab === 'earlybird' && (
                                                                                        <div className="space-y-4">
                                                                                            <div className="flex items-center justify-between py-1">
                                                                                                <div className="flex items-center gap-2.5">
                                                                                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                                                                                    <Label className="text-[13px] font-semibold">Early Bird Pricing</Label>
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
                                                                                                <div className="grid gap-4 sm:grid-cols-2">
                                                                                                    <div className="space-y-2">
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
                                                                                    )}
                                                                                </div>
                                                                            </CollapsibleContent>
                                                                        </Collapsible>
                                                                    </CollapsibleContent>
                                                                </div>
                                                            </Collapsible>
                                                        );
                                                    })}
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    className="w-full h-10 border-dashed border-border/60 text-sm"
                                                    onClick={addTicket}
                                                >
                                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                                    Add Another Ticket
                                                </Button>
                                        </section>

                                        {/* Section: Donations */}
                                        <section id="section-donations" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Donations</h2>
                                                </div>

                                                {/* Donation Section */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="w-full px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Heart className="h-4 w-4 text-primary" />
                                                            <h3 className="text-sm font-medium text-foreground">Donation</h3>
                                                            {donationTicket && <Badge variant="secondary" className="text-xs">Enabled</Badge>}
                                                        </div>
                                                        {!donationTicket && (
                                                            <span className="text-xs text-muted-foreground">Optional</span>
                                                        )}
                                                    </div>

                                                    <div className="p-4">
                                                        <div className="flex items-center justify-between mb-4">
                                                            {donationTicket ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={removeDonationTicket}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                                    Remove Donation
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
                                                                        placeholder="Contribute to supporting the great work we are trying to do"
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
                                                    </div>
                                                </div>
                                        </section>

                                        {/* Section: Promo Codes */}
                                        <section id="section-promoCodes" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Promo Codes</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Create discount codes for your event</p>
                                                </div>

                                                {/* Promo Codes Section */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="w-full px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Tag className="h-4 w-4 text-primary" />
                                                            <h3 className="text-sm font-medium text-foreground">Promo Codes</h3>
                                                            {promoCodes.length > 0 && <Badge variant="secondary" className="text-xs">{promoCodes.length}</Badge>}
                                                        </div>
                                                        {promoCodes.length === 0 && (
                                                            <span className="text-xs text-muted-foreground">Optional</span>
                                                        )}
                                                    </div>

                                                    <div className="p-4 flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">
                                                            Max {MAX_PROMO_CODES_PER_EVENT} active codes per event
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={addPromoCode}
                                                            disabled={promoLimitReached}
                                                        >
                                                            <Plus className="mr-1 h-3 w-3" />
                                                            Add Code
                                                        </Button>
                                                    </div>

                                                    {promoCodes.length === 0 ? (
                                                        <div className="text-center pb-8 text-muted-foreground">
                                                            <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                            <p className="text-sm">No promo codes yet</p>
                                                            <p className="text-xs">Add a code to offer discounts</p>
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 space-y-4">
                                                            {promoCodes.map((promo) => {
                                                                const promoError = promoErrors[promo.id];
                                                                const usageCount = promo.usageCount ?? 0;
                                                                const usageLabel = promo.usageLimit > 0
                                                                    ? `${usageCount}/${promo.usageLimit} used`
                                                                    : `${usageCount} used`;

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
                                                                                <p className="text-xs text-muted-foreground">{usageLabel}</p>
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
                                                                                    onChange={(value) => {
                                                                                        updatePromoCode(promo.id, 'validFrom', value);
                                                                                        if (!value) {
                                                                                            updatePromoCode(promo.id, 'validFromTime', '');
                                                                                        }
                                                                                    }}
                                                                                    placeholder="Select start date"
                                                                                    hasError={!!promoError?.validFrom}
                                                                                />
                                                                                <TimePicker
                                                                                    value={promo.validFromTime}
                                                                                    onChange={(value) => updatePromoCode(promo.id, 'validFromTime', value)}
                                                                                    placeholder="Optional start time"
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
                                                                                    onChange={(value) => {
                                                                                        updatePromoCode(promo.id, 'validUntil', value);
                                                                                        if (!value) {
                                                                                            updatePromoCode(promo.id, 'validUntilTime', '');
                                                                                        }
                                                                                    }}
                                                                                    placeholder="Select end date"
                                                                                    hasError={!!promoError?.validUntil}
                                                                                    minDate={parseLocalDateInput(promo.validFrom)}
                                                                                />
                                                                                <TimePicker
                                                                                    value={promo.validUntilTime}
                                                                                    onChange={(value) => updatePromoCode(promo.id, 'validUntilTime', value)}
                                                                                    placeholder="Optional end time"
                                                                                    hasError={!!promoError?.validUntil}
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
                                                    )}
                                                </div>
                                        </section>

                                        {/* Section: Refund Policy */}
                                        <section id="section-refundPolicy" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Refund Policy</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Set your ticket refund terms for attendees</p>
                                                </div>

                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                        <h3 className="text-sm font-medium text-foreground">Policy Selection</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">This will be shown on the public event page</p>
                                                    </div>
                                                    <div className="p-4 space-y-3">
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
                                                        {fieldErrors.refundPolicy && (
                                                            <p className="text-xs text-destructive">{fieldErrors.refundPolicy}</p>
                                                        )}
                                                    </div>
                                                </div>
                                        </section>

                                        {/* Section: Attendee Info */}
                                        <section id="section-attendeeInfo" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                                <div>
                                                    <h2 className="font-display text-xl lg:text-2xl font-bold">Attendee Information</h2>
                                                    <p className="mt-1 text-sm text-muted-foreground">Configure how you collect attendee details at checkout</p>
                                                </div>

                                                {/* Attendee Collection Mode */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                        <h3 className="text-sm font-medium text-foreground">Collection Mode</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Choose how attendee info is collected during checkout</p>
                                                    </div>
                                                    <div className="p-4 space-y-4">

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
                                                                    <p className="font-medium">Buyer info for all tickets</p>
                                                                    <p className="text-sm text-muted-foreground mt-1">
                                                                        Use the buyer&apos;s name, gender and age for all tickets. Best for general admission events.
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
                                                                        Collect name, gender, age and custom questions (if any) for every ticket. Best for conferences or reserved seating.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Default Fields Info */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                        <h3 className="text-sm font-medium text-foreground">Default Fields</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">These fields are always collected from attendees</p>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                                <Check className="h-4 w-4 text-primary" />
                                                                <div>
                                                                    <span className="text-sm">Email</span>
                                                                    <span className="text-xs text-muted-foreground ml-1">(buyer email)</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                                <Check className="h-4 w-4 text-primary" />
                                                                <span className="text-sm">Full Name</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                                                <Check className="h-4 w-4 text-primary" />
                                                                <span className="text-sm">Gender</span>
                                                            </div>
                                                            <div className="flex min-w-0 flex-col gap-1 rounded-lg bg-muted/30 p-3">
                                                                <div className="flex min-w-0 flex-col gap-1.5">
                                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                                        <Check className="h-4 w-4 shrink-0 text-primary" />
                                                                        <Label htmlFor="minimumAttendeeAge" className="text-sm">Age</Label>
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <button
                                                                                    type="button"
                                                                                    aria-label="About the minimum age requirement"
                                                                                    className="relative -m-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                                >
                                                                                    <Info className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent side="top" className="w-56 p-3 text-center text-xs">
                                                                                Set the minimum age attendees must meet to complete checkout. Leave at 0 for no restriction.
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    </div>
                                                                    <div className="flex min-w-0 items-center justify-end gap-1.5">
                                                                        <span className="text-xs text-muted-foreground">Min</span>
                                                                        <Input
                                                                            id="minimumAttendeeAge"
                                                                            name="minimumAttendeeAge"
                                                                            type="number"
                                                                            min={0}
                                                                            max={120}
                                                                            step={1}
                                                                            aria-label="Minimum attendee age"
                                                                            aria-invalid={Boolean(fieldErrors.minimumAttendeeAge)}
                                                                            value={formData.minimumAttendeeAge}
                                                                            onChange={(event) => {
                                                                                const value = event.target.value;
                                                                                const nextValue = value === '' ? '' : Number(value);
                                                                                const currentMinimumAgeError = validateMinimumAttendeeAge(
                                                                                    formData.minimumAttendeeAge,
                                                                                );
                                                                                setFormData((current) => ({
                                                                                    ...current,
                                                                                    minimumAttendeeAge: nextValue,
                                                                                }));
                                                                                clearFieldErrors('minimumAttendeeAge');
                                                                                if (
                                                                                    !validateMinimumAttendeeAge(nextValue) &&
                                                                                    currentMinimumAgeError
                                                                                ) {
                                                                                    setActionError((current) =>
                                                                                        current === currentMinimumAgeError ? null : current,
                                                                                    );
                                                                                }
                                                                            }}
                                                                            className={cn(
                                                                                'h-8 min-w-0 w-14 bg-background px-1 text-center',
                                                                                fieldErrors.minimumAttendeeAge && 'border-destructive focus-visible:ring-destructive',
                                                                            )}
                                                                        />
                                                                        <span className="text-xs font-medium text-(--brand-cyan)">yrs</span>
                                                                    </div>
                                                                </div>
                                                                {fieldErrors.minimumAttendeeAge ? (
                                                                    <p className="text-xs text-destructive">{fieldErrors.minimumAttendeeAge}</p>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Custom Questions */}
                                                <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                                    <div className="flex flex-col gap-3 border-b border-border/40 bg-(--brand-cyan)/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div>
                                                            <h3 className="text-sm font-medium text-foreground">Custom Questions</h3>
                                                            <p className="text-xs text-muted-foreground mt-0.5">Add additional questions for attendees (max {MAX_CUSTOM_QUESTIONS})</p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 min-[420px]:flex-row sm:justify-end">
                                                            <CustomQuestionLibraryDialog
                                                                organizerId={activeOrganizerId}
                                                                existingQuestions={formData.customQuestions}
                                                                onAddQuestions={(questions: CustomQuestionLibraryItem[]) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        customQuestions: addLibraryQuestions(
                                                                            prev.customQuestions,
                                                                            questions,
                                                                            createCustomQuestionId,
                                                                        ).questions,
                                                                    }));
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    if (formData.customQuestions.length >= MAX_CUSTOM_QUESTIONS) return;
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        customQuestions: [
                                                                            ...prev.customQuestions,
                                                                            {
                                                                                id: createCustomQuestionId(),
                                                                                label: '',
                                                                                type: 'text',
                                                                                required: false,
                                                                            }
                                                                        ]
                                                                    }));
                                                                }}
                                                                disabled={formData.customQuestions.length >= MAX_CUSTOM_QUESTIONS}
                                                                className="min-h-9"
                                                            >
                                                                <Plus className="mr-1 h-3 w-3" />
                                                                Add Question
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 space-y-4">

                                                        {formData.customQuestions.length === 0 ? (
                                                            <div className="text-center py-8 border border-dashed rounded-lg">
                                                                <p className="text-sm text-muted-foreground">No custom questions added</p>
                                                                <p className="text-xs text-muted-foreground mt-1">Click &ldquo;Add Question&rdquo; to collect more info</p>
                                                            </div>
                                                        ) : (
                                                            <Reorder.Group
                                                                as="div"
                                                                axis="y"
                                                                values={formData.customQuestions}
                                                                onReorder={(next: typeof formData.customQuestions) =>
                                                                    setFormData(prev => ({ ...prev, customQuestions: next }))
                                                                }
                                                                className="space-y-3"
                                                            >
                                                                {formData.customQuestions.map((question, index) => (
                                                                    <CustomQuestionRow
                                                                        key={question.id}
                                                                        question={question}
                                                                        index={index}
                                                                        total={formData.customQuestions.length}
                                                                        accent={QUESTION_ACCENTS[index % QUESTION_ACCENTS.length]}
                                                                        maxLabelLength={MAX_CUSTOM_QUESTION_LABEL_LENGTH}
                                                                        onPatch={(patch) =>
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                customQuestions: prev.customQuestions.map((q, i) =>
                                                                                    i === index ? { ...q, ...patch } : q,
                                                                                ),
                                                                            }))
                                                                        }
                                                                        onRemove={() =>
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                customQuestions: prev.customQuestions.filter(q => q.id !== question.id),
                                                                            }))
                                                                        }
                                                                        onMoveUp={() =>
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                customQuestions: moveCustomQuestion(prev.customQuestions, index, index - 1),
                                                                            }))
                                                                        }
                                                                        onMoveDown={() =>
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                customQuestions: moveCustomQuestion(prev.customQuestions, index, index + 1),
                                                                            }))
                                                                        }
                                                                    />
                                                                ))}
                                                            </Reorder.Group>
                                                        )}
                                                    </div>
                                                </div>
                                        </section>
                                    </motion.div>
                                )}

                                {/* Step 5: Embed Widget */}
                                {currentStep === 5 && (
                                    <motion.div
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-10 lg:space-y-12"
                                    >
                                        <section id="section-widget" className="scroll-mt-[calc(var(--event-wizard-sticky-offset)+1.5rem)] space-y-4 lg:space-y-5">
                                        <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-border/40 bg-(--brand-cyan)/5">
                                                <h3 className="text-sm font-medium text-foreground">Embed Checkout Widget</h3>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Integrate ticket sales directly into your website</p>
                                                </div>
                                                <EmbedCheckoutSnippet
                                                    slug={embedSlug}
                                                    canCopy={embedCanCopy}
                                                    isLive={embedIsLive}
                                                    isPublic={embedIsPublic}
                                                />
                                            </div>
                                        </div>
                                        </section>
                                    </motion.div>
                                )}

                            {/* Navigation Footer */}
                            <div className="mt-8 flex items-center justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={currentStep === 1}
                                    className="gap-2"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    <span className="hidden sm:inline">Back</span>
                                </Button>

                                {currentStep < steps.length && (
                                    <Button onClick={handleContinue} className="gap-2 px-4 sm:px-6">
                                        Continue
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </main>
            </div>

            {/* Unified Sticky Footer Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
                <div className={cn(
                    'pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:py-3',
                    hasSectionRail ? 'lg:pl-[18rem] xl:pl-[22rem]' : 'lg:pl-28 xl:pl-32',
                )}>
                    <div className="px-4 sm:px-6 lg:px-6 xl:px-8">
                        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
                        {/* Error Display - Left (tap for full message) */}
                        <div className="flex-1 min-w-0">
                            {actionError ? (
                                <div className="flex items-center gap-2 text-left w-full group">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toast.error(actionError, undefined, { duration: 8000 });
                                        }}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <p className="text-sm text-destructive font-medium truncate group-hover:underline">{actionError}</p>
                                    </button>
                                    {actionError.toLowerCase().includes('stripe') && (
                                        <Link
                                            href="/settings?tab=payments"
                                            className="shrink-0 text-xs text-primary hover:underline"
                                        >
                                            Fix →
                                        </Link>
                                    )}
                                    {needsOrganizerContactEmailFix && (
                                        <button
                                            type="button"
                                            className="shrink-0 text-xs text-primary hover:underline disabled:pointer-events-none disabled:opacity-60"
                                            onClick={() => {
                                                void handleSaveDraftAndOpenOrganizerSettings();
                                            }}
                                            disabled={isNavigatingToOrganizerSettings || isSaving || isPublishing}
                                        >
                                            {isNavigatingToOrganizerSettings ? 'Saving…' : 'Save draft & fix →'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground truncate">{statusLabel}</p>
                            )}
                        </div>

                        {/* Action Buttons - Right */}
                        <div className="flex shrink-0 items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviewClick}
                                aria-label="Preview event"
                                disabled={disableSaveButtons}
                                className="flex h-11 min-w-11 gap-1.5 px-3 sm:h-9 sm:min-w-0"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Preview</span>
                            </Button>
                            {!isAlreadyPublished && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSaveDraftClick}
                                    aria-label="Save draft"
                                    disabled={disableSaveButtons}
                                    className="h-11 px-3 sm:h-9"
                                >
                                    <span className="hidden sm:inline">Save draft</span>
                                    <span className="sm:hidden">Save draft</span>
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handlePublishClick}
                                aria-label={publishButtonLabel}
                                disabled={disablePublishButtons}
                                className="h-11 gap-1.5 px-3 sm:h-9"
                            >
                                {!isAlreadyPublished && <Sparkles className="h-3.5 w-3.5" />}
                                <span className="hidden sm:inline">{publishButtonLabel}</span>
                                <span className="sm:hidden">{publishButtonLabel}</span>
                            </Button>
                        </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for sticky footer */}
            <div className="h-[calc(6rem+env(safe-area-inset-bottom))] sm:h-20" />

            <Dialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Insufficient Credits</DialogTitle>
                        <DialogDescription>
                            Your total ticket capacity ({publishCapacity}) exceeds your available credits ({organizerCredits}).
                            Credits will be used until they run out, then tickets will switch to the platform fee and organiser fees won&apos;t apply.
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

            <Dialog open={serverChangeDraft !== null} onOpenChange={(open) => !open && setServerChangeDraft(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>This event changed elsewhere</DialogTitle>
                        <DialogDescription>
                            Your unsaved edits are still safe in this tab. Reload to review the newer event, or continue editing your current draft.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setServerChangeDraft(null)}>
                            Continue editing
                        </Button>
                        <Button
                            onClick={() => {
                                if (!serverChangeDraft) return;
                                applyForegroundDraft(serverChangeDraft);
                                setServerChangeDraft(null);
                            }}
                        >
                            Reload and review
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={ticketArchiveConfirmId !== null} onOpenChange={(open) => !open && setTicketArchiveConfirmId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Archive ticket type?</DialogTitle>
                        <DialogDescription>
                            This ticket type will stop appearing on the live event and checkout pages. Existing orders, tickets, refunds and check-ins will keep their historical ticket details.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setTicketArchiveConfirmId(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!ticketArchiveConfirmId) return;
                                removeTicketConfirmed(ticketArchiveConfirmId);
                                setTicketArchiveConfirmId(null);
                            }}
                        >
                            Archive ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
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
    const [entryContext, setEntryContext] = useState<DraftEntryContext>(
        () => resolveDraftEntryContext(null, null).entryContext,
    );
    const [wizardKey, setWizardKey] = useState('scratch');
    const appliedSourceRef = useRef<string | null>(null);

    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isDraftSource(sourceParam)) {
            appliedSourceRef.current = null;
            const resolution = resolveDraftEntryContext(null, null);
            setInitialDraft(resolution.initialDraft);
            setEntryContext(resolution.entryContext);
            setWizardKey(resolution.wizardKey);
            return;
        }

        if (appliedSourceRef.current === sourceParam) {
            return;
        }

        appliedSourceRef.current = sourceParam;
        const pending = consumePendingDraft();
        const resolution = resolveDraftEntryContext(sourceParam, pending);
        setInitialDraft(resolution.initialDraft);
        setEntryContext(resolution.entryContext);
        setWizardKey(resolution.wizardKey);
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
