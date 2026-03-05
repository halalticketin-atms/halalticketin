import { describe, expect, it } from 'vitest';

import type { TicketRecord } from './events-api';
import { mapTicketRecordsToDraft } from './ticket-mappers';

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
