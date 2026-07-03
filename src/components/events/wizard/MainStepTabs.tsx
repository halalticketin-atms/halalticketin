'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface MainStep {
    id: number;
    title: string;
    icon: LucideIcon;
    isComplete: boolean;
    isCurrent: boolean;
    hasWarning?: boolean;
}

interface MainStepTabsProps {
    steps: MainStep[];
    onStepClick: (stepId: number) => void;
    className?: string;
}

export function MainStepTabs({ steps, onStepClick, className }: MainStepTabsProps) {
    return (
        <div className={cn('border-b border-border/50 bg-card/50', className)}>
            {/* Desktop: Full tabs */}
            <div className="hidden sm:flex items-center justify-center gap-1 px-4 py-2">
                {steps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                        <button
                            key={step.id}
                            aria-label={step.title}
                            onClick={() => onStepClick(step.id)}
                            className={cn(
                                'group relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                                step.isCurrent
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : step.isComplete
                                        ? 'text-primary hover:bg-primary/10'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                        >
                            <span className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                                step.isCurrent
                                    ? 'bg-primary-foreground/20'
                                    : step.isComplete
                                        ? 'bg-primary/20'
                                        : 'bg-muted'
                            )}>
                                {step.isComplete && !step.isCurrent ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    <StepIcon className="h-3.5 w-3.5" />
                                )}
                            </span>
                            <span className="hidden lg:inline">{step.title}</span>

                            {/* Active indicator */}
                            {step.isCurrent && (
                                <motion.div
                                    layoutId="activeMainStep"
                                    className="absolute inset-0 rounded-lg bg-primary -z-10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Mobile: Compact step indicators */}
            <div className="flex sm:hidden items-center justify-between px-4 py-3">
                {steps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                        <button
                            key={step.id}
                            aria-label={step.title}
                            onClick={() => onStepClick(step.id)}
                            className="flex flex-col items-center gap-1"
                        >
                            <div
                                className={cn(
                                    'flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all',
                                    step.isCurrent
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : step.isComplete
                                            ? 'bg-primary/20 text-primary'
                                            : step.hasWarning
                                                ? 'border-2 border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground'
                                                : 'bg-muted text-muted-foreground'
                                )}
                            >
                                {step.isComplete && !step.isCurrent ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <StepIcon className="h-4 w-4" />
                                )}
                            </div>
                            <span className={cn(
                                'text-[10px] font-medium',
                                step.isCurrent ? 'text-primary' : 'text-muted-foreground'
                            )}>
                                {step.title.split(' ')[0]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function MainStepSidebar({ steps, onStepClick, className }: MainStepTabsProps) {
    return (
        <aside className={cn('hidden w-28 shrink-0 border-r border-border/60 bg-muted/25 lg:block xl:w-32', className)}>
            <nav
                aria-label="Wizard steps"
                className="sticky space-y-1 overflow-y-auto px-3 py-4 xl:px-4"
                style={{
                    top: 'var(--event-wizard-sticky-offset)',
                    maxHeight: 'calc(100vh - var(--event-wizard-sticky-offset) - 64px)',
                }}
            >
                {steps.map((step) => {
                    const StepIcon = step.icon;
                    const shortLabel = step.title === 'Event Details' ? 'Details' : step.title;
                    return (
                        <button
                            key={step.id}
                            aria-label={step.title}
                            onClick={() => onStepClick(step.id)}
                            className={cn(
                                'flex w-full flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors xl:py-3',
                                step.isCurrent
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : step.isComplete
                                        ? 'text-primary hover:bg-primary/10'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                            )}
                        >
                            <span className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-full',
                                step.isCurrent
                                    ? 'bg-primary-foreground/20'
                                    : step.isComplete
                                        ? 'bg-primary/15'
                                        : 'bg-muted'
                            )}>
                                {step.isComplete && !step.isCurrent ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <StepIcon className="h-4 w-4" />
                                )}
                            </span>
                            <span className="leading-tight">{shortLabel}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}
