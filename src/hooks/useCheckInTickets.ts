import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CheckInTicket, CheckInStats, CheckInResult } from '@/types';
import {
  listCheckInTickets,
  getCheckInStats,
  checkInTicket as apiCheckIn,
  undoCheckIn as apiUndoCheckIn,
  CheckInTicketRecord,
} from '@/lib/check-in-api';
import { ApiError } from '@/lib/api';

const CHECK_IN_TICKETS_PAGE_SIZE = 100;
type CheckInFailureResult = Extract<CheckInResult, { status: 'needs_claim' | 'invalid' }>;

export function isCheckInEligibleStatus(status: CheckInTicketRecord['status']): boolean {
  return status === 'valid' || status === 'checked_in';
}

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
    status: record.status,
    checkInStatus: record.status === 'checked_in' ? 'checked_in' : 'not_checked_in',
    checkedInAt: record.checkedInAt ? new Date(record.checkedInAt) : undefined,
    checkedInBy: record.checkedInBy ?? undefined,
    checkedInByName: record.checkedInByName,
    requiresClaim: record.requiresClaim ?? false,
    // Group features not yet implemented in backend
    groupSize: 1,
    groupCheckedIn: record.status === 'checked_in' ? 1 : 0,
  };
}

const getNeedsClaimInstructions = (error: ApiError): string | null => {
  const payload = error.payload as
    | { error?: { details?: { reason?: string; instructions?: string } } }
    | null
    | undefined;
  const details = payload?.error?.details;

  if (details?.reason !== 'needs_claim') {
    return null;
  }

  return typeof details.instructions === 'string' && details.instructions.length > 0
    ? details.instructions
    : error.message;
};

export function getCheckInFailureResult(
  error: unknown,
  currentTicket?: CheckInTicket,
): CheckInFailureResult {
  if (error instanceof ApiError) {
    const instructions = getNeedsClaimInstructions(error);
    if (instructions) {
      return {
        status: 'needs_claim',
        message: instructions,
        ticket: currentTicket,
      };
    }
  }

  return {
    status: 'invalid',
    message: error instanceof Error ? error.message : 'Failed to check in ticket',
  };
}

export async function listAllCheckInTickets(
  eventId: string,
  listTickets: typeof listCheckInTickets = listCheckInTickets,
): Promise<CheckInTicketRecord[]> {
  const allTickets: CheckInTicketRecord[] = [];
  let offset = 0;

  while (true) {
    const response = await listTickets(eventId, {
      limit: CHECK_IN_TICKETS_PAGE_SIZE,
      offset,
    });
    const pageTickets = response.tickets;

    if (pageTickets.length === 0) {
      return allTickets;
    }

    allTickets.push(...pageTickets.filter((ticket) => isCheckInEligibleStatus(ticket.status)));
    offset += pageTickets.length;

    if (pageTickets.length < CHECK_IN_TICKETS_PAGE_SIZE) {
      return allTickets;
    }
  }
}

interface UseCheckInTicketsResult {
  tickets: CheckInTicket[];
  stats: CheckInStats;
  checkIn: (ticketId: string) => Promise<CheckInResult>;
  undo: (ticketId: string) => Promise<void>;
  applyCheckInUpdate: (ticket: CheckInTicket) => void;
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
        listAllCheckInTickets(eventId),
        getCheckInStats(eventId),
      ]);

      if (fetchIdRef.current !== requestId) {
        return;
      }

      setTickets(ticketsRes.map(transformCheckInTicket));
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
    const claimBlockedCount = tickets.filter((t) => t.requiresClaim).length;
    const eligibleTickets = tickets.filter((t) => isCheckInEligibleStatus(t.status));
    const totalTickets = eligibleTickets.length;
    const checkedIn = eligibleTickets.filter((t) => t.checkInStatus === 'checked_in').length;
    const notCheckedIn = eligibleTickets.filter((t) => t.checkInStatus === 'not_checked_in').length;
    const percentage = totalTickets > 0 ? (checkedIn / totalTickets) * 100 : 0;
    return { totalTickets, checkedIn, notCheckedIn, requiresClaimCount: claimBlockedCount, percentage };
  }, [tickets, apiStats]);

  const applyCheckInUpdate = useCallback(
    (updatedTicket: CheckInTicket) => {
      let previousStatus: CheckInTicket['checkInStatus'] | undefined;
      let found = false;

      setTickets((prev) => {
        const next = prev.map((ticket) => {
          if (ticket.id === updatedTicket.id) {
            previousStatus = ticket.checkInStatus;
            found = true;
            return updatedTicket;
          }
          return ticket;
        });

        return found ? next : prev;
      });

      if (!found) {
        void fetchData();
        return;
      }

      setApiStats((prev) => {
        if (!prev || !previousStatus) return prev;
        if (previousStatus === updatedTicket.checkInStatus) return prev;

        if (previousStatus === 'not_checked_in' && updatedTicket.checkInStatus === 'checked_in') {
          const checkedIn = prev.checkedIn + 1;
          const notCheckedIn = Math.max(prev.notCheckedIn - 1, 0);
          const percentage = prev.totalTickets > 0 ? (checkedIn / prev.totalTickets) * 100 : 0;
          return { ...prev, checkedIn, notCheckedIn, percentage };
        }

        if (previousStatus === 'checked_in' && updatedTicket.checkInStatus === 'not_checked_in') {
          const checkedIn = Math.max(prev.checkedIn - 1, 0);
          const notCheckedIn = prev.notCheckedIn + 1;
          const percentage = prev.totalTickets > 0 ? (checkedIn / prev.totalTickets) * 100 : 0;
          return { ...prev, checkedIn, notCheckedIn, percentage };
        }

        return prev;
      });
    },
    [fetchData]
  );

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

          applyCheckInUpdate(updatedTicket);

          return { status: 'success', ticket: updatedTicket };
        }

        return { status: 'invalid', message: 'Failed to check in ticket' };
      } catch (err) {
        const currentTicket = tickets.find((ticket) => ticket.id === ticketId);
        const failure = getCheckInFailureResult(err, currentTicket);
        setError(failure.message);
        return failure;
      } finally {
        setUpdatingTicketId(null);
      }
    },
    [applyCheckInUpdate, eventId, tickets]
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

          applyCheckInUpdate(updatedTicket);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to undo check-in';
        setError(message);
      } finally {
        setUpdatingTicketId(null);
      }
    },
    [applyCheckInUpdate, eventId]
  );

  return {
    tickets,
    stats,
    checkIn,
    undo,
    applyCheckInUpdate,
    isLoading,
    updatingTicketId,
    error,
    refresh: fetchData,
  };
}
