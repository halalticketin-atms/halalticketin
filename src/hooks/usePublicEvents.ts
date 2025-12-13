'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    fetchPublicEventBySlug,
    fetchPublicEvents,
    PublicEventRecord,
    PublicTicketRecord,
} from '@/lib/events-api';

/**
 * Hook for fetching public events list.
 */
export function usePublicEvents(options?: { limit?: number; organizerId?: string }) {
    const [events, setEvents] = useState<PublicEventRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchPublicEvents(options);
            setEvents(response.events);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load events';
            setError(message);
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, [options?.limit, options?.organizerId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return {
        events,
        isLoading,
        error,
        refresh: fetch,
    };
}

/**
 * Hook for fetching a single public event by slug.
 */
export function usePublicEvent(slug: string | null) {
    const [event, setEvent] = useState<PublicEventRecord | null>(null);
    const [tickets, setTickets] = useState<PublicTicketRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        if (!slug) {
            setEvent(null);
            setTickets([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchPublicEventBySlug(slug);
            setEvent(response.event);
            setTickets(response.tickets);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Event not found';
            setError(message);
            setEvent(null);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return {
        event,
        tickets,
        isLoading,
        error,
        refresh: fetch,
    };
}
