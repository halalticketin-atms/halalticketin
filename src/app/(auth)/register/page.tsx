'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SignupOnboardingDialog } from '@/components/auth/SignupOnboardingDialog';
import { useAuth } from '@/context/auth-context';
import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const [dialogOpen, setDialogOpen] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const isCompletingRef = useRef(false);
    const router = useRouter();
    const { user, isLoading } = useAuth();

    // Mark initial load as complete once auth state is first resolved
    useEffect(() => {
        if (!isLoading) {
            setInitialLoadComplete(true);
        }
    }, [isLoading]);

    // If already logged in AND not in the middle of onboarding, redirect to dashboard
    // Only check this on initial load, not during the signup flow
    useEffect(() => {
        if (initialLoadComplete && user && !dialogOpen) {
            router.push('/dashboard');
        }
    }, [user, initialLoadComplete, router, dialogOpen]);

    const handleDialogClose = (open: boolean) => {
        setDialogOpen(open);
        if (!open && !isCompletingRef.current) {
            // Only redirect to home if user manually closed (not after completion)
            router.push('/');
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
            />
        </div>
    );
}

