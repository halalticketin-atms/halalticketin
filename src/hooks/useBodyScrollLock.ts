'use client';

import { useEffect } from 'react';

type LockSnapshot = {
    bodyOverflow: string;
    bodyPaddingRight: string;
    bodyPosition: string;
    bodyTop: string;
    bodyLeft: string;
    bodyRight: string;
    bodyWidth: string;
    bodyOverscrollBehavior: string;
    htmlOverflow: string;
    htmlOverscrollBehavior: string;
};

let activeLocks = 0;
let savedScrollY = 0;
let snapshot: LockSnapshot | null = null;

/**
 * Hook to lock body scroll when an overlay (modal, mobile nav, etc.) is open.
 * Prevents scroll bleed/chaining to the background content.
 * 
 * @param isLocked - Whether the body scroll should be locked
 */
export function useBodyScrollLock(isLocked: boolean): void {
    useEffect(() => {
        if (!isLocked) return;

        const body = document.body;
        const html = document.documentElement;

        if (activeLocks === 0) {
            savedScrollY = window.scrollY;
            snapshot = {
                bodyOverflow: body.style.overflow,
                bodyPaddingRight: body.style.paddingRight,
                bodyPosition: body.style.position,
                bodyTop: body.style.top,
                bodyLeft: body.style.left,
                bodyRight: body.style.right,
                bodyWidth: body.style.width,
                bodyOverscrollBehavior: body.style.overscrollBehavior,
                htmlOverflow: html.style.overflow,
                htmlOverscrollBehavior: html.style.overscrollBehavior,
            };

            // Get scrollbar width to prevent layout shift on desktop
            const scrollbarWidth = window.innerWidth - html.clientWidth;

            // Lock document scrolling (body-only lock is unreliable on mobile Safari)
            html.style.overflow = 'hidden';
            html.style.overscrollBehavior = 'none';
            body.style.overflow = 'hidden';
            body.style.overscrollBehavior = 'none';
            body.style.position = 'fixed';
            body.style.top = `-${savedScrollY}px`;
            body.style.left = '0';
            body.style.right = '0';
            body.style.width = '100%';

            if (scrollbarWidth > 0) {
                body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        activeLocks += 1;

        return () => {
            activeLocks = Math.max(0, activeLocks - 1);

            if (activeLocks !== 0 || !snapshot) return;

            body.style.overflow = snapshot.bodyOverflow;
            body.style.paddingRight = snapshot.bodyPaddingRight;
            body.style.position = snapshot.bodyPosition;
            body.style.top = snapshot.bodyTop;
            body.style.left = snapshot.bodyLeft;
            body.style.right = snapshot.bodyRight;
            body.style.width = snapshot.bodyWidth;
            body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
            html.style.overflow = snapshot.htmlOverflow;
            html.style.overscrollBehavior = snapshot.htmlOverscrollBehavior;

            snapshot = null;
            window.scrollTo(0, savedScrollY);
        };
    }, [isLocked]);
}
