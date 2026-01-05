'use client';

import { motion } from 'motion/react';

interface CircularProgressProps {
    percentage: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    strokeWidth?: number;
    showPercentage?: boolean;
    colorVariant?: 'primary' | 'emerald' | 'violet' | 'amber' | 'rose' | 'sky' | 'lime' | 'fuchsia';
    className?: string;
    label?: string;
    sublabel?: string;
}

const sizeConfig = {
    sm: { diameter: 56, fontSize: 'text-xs', strokeWidth: 4 },
    md: { diameter: 72, fontSize: 'text-sm', strokeWidth: 5 },
    lg: { diameter: 96, fontSize: 'text-lg', strokeWidth: 6 },
    xl: { diameter: 120, fontSize: 'text-xl', strokeWidth: 7 },
};

// Curated color palette - vibrant but refined, works in light/dark mode
const colorConfig = {
    primary: {
        stroke: 'stroke-primary',
        text: 'text-primary',
        glow: 'drop-shadow-[0_0_8px_rgba(124,58,237,0.3)]',
    },
    emerald: {
        stroke: 'stroke-emerald-500',
        text: 'text-emerald-500',
        glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    },
    violet: {
        stroke: 'stroke-violet-500',
        text: 'text-violet-500',
        glow: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.3)]',
    },
    amber: {
        stroke: 'stroke-amber-500',
        text: 'text-amber-500',
        glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]',
    },
    rose: {
        stroke: 'stroke-rose-500',
        text: 'text-rose-500',
        glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]',
    },
    sky: {
        stroke: 'stroke-sky-500',
        text: 'text-sky-500',
        glow: 'drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]',
    },
    lime: {
        stroke: 'stroke-lime-500',
        text: 'text-lime-500',
        glow: 'drop-shadow-[0_0_8px_rgba(132,204,22,0.3)]',
    },
    fuchsia: {
        stroke: 'stroke-fuchsia-500',
        text: 'text-fuchsia-500',
        glow: 'drop-shadow-[0_0_8px_rgba(217,70,239,0.3)]',
    },
};

// Color rotation for automatic assignment
export const ticketTypeColors: Array<keyof typeof colorConfig> = [
    'emerald',
    'violet',
    'amber',
    'rose',
    'sky',
    'lime',
    'fuchsia',
    'primary',
];

export function CircularProgress({
    percentage,
    size = 'md',
    strokeWidth: customStrokeWidth,
    showPercentage = true,
    colorVariant = 'primary',
    className = '',
    label,
    sublabel,
}: CircularProgressProps) {
    const config = sizeConfig[size];
    const colors = colorConfig[colorVariant];
    const strokeWidth = customStrokeWidth ?? config.strokeWidth;
    const diameter = config.diameter;
    const radius = (diameter - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

    return (
        <div className={`flex items-center gap-4 ${className}`}>
            <div className={`relative inline-flex items-center justify-center ${colors.glow}`}>
                <svg
                    width={diameter}
                    height={diameter}
                    viewBox={`0 0 ${diameter} ${diameter}`}
                    className="-rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={diameter / 2}
                        cy={diameter / 2}
                        r={radius}
                        fill="none"
                        className="stroke-muted/50"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx={diameter / 2}
                        cy={diameter / 2}
                        r={radius}
                        fill="none"
                        className={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                </svg>
                {showPercentage && (
                    <span className={`absolute font-mono font-bold ${config.fontSize} ${colors.text}`}>
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>
            {(label || sublabel) && (
                <div className="flex flex-col min-w-0">
                    {label && (
                        <span className="font-semibold text-sm leading-snug truncate">{label}</span>
                    )}
                    {sublabel && (
                        <span className="text-xs text-muted-foreground font-mono">{sublabel}</span>
                    )}
                </div>
            )}
        </div>
    );
}
