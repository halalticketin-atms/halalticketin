import type { DraftEventInitial, DraftLocationType, DraftPromoCode, DraftTicketType } from '@/hooks/useEventDraft';
import type { EventRecord, PromoCodeRecord, TicketRecord } from '@/lib/events-api';

const isoToDate = (iso?: string | null) => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0] ?? '';
};

const isoToTime = (iso?: string | null) => {
    if (!iso) return '';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[1]?.slice(0, 5) ?? '';
};

export const mapTicketRecordsToDraft = (rows: TicketRecord[]): DraftTicketType[] =>
    rows.map((ticket, index) => {
        const priceValue = ticket.price ?? '0';
        const isFree = ticket.type === 'free' || Number(priceValue) === 0;
        return {
            id: ticket.id ?? `ticket-${index}`,
            name: ticket.name ?? `Ticket ${index + 1}`,
            price: priceValue,
            isFree,
            quantity: ticket.maxQuantity ?? 0,
            maxPerOrder: ticket.maxPerOrder ?? 1,
            description: ticket.description ?? '',
            salesStart: isoToDate(ticket.salesStart),
            salesEnd: isoToDate(ticket.salesEnd),
            hasEarlyBird: false,
            earlyBirdPrice: '',
            earlyBirdEndDate: '',
            visibility: ticket.visibility ?? 'public',
            absorbFee: ticket.absorbFee ?? null, // null = use event default
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
        bannerImageDataUrl: '',
        categories: event.category ? event.category.split(',').map((c) => c.trim()) : [],
        organizerName: '',
        visibility: event.isListedPublicly ? 'public' : 'private',
        date: isoToDate(event.startDatetime),
        endDate: isoToDate(event.endDatetime),
        isMultiDay: event.isMultiDay,
        startTime: isoToTime(event.startDatetime),
        endTime: isoToTime(event.endDatetime),
        timezone: event.timezone ?? 'UTC',
        locationType: backendToDraftLocation(event.locationType),
        venue: event.venue ?? '',
        address: event.address ?? '',
        city: event.city ?? '',
        onlineUrl: event.onlineUrl ?? '',
        currency: event.currency ?? 'GBP',
        absorbFee: event.absorbFee ?? false,
        attendeeInfoMode: event.attendeeInfoMode ?? 'buyer_choice',
        customQuestions: event.customQuestions ?? [],
    },
    tickets: tickets.length > 0 ? mapTicketRecordsToDraft(tickets) : undefined,
    promoCodes: promoCodes.length > 0 ? mapPromoCodeRecordsToDraft(promoCodes) : [],
    currentStep: 1,
});
