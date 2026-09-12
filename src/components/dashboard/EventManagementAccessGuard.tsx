'use client';

import { useEffect, type PropsWithChildren } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import { Loader2 } from 'lucide-react';

export function EventManagementAccessGuard({ children }: PropsWithChildren) {
    const pathname = usePathname();
    const router = useRouter();
    const { organizers, activeOrganizerId, isLoading } = useOrganizers();
    const isManagementRoute = /^\/events\/(new|create)(\/|$)/.test(pathname) || /^\/events\/[^/]+\/edit\/?$/.test(pathname);
    const organiser = organizers.find(org => org.id === activeOrganizerId);
    const isCheckIn = isManagementRoute && organiser?.role === 'check_in';
    useEffect(() => {
        if (isCheckIn && activeOrganizerId) {
            router.replace(buildDashboardPath(activeOrganizerId, '/check-in'));
        }
    }, [isCheckIn, activeOrganizerId, router]);
    if (isManagementRoute && (isLoading || isCheckIn)) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    return <>{children}</>;
}
