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
    const lastToggleY = useRef(0);
    const rafRef = useRef<number | null>(null);
    const idleTimerRef = useRef<number | null>(null);

    const clearIdleTimer = useCallback(() => {
        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }, []);

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
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        setIsScrolled(currentScrollY > topOffset);

        if (isInteracting) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            lastToggleY.current = currentScrollY;
            clearIdleTimer();
            return;
        }

        if (currentScrollY <= topOffset) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            lastToggleY.current = currentScrollY;
            clearIdleTimer();
            return;
        }

        if (delta > 0 && currentScrollY - lastToggleY.current > directionThreshold) {
            setIsVisible(false);
            lastToggleY.current = currentScrollY;
        } else if (delta < 0 && lastToggleY.current - currentScrollY > directionThreshold) {
            setIsVisible(true);
            lastToggleY.current = currentScrollY;
        }

        lastScrollY.current = currentScrollY;
        scheduleIdleHide(currentScrollY);
    }, [clearIdleTimer, directionThreshold, isInteracting, scheduleIdleHide, topOffset]);

    useEffect(() => {
        const initialScrollY = window.scrollY;
        lastScrollY.current = initialScrollY;
        lastToggleY.current = initialScrollY;
        setIsScrolled(initialScrollY > topOffset);
        if (initialScrollY <= topOffset) {
            setIsVisible(true);
        }
        scheduleIdleHide(initialScrollY);

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
            }
            clearIdleTimer();
        };
    }, [clearIdleTimer, scheduleIdleHide, topOffset, updateVisibility]);

    useEffect(() => {
        if (isInteracting) {
            setIsVisible(true);
            clearIdleTimer();
            return;
        }
        scheduleIdleHide(window.scrollY);
    }, [clearIdleTimer, isInteracting, scheduleIdleHide]);

    return { isVisible, isScrolled };
}
