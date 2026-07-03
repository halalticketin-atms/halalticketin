'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface WizardSection {
    id: string;
    label: string;
}

interface SectionNavProps {
    sections: WizardSection[];
    activeSection: string;
    onSectionClick: (sectionId: string) => void;
    className?: string;
}

/** Desktop: sticky "on this page" rail listing the current main step's sections. */
export function SectionNavSidebar({ sections, activeSection, onSectionClick, className }: SectionNavProps) {
    if (sections.length < 2) {
        return null;
    }

    return (
        <aside className={cn('hidden w-44 shrink-0 border-r border-border/60 bg-background/50 lg:block xl:w-56', className)}>
            <nav
                aria-label="Page sections"
                className="sticky overflow-y-auto px-4 py-6"
                style={{
                    top: 'var(--event-wizard-sticky-offset)',
                    maxHeight: 'calc(100vh - var(--event-wizard-sticky-offset) - 64px)',
                }}
            >
                <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    On this page
                </p>
                <div className="border-l border-border/60">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionClick(section.id)}
                                aria-current={isActive ? 'true' : undefined}
                                className={cn(
                                    'block w-full -ml-px border-l-2 px-3.5 py-2 text-left text-sm transition-colors',
                                    isActive
                                        ? 'border-primary font-medium text-primary'
                                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                )}
                            >
                                {section.label}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </aside>
    );
}

/** Mobile/tablet: compact horizontal jump links for the current main step's sections. */
export function SectionNavChips({ sections, activeSection, onSectionClick, className }: SectionNavProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const activeChipRef = useRef<HTMLButtonElement>(null);

    // Keep the highlighted chip visible as the scroll spy moves through sections
    useEffect(() => {
        const container = scrollContainerRef.current;
        const chip = activeChipRef.current;
        if (!container || !chip) return;

        const containerRect = container.getBoundingClientRect();
        const chipRect = chip.getBoundingClientRect();
        if (chipRect.left < containerRect.left || chipRect.right > containerRect.right) {
            container.scrollTo({ left: chip.offsetLeft - 16, behavior: 'smooth' });
        }
    }, [activeSection]);

    if (sections.length < 2) {
        return null;
    }

    return (
        <div className={cn('lg:hidden border-b border-border/50 bg-card/30', className)}>
            <div
                ref={scrollContainerRef}
                className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide"
            >
                {sections.map((section) => {
                    const isActive = activeSection === section.id;
                    return (
                        <button
                            key={section.id}
                            ref={isActive ? activeChipRef : null}
                            onClick={() => onSectionClick(section.id)}
                            aria-current={isActive ? 'true' : undefined}
                            className={cn(
                                'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                isActive
                                    ? 'border-primary/40 bg-primary/15 text-primary'
                                    : 'border-border/50 bg-muted/60 text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {section.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
