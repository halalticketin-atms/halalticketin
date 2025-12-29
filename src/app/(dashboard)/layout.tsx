'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { OrganizerProvider } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: PropsWithChildren) {
    const router = useRouter();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        // Redirect to login if not authenticated (after loading completes)
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    // Show loading spinner while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Don't render dashboard content if not authenticated
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <OrganizerProvider>{children}</OrganizerProvider>;
}
