import { describe, expect, it, vi } from 'vitest';

import type { CheckInTicketRecord } from '@/lib/check-in-api';

import { listAllCheckInTickets } from './useCheckInTickets';

const makeTicket = (index: number): CheckInTicketRecord => ({
  id: `ticket-${index}`,
  ticketCode: `code-${index}`,
  attendeeName: `Attendee ${index}`,
  attendeeEmail: `attendee-${index}@example.com`,
  ticketType: 'General Admission',
  orderNumber: `order-${index}`,
  status: 'valid',
  checkedInAt: null,
  checkedInBy: null,
  checkedInByName: null,
  createdAt: `2026-04-04T00:${String(index).padStart(2, '0')}:00.000Z`,
});

describe('listAllCheckInTickets', () => {
  it('loads every page until the backend returns a partial page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => makeTicket(index));
    const secondPage = Array.from({ length: 10 }, (_, index) => makeTicket(index + 100));
    const listTickets = vi
      .fn()
      .mockResolvedValueOnce({ tickets: firstPage })
      .mockResolvedValueOnce({ tickets: secondPage });

    const tickets = await listAllCheckInTickets('event-1', listTickets);

    expect(listTickets).toHaveBeenNthCalledWith(1, 'event-1', { limit: 100, offset: 0 });
    expect(listTickets).toHaveBeenNthCalledWith(2, 'event-1', { limit: 100, offset: 100 });
    expect(tickets).toHaveLength(110);
    expect(tickets[0]?.id).toBe('ticket-0');
    expect(tickets[109]?.id).toBe('ticket-109');
  });

  it('returns an empty list when the first page has no tickets', async () => {
    const listTickets = vi.fn().mockResolvedValueOnce({ tickets: [] });

    await expect(listAllCheckInTickets('event-1', listTickets)).resolves.toEqual([]);
    expect(listTickets).toHaveBeenCalledTimes(1);
  });
});
