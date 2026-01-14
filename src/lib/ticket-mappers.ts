import type { DraftEventInitial, DraftLocationType, DraftPromoCode, DraftTicketType } from '@/hooks/useEventDraft';
import type { EventRecord, PromoCodeRecord, TicketRecord } from '@/lib/events-api';
import { formatDateInTimeZone, formatTimeInTimeZone } from '@/lib/timezone';

const isoToDate = (iso?: string | null, timeZone?: string) =>
    formatDateInTimeZone(iso, timeZone);

const isoToTime = (iso?: string | null, timeZone?: string) =>
    formatTimeInTimeZone(iso, timeZone);

export const mapTicketRecordsToDraft = (
    rows: TicketRecord[],
    timeZone?: string,
): DraftTicketType[] =>
    rows.map((ticket, index) => {
        const priceValue = ticket.price ?? '0';
        const isDonation = ticket.type === 'donation';
        const isFree = !isDonation && (ticket.type === 'free' || Number(priceValue) === 0);
        // Check if early bird is configured
        const hasEarlyBird = !!(ticket.earlyBirdPrice && ticket.earlyBirdEndDate);
        return {
            id: ticket.id ?? `ticket-${index}`,
            name: ticket.name ?? `Ticket ${index + 1}`,
            price: priceValue,
            customFee: ticket.customFee === null || ticket.customFee === undefined ? '' : String(ticket.customFee),
            isFree,
            type: ticket.type ?? (isFree ? 'free' : 'paid'),
            quantity: ticket.maxQuantity ?? 0,
            minPerOrder: ticket.minPerOrder ?? 0,
            maxPerOrder: ticket.maxPerOrder ?? 0,
            description: ticket.description ?? '',
            salesStart: isoToDate(ticket.salesStart, timeZone),
            salesEnd: isoToDate(ticket.salesEnd, timeZone),
            hasEarlyBird,
            earlyBirdPrice: ticket.earlyBirdPrice ?? '',
            earlyBirdEndDate: isoToDate(ticket.earlyBirdEndDate, timeZone),
            visibility: ticket.visibility ?? 'public',
            absorbFee: ticket.absorbFee ?? null,
        };
    });

export const mapPromoCodeRecordsToDraft = (rows: PromoCodeRecord[]): DraftPromoCode[] =>
    rows.map((promo) => ({
        id: promo.id,
        code: promo.code,
        discountType: promo.discountType === 'amount' ? 'fixed' : 'percentage',
        discountValue: promo.discountValue,
        usageLimit: promo.usageLimit ?? 100,
        validFrom: isoToDate(promo.validFrom),
        validUntil: isoToDate(promo.validUntil),
        isActive: promo.isActive,
        revealsHiddenTickets: promo.revealsHiddenTickets ?? false,
        applicableTicketTypeIds: promo.applicableTicketTypeIds ?? null,
    }));

const backendToDraftLocation = (value: EventRecord['locationType']): DraftLocationType => {
    if (value === 'online' || value === 'hybrid') {
        return value;
    }
    return 'physical';
};

export const buildDraftFromEventRecord = (
    event: EventRecord,
    tickets: TicketRecord[],
    promoCodes: PromoCodeRecord[] = [],
): DraftEventInitial => ({
    eventId: event.id,
    eventStatus: event.status,
    formData: {
        title: event.title ?? '',
        description: event.description ?? '',
        bannerImageDataUrl: event.bannerImageUrl ?? '', // FIX: Populate from backend's bannerImageUrl
        categories: event.category ? event.category.split(',').map((c) => c.trim()) : [],
        visibility: event.isListedPublicly ? 'public' : 'private',
        accessCodeEnabled: !event.isListedPublicly && (event.hasAccessPassword ?? false),
        accessCode: '',
        date: isoToDate(event.startDatetime, event.timezone),
        endDate: isoToDate(event.endDatetime, event.timezone),
        isMultiDay: event.isMultiDay,
        startTime: isoToTime(event.startDatetime, event.timezone),
        endTime: isoToTime(event.endDatetime, event.timezone),
        timezone: event.timezone ?? 'UTC',
        locationType: backendToDraftLocation(event.locationType),
        venue: event.venue ?? '',
        address: event.address ?? '',
        city: event.city ?? '',
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        onlineUrl: event.onlineUrl ?? '',
        currency: event.currency ?? 'GBP',
        absorbFee: event.absorbFee ?? false,
        refundPolicy: event.refundPolicy ?? '',
        attendeeInfoMode: event.attendeeInfoMode ?? 'buyer_choice',
        customQuestions: event.customQuestions ?? [],
    },
    tickets: tickets.length > 0 ? mapTicketRecordsToDraft(tickets, event.timezone) : undefined,
    promoCodes: promoCodes.length > 0 ? mapPromoCodeRecordsToDraft(promoCodes) : [],
    currentStep: 1,
});
