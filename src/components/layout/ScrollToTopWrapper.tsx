'use client';

import { useScrollToTop } from '@/hooks/useScrollToTop';

interface ScrollToTopWrapperProps {
    children: React.ReactNode;
}

/**
 * Client component wrapper that applies scroll-to-top behavior on route changes.
 * Used in server component layouts to enable scroll reset functionality.
 */
export function ScrollToTopWrapper({ children }: ScrollToTopWrapperProps) {
    useScrollToTop();
    return <>{children}</>;
}
