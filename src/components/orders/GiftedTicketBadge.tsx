import { Gift } from 'lucide-react';

interface GiftedTicketBadgeProps {
    count: number;
}

export function GiftedTicketBadge({ count }: GiftedTicketBadgeProps) {
    if (count <= 0) {
        return null;
    }

    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-linear-to-r from-amber-100/90 to-yellow-100/80 px-3 py-1.5 text-amber-800 shadow-sm dark:border-amber-500/30 dark:from-amber-500/15 dark:to-yellow-500/10 dark:text-amber-300">
            <Gift className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase">
                {count} gifted
            </span>
        </div>
    );
}
