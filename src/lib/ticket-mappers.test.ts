import { describe, expect, it } from 'vitest';

import type { PromoCodeRecord, TicketRecord } from './events-api';
import { mapPromoCodeRecordsToDraft, mapTicketRecordsToDraft } from './ticket-mappers';

describe('mapTicketRecordsToDraft', () => {
  it('maps sales window ISO values to date and time fields in event timezone', () => {
    const rows: TicketRecord[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        name: 'General Admission',
        description: null,
        price: '25.00',
        currency: 'GBP',
        maxQuantity: 100,
        minPerOrder: 1,
        maxPerOrder: 4,
        type: 'paid',
        visibility: 'public',
        salesStart: '2026-03-10T10:15:00.000Z',
        salesEnd: '2026-03-10T18:45:00.000Z',
        absorbFee: null,
        customFee: null,
        earlyBirdPrice: null,
        earlyBirdEndDate: null,
      },
    ];

    const [mapped] = mapTicketRecordsToDraft(rows, 'Europe/London');
    expect(mapped.salesStart).toBe('2026-03-10');
    expect(mapped.salesStartTime).toBe('10:15');
    expect(mapped.salesEnd).toBe('2026-03-10');
    expect(mapped.salesEndTime).toBe('18:45');
  });

  it('falls back to empty strings for missing sales window values', () => {
    const rows: TicketRecord[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        eventId: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Donation',
        description: null,
        price: '0',
        currency: 'GBP',
        maxQuantity: null,
        minPerOrder: null,
        maxPerOrder: null,
        type: 'donation',
        visibility: 'public',
        salesStart: null,
        salesEnd: null,
        absorbFee: null,
        customFee: null,
        earlyBirdPrice: null,
        earlyBirdEndDate: null,
      },
    ];

    const [mapped] = mapTicketRecordsToDraft(rows, 'Europe/London');
    expect(mapped.salesStart).toBe('');
    expect(mapped.salesStartTime).toBe('');
    expect(mapped.salesEnd).toBe('');
    expect(mapped.salesEndTime).toBe('');
  });
});

describe('mapPromoCodeRecordsToDraft', () => {
  it('maps promo validity ISO values to date and time fields', () => {
    const rows: PromoCodeRecord[] = [
      {
        id: 'promo-1',
        eventId: '550e8400-e29b-41d4-a716-446655440010',
        code: 'SAVE10',
        discountType: 'percentage',
        discountValue: '10',
        usageLimit: 100,
        usageCount: 0,
        validFrom: '2026-03-10T09:30:00.000Z',
        validFromHasTime: true,
        validUntil: '2026-03-12T17:45:00.000Z',
        validUntilHasTime: true,
        isActive: true,
        revealsHiddenTickets: false,
        applicableTicketTypeIds: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const [mapped] = mapPromoCodeRecordsToDraft(rows, 'Europe/Dublin');
    expect(mapped.validFrom).toBe('2026-03-10');
    expect(mapped.validFromTime).toBe('09:30');
    expect(mapped.validUntil).toBe('2026-03-12');
    expect(mapped.validUntilTime).toBe('17:45');
  });

  it('maps promo validity using the supplied event timezone', () => {
    const rows: PromoCodeRecord[] = [
      {
        id: 'promo-ny',
        eventId: '550e8400-e29b-41d4-a716-446655440012',
        code: 'MORNING',
        discountType: 'percentage',
        discountValue: '15',
        usageLimit: 50,
        usageCount: 0,
        validFrom: '2026-03-10T13:30:00.000Z',
        validFromHasTime: true,
        validUntil: '2026-03-10T22:15:00.000Z',
        validUntilHasTime: true,
        isActive: true,
        revealsHiddenTickets: false,
        applicableTicketTypeIds: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const [mapped] = mapPromoCodeRecordsToDraft(rows, 'America/New_York');
    expect(mapped.validFrom).toBe('2026-03-10');
    expect(mapped.validFromTime).toBe('09:30');
    expect(mapped.validUntil).toBe('2026-03-10');
    expect(mapped.validUntilTime).toBe('18:15');
  });

  it('falls back to empty strings for missing promo validity values', () => {
    const rows: PromoCodeRecord[] = [
      {
        id: 'promo-2',
        eventId: '550e8400-e29b-41d4-a716-446655440011',
        code: 'SECRET',
        discountType: 'amount',
        discountValue: '0',
        usageLimit: null,
        usageCount: 0,
        validFrom: null,
        validFromHasTime: false,
        validUntil: null,
        validUntilHasTime: false,
        isActive: true,
        revealsHiddenTickets: true,
        applicableTicketTypeIds: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const [mapped] = mapPromoCodeRecordsToDraft(rows, 'Europe/London');
    expect(mapped.validFrom).toBe('');
    expect(mapped.validFromTime).toBe('');
    expect(mapped.validUntil).toBe('');
    expect(mapped.validUntilTime).toBe('');
  });

  it('keeps promo times blank when backend marks date-only validity', () => {
    const rows: PromoCodeRecord[] = [
      {
        id: 'promo-3',
        eventId: '550e8400-e29b-41d4-a716-446655440012',
        code: 'DATEONLY',
        discountType: 'percentage',
        discountValue: '15',
        usageLimit: 20,
        usageCount: 0,
        validFrom: '2026-03-10T00:00:00.000Z',
        validFromHasTime: false,
        validUntil: '2026-03-12T23:59:59.000Z',
        validUntilHasTime: false,
        isActive: true,
        revealsHiddenTickets: false,
        applicableTicketTypeIds: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const [mapped] = mapPromoCodeRecordsToDraft(rows, 'America/New_York');
    expect(mapped.validFrom).toBe('2026-03-10');
    expect(mapped.validFromTime).toBe('');
    expect(mapped.validUntil).toBe('2026-03-12');
    expect(mapped.validUntilTime).toBe('');
  });

  it('uses the event timezone for non-legacy date-only promo boundaries', () => {
    const rows: PromoCodeRecord[] = [
      {
        id: 'promo-4',
        eventId: '550e8400-e29b-41d4-a716-446655440013',
        code: 'LOCALDAY',
        discountType: 'percentage',
        discountValue: '20',
        usageLimit: 10,
        usageCount: 0,
        validFrom: '2026-03-10T04:00:00.000Z',
        validFromHasTime: false,
        validUntil: '2026-03-11T03:59:00.000Z',
        validUntilHasTime: false,
        isActive: true,
        revealsHiddenTickets: false,
        applicableTicketTypeIds: null,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      },
    ];

    const [mapped] = mapPromoCodeRecordsToDraft(rows, 'America/New_York');
    expect(mapped.validFrom).toBe('2026-03-10');
    expect(mapped.validFromTime).toBe('');
    expect(mapped.validUntil).toBe('2026-03-10');
    expect(mapped.validUntilTime).toBe('');
  });
});
