'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SubStep {
    id: string;
    label: string;
    icon?: LucideIcon;
    isComplete?: boolean;
}

interface SubStepSidebarProps {
    subSteps: SubStep[];
    currentSubStep: string;
    onSubStepClick: (subStepId: string) => void;
    className?: string;
}

export function SubStepSidebar({
    subSteps,
    currentSubStep,
    onSubStepClick,
    className
}: SubStepSidebarProps) {
    return (
        <aside className={cn('hidden lg:block w-64 xl:w-72 shrink-0', className)}>
            <div className="sticky top-24 space-y-2">
                {subSteps.map((subStep) => {
                    const isActive = currentSubStep === subStep.id;

                    return (
                        <button
                            key={subStep.id}
                            onClick={() => onSubStepClick(subStep.id)}
                            className={cn(
                                'w-full flex items-center justify-center gap-3 rounded-xl px-4 py-3 text-center transition-all group',
                                isActive
                                    ? 'bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/20'
                                    : subStep.isComplete
                                        ? 'bg-primary/10 hover:bg-primary/15 text-foreground'
                                        : 'bg-card hover:bg-muted border border-border/50'
                            )}
                        >
                            <span className={cn(
                                'text-sm font-medium truncate',
                                isActive ? '' : 'group-hover:text-foreground'
                            )}>
                                {subStep.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
