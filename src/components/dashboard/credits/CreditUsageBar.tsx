'use client';

import { motion } from 'motion/react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export interface UsageSegment {
    id: string;
    label: string;
    value: number;
    color: string;
    legendColor?: string; // Optional override for legend dot if different from bar color
}

interface CreditUsageBarProps {
    total: number;
    used: number;
    segments: UsageSegment[];
    className?: string;
}

export function CreditUsageBar({ total, used, segments, className }: CreditUsageBarProps) {
    const available = Math.max(0, total - used);

    // Calculate percentages for width
    const processedSegments = useMemo(() => {
        let currentTotal = 0;
        return segments.map((segment) => {
            const percentage = (segment.value / total) * 100;
            currentTotal += segment.value;
            return { ...segment, percentage };
        });
    }, [segments, total]);

    const availablePercentage = (available / total) * 100;

    return (
        <div className={cn('w-full space-y-6', className)}>
            <div className="flex flex-col space-y-1">
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{available.toLocaleString()}</span> credits available of{' '}
                    <span className="font-medium text-foreground">{total.toLocaleString()}</span> total purchased
                </p>
            </div>

            {/* The Bar */}
            <div className="relative h-12 w-full rounded-xl overflow-hidden flex bg-muted/20 shadow-inner border border-border/10">
                <TooltipProvider delayDuration={100}>
                    {processedSegments.map((segment, index) => (
                        <Tooltip key={segment.id}>
                            <TooltipTrigger asChild>
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: `${segment.percentage}%`, opacity: 1 }}
                                    transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                                    className={cn(
                                        'h-full relative group first:rounded-l-xl transition-colors hover:brightness-110 cursor-help',
                                        // Add a subtle separator line for all but the last item
                                        index !== processedSegments.length - 1 && "border-r border-background/20"
                                    )}
                                    style={{ backgroundColor: segment.color }}
                                >
                                    {/* Removed inline labels for cleaner macOS-like look */}
                                </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="flex flex-col gap-1">
                                <span className="font-semibold">{segment.label}</span>
                                <span className="text-xs text-muted-foreground">
                                    {segment.value.toLocaleString()} Credits ({segment.percentage.toFixed(1)}%)
                                </span>
                            </TooltipContent>
                        </Tooltip>
                    ))}

                    {/* Available Segment */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: `${availablePercentage}%`, opacity: 1 }}
                                transition={{ duration: 0.8, delay: processedSegments.length * 0.1, ease: 'easeOut' }}
                                className="h-full bg-emerald-500 hover:bg-emerald-400 transition-colors cursor-help flex items-center justify-center last:rounded-r-xl first:rounded-l-xl"
                            >
                                {availablePercentage > 20 && (
                                    <span className="text-xs font-medium text-white/90 truncate px-2">
                                        {available.toLocaleString()} Available
                                    </span>
                                )}
                            </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <span className="font-semibold">Available Balance</span>
                            <span className="text-xs text-muted-foreground block">
                                {available.toLocaleString()} Credits ({availablePercentage.toFixed(1)}%)
                            </span>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-start text-sm">
                {segments.map((segment) => (
                    <div key={segment.id} className="flex items-center gap-2 group cursor-default">
                        <div
                            className="h-3 w-3 rounded-full shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10"
                            style={{ backgroundColor: segment.legendColor || segment.color }}
                        />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                            {segment.label}: <span className="font-medium text-foreground">{segment.value.toLocaleString()}</span>
                        </span>
                    </div>
                ))}
                <div className="flex items-center gap-2 group cursor-default">
                    <div className="h-3 w-3 rounded-full bg-muted/40 ring-1 ring-inset ring-black/5 dark:ring-white/10" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        Available: <span className="font-medium text-foreground">{available.toLocaleString()}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
