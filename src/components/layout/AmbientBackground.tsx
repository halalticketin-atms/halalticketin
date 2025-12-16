'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const ORB_CONFIG = [
    {
        id: 'mint',
        className: '-top-[12%] -left-[10%] h-[45vh] w-[45vh]',
        style: { background: 'radial-gradient(circle, var(--brand-mint), transparent)' },
        animate: { x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] },
        transition: { duration: 15, repeat: Infinity, ease: 'easeInOut' as const },
    },
    {
        id: 'cyan',
        className: 'top-[18%] right-[12%] h-[55vh] w-[55vh]',
        style: { background: 'radial-gradient(circle, var(--brand-cyan), transparent)' },
        animate: { x: [0, -40, 0], y: [0, 50, 0], scale: [1, 1.2, 1] },
        transition: { duration: 18, repeat: Infinity, ease: 'easeInOut' as const, delay: 2 },
    },
    {
        id: 'teal',
        className: '-bottom-[12%] left-[25%] h-[60vh] w-[60vh]',
        style: { background: 'radial-gradient(circle, var(--brand-teal), transparent)' },
        animate: { x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] },
        transition: { duration: 20, repeat: Infinity, ease: 'easeInOut' as const, delay: 5 },
    },
];

interface AmbientBackgroundProps {
    className?: string;
    showNoise?: boolean;
    noiseClassName?: string;
}

const StaticOrbs = ({ className }: { className?: string }) => (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
        {ORB_CONFIG.map((orb) => (
            <div
                key={`static-${orb.id}`}
                className={cn(
                    'absolute rounded-full blur-2xl opacity-25',
                    orb.id === 'cyan' ? 'mix-blend-screen' : 'mix-blend-normal',
                    orb.className
                )}
                style={orb.style}
            />
        ))}
    </div>
);

export function AmbientBackground({
    className,
    showNoise = true,
    noiseClassName = 'opacity-30',
}: AmbientBackgroundProps) {
    const prefersReducedMotion = useReducedMotion();

    return (
        <div className={cn('absolute inset-0 pointer-events-none', className)}>
            {showNoise ? (
                <div className={cn('absolute inset-0 bg-noise', noiseClassName)} />
            ) : null}

            <div className="md:hidden">
                <StaticOrbs />
            </div>

            {prefersReducedMotion ? (
                <div className="hidden md:block">
                    <StaticOrbs />
                </div>
            ) : (
                <div className="hidden md:block absolute inset-0 overflow-hidden">
                    {ORB_CONFIG.map((orb) => (
                        <motion.div
                            key={orb.id}
                            className={cn(
                                'absolute rounded-full blur-3xl opacity-30 mix-blend-multiply filter',
                                orb.className
                            )}
                            style={orb.style}
                            animate={orb.animate}
                            transition={orb.transition}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
