'use client';

import { useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubStep } from './SubStepSidebar';

interface SubStepChipsProps {
    subSteps: SubStep[];
    currentSubStep: string;
    onSubStepClick: (subStepId: string) => void;
    className?: string;
}

export function SubStepChips({
    subSteps,
    currentSubStep,
    onSubStepClick,
    className
}: SubStepChipsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeChipRef = useRef<HTMLButtonElement>(null);

    // Scroll active chip into view
    useEffect(() => {
        if (activeChipRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const chip = activeChipRef.current;
            const containerRect = container.getBoundingClientRect();
            const chipRect = chip.getBoundingClientRect();

            const isOutOfView =
                chipRect.left < containerRect.left ||
                chipRect.right > containerRect.right;

            if (isOutOfView) {
                chip.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [currentSubStep]);

    return (
        <div className={cn('lg:hidden border-b border-border/50 bg-card/30', className)}>
            <div
                ref={scrollContainerRef}
                className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
            >
                {subSteps.map((subStep) => {
                    const isActive = currentSubStep === subStep.id;

                    return (
                        <button
                            key={subStep.id}
                            ref={isActive ? activeChipRef : null}
                            onClick={() => onSubStepClick(subStep.id)}
                            className={cn(
                                'shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : subStep.isComplete
                                        ? 'bg-primary/15 text-primary border border-primary/30'
                                        : 'bg-muted text-muted-foreground border border-border/50'
                            )}
                        >
                            {subStep.isComplete && !isActive && (
                                <Check className="h-3 w-3" />
                            )}
                            <span className="whitespace-nowrap">{subStep.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
