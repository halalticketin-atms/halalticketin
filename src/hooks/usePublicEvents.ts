'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    fetchPublicEventBySlug,
    fetchPublicEvents,
    PublicEventRecord,
    PublicTicketRecord,
} from '@/lib/events-api';
import { ApiError } from '@/lib/api';
import { getBackendErrorMessage, parseBackendError } from '@/lib/api-errors';
import type { PublicEventData } from '@/lib/public-event-server';
import type { PublicEventsSnapshot } from '@/lib/public-events-data';

/**
 * Hook for fetching public events list with pagination support.
 */
export function usePublicEvents(options?: { limit?: number; organizerId?: string; initialData?: PublicEventsSnapshot | null }) {
    const initialData = options?.initialData;
    const [events, setEvents] = useState<PublicEventRecord[]>(initialData?.events ?? []);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(Boolean(initialData));
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(initialData?.hasMore ?? false);
    const [offset, setOffset] = useState(initialData?.events.length ?? 0);
    const { limit = 12, organizerId } = options ?? {};

    const fetchPage = useCallback(async (pageOffset: number, append: boolean = false, background: boolean = false) => {
        if (append) {
            setIsLoadingMore(true);
        } else if (!background) {
            setIsLoading(true);
        }
        if (background) setIsRefreshing(true);
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
            if (background) setIsRefreshing(false);
        }
    }, [limit, organizerId]);

    const loadMore = useCallback(() => {
        if (!isLoadingMore && !isRefreshing && hasMore) {
            fetchPage(offset, true);
        }
    }, [fetchPage, offset, isLoadingMore, isRefreshing, hasMore]);

    const refresh = useCallback(() => {
        setOffset(0);
        fetchPage(0, false);
    }, [fetchPage]);

    useEffect(() => {
        fetchPage(0, false, Boolean(initialData));
    }, [fetchPage, initialData]);

    return {
        events,
        isLoading,
        isLoadingMore,
        isRefreshing,
        error,
        hasMore,
        loadMore,
        refresh,
    };
}

/**
 * Hook for fetching a single public event by slug.
 */
export function usePublicEvent(slug: string | null, options?: { preview?: boolean; initialData?: PublicEventData | null }) {
    const initialData = options?.preview ? null : options?.initialData;
    const [event, setEvent] = useState<PublicEventRecord | null>(initialData?.event ?? null);
    const [tickets, setTickets] = useState<PublicTicketRecord[]>(initialData?.tickets ?? []);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isValidated, setIsValidated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accessStatus, setAccessStatus] = useState<'required' | 'denied' | null>(null);
    const [accessCode, setAccessCode] = useState<string | null>(null);
    const preview = options?.preview ?? false;
    const requestVersion = useRef(0);
    const hasInitialData = Boolean(initialData);

    const fetch = useCallback(async () => {
        const version = ++requestVersion.current;
        if (!slug) {
            setEvent(null);
            setTickets([]);
            setAccessStatus(null);
            setError(null);
            setIsLoading(false);
            setIsValidated(false);
            return;
        }

        setIsLoading(!hasInitialData || Boolean(accessCode));
        setIsValidated(false);
        setError(null);

        try {
            const response = await fetchPublicEventBySlug(slug, {
                accessCode: accessCode ?? undefined,
                preview,
            });
            if (version !== requestVersion.current) return;
            setEvent(response.event);
            setTickets(response.tickets);
            setAccessStatus(null);
            setIsValidated(true);
        } catch (err) {
            if (version !== requestVersion.current) return;
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
            if (version === requestVersion.current) setIsLoading(false);
        }
    }, [accessCode, hasInitialData, preview, slug]);

    useEffect(() => {
        fetch();
        return () => {
            requestVersion.current += 1;
        };
    }, [fetch]);

    return {
        event,
        tickets,
        isLoading,
        error,
        accessStatus,
        isValidated,
        accessCode,
        setAccessCode,
        refresh: fetch,
    };
}
