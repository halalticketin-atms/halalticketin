'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import api, { ApiError, getAuthSessionRevision, getAuthIdentityRevision, subscribeAuthSession } from '@/lib/api';
import { useDashboardSessionSeed } from './dashboard-session-seed';
import { useAuth } from './auth-context';
import type { EventScope } from '@/types';

const STORAGE_KEY = 'halal-ticketin:last-organizer-id';

export interface OrganizerSummary {
    id: string;
    name: string;
    avatarUrl: string | null;
    bio: string | null;
    website: string | null;
    replyToEmail: string | null;
    socialLinks: Record<string, string> | null;
    city: string | null;
    country: string | null;
    defaultTimezone?: string;
    defaultCurrency?: string;
    metaPixelId: string | null;
    metaCapiTokenLast4?: string | null;
    feeTier: 'payg' | 'token' | 'charity';
    charityNumber: string | null;
    isCharityVerified: boolean;
    sendFollowerEventNotifications: boolean;
    role: string;
    status: string;
    membershipId: string;
    eventScope: EventScope;
}

interface OrganizerContextValue {
    organizers: OrganizerSummary[];
    activeOrganizers: OrganizerSummary[];
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
    const { user, signOut } = useAuth();
    const seed = useDashboardSessionSeed();
    const revision = useSyncExternalStore(subscribeAuthSession, getAuthIdentityRevision, () => 0);
    const identity = `${user?.id ?? ''}:${revision}`;
    const seedMatches = Boolean(seed && seed.profile.user?.id === user?.id);
    const [organizers, setOrganizers] = useState<OrganizerSummary[]>(seedMatches ? seed!.organizers : []);
    const ownerRef = useRef(identity);
    const [owner, setOwner] = useState(identity);
    const [isLoading, setIsLoading] = useState(!seedMatches);
    const [error, setError] = useState<string | null>(null);
    const [activeOrganizerId, setActiveOrganizerIdState] = useState<string | null>(seedMatches ? seed!.organizers[0]?.id ?? null : null);
    const activeIdRef = useRef<string | null>(null);
    const lastFetchedAtRef = useRef<number | null>(null);
    const cooldownUntilRef = useRef<number | null>(null);
    const consumedSeedRef = useRef<string | null>(null);
    const inFlightRevisionRef = useRef<number | null>(null);
    const inFlightRef = useRef<Promise<void> | null>(null);

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

    const resetOwner = useCallback(() => {
        if (ownerRef.current === identity) return;
        ownerRef.current = identity;
        activeIdRef.current = null;
        lastFetchedAtRef.current = null;
        cooldownUntilRef.current = null;
        inFlightRef.current = null;
        setOwner(identity);
        setOrganizers([]);
        setActiveOrganizerId(null, { persist: false });
        setError(null);
    }, [identity, setActiveOrganizerId]);

    const fetchOrganizers = useCallback(async (options?: { force?: boolean }) => {
        resetOwner();
        const requestRevision = getAuthSessionRevision();
        if (inFlightRef.current && inFlightRevisionRef.current !== requestRevision) {
            inFlightRef.current = null;
            setIsLoading(false);
        }
        const isCurrent = () => requestRevision === getAuthSessionRevision() && ownerRef.current === identity;
        if (!user) {
            setOrganizers([]);
            setActiveOrganizerId(null, { persist: false });
            activeIdRef.current = null;
            lastFetchedAtRef.current = null;
            cooldownUntilRef.current = null;
            setError(null);
            setIsLoading(false);
            return;
        }

        const seedKey = seed ? `${identity}:${seed.nonce}` : null;
        if (!options?.force && seedMatches && seed && consumedSeedRef.current !== seedKey) {
            consumedSeedRef.current = seedKey;
            setOrganizers(seed.organizers);
            setActiveOrganizerId(selectDefaultOrganizerId(seed.organizers));
            setError(null);
            setIsLoading(false);
            return;
        }
        const now = Date.now();
        if (!options?.force) {
            if (cooldownUntilRef.current && now < cooldownUntilRef.current) {
                return;
            }
            if (lastFetchedAtRef.current && now - lastFetchedAtRef.current < 10_000) {
                return;
            }
        }

        if (inFlightRef.current) {
            return inFlightRef.current;
        }

        const run = (async () => {
            setIsLoading(true);
            try {
                const response = await api.get<{ organizers: OrganizerSummary[] }>('/api/v1/organizers');
                if (!isCurrent()) return;
                setOrganizers(response.organizers);
                setError(null);

                const nextOrganizerId = selectDefaultOrganizerId(response.organizers);
                setActiveOrganizerId(nextOrganizerId ?? null);
            } catch (err) {
                if (!isCurrent()) return;
                if (err instanceof ApiError && err.status === 401) {
                    signOut();
                    setError(null);
                    setOrganizers([]);
                    setActiveOrganizerId(null, { persist: false });
                    return;
                }
                if (err instanceof ApiError && err.status === 429) {
                    const payload = err.payload as { retryAfter?: number } | null;
                    const retryAfter = typeof payload?.retryAfter === 'number' ? payload.retryAfter : null;
                    if (retryAfter) {
                        cooldownUntilRef.current = Date.now() + retryAfter * 1000;
                    }
                }
                const message = err instanceof Error ? err.message : 'Unable to load organisers';
                setError(message);
                setOrganizers([]);
                setActiveOrganizerId(null, { persist: false });
            } finally {
                if (isCurrent()) {
                    lastFetchedAtRef.current = Date.now();
                    setIsLoading(false);
                }
            }
        })();

        inFlightRevisionRef.current = requestRevision;
        inFlightRef.current = run;
        try {
            await run;
        } finally {
            if (inFlightRef.current === run) inFlightRef.current = null;
        }
    }, [identity, resetOwner, seed, seedMatches, user, selectDefaultOrganizerId, setActiveOrganizerId, signOut]);

    useEffect(() => {
        void fetchOrganizers();
    }, [fetchOrganizers]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleAvatarUpdate = () => {
            void fetchOrganizers({ force: true });
        };

        window.addEventListener('organizer-avatar-updated', handleAvatarUpdate);
        return () => {
            window.removeEventListener('organizer-avatar-updated', handleAvatarUpdate);
        };
    }, [fetchOrganizers]);

    const visibleOrganizers = useMemo(() => owner === identity ? organizers : (seedMatches ? seed!.organizers : []), [owner, identity, organizers, seedMatches, seed]);
    const activeOrganizers = useMemo(
        () => visibleOrganizers.filter(org => org.status === 'active'),
        [visibleOrganizers]
    );

    const refresh = useCallback(() => fetchOrganizers({ force: true }), [fetchOrganizers]);

    const value = useMemo<OrganizerContextValue>(
        () => ({
            organizers: visibleOrganizers,
            activeOrganizers,
            isLoading: owner === identity ? isLoading : Boolean(user && !seedMatches),
            error: owner === identity ? error : null,
            activeOrganizerId: owner === identity ? activeOrganizerId : null,
            setActiveOrganizerId,
            refresh,
        }),
        [visibleOrganizers, activeOrganizers, isLoading, error, activeOrganizerId, setActiveOrganizerId, refresh, owner, identity, user, seedMatches]
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
