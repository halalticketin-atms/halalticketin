import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CheckInTicket, CheckInStats, CheckInResult } from '@/types';
import {
  listCheckInTickets,
  getCheckInStats,
  checkInTicket as apiCheckIn,
  undoCheckIn as apiUndoCheckIn,
  CheckInTicketRecord,
} from '@/lib/check-in-api';

/**
 * Transform API ticket record to frontend CheckInTicket format.
 */
export function transformCheckInTicket(record: CheckInTicketRecord): CheckInTicket {
  return {
    id: record.id,
    ticketCode: record.ticketCode,
    orderId: record.orderNumber, // Using orderNumber as orderId for display
    orderNumber: record.orderNumber,
    attendeeName: record.attendeeName ?? 'Unknown',
    attendeeEmail: record.attendeeEmail ?? '',
    ticketType: record.ticketType,
    checkInStatus: record.status === 'checked_in' ? 'checked_in' : 'not_checked_in',
    checkedInAt: record.checkedInAt ? new Date(record.checkedInAt) : undefined,
    checkedInBy: record.checkedInBy ?? undefined,
    checkedInByName: record.checkedInByName,
    // Group features not yet implemented in backend
    groupSize: 1,
    groupCheckedIn: record.status === 'checked_in' ? 1 : 0,
  };
}

interface UseCheckInTicketsResult {
  tickets: CheckInTicket[];
  stats: CheckInStats;
  checkIn: (ticketId: string) => Promise<CheckInResult>;
  undo: (ticketId: string) => Promise<void>;
  isLoading: boolean;
  updatingTicketId: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCheckInTickets(eventId: string | null): UseCheckInTicketsResult {
  const [tickets, setTickets] = useState<CheckInTicket[]>([]);
  const [apiStats, setApiStats] = useState<CheckInStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = ++fetchIdRef.current;
    if (!eventId) {
      setTickets([]);
      setApiStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch tickets and stats in parallel
      const [ticketsRes, statsRes] = await Promise.all([
        listCheckInTickets(eventId),
        getCheckInStats(eventId),
      ]);

      if (fetchIdRef.current !== requestId) {
        return;
      }

      setTickets(ticketsRes.tickets.map(transformCheckInTicket));
      setApiStats(statsRes);
    } catch (err) {
      if (fetchIdRef.current !== requestId) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to load check-in data';
      setError(message);
      setTickets([]);
      setApiStats(null);
    } finally {
      if (fetchIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stats from API response or fallback to local calculation
  const stats: CheckInStats = useMemo(() => {
    if (apiStats) {
      return apiStats;
    }
    // Fallback: calculate from local tickets
    const totalTickets = tickets.length;
    const checkedIn = tickets.filter((t) => t.checkInStatus === 'checked_in').length;
    const notCheckedIn = tickets.filter((t) => t.checkInStatus === 'not_checked_in').length;
    const percentage = totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;
    return { totalTickets, checkedIn, notCheckedIn, percentage };
  }, [tickets, apiStats]);

  const checkIn = useCallback(
    async (ticketId: string): Promise<CheckInResult> => {
      if (!eventId) {
        const message = 'Select an event before checking in tickets.';
        setError(message);
        return { status: 'invalid', message };
      }

      setError(null);
      setUpdatingTicketId(ticketId);

      try {
        const response = await apiCheckIn(eventId, ticketId);

        if (response.success) {
          const updatedTicket = transformCheckInTicket(response.ticket);

          // Update local state
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? updatedTicket : t))
          );

          // Update stats
          setApiStats((prev) =>
            prev
              ? {
                ...prev,
                checkedIn: prev.checkedIn + 1,
                notCheckedIn: prev.notCheckedIn - 1,
                percentage:
                  prev.totalTickets > 0
                    ? ((prev.checkedIn + 1) / prev.totalTickets) * 100
                    : 0,
              }
              : prev
          );

          return { status: 'success', ticket: updatedTicket };
        }

        return { status: 'invalid', message: 'Failed to check in ticket' };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check in ticket';
        setError(message);
        return { status: 'invalid', message };
      } finally {
        setUpdatingTicketId(null);
      }
    },
    [eventId]
  );

  const undo = useCallback(
    async (ticketId: string): Promise<void> => {
      if (!eventId) {
        setError('Select an event before undoing check-ins.');
        return;
      }

      setError(null);
      setUpdatingTicketId(ticketId);

      try {
        const response = await apiUndoCheckIn(eventId, ticketId);

        if (response.success) {
          const updatedTicket = transformCheckInTicket(response.ticket);

          // Update local state
          setTickets((prev) =>
            prev.map((t) => (t.id === ticketId ? updatedTicket : t))
          );

          // Update stats
          setApiStats((prev) =>
            prev
              ? {
                ...prev,
                checkedIn: prev.checkedIn - 1,
                notCheckedIn: prev.notCheckedIn + 1,
                percentage:
                  prev.totalTickets > 0
                    ? ((prev.checkedIn - 1) / prev.totalTickets) * 100
                    : 0,
              }
              : prev
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to undo check-in';
        setError(message);
      } finally {
        setUpdatingTicketId(null);
      }
    },
    [eventId]
  );

  return {
    tickets,
    stats,
    checkIn,
    undo,
    isLoading,
    updatingTicketId,
    error,
    refresh: fetchData,
  };
}
