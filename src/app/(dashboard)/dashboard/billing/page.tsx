'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';

/**
 * /dashboard/billing - Redirect page
 * Resolves the active organizer and redirects to the correct billing/purchase page.
 * Used when coming from public pages (like /pricing) that don't have access to OrganizerProvider.
 */
function BillingRedirectContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { organizers, activeOrganizerId, isLoading } = useOrganizers();

    useEffect(() => {
        if (isAuthLoading) return;
        if (!user) {
            const nextPath = searchParams.get('credits')
                ? `/dashboard/billing?credits=${searchParams.get('credits')}`
                : '/dashboard/billing';
            router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
            return;
        }
        // Wait until we're done loading
        if (isLoading) return;

        const credits = searchParams.get('credits');

        // Try to get an ID
        const orgId = activeOrganizerId || (organizers.length > 0 ? organizers[0].id : null);

        if (orgId) {
            // Found an organizer! Redirect to purchase page
            const url = credits
                ? `/dashboard/o/${orgId}/billing/purchase?credits=${credits}`
                : `/dashboard/o/${orgId}/billing`;
            router.replace(url);
        } else if (!isLoading && organizers.length === 0) {
            // Definitely no organizers loaded and loading is finished
            // Redirect to dashboard overview to create one
            router.replace('/dashboard');
        }
        // If we have organizers but activeOrganizerId is null, wait a tick for context to potentially set it,
        // or the next render cycle will catch 'orgId' via organizers[0].id

    }, [isAuthLoading, user, isLoading, activeOrganizerId, organizers, searchParams, router]);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
    );
}

function BillingRedirectFallback() {
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
    );
}

export default function BillingRedirectPage() {
    return (
        <Suspense fallback={<BillingRedirectFallback />}>
            <BillingRedirectContent />
        </Suspense>
    );
}
