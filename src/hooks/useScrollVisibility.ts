'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollVisibilityOptions {
    topOffset?: number;
    directionThreshold?: number;
    idleDelay?: number;
    isInteracting?: boolean;
}

export function useScrollVisibility({
    topOffset = 50,
    directionThreshold = 8,
    idleDelay = 2500,
    isInteracting = false,
}: ScrollVisibilityOptions = {}) {
    const [isVisible, setIsVisible] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);
    const lastScrollY = useRef(0);
    // Distance travelled in the current, unbroken scroll direction. It resets to
    // zero whenever the direction reverses, so a reversal is always measured from
    // its turning point rather than from a stale anchor. This is what guarantees
    // that any sustained upward scroll reliably re-reveals the bar.
    const directionDelta = useRef(0);
    const rafRef = useRef<number | null>(null);
    const idleTimerRef = useRef<number | null>(null);

    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

    // After the user stops scrolling, tuck the bar away (but never near the top).
    const scheduleIdleHide = useCallback((scrollY: number) => {
        clearIdleTimer();
        if (scrollY <= topOffset) {
            return;
        }
        idleTimerRef.current = window.setTimeout(() => {
            if (window.scrollY > topOffset) {
                setIsVisible(false);
            }
        }, idleDelay);
    }, [clearIdleTimer, idleDelay, topOffset]);

    const updateVisibility = useCallback(() => {
        const currentScrollY = Math.max(0, window.scrollY);
        const delta = currentScrollY - lastScrollY.current;
        lastScrollY.current = currentScrollY;

        setIsScrolled(currentScrollY > topOffset);

        // Near the top, or while the pointer is on the nav: always shown.
        if (currentScrollY <= topOffset || isInteracting) {
            directionDelta.current = 0;
            setIsVisible(true);
            clearIdleTimer();
            return;
        }

        if (delta !== 0) {
            // Reset the accumulator the moment direction flips, so the new
            // direction is measured from the turning point.
            if ((delta > 0) !== (directionDelta.current > 0)) {
                directionDelta.current = 0;
            }
            directionDelta.current += delta;
        }

        if (directionDelta.current > directionThreshold) {
            // Sustained scroll down -> hide.
            setIsVisible(false);
        } else if (directionDelta.current < -directionThreshold) {
            // Sustained scroll up -> reveal.
            setIsVisible(true);
        }

        scheduleIdleHide(currentScrollY);
    }, [clearIdleTimer, directionThreshold, isInteracting, scheduleIdleHide, topOffset]);

    useEffect(() => {
        lastScrollY.current = typeof window === 'undefined' ? 0 : window.scrollY;
        directionDelta.current = 0;

        // Sync once on mount in case the page loads already scrolled.
        if (rafRef.current === null) {
            rafRef.current = window.requestAnimationFrame(() => {
                updateVisibility();
                rafRef.current = null;
            });
        }

        const onScroll = () => {
            if (rafRef.current !== null) return;
            rafRef.current = window.requestAnimationFrame(() => {
                updateVisibility();
                rafRef.current = null;
            });
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            clearIdleTimer();
        };
    }, [clearIdleTimer, updateVisibility]);

    // Keep idle-hide consistent when the pointer enters/leaves the nav, without
    // waiting for the next scroll event.
    useEffect(() => {
        if (isInteracting) {
            // `effectiveVisible` already forces the bar visible while interacting;
            // here we only need to cancel any pending idle-hide.
            clearIdleTimer();
            return;
        }
        if (typeof window !== 'undefined') {
            scheduleIdleHide(window.scrollY);
        }
    }, [clearIdleTimer, isInteracting, scheduleIdleHide]);

    const effectiveVisible = isInteracting ? true : isVisible;

    return { isVisible: effectiveVisible, isScrolled };
}
