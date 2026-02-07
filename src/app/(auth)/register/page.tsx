'use client';

import { Suspense, useState, useEffect, useRef, useEffectEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth-context';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import {
    clearPendingInviteContext,
    getDefaultInviteNextPath,
    getPendingInviteContext,
    resolveContinuationPath,
    savePendingInviteContext,
} from '@/lib/pending-invite';

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
    const [pendingInvite, setPendingInvite] = useState(() => getPendingInviteContext());

    // Get params from URL
    const roleParam = searchParams.get('role');
    const defaultRole = roleParam === 'organizer'
        ? 'organizer'
        : (roleParam === 'buyer' ? 'buyer' : undefined);
    const queryInviteToken = searchParams.get('inviteToken');
    const nextParam = searchParams.get('next');
    const inviteToken = queryInviteToken ?? pendingInvite?.token ?? null;
    const safeNextParam = nextParam && nextParam.startsWith('/') ? nextParam : null;
    const inviteDefaultNextPath = getDefaultInviteNextPath(inviteToken);
    const pendingNextPath = queryInviteToken && pendingInvite?.token !== queryInviteToken
        ? null
        : (pendingInvite?.nextPath ?? null);
    const continuationPath = resolveContinuationPath(safeNextParam, {
        token: inviteToken ?? '',
        invitedEmail: pendingInvite?.invitedEmail,
        nextPath: pendingNextPath ?? inviteDefaultNextPath,
        createdAt: pendingInvite?.createdAt ?? Date.now(),
    });
    const redirectPath = continuationPath ?? '/dashboard';

    const markInitialLoadComplete = useEffectEvent(() => {
        setInitialLoadComplete(true);
    });

    useEffect(() => {
        setPendingInvite(getPendingInviteContext());
    }, []);

    // Mark initial load as complete once auth state is first resolved
    useEffect(() => {
        if (!isLoading) {
            markInitialLoadComplete();
        }
    }, [isLoading]);

    // Fetch invite email if token is present
    const [inviteEmailLoading, setInviteEmailLoading] = useState(false);
    const [inviteTokenError, setInviteTokenError] = useState<string | null>(null);

    useEffect(() => {
        if (!inviteToken) {
            setInviteEmailLoading(false);
            setInviteTokenError(null);
            return;
        }

        const fetchEmail = async () => {
            setInviteEmailLoading(true);
            try {
                const { fetchInvitationInfo } = await import('@/lib/organizers-api');
                const info = await fetchInvitationInfo(inviteToken);
                setInviteEmail(info.email);
                setInviteTokenError(null);
                savePendingInviteContext({
                    token: inviteToken,
                    invitedEmail: info.email,
                    nextPath: continuationPath ?? inviteDefaultNextPath,
                });
                setPendingInvite(getPendingInviteContext());
            } catch (err) {
                console.warn('Could not fetch invite info:', err);
                const message = err instanceof Error
                    ? err.message
                    : 'This invitation link is invalid or expired. Ask the organizer to send a new invite.';
                const normalized = message.toLowerCase();
                const isTerminalInviteError = normalized.includes('invalid')
                    || normalized.includes('expired')
                    || normalized.includes('revoked')
                    || normalized.includes('not found');
                setInviteTokenError(
                    message
                );
                setInviteEmail(undefined);
                if (isTerminalInviteError) {
                    clearPendingInviteContext();
                    setPendingInvite(null);
                }
            } finally {
                setInviteEmailLoading(false);
            }
        };
        void fetchEmail();
    }, [continuationPath, inviteDefaultNextPath, inviteToken]);

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

    if (inviteToken && (!inviteEmail || inviteTokenError)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-2xl border bg-white p-6 text-center space-y-3">
                    <h1 className="text-xl font-semibold text-slate-900">Invitation unavailable</h1>
                    <p className="text-sm text-slate-600">
                        {inviteTokenError ?? 'This invitation link is invalid or expired. Ask the organizer to send a new invite.'}
                    </p>
                    <p className="text-sm text-slate-600">
                        If you already have an account, sign in with the invited email and open the invite link again.
                    </p>
                    <div className="pt-2">
                        <Link href="/login" className="text-sm font-medium text-[var(--brand-cyan)] hover:underline">
                            Go to sign in
                        </Link>
                    </div>
                </div>
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
                redirectAfterComplete={continuationPath ?? undefined}
                inviteEmail={inviteEmail}
                inviteToken={inviteToken ?? undefined}
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
