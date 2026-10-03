'use client';

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react';
import { AuthContext, useAuth } from './auth-context';
import { isWebSessionSeedCurrent, subscribeWebSession } from '@/lib/web-session-client';
import { subscribeAuthSession } from '@/lib/api';
import type { DashboardSessionSeed } from '@/lib/web-session-types';

const SeedContext = createContext<DashboardSessionSeed | null>(null);
const subscribe = (listener: () => void) => {
    const stopAuth = subscribeAuthSession(listener);
    const stopWeb = subscribeWebSession(listener);
    return () => { stopAuth(); stopWeb(); };
};

export function DashboardSessionSeedProvider({ seed, children }: { seed: DashboardSessionSeed | null; children: React.ReactNode }) {
    const auth = useAuth();
    const adoptSessionSeed = auth.adoptSessionSeed;
    const rejected = useRef(new WeakSet<DashboardSessionSeed>());
    const previous = useRef(seed);
    const getCurrent = () => {
        if (!seed || rejected.current.has(seed)) return null;
        if (!isWebSessionSeedCurrent(seed.nonce) || (auth.user && auth.user.id !== seed.profile.user?.id)) {
            rejected.current.add(seed);
            return null;
        }
        return seed;
    };
    const current = useSyncExternalStore(subscribe, getCurrent, () => seed);
    useEffect(() => {
        if (previous.current && previous.current !== seed) rejected.current.add(previous.current);
        previous.current = seed;
        if (current) adoptSessionSeed(current);
    }, [adoptSessionSeed, current, seed]);
    // The root retains SDK ownership. Only the private subtree gets the verified first render.
    const view = current && auth.adoptedSeedNonce !== current.nonce ? {
        ...auth,
        user: current.profile.user,
        memberships: current.profile.memberships,
        isOrganizer: current.profile.isOrganizer,
        needsOnboarding: current.profile.needsOnboarding,
        isLoading: false,
        error: null,
    } : auth;
    return <SeedContext.Provider value={current}><AuthContext.Provider value={view}>{children}</AuthContext.Provider></SeedContext.Provider>;
}

export const useDashboardSessionSeed = () => useContext(SeedContext);
