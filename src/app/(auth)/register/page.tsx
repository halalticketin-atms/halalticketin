'use client';

import { Suspense, useState, useEffect, useRef, useEffectEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth-context';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

// Lazy load the dialog to reduce initial bundle size
const SignupOnboardingDialog = dynamic(
    () => import('@/components/auth/SignupOnboardingDialog').then(m => ({ default: m.SignupOnboardingDialog })),
    { ssr: false }
);

function RegisterPageContent() {
    const [dialogOpen, setDialogOpen] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [inviteEmail, setInviteEmail] = useState<string | undefined>(undefined);
    const isCompletingRef = useRef(false);
    const userClosedRef = useRef(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading, needsOnboarding } = useAuth();
    const isAuthenticatedOnboarding = Boolean(user && needsOnboarding);
    const [prefill, setPrefill] = useState<{ email?: string; name?: string } | null>(null);

    // Get params from URL
    const roleParam = searchParams.get('role');
    const defaultRole = roleParam === 'organizer'
        ? 'organizer'
        : (roleParam === 'buyer' ? 'buyer' : undefined);
    const nextParam = searchParams.get('next');
    const safeNextParam = nextParam && nextParam.startsWith('/') ? nextParam : null;
    const redirectPath = safeNextParam ?? '/dashboard';
    const inviteToken = searchParams.get('inviteToken');

    const markInitialLoadComplete = useEffectEvent(() => {
        setInitialLoadComplete(true);
    });

    // Mark initial load as complete once auth state is first resolved
    useEffect(() => {
        if (!isLoading) {
            markInitialLoadComplete();
        }
    }, [isLoading]);

    // Fetch invite email if token is present
    const [inviteEmailLoading, setInviteEmailLoading] = useState(Boolean(inviteToken));

    useEffect(() => {
        if (!inviteToken) return;

        const fetchEmail = async () => {
            try {
                const { fetchInvitationInfo } = await import('@/lib/organizers-api');
                const info = await fetchInvitationInfo(inviteToken);
                setInviteEmail(info.email);
            } catch (err) {
                console.warn('Could not fetch invite info:', err);
            } finally {
                setInviteEmailLoading(false);
            }
        };
        void fetchEmail();
    }, [inviteToken]);

    // If already logged in AND not in the middle of onboarding, redirect to dashboard
    // Only check this on initial load, not during the signup flow
    useEffect(() => {
        if (initialLoadComplete && user && !dialogOpen && !isCompletingRef.current && !userClosedRef.current) {
            router.push(redirectPath);
        }
    }, [user, initialLoadComplete, router, dialogOpen, redirectPath]);

    const handleDialogClose = (open: boolean) => {
        if (!open && isAuthenticatedOnboarding) {
            setDialogOpen(true);
            return;
        }

        setDialogOpen(open);
        if (!open && !isCompletingRef.current) {
            // Mark that user manually closed, then redirect to home
            userClosedRef.current = true;
            router.replace('/');
        }
    };

    const handleComplete = (redirectTo: string) => {
        isCompletingRef.current = true;
        router.push(redirectTo);
    };

    useEffect(() => {
        if (!isAuthenticatedOnboarding) {
            return;
        }

        const loadPrefill = async () => {
            try {
                const supabase = getSupabase();
                const { data } = await supabase.auth.getUser();
                const supabaseUser = data.user;
                const metadata = (supabaseUser?.user_metadata ?? {}) as Record<string, unknown>;
                const metadataName = [metadata.given_name, metadata.family_name]
                    .filter((value) => typeof value === 'string' && value.trim().length > 0)
                    .join(' ');
                const resolvedName = (user?.name ?? '').trim()
                    || (typeof metadata.full_name === 'string' && metadata.full_name.trim() ? metadata.full_name.trim() : '')
                    || (typeof metadata.name === 'string' && metadata.name.trim() ? metadata.name.trim() : '')
                    || metadataName;
                const resolvedEmail = (user?.email ?? '').trim() || (supabaseUser?.email ?? '').trim();

                setPrefill({
                    email: resolvedEmail || undefined,
                    name: resolvedName || undefined,
                });
            } catch (err) {
                console.warn('Unable to prefill Google account data:', err);
            }
        };

        void loadPrefill();
    }, [isAuthenticatedOnboarding, user]);

    // Show loading spinner while fetching initial data
    if (!initialLoadComplete || inviteEmailLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-cyan)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-purple-50">
            <AmbientBackground showNoise={false} />
            <SignupOnboardingDialog
                open={dialogOpen}
                onOpenChange={handleDialogClose}
                onComplete={handleComplete}
                defaultRole={defaultRole}
                redirectAfterComplete={safeNextParam ?? undefined}
                inviteEmail={inviteEmail}
                authMode={isAuthenticatedOnboarding ? 'existing' : undefined}
                prefill={prefill ?? undefined}
            />
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-cyan)]" />
            </div>
        }>
            <RegisterPageContent />
        </Suspense>
    );
}
