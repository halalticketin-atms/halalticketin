import Image from 'next/image';
import { cn } from '@/lib/utils';

// Halal Ticketin's partner placement for MyDeen (see referral agreement). Downloads are
// attributed through this tracked link, so it must not be changed or have parameters appended.
const MYDEEN_URL = 'https://getmydeen.com/go/tick';

export function MyDeenPromo({ className }: { className?: string }) {
    return (
        <a
            href={MYDEEN_URL}
            target="_blank"
            rel="sponsored noopener"
            className={cn(
                'group block rounded-xl border border-[#E6DCC4] bg-[#F9F8F2] p-5',
                'shadow-[0_1px_2px_rgba(123,87,25,0.06),0_8px_24px_-12px_rgba(123,87,25,0.18)]',
                'transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(123,87,25,0.08),0_14px_32px_-12px_rgba(123,87,25,0.28)]',
                'outline-none focus-visible:ring-2 focus-visible:ring-[#AC8636] focus-visible:ring-offset-2',
                className,
            )}
        >
            <p className="text-xs text-[#8B6A2E]">Halal Ticketin partner</p>
            <div className="mt-3 flex items-center gap-4">
                {/* Soft gold halo so the tree reads as the focal point of the card. */}
                <div className="grid size-[72px] shrink-0 place-items-center rounded-full bg-[radial-gradient(circle,#F3E6C6_0%,#F3E6C600_70%)]">
                    <Image src="/partners/mydeen-logo.png" unoptimized alt="" width={64} height={69} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#8B6A2E]">MyDeen</p>
                    <p className="mt-0.5 font-display text-xl font-bold leading-tight tracking-[-0.01em] text-[#231A12]">
                        The Duolingo for Islam.
                    </p>
                </div>
            </div>
            <p className="mt-3 text-sm text-[#5B4F42]">Learn in just 3 minutes a day.</p>
            {/* Gold-to-bronze sampled from the logo; the midpoint keeps white text at 4.6:1. */}
            <span
                className={cn(
                    'mt-4 flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white',
                    'bg-gradient-to-b from-[#AC8636] to-[#7B5719]',
                    'shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(123,87,25,0.3)]',
                    'transition-[filter,transform] duration-150 group-hover:brightness-[0.94] group-active:translate-y-px motion-reduce:transition-none',
                )}
            >
                Download free now
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
        </a>
    );
}
