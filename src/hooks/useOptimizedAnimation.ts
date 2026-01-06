'use client';

import { useReducedMotion } from 'motion/react';
import { useMemo } from 'react';

const isLikelyMobile = () => {
    if (typeof navigator === 'undefined') return false;
    const userAgentData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
    if (userAgentData?.mobile !== undefined) return userAgentData.mobile;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

/**
 * Hook for optimized animations that respect user preferences
 * and provide consistent animation presets across the app.
 * 
 * Benefits:
 * - Respects `prefers-reduced-motion` system setting
 * - Provides faster, simpler animations for better performance  
 * - Centralized animation configuration for consistency
 */
export function useOptimizedAnimation() {
    const prefersReducedMotion = useReducedMotion();

    return useMemo(() => {
        // If user prefers reduced motion, return minimal/no animations
        if (prefersReducedMotion || isLikelyMobile()) {
            return {
                prefersReducedMotion: true,
                // No animations for reduced motion
                fadeIn: {},
                fadeInUp: {},
                staggerDelay: 0,
                // Instant transitions
                transition: { duration: 0 },
                springTransition: { duration: 0 },
                // For AnimatePresence
                initial: {},
                animate: {},
                exit: {},
            };
        }

        // Optimized animations - shorter durations, simpler easing
        return {
            prefersReducedMotion: false,

            // Basic fade in
            fadeIn: {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
            },

            // Fade in with subtle upward motion (reduced from 20px to 12px)
            fadeInUp: {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -8 },
            },

            // Reduced stagger delay (was 0.1s, now 0.03s)
            staggerDelay: 0.03,

            // Fast, smooth transition (was 0.4-0.5s, now 0.2s)
            transition: {
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
            },

            // For spring-like but faster animations
            springTransition: {
                duration: 0.25,
                ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
            },

            // Shorthand for motion components
            initial: { opacity: 0, y: 12 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -8 },
        };
    }, [prefersReducedMotion]);
}

/**
 * Animation presets for common use cases.
 * Use these for CSS-only animations or static motion props.
 */
export const animationPresets = {
    // Duration values (in seconds)
    duration: {
        instant: 0,
        fast: 0.15,
        normal: 0.2,
        slow: 0.3,
    },

    // Easing functions
    ease: {
        // Standard ease-out for most transitions
        out: [0.4, 0, 0.2, 1] as const,
        // iOS-like spring feel
        spring: [0.32, 0.72, 0, 1] as const,
        // Linear for progress bars
        linear: [0, 0, 1, 1] as const,
    },

    // CSS class helpers for Tailwind
    css: {
        fast: 'transition-all duration-150 ease-out',
        normal: 'transition-all duration-200 ease-out',
        slow: 'transition-all duration-300 ease-out',
    },
};

export type OptimizedAnimationReturn = ReturnType<typeof useOptimizedAnimation>;
