'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EventRecord, listOrganizerEvents } from '@/lib/events-api';

export type DashboardEventStatus = 'draft' | 'active' | 'past';
export const EMAIL_ATTENDEE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;
const EVENT_FALLBACK_DURATION_MS = 24 * 60 * 60 * 1000;

export interface DashboardEvent extends EventRecord {
    /** Computed status based on dates and published state */
    displayStatus: DashboardEventStatus;
    /** Whether Email Attendees should remain available for this event */
    canEmailAttendees: boolean;
}

const getEventEffectiveEnd = (event: EventRecord): Date | null => {
    if (event.endDatetime) {
        return new Date(event.endDatetime);
    }

    if (!event.startDatetime) {
        return null;
    }

    return new Date(new Date(event.startDatetime).getTime() + EVENT_FALLBACK_DURATION_MS);
};

/**
 * Classify an event's display status based on its publish status and dates.
 * 
 * - draft: Not published
 * - active: Published and hasn't ended yet (includes upcoming + happening now)
 * - past: Published and has ended
 */
function classifyEventStatus(event: EventRecord): DashboardEventStatus {
    if (event.status === 'draft') {
        return 'draft';
    }

    if (event.status === 'archived' || event.status === 'cancelled') {
        return 'past';
    }

    // For published/archived/cancelled events, classify by end date
    const now = new Date();
    const end = event.endDatetime ? new Date(event.endDatetime) : null;

    // If no end date, check start date - if in past, it's past; otherwise active
    if (!end) {
        const start = event.startDatetime ? new Date(event.startDatetime) : null;
        if (start && start < now) {
            // Event started but no end date - consider it past if it started more than 24h ago
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            return start < oneDayAgo ? 'past' : 'active';
        }
        return 'active';
    }

    // Event has ended
    if (end < now) {
        return 'past';
    }

    // Event hasn't ended yet (upcoming or happening now)
    return 'active';
}

/**
 * Hook for fetching and managing organizer events.
 * Automatically classifies events into draft/active/past.
 */
export function useOrganizerEvents(organizerId: string | null) {
    const [events, setEvents] = useState<DashboardEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resolvedOrganizerId, setResolvedOrganizerId] = useState<string | null>(null);
    const fetchIdRef = useRef(0);

    const fetchEvents = useCallback(async () => {
        const requestId = ++fetchIdRef.current;
        if (!organizerId) {
            setEvents([]);
            setError(null);
            setResolvedOrganizerId(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await listOrganizerEvents(organizerId);
            if (fetchIdRef.current !== requestId) {
                return;
            }
            const classified = response.events.map((event) => ({
                ...event,
                displayStatus: classifyEventStatus(event),
                canEmailAttendees: canEmailAttendeesForEvent(event),
            }));

            // Sort events so active ones are always first
            classified.sort((a, b) => {
                if (a.displayStatus === 'active' && b.displayStatus !== 'active') return -1;
                if (a.displayStatus !== 'active' && b.displayStatus === 'active') return 1;
                return 0;
            });

            setEvents(classified);
            setResolvedOrganizerId(organizerId);
        } catch (err) {
            if (fetchIdRef.current !== requestId) {
                return;
            }
            const message = err instanceof Error ? err.message : 'Failed to load events';
            setError(message);
            setEvents([]);
            setResolvedOrganizerId(organizerId);
        } finally {
            if (fetchIdRef.current === requestId) {
                setIsLoading(false);
            }
        }
    }, [organizerId]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    /**
     * Get events filtered by display status.
     */
    const getByStatus = useCallback(
        (status: DashboardEventStatus) => {
            return events.filter((event) => event.displayStatus === status);
        },
        [events]
    );

    /**
     * Get counts for each status.
     */
    const counts = {
        all: events.length,
        draft: events.filter((e) => e.displayStatus === 'draft').length,
        active: events.filter((e) => e.displayStatus === 'active').length,
        past: events.filter((e) => e.displayStatus === 'past').length,
    };

    return {
        events,
        isLoading,
        error,
        resolvedOrganizerId,
        refresh: fetchEvents,
        getByStatus,
        counts,
    };
}

export function canEmailAttendeesForEvent(event: EventRecord, now: Date = new Date()): boolean {
    if (event.status !== 'published') {
        return false;
    }

    const effectiveEnd = getEventEffectiveEnd(event);
    if (!effectiveEnd) {
        return true;
    }

    return effectiveEnd.getTime() + EMAIL_ATTENDEE_GRACE_PERIOD_MS >= now.getTime();
}
