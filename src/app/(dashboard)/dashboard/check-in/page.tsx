'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import { Button } from '@/components/ui/button';

export default function CheckInRedirectPage() {
    const router = useRouter();
    const { activeOrganizerId, isLoading } = useOrganizers();

    useEffect(() => {
        if (isLoading) return;
        if (activeOrganizerId) {
            router.replace(`${buildDashboardPath(activeOrganizerId)}/check-in`);
            return;
        }
        router.replace('/dashboard');
    }, [activeOrganizerId, isLoading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
            <div className="space-y-3 text-center">
                <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Redirecting to check-in…</p>
                <Button variant="ghost" onClick={() => router.replace('/dashboard')}>
                    Go to dashboard
                </Button>
            </div>
        </div>
    );
}
