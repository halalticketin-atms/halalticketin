'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { getSupabase } from '@/lib/supabase';
import { API_SESSION_STORAGE_KEYS, getSupabaseStorageKey, needsSupabaseSession, subscribeSupabaseClient, retireSupabaseSession } from '@/lib/supabase-readiness';

import api, { ApiError, clearAuthSession, getAuthToken, getAuthSessionRevision, getAuthIdentityRevision, getAuthSessionOwner, subscribeAuthSession, setAuthToken } from '@/lib/api';
import { dataUrlToFile, uploadOrganizerAvatar } from '@/lib/upload-api';
import { ensureWebSession, isWebSessionSeedCurrent } from '@/lib/web-session-client';
import type { DashboardSessionSeed } from '@/lib/web-session-types';
import type { EventScope } from '@/types';

interface Membership {
    id: string;
    organizerId: string;
    role: string;
    status: string;
    eventScope: EventScope;
}

interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    gender: 'male' | 'female' | null;
    dateOfBirth: string | null;
    homeCountry: string | null;
    homeCity: string | null;
}

export interface ProfileResponse {
    user: UserProfile | null;
    memberships: Membership[];
    isOrganizer: boolean;
    needsOnboarding: boolean;
}

interface AuthContextValue {
    user: UserProfile | null;
    memberships: Membership[];
    isOrganizer: boolean;
    needsOnboarding: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    signOut: () => void;
    adoptSessionSeed: (seed: DashboardSessionSeed) => void;
    adoptedSeedNonce: string | null;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const PENDING_ORG_AVATAR_KEY = 'halal-ticketin:pending-organizer-avatar';

const loadSupabase = async () => {
    const { getSupabase } = await import('@/lib/supabase');
    return getSupabase();
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const revision = useSyncExternalStore(subscribeAuthSession, getAuthSessionRevision, () => 0);
    const profileIdentityRef = useRef<number | null>(null);
    const profileValueRef = useRef<ProfileResponse | null>(null);
    const profileRevisionRef = useRef<number | null>(null);
    const [adoptedSeedNonce, setAdoptedSeedNonce] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabaseRef = useRef<ReturnType<typeof getSupabase> | null>(null);
    const sdkTokenRef = useRef<string | null>(null);
    const authGenerationRef = useRef(0);
    const signingOutRef = useRef(false);
    const seededProfileRef = useRef<DashboardSessionSeed | null>(null);

    const adoptSessionSeed = useCallback((seed: DashboardSessionSeed) => {
        if (!isWebSessionSeedCurrent(seed.nonce)) return;
        seededProfileRef.current = seed;
        setAdoptedSeedNonce(seed.nonce);
        profileRevisionRef.current = getAuthSessionRevision();
        profileIdentityRef.current = getAuthIdentityRevision();
        profileValueRef.current = seed.profile;
        setProfile(seed.profile);
        setIsLoading(false);
        setError(null);
    }, []);

    const maybeUploadPendingOrganizerAvatar = useCallback(async () => {
        if (typeof window === 'undefined') {
            return;
        }

        const stored = window.localStorage.getItem(PENDING_ORG_AVATAR_KEY);
        if (!stored) {
            return;
        }

        let payload: { organizerId?: string; dataUrl?: string } | null = null;
        try {
            payload = JSON.parse(stored) as { organizerId?: string; dataUrl?: string };
        } catch (error) {
            console.warn('Failed to parse pending organizer avatar payload:', error);
            window.localStorage.removeItem(PENDING_ORG_AVATAR_KEY);
            return;
        }

        if (!payload?.organizerId || !payload?.dataUrl) {
            window.localStorage.removeItem(PENDING_ORG_AVATAR_KEY);
            return;
        }

        try {
            const file = await dataUrlToFile(payload.dataUrl, 'org-avatar.jpg');
            await uploadOrganizerAvatar(payload.organizerId, file);
            window.dispatchEvent(new CustomEvent('organizer-avatar-updated', { detail: { organizerId: payload.organizerId } }));
        } catch (error) {
            console.warn('Pending organizer avatar upload failed:', error);
        } finally {
            window.localStorage.removeItem(PENDING_ORG_AVATAR_KEY);
        }
    }, []);

    const loadProfile = useCallback(async (allowSeed = false) => {
        const generation = authGenerationRef.current;
        let revision: number;
        let token: string | null;
        let owner: ReturnType<typeof getAuthSessionOwner>;
        try {
            owner = getAuthSessionOwner();
            token = owner.token;
            revision = owner.revision;
        } catch (err) {
            setProfile(null);
            setError(err instanceof Error ? err.message : 'Unable to read session');
            setIsLoading(false);
            return;
        }

        if (!token) {
            setProfile(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        void ensureWebSession();
        const seed = seededProfileRef.current;
        seededProfileRef.current = null;
        if (allowSeed && seed && isWebSessionSeedCurrent(seed.nonce)) {
            profileRevisionRef.current = revision;
            profileIdentityRef.current = getAuthIdentityRevision();
            profileValueRef.current = seed.profile;
            setProfile(seed.profile);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.get<ProfileResponse>('/api/v1/auth/me');
            if (generation !== authGenerationRef.current || revision !== getAuthSessionRevision() || !getAuthToken()) return;
            profileRevisionRef.current = revision;
            profileIdentityRef.current = getAuthIdentityRevision();
            profileValueRef.current = response;
            setProfile(response);
            setError(null);
            void maybeUploadPendingOrganizerAvatar();
        } catch (err) {
            if (generation !== authGenerationRef.current || revision !== getAuthSessionRevision()) return;
            const message = err instanceof Error ? err.message : 'Unable to load profile';
            if (err instanceof ApiError && err.status === 401) {
                if (!clearAuthSession(owner)) return;
                setProfile(null);
            } else setError(message);
        } finally {
            if (generation === authGenerationRef.current && revision === getAuthSessionRevision()) setIsLoading(false);
        }
    }, [maybeUploadPendingOrganizerAvatar]);

    const profileRequestRef = useRef<{ revision: number; promise: Promise<void> } | null>(null);
    const fetchProfile = useCallback((allowSeed = false) => {
        let revision: number;
        try { revision = getAuthSessionRevision(); } catch { return loadProfile(allowSeed); }
        if (profileRequestRef.current?.revision === revision) return profileRequestRef.current.promise;
        const promise = loadProfile(allowSeed);
        profileRequestRef.current = { revision, promise };
        void promise.finally(() => { if (profileRequestRef.current?.promise === promise) profileRequestRef.current = null; });
        return promise;
    }, [loadProfile]);

    useEffect(() => {
        let disposed = false;
        let unsubscribe: (() => void) | undefined;
        let initializing = false;
        let readingInitialSession = true;
        const tokenSubject = (token: string): string | null => {
            try {
                const payload = JSON.parse(atob(token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))) as { sub?: unknown };
                return typeof payload.sub === 'string' ? payload.sub : null;
            } catch { return null; }
        };
        const canAdoptSdkSession = (session: { access_token: string; user?: { id: string } }, owner: ReturnType<typeof getAuthSessionOwner>) => {
            const sharedToken = owner.token;
            if (sharedToken === session.access_token) return true;
            if (owner.retired) return false;
            if (!sharedToken) return true;
            // This hint only chooses same-user recovery. The backend verifies all profile data.
            const userId = profileValueRef.current?.user?.id ?? tokenSubject(sharedToken);
            return Boolean(userId && session.user?.id === userId);
        };
        const stopSessionListening = subscribeAuthSession(() => {
            seededProfileRef.current = null;
            setAdoptedSeedNonce(null);
            if (!getAuthToken()) retireSupabaseSession();
            if (getAuthToken() && profileIdentityRef.current === getAuthIdentityRevision()) {
                profileRevisionRef.current = getAuthSessionRevision();
            } else {
                profileValueRef.current = null;
                setProfile(null);
            }
            setError(null);
            setIsLoading(Boolean(getAuthToken()));
            if (getAuthToken() && !readingInitialSession) void fetchProfile(true);
        });

        const initializeSession = async (ready?: ReturnType<typeof getSupabase>) => {
            if (disposed || initializing) return;
            initializing = true;
            readingInitialSession = true;
            const initialGeneration = authGenerationRef.current;
            let initialToken: string | null = null;
            let initialRevision: number | null = null;
            try {
                const owner = getAuthSessionOwner();
                initialToken = owner.token;
                initialRevision = owner.revision;
            } catch { /* Existing fallback handles blocked storage. */ }
            const startedDuringSignOut = signingOutRef.current;
            try {
                const supabase = ready ?? await loadSupabase();
                if (disposed) return;
                supabaseRef.current = supabase;

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    // Initial session reading owns the first profile load.
                    if (disposed || event === 'INITIAL_SESSION') return;

                    if (event === 'SIGNED_OUT') {
                        const owner = getAuthSessionOwner();
                        if (owner.token && (!sdkTokenRef.current || owner.token !== sdkTokenRef.current)) return;
                        if (!owner.token && owner.retired) return;
                        if (!clearAuthSession(owner)) return;
                        authGenerationRef.current += 1;
                        setProfile(null);
                        setError(null);
                        setIsLoading(false);
                        return;
                    }

                    // A delayed SDK recovery must not undo an explicit sign-out.
                    if (signingOutRef.current || (readingInitialSession && (startedDuringSignOut || initialGeneration !== authGenerationRef.current))) return;

                    if (session?.access_token) {
                        const owner = getAuthSessionOwner();
                        if (!canAdoptSdkSession(session, owner)) return;
                        const preserveIdentity = Boolean(
                            session.user?.id && session.user.id === profileValueRef.current?.user?.id
                        );
                        if (!setAuthToken(session.access_token, {
                            preserveIdentity, expectedSession: owner, refreshToken: session.refresh_token ?? null,
                        })) return;
                        sdkTokenRef.current = session.access_token;
                        if (!readingInitialSession) await fetchProfile(true);
                    }
                });
                unsubscribe = () => subscription.unsubscribe();

                const { data: { session } } = await supabase.auth.getSession();
                if (disposed) return;

                const owner = getAuthSessionOwner();
                if (!startedDuringSignOut && !signingOutRef.current && initialGeneration === authGenerationRef.current && session?.access_token && canAdoptSdkSession(session, owner) && (!owner.token || owner.token === initialToken || owner.token === session.access_token)) {
                    const accepted = setAuthToken(session.access_token, { preserveIdentity: Boolean(
                        session.user?.id && session.user.id === profileValueRef.current?.user?.id
                    ), expectedSession: owner, refreshToken: session.refresh_token ?? null });
                    if (accepted) sdkTokenRef.current = session.access_token;
                }
            } catch (err) {
                console.error('Failed to read Supabase session:', err);
                if (!supabaseRef.current) initializing = false;
            }

            if (disposed) return;
            readingInitialSession = false;
            if (startedDuringSignOut || signingOutRef.current || initialGeneration !== authGenerationRef.current) return;
            let profileIsCurrent = false;
            try {
                profileIsCurrent = initialToken === getAuthToken() && initialRevision === getAuthSessionRevision()
                    && profileRevisionRef.current === initialRevision && Boolean(profileValueRef.current) && !seededProfileRef.current;
            } catch { /* The profile loader reports unreadable credentials below. */ }
            if (profileIsCurrent) {
                await profileRequestRef.current?.promise;
                return;
            }
            await fetchProfile(true);
        };

        // Replay covers a child effect that creates the client before this effect runs.
        const stopListening = subscribeSupabaseClient(client => { void initializeSession(client); });
        const wakeSession = (event: StorageEvent) => {
            if (event.storageArea && event.storageArea !== window.localStorage) return;
            if (event.newValue === null && (event.key === API_SESSION_STORAGE_KEYS[0] || event.key === null)) {
                const owner = getAuthSessionOwner();
                if (owner.token) {
                    if (!readingInitialSession) void fetchProfile(true);
                    return;
                }
                if (!clearAuthSession(owner)) return;
                authGenerationRef.current += 1;
                setProfile(null);
                setError(null);
                setIsLoading(false);
                return;
            }
            if (!event.newValue) return;
            if (API_SESSION_STORAGE_KEYS.some(key => key === event.key)) {
                getAuthToken();
                if (!readingInitialSession) void fetchProfile(true);
                return;
            }
            if (initializing) return;
            let supabaseKey: string | undefined;
            try { supabaseKey = getSupabaseStorageKey(); } catch { /* Initialise conservatively below. */ }
            if (event.key === null || event.key === supabaseKey) {
                void initializeSession();
            }
        };
        window.addEventListener('storage', wakeSession);
        let needsSession = needsSupabaseSession();
        if (!needsSession) {
            try { getAuthToken(); } catch { needsSession = true; }
        }
        if (needsSession) void initializeSession();
        else if (!initializing) {
            readingInitialSession = false;
            if (getAuthToken()) {
                // Let child effects publish their verified seed before it is consumed.
                void Promise.resolve().then(() => { if (!disposed && !initializing) return fetchProfile(true); });
            } else {
                setProfile(null);
                setError(null);
                setIsLoading(false);
            }
        }

        return () => {
            disposed = true;
            stopListening();
            stopSessionListening();
            window.removeEventListener('storage', wakeSession);
            unsubscribe?.();
        };
    }, [fetchProfile]);

    const signOut = useCallback(() => {
        authGenerationRef.current += 1;
        signingOutRef.current = true;
        const token = getAuthToken();
        const signOutSession = async () => {
            try {
                if (!token) return;
                const supabase = supabaseRef.current ?? await loadSupabase();
                const { error } = await supabase.auth.admin.signOut(token, 'global');
                if (error) console.error('Unable to revoke the remote session:', error.message);
            } catch (err) {
                console.error('Failed to sign out of Supabase:', err);
            } finally {
                signingOutRef.current = false;
            }
        };
        void signOutSession();
        clearAuthSession();
        setProfile(null);
        setError(null);
        setIsLoading(false);
    }, []);

    const visibleProfile = profileRevisionRef.current === revision || profileIdentityRef.current === getAuthIdentityRevision() ? profile : null;
    const value = useMemo<AuthContextValue>(
        () => ({
            user: visibleProfile?.user ?? null,
            memberships: visibleProfile?.memberships ?? [],
            isOrganizer: visibleProfile?.isOrganizer ?? false,
            needsOnboarding: visibleProfile?.needsOnboarding ?? false,
            isLoading,
            error,
            refresh: fetchProfile,
            signOut,
            adoptSessionSeed,
            adoptedSeedNonce,
        }),
        [adoptSessionSeed, adoptedSeedNonce, error, fetchProfile, isLoading, visibleProfile, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOptionalAuth() {
    return useContext(AuthContext) ?? null;
}

export function useAuth() {
    const context = useOptionalAuth();
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
