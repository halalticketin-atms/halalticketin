'use client';

import { useCallback, useEffect, useState } from 'react';
import { EventRecord, listOrganizerEvents } from '@/lib/events-api';

export type DashboardEventStatus = 'draft' | 'ongoing' | 'upcoming' | 'past';

export interface DashboardEvent extends EventRecord {
    /** Computed status based on dates and published state */
    displayStatus: DashboardEventStatus;
}

/**
 * Classify an event's display status based on its publish status and dates.
 */
function classifyEventStatus(event: EventRecord): DashboardEventStatus {
    if (event.status === 'draft') {
        return 'draft';
    }

    // For published/archived/cancelled events, classify by date
    const now = new Date();
    const start = event.startDatetime ? new Date(event.startDatetime) : null;
    const end = event.endDatetime ? new Date(event.endDatetime) : null;

    // If we have both start and end, check if event is ongoing
    if (start && end && start <= now && now <= end) {
        return 'ongoing';
    }

    // If start is in the future, it's upcoming
    if (start && start > now) {
        return 'upcoming';
    }

    // Otherwise it's past (or dates are missing, treat as past)
    return 'past';
}

/**
 * Hook for fetching and managing organizer events.
 * Automatically classifies events into draft/ongoing/upcoming/past.
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
        ongoing: events.filter((e) => e.displayStatus === 'ongoing').length,
        upcoming: events.filter((e) => e.displayStatus === 'upcoming').length,
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
