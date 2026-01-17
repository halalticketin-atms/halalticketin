'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    fetchPublicEventBySlug,
    fetchPublicEvents,
    PublicEventRecord,
    PublicTicketRecord,
} from '@/lib/events-api';
import { ApiError } from '@/lib/api';
import { getBackendErrorMessage, parseBackendError } from '@/lib/api-errors';

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
export function usePublicEvent(slug: string | null, options?: { preview?: boolean }) {
    const [event, setEvent] = useState<PublicEventRecord | null>(null);
    const [tickets, setTickets] = useState<PublicTicketRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] = useState<'required' | 'denied' | null>(null);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    const preview = options?.preview ?? false;

    const fetch = useCallback(async () => {
        if (!slug) {
            setEvent(null);
            setTickets([]);
            setAccessStatus(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetchPublicEventBySlug(slug, {
                accessCode: accessCode ?? undefined,
                preview,
            });
            setEvent(response.event);
            setTickets(response.tickets);
            setAccessStatus(null);
        } catch (err) {
            let message = err instanceof Error ? err.message : 'Event not found';
            let nextAccessStatus: 'required' | 'denied' | null = null;
            if (err instanceof ApiError) {
                const parsed = parseBackendError(err.payload);
                message = getBackendErrorMessage(err.payload, message);
                if (parsed?.code === 'EVENT_ACCESS_REQUIRED') {
                    nextAccessStatus = 'required';
                }
                if (parsed?.code === 'EVENT_ACCESS_DENIED') {
                    nextAccessStatus = 'denied';
                }
            }
            setError(message);
            setAccessStatus(nextAccessStatus);
            setEvent(null);
            setTickets([]);
        } finally {
            setIsLoading(false);
        }
    }, [accessCode, preview, slug]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    return {
        event,
        tickets,
        isLoading,
        error,
        accessStatus,
        accessCode,
        setAccessCode,
        refresh: fetch,
    };
}
