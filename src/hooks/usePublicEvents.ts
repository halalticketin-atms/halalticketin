'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    fetchPublicEventBySlug,
    fetchPublicEvents,
    PublicEventRecord,
    PublicTicketRecord,
} from '@/lib/events-api';

/**
 * Hook for fetching public events list with pagination support.
 */
export function usePublicEvents(options?: { limit?: number; organizerId?: string }) {
    const [events, setEvents] = useState<PublicEventRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const { limit = 12, organizerId } = options ?? {};

    const fetchPage = useCallback(async (pageOffset: number, append: boolean = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const response = await fetchPublicEvents({ limit, offset: pageOffset, organizerId });

            if (append) {
                setEvents(prev => [...prev, ...response.events]);
            } else {
                setEvents(response.events);
            }

            setHasMore(response.hasMore);
            setOffset(pageOffset + response.events.length);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load events';
            setError(message);
            if (!append) {
                setEvents([]);
            }
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [limit, organizerId]);

    const loadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            fetchPage(offset, true);
        }
    }, [fetchPage, offset, isLoadingMore, hasMore]);

    const refresh = useCallback(() => {
        setOffset(0);
        fetchPage(0, false);
    }, [fetchPage]);

    useEffect(() => {
        fetchPage(0, false);
    }, [fetchPage]);

    return {
        events,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
        loadMore,
        refresh,
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
