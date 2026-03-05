import type { DraftTicketType } from '@/hooks/useEventDraft';
import type { TicketInputPayload } from '@/lib/events-api';
import { toUtcIsoString } from '@/lib/timezone';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string | undefined | null) => (value ? UUID_REGEX.test(value) : false);

export const shouldIncludeTicketIdsForSave = (existingEventId?: string | null) =>
  Boolean(existingEventId && existingEventId.trim().length > 0);

export const buildTicketPayloadsForSave = (
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
    const minPerOrderValue =
      ticket.minPerOrder && Number.isFinite(ticket.minPerOrder) && ticket.minPerOrder >= 1
        ? ticket.minPerOrder
        : undefined;
    const maxPerOrderValue =
      ticket.maxPerOrder && Number.isFinite(ticket.maxPerOrder) && ticket.maxPerOrder >= 1
        ? ticket.maxPerOrder
        : undefined;
    const shouldIncludeIds = options?.includeIds ?? true;
    const backendId = shouldIncludeIds && isUuid(ticket.id) ? ticket.id : undefined;

    const parsedEarlyBirdPrice = Number.parseFloat(ticket.earlyBirdPrice || '0');
    const earlyBirdPriceValue =
      !isDonation &&
      ticket.hasEarlyBird &&
      Number.isFinite(parsedEarlyBirdPrice) &&
      parsedEarlyBirdPrice > 0
        ? parsedEarlyBirdPrice
        : null;
    const earlyBirdEndDateValue =
      !isDonation && ticket.hasEarlyBird && ticket.earlyBirdEndDate
        ? toUtcIsoString(ticket.earlyBirdEndDate, '23:59', timeZone)
        : null;
    const trimmedCustomFee = ticket.customFee?.trim() ?? '';
    const parsedCustomFee = Number.parseFloat(trimmedCustomFee);
    const customFeeValue =
      !isDonation &&
      !isFree &&
      priceValue > 0 &&
      trimmedCustomFee &&
      Number.isFinite(parsedCustomFee)
        ? parsedCustomFee
        : null;
    const salesStartValue =
      !isDonation && ticket.salesStart && ticket.salesStartTime
        ? toUtcIsoString(ticket.salesStart, ticket.salesStartTime, timeZone)
        : null;
    const salesEndValue =
      !isDonation && ticket.salesEnd && ticket.salesEndTime
        ? toUtcIsoString(ticket.salesEnd, ticket.salesEndTime, timeZone)
        : null;

    return {
      id: backendId,
      name: isDonation ? 'Donation' : ticket.name.trim() || `Ticket ${index + 1}`,
      description: ticket.description.trim() ? ticket.description.trim() : null,
      price: resolvedType === 'free' ? 0 : priceValue,
      isFree: resolvedType === 'free',
      type: resolvedType,
      currency,
      maxQuantity: isDonation ? undefined : quantityValue,
      minPerOrder: isDonation ? 1 : minPerOrderValue,
      maxPerOrder: isDonation ? 1 : maxPerOrderValue,
      visibility: isDonation ? 'public' : ticket.visibility,
      salesStart: isDonation ? null : salesStartValue,
      salesEnd: isDonation ? null : salesEndValue,
      absorbFee: ticket.absorbFee,
      customFee: customFeeValue,
      earlyBirdPrice: earlyBirdPriceValue,
      earlyBirdEndDate: earlyBirdEndDateValue,
    };
  });

export const serializeTicketPayloadsForSave = (
  tickets: DraftTicketType[],
  currency: string,
  timeZone: string,
  existingEventId?: string | null,
) =>
  JSON.stringify(
    buildTicketPayloadsForSave(tickets, currency, timeZone, {
      includeIds: shouldIncludeTicketIdsForSave(existingEventId),
    }),
  );

export const getTicketSavePlan = ({
  tickets,
  currency,
  timeZone,
  existingEventId,
  lastSavedSerializedPayload,
}: {
  tickets: DraftTicketType[];
  currency: string;
  timeZone: string;
  existingEventId?: string | null;
  lastSavedSerializedPayload: string | null;
}) => {
  const payloads = buildTicketPayloadsForSave(tickets, currency, timeZone, {
    includeIds: shouldIncludeTicketIdsForSave(existingEventId),
  });
  const serializedPayload = JSON.stringify(payloads);

  return {
    payloads,
    serializedPayload,
    shouldSave:
      lastSavedSerializedPayload === null || lastSavedSerializedPayload !== serializedPayload,
  };
};
