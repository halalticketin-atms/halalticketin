'use client';

import { useEffect } from 'react';

/**
 * Hook to lock body scroll when an overlay (modal, mobile nav, etc.) is open.
 * Prevents scroll bleed/chaining to the background content.
 * 
 * @param isLocked - Whether the body scroll should be locked
 */
export function useBodyScrollLock(isLocked: boolean): void {
    useEffect(() => {
        if (!isLocked) return;

        // Store the original styles
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;

        // Get scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        // Lock the body scroll
        document.body.style.overflow = 'hidden';

        // Add padding to prevent layout shift from scrollbar disappearing
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // Cleanup: restore original styles
        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isLocked]);
}
