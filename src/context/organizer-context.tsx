'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import api from '@/lib/api';
import { useAuth } from './auth-context';
import type { EventScope } from '@/types';

const STORAGE_KEY = 'halal-ticketin:last-organizer-id';

export interface OrganizerSummary {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    website: string | null;
    socialLinks: Record<string, string> | null;
    defaultTimezone?: string;
    defaultCurrency?: string;
    metaPixelId: string | null;
    role: string;
    status: string;
    membershipId: string;
    eventScope: EventScope;
}

interface OrganizerContextValue {
    organizers: OrganizerSummary[];
    isLoading: boolean;
    error: string | null;
    activeOrganizerId: string | null;
    setActiveOrganizerId: (organizerId: string | null, options?: { persist?: boolean }) => void;
    refresh: () => Promise<void>;
}

const OrganizerContext = createContext<OrganizerContextValue | undefined>(undefined);

const readStoredOrganizerId = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.localStorage.getItem(STORAGE_KEY);
};

const persistOrganizerId = (organizerId: string | null) => {
    if (typeof window === 'undefined') {
        return;
    }
    if (organizerId) {
        window.localStorage.setItem(STORAGE_KEY, organizerId);
    } else {
        window.localStorage.removeItem(STORAGE_KEY);
    }
};

export function OrganizerProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [organizers, setOrganizers] = useState<OrganizerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeOrganizerId, setActiveOrganizerIdState] = useState<string | null>(null);
    const activeIdRef = useRef<string | null>(null);

    const setActiveOrganizerId = useCallback(
        (organizerId: string | null, options: { persist?: boolean } = {}) => {
            activeIdRef.current = organizerId;
            setActiveOrganizerIdState(organizerId);
            if (options.persist !== false) {
                persistOrganizerId(organizerId);
            }
        },
        []
    );

    const selectDefaultOrganizerId = useCallback(
        (items: OrganizerSummary[]): string | null => {
            if (items.length === 0) {
                return null;
            }

            const preferred = activeIdRef.current;
            if (preferred && items.some((org) => org.id === preferred)) {
                return preferred;
            }

            const stored = readStoredOrganizerId();
            if (stored && items.some((org) => org.id === stored)) {
                return stored;
            }

            return items[0]?.id ?? null;
        },
        []
    );

    const fetchOrganizers = useCallback(async () => {
        if (!user) {
            setOrganizers([]);
            setActiveOrganizerId(null, { persist: false });
            activeIdRef.current = null;
            setError(null);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get<{ organizers: OrganizerSummary[] }>('/api/v1/organizers');
            setOrganizers(response.organizers);
            setError(null);

            const nextOrganizerId = selectDefaultOrganizerId(response.organizers);
            setActiveOrganizerId(nextOrganizerId ?? null);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to load organisers';
            setError(message);
            setOrganizers([]);
            setActiveOrganizerId(null, { persist: false });
        } finally {
            setIsLoading(false);
        }
    }, [user, selectDefaultOrganizerId, setActiveOrganizerId]);

    useEffect(() => {
        void fetchOrganizers();
    }, [fetchOrganizers]);

    const value = useMemo<OrganizerContextValue>(
        () => ({
            organizers,
            isLoading,
            error,
            activeOrganizerId,
            setActiveOrganizerId,
            refresh: fetchOrganizers,
        }),
        [organizers, isLoading, error, activeOrganizerId, setActiveOrganizerId, fetchOrganizers]
    );

    return <OrganizerContext.Provider value={value}>{children}</OrganizerContext.Provider>;
}

export function useOrganizers() {
    const context = useContext(OrganizerContext);
    if (!context) {
        throw new Error('useOrganizers must be used within an OrganizerProvider');
    }
    return context;
}
