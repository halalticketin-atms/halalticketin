'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Hook to scroll to top of page when navigating between routes.
 * Only triggers on pathname changes (not query params).
 * Uses instant scroll to avoid jarring animations during navigation.
 */
export function useScrollToTop() {
    const pathname = usePathname();
    const previousPathname = useRef(pathname);

    useEffect(() => {
        // Only scroll if the pathname actually changed
        if (previousPathname.current !== pathname) {
            window.scrollTo({ top: 0, behavior: 'instant' });
            previousPathname.current = pathname;
        }
    }, [pathname]);
}
