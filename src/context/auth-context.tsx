'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import api, { ApiError, clearAuthToken, getAuthToken } from '@/lib/api';

interface Membership {
    id: string;
    organizerId: string;
    role: string;
    status: string;
}

interface UserProfile {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
}

export interface ProfileResponse {
    user: UserProfile | null;
    memberships: Membership[];
    isOrganizer: boolean;
}

interface AuthContextValue {
    user: UserProfile | null;
    memberships: Membership[];
    isOrganizer: boolean;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<ProfileResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to load profile';
            setError(message);

            if (err instanceof ApiError && err.status === 401) {
                clearAuthToken();
                setProfile(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const signOut = useCallback(() => {
        clearAuthToken();
        setProfile(null);
        setError(null);
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user: profile?.user ?? null,
            memberships: profile?.memberships ?? [],
            isOrganizer: profile?.isOrganizer ?? false,
            isLoading,
            error,
            refresh: fetchProfile,
            signOut,
        }),
        [error, fetchProfile, isLoading, profile, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
