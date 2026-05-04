'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { PropsWithChildren } from 'react';
import { OrganizerProvider } from '@/context/organizer-context';
import { useAuth } from '@/context/auth-context';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: PropsWithChildren) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading, needsOnboarding } = useAuth();
    const isPreviewRoute = Boolean(
        pathname &&
        (/^\/events\/preview(\/|$)/.test(pathname) || /^\/events\/[^/]+\/preview$/.test(pathname))
    );

    useEffect(() => {
        if (isPreviewRoute) {
            return;
        }
        // Redirect to login if not authenticated (after loading completes)
        if (!isLoading && !user) {
            router.replace('/login');
            return;
        }

        if (!isLoading && needsOnboarding) {
            router.replace('/register');
        }
    }, [isPreviewRoute, user, isLoading, needsOnboarding, router]);

    // Show loading spinner while checking auth
    if (isLoading && !user && !isPreviewRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Don't render dashboard content if not authenticated
    if ((!user || needsOnboarding) && !isPreviewRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <OrganizerProvider>{children}</OrganizerProvider>;
}
