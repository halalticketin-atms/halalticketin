'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CreditAccountingSummary, CreditStatus } from '@/lib/credit-accounting';

interface CreditBalancePanelProps {
  accounting: CreditAccountingSummary;
  status: CreditStatus;
  purchaseHref: string;
  className?: string;
}

type StatusStyle = {
  card: string;
  accentText: string;
  fill: string;
  track: string;
  legendDot: string;
  usedSegment: string;
  usedLegendDot: string;
  link: string;
};

// Each state is colour-coded so the bar's fill reads as the *remaining* balance:
// a depleted account shows an empty (amber) track, never a full bar.
const STATUS_STYLES: Record<CreditStatus, StatusStyle> = {
  healthy: {
    card: 'border-[var(--brand-mint)]/30 bg-gradient-to-br from-[var(--brand-mint)]/5 via-background to-[var(--brand-cyan)]/5',
    accentText:
      'bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)] bg-clip-text text-transparent',
    fill: 'bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)]',
    track: 'bg-muted/40',
    legendDot: 'bg-gradient-to-r from-[var(--brand-teal)] to-[var(--brand-cyan)]',
    usedSegment: 'bg-rose-200/60 dark:bg-rose-950/40',
    usedLegendDot: 'bg-rose-300/80 dark:bg-rose-700/70',
    link: 'text-[var(--brand-teal)] hover:text-[var(--brand-cyan)]',
  },
  low: {
    card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/80 via-background to-amber-50/30',
    accentText: 'text-amber-700 dark:text-amber-400',
    fill: 'bg-gradient-to-r from-amber-400 to-amber-500',
    track: 'bg-amber-100/70 dark:bg-amber-950/30',
    legendDot: 'bg-amber-500',
    usedSegment: 'bg-rose-200/70 dark:bg-rose-950/40',
    usedLegendDot: 'bg-rose-300/80 dark:bg-rose-700/70',
    link: 'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200',
  },
  empty: {
    card: 'border-amber-300/70 bg-gradient-to-br from-amber-50/90 via-background to-amber-50/40',
    accentText: 'text-amber-700 dark:text-amber-400',
    // Fill is 0% in the empty state, so this only matters for a sliver if any.
    fill: 'bg-gradient-to-r from-amber-400 to-amber-500',
    track: 'bg-amber-100/80 dark:bg-amber-950/40',
    legendDot: 'bg-amber-400',
    usedSegment: 'bg-rose-200/70 dark:bg-rose-950/40',
    usedLegendDot: 'bg-rose-300/80 dark:bg-rose-700/70',
    link: 'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200',
  },
};

export function CreditBalancePanel({
  accounting,
  status,
  purchaseHref,
  className,
}: CreditBalancePanelProps) {
  const styles = STATUS_STYLES[status];
  const ctaLabel = status === 'healthy' ? 'Add credits' : 'Top up credits';

  const { available, used, total, availablePercentage, usedPercentage } = accounting;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Credit balance"
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5',
        styles.card,
        className
      )}
    >
      {/* Header: original compact balance pattern with a light top-up action. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-foreground">Credit Balance</span>
          <span
            className={cn(
              'font-display text-2xl font-bold leading-none tracking-tight sm:text-3xl',
              styles.accentText
            )}
          >
            {available.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">available</span>
        </div>
        <Link
          href={purchaseHref}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-colors',
            styles.link
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {ctaLabel}
        </Link>
      </div>

      {/* Slim segmented bar: fill represents remaining (available) credits, so a
          depleted balance reads as an empty track rather than a full bar. */}
      <div
        role="img"
        aria-label={`${available.toLocaleString()} of ${total.toLocaleString()} credits available`}
        className={cn('mt-3 flex h-2 w-full overflow-hidden rounded-full', styles.track)}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${availablePercentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={cn('h-full', styles.fill)}
        />
        {/* Out of credits: leave the amber track empty rather than filling it
            with the "used" segment, so a depleted balance reads as empty. */}
        {status !== 'empty' && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usedPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className={cn('h-full', styles.usedSegment)}
          />
        )}
      </div>

      {/* Compact legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', styles.legendDot)} aria-hidden="true" />
          Available <span className="font-medium text-foreground">{available.toLocaleString()}</span>
        </span>
        {used > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn('h-1.5 w-1.5 rounded-full', styles.usedLegendDot)}
              aria-hidden="true"
            />
            Used <span className="font-medium text-foreground">{used.toLocaleString()}</span>
          </span>
        )}
      </div>
    </motion.section>
  );
}
