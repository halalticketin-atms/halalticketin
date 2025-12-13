'use client';

import { useCallback, useEffect, useState } from 'react';
import { EventRecord, listOrganizerEvents } from '@/lib/events-api';

export type DashboardEventStatus = 'draft' | 'active' | 'past';

export interface DashboardEvent extends EventRecord {
    /** Computed status based on dates and published state */
    displayStatus: DashboardEventStatus;
}

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

    const fetchEvents = useCallback(async () => {
        if (!organizerId) {
            setEvents([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await listOrganizerEvents(organizerId);
            const classified = response.events.map((event) => ({
                ...event,
                displayStatus: classifyEventStatus(event),
            }));
            setEvents(classified);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load events';
            setError(message);
            setEvents([]);
        } finally {
            setIsLoading(false);
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
        refresh: fetchEvents,
        getByStatus,
        counts,
    };
}
