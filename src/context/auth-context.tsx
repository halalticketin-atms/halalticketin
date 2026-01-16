'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import api, { ApiError, clearAuthSession, getAuthToken, setAuthToken, setRefreshToken } from '@/lib/api';
import { dataUrlToFile, uploadOrganizerAvatar } from '@/lib/upload-api';
import { getSupabase } from '@/lib/supabase';
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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const PENDING_ORG_AVATAR_KEY = 'halal-ticketin:pending-organizer-avatar';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const fetchProfile = useCallback(async () => {
        const token = getAuthToken();

        if (!token) {
            setProfile(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get<ProfileResponse>('/api/v1/auth/me');
            setProfile(response);
            setError(null);
            void maybeUploadPendingOrganizerAvatar();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to load profile';
            setError(message);

            if (err instanceof ApiError && err.status === 401) {
                clearAuthSession();
                setProfile(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [maybeUploadPendingOrganizerAvatar]);

    useEffect(() => {
        const supabase = getSupabase();

        const initializeSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.access_token) {
                    setAuthToken(session.access_token);
                    setRefreshToken(session.refresh_token ?? null);
                }
            } catch (err) {
                console.error('Failed to read Supabase session:', err);
            }

            await fetchProfile();
        };

        initializeSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                clearAuthSession();
                setProfile(null);
                setError(null);
                setIsLoading(false);
                return;
            }

            if (session?.access_token) {
                setAuthToken(session.access_token);
                setRefreshToken(session.refresh_token ?? null);
                await fetchProfile();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signOut = useCallback(() => {
        void getSupabase().auth.signOut();
        clearAuthSession();
        setProfile(null);
        setError(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user: profile?.user ?? null,
            memberships: profile?.memberships ?? [],
            isOrganizer: profile?.isOrganizer ?? false,
            needsOnboarding: profile?.needsOnboarding ?? false,
            isLoading,
            error,
            refresh: fetchProfile,
            signOut,
        }),
        [error, fetchProfile, isLoading, profile, signOut]
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
