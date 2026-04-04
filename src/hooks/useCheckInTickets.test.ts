import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { CheckInTicketRecord } from '@/lib/check-in-api';

import {
  getCheckInFailureResult,
  isCheckInEligibleStatus,
  listAllCheckInTickets,
  transformCheckInTicket,
} from './useCheckInTickets';

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

  it('filters refunded and cancelled tickets from the aggregated attendee list', async () => {
    const listTickets = vi
      .fn()
      .mockResolvedValueOnce({
        tickets: [
          makeTicket(0),
          { ...makeTicket(1), status: 'refunded' },
          { ...makeTicket(2), status: 'cancelled' },
          { ...makeTicket(3), status: 'checked_in' },
        ],
      });

    await expect(listAllCheckInTickets('event-1', listTickets)).resolves.toEqual([
      makeTicket(0),
      { ...makeTicket(3), status: 'checked_in' },
    ]);
  });

  it('keeps unclaimed gifted tickets in the aggregated attendee list', async () => {
    const listTickets = vi.fn().mockResolvedValueOnce({
      tickets: [{ ...makeTicket(4), requiresClaim: true, giftStatus: 'pending_claim' }],
    });

    await expect(listAllCheckInTickets('event-1', listTickets)).resolves.toEqual([
      { ...makeTicket(4), requiresClaim: true, giftStatus: 'pending_claim' },
    ]);
  });
});

describe('check-in eligibility helpers', () => {
  it('marks only valid and checked-in tickets as check-in eligible', () => {
    expect(isCheckInEligibleStatus('valid')).toBe(true);
    expect(isCheckInEligibleStatus('checked_in')).toBe(true);
    expect(isCheckInEligibleStatus('refunded')).toBe(false);
    expect(isCheckInEligibleStatus('cancelled')).toBe(false);
  });

  it('preserves raw ticket status on transformed tickets', () => {
    const ticket = transformCheckInTicket({ ...makeTicket(1), status: 'checked_in' });

    expect(ticket.status).toBe('checked_in');
    expect(ticket.checkInStatus).toBe('checked_in');
  });

  it('maps needs-claim validation errors to the warning result', () => {
    const ticket = transformCheckInTicket({
      ...makeTicket(5),
      requiresClaim: true,
      giftStatus: 'pending_claim',
      giftDeliveryMode: 'email',
    });
    const error = new ApiError('Gift ticket must be claimed first.', 400, {
      error: {
        details: {
          reason: 'needs_claim',
          instructions: 'Ask the recipient to click the claim link in their gift email before entry.',
        },
      },
    });

    expect(getCheckInFailureResult(error, ticket)).toEqual({
      status: 'needs_claim',
      message: 'Ask the recipient to click the claim link in their gift email before entry.',
      ticket,
    });
  });
});
