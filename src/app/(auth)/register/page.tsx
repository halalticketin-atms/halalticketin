'use client';

import { Suspense, useState, useEffect, useRef, useEffectEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/auth-context';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Loader2 } from 'lucide-react';

// Lazy load the dialog to reduce initial bundle size
const SignupOnboardingDialog = dynamic(
    () => import('@/components/auth/SignupOnboardingDialog').then(m => ({ default: m.SignupOnboardingDialog })),
    { ssr: false }
);

function RegisterPageContent() {
    const [dialogOpen, setDialogOpen] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const isCompletingRef = useRef(false);
    const userClosedRef = useRef(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading } = useAuth();

    // Get default role from URL query param
    const roleParam = searchParams.get('role');
    const defaultRole = roleParam === 'organizer' ? 'organizer' : undefined;

    const markInitialLoadComplete = useEffectEvent(() => {
        setInitialLoadComplete(true);
    });

    // Mark initial load as complete once auth state is first resolved
    useEffect(() => {
        if (!isLoading) {
            markInitialLoadComplete();
        }
    }, [isLoading]);

    // If already logged in AND not in the middle of onboarding, redirect to dashboard
    // Only check this on initial load, not during the signup flow
    useEffect(() => {
        if (initialLoadComplete && user && !dialogOpen && !isCompletingRef.current && !userClosedRef.current) {
            router.push('/dashboard');
        }
    }, [user, initialLoadComplete, router, dialogOpen]);

    const handleDialogClose = (open: boolean) => {
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

    // Only show loading spinner on initial page load, before the dialog is shown
    // Once initial load is complete, never unmount the dialog due to auth state changes
    if (!initialLoadComplete) {
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
