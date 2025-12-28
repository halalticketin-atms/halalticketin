'use client';

import { useMemo } from 'react';

interface SparklineProps {
    data: number[]; // Array of values (typically 7 days)
    width?: number;
    height?: number;
    color?: string;
    className?: string;
}

export function Sparkline({
    data,
    width = 60,
    height = 20,
    color = 'currentColor',
    className = ''
}: SparklineProps) {
    const path = useMemo(() => {
        if (data.length === 0) return '';

        const max = Math.max(...data, 1); // Avoid division by zero
        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - (value / max) * height;
            return `${x},${y}`;
        });

        return `M ${points.join(' L ')}`;
    }, [data, width, height]);

    if (data.length === 0) {
        return null;
    }

    return (
        <svg
            width={width}
            height={height}
            className={`inline-block ${className}`}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
        >
            <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
