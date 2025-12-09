import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CheckInTicket, CheckInStats, CheckInResult } from '@/types';

// Mock tickets data (frontend-only scaffold)
const mockTickets: CheckInTicket[] = [
  {
    id: 'TKT-001',
    orderId: 'ORD-2024-001',
    orderNumber: 'ORD-2024-001',
    attendeeName: 'Ahmed Hassan',
    attendeeEmail: 'ahmed@example.com',
    ticketType: 'VIP Pass',
    checkInStatus: 'not_checked_in',
    groupSize: 2,
    groupCheckedIn: 0,
  },
  {
    id: 'TKT-002',
    orderId: 'ORD-2024-001',
    orderNumber: 'ORD-2024-001',
    attendeeName: 'Ahmed Hassan',
    attendeeEmail: 'ahmed@example.com',
    ticketType: 'VIP Pass',
    checkInStatus: 'not_checked_in',
    groupSize: 2,
    groupCheckedIn: 0,
  },
  {
    id: 'TKT-003',
    orderId: 'ORD-2024-002',
    orderNumber: 'ORD-2024-002',
    attendeeName: 'Fatima Khan',
    attendeeEmail: 'fatima.k@example.com',
    ticketType: 'General Admission',
    checkInStatus: 'checked_in',
    checkedInAt: new Date('2024-12-07T14:30:00'),
    groupSize: 1,
    groupCheckedIn: 1,
  },
  {
    id: 'TKT-004',
    orderId: 'ORD-2024-003',
    orderNumber: 'ORD-2024-003',
    attendeeName: 'Omar Ali',
    attendeeEmail: 'omar.ali@example.com',
    ticketType: 'General Admission',
    checkInStatus: 'not_checked_in',
    groupSize: 1,
    groupCheckedIn: 0,
  },
  {
    id: 'TKT-005',
    orderId: 'ORD-2024-004',
    orderNumber: 'ORD-2024-004',
    attendeeName: 'Aisha Mohammed',
    attendeeEmail: 'aisha.m@example.com',
    ticketType: 'Family Pack',
    checkInStatus: 'not_checked_in',
    groupSize: 4,
    groupCheckedIn: 0,
  },
];

interface UseCheckInTicketsResult {
  tickets: CheckInTicket[];
  stats: CheckInStats;
  checkIn: (ticketId: string) => Promise<CheckInResult>;
  undo: (ticketId: string) => Promise<void>;
  isLoading: boolean;
  updatingTicketId: string | null;
  error: string | null;
}

export function useCheckInTickets(eventId: string): UseCheckInTicketsResult {
  const [tickets, setTickets] = useState<CheckInTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // In a real app, this is where you'd fetch tickets for the event.
    const timeout = setTimeout(() => {
      // For now, use the mock tickets regardless of eventId.
      setTickets(mockTickets);
      setIsLoading(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, [eventId]);

  const stats: CheckInStats = useMemo(() => {
    const totalTickets = tickets.length;
    const checkedIn = tickets.filter((t) => t.checkInStatus === 'checked_in').length;
    const notCheckedIn = tickets.filter((t) => t.checkInStatus === 'not_checked_in').length;
    const percentage =
      totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;

    return {
      totalTickets,
      checkedIn,
      notCheckedIn,
      percentage,
    };
  }, [tickets]);

  const checkIn = useCallback(
    async (ticketId: string): Promise<CheckInResult> => {
      setError(null);
      setUpdatingTicketId(ticketId);

      try {
        let result: CheckInResult = { status: 'invalid', message: 'Ticket not found' };

        setTickets((prev) => {
          const ticketForOrder = prev.find((t) => t.id === ticketId);
          const orderId = ticketForOrder?.orderId;

          if (!ticketForOrder) {
            return prev;
          }

          result = {
            status: 'success',
            ticket: {
              ...ticketForOrder,
              checkInStatus: 'checked_in',
            },
          };

          return prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  checkInStatus: 'checked_in',
                  checkedInAt: new Date(),
                  groupCheckedIn: t.groupCheckedIn + 1,
                }
              : orderId && t.orderId === orderId
              ? { ...t, groupCheckedIn: t.groupCheckedIn + 1 }
              : t,
          );
        });

        // Placeholder for future async API call
        await Promise.resolve();

        return result;
      } catch (e) {
        setError('Failed to check in ticket. Please try again.');
        return { status: 'invalid', message: 'Failed to check in ticket.' };
      } finally {
        setUpdatingTicketId(null);
      }
    },
    [],
  );

  const undo = useCallback(async (ticketId: string): Promise<void> => {
    setError(null);
    setUpdatingTicketId(ticketId);

    try {
      setTickets((prev) => {
        const ticketForOrder = prev.find((t) => t.id === ticketId);
        const orderId = ticketForOrder?.orderId;

        return prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                checkInStatus: 'not_checked_in',
                checkedInAt: undefined,
                groupCheckedIn: Math.max(0, t.groupCheckedIn - 1),
              }
            : orderId && t.orderId === orderId
            ? { ...t, groupCheckedIn: Math.max(0, t.groupCheckedIn - 1) }
            : t,
        );
      });

      // Placeholder for future async API call
      await Promise.resolve();
    } catch (e) {
      setError('Failed to undo check-in. Please try again.');
    } finally {
      setUpdatingTicketId(null);
    }
  }, []);

  return {
    tickets,
    stats,
    checkIn,
    undo,
    isLoading,
    updatingTicketId,
    error,
  };
}
