'use client';

import { cn } from '@/lib/utils';
import { useCookieConsent } from '@/context/cookie-consent-context';

export function ManageCookiesButton({ className }: { className?: string }) {
    const { openPreferences } = useCookieConsent();

    return (
        <button
            type="button"
            onClick={openPreferences}
            className={cn(
                'inline-flex min-h-8 items-center rounded-md px-2 -ml-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-left',
                className,
            )}
        >
            Manage cookies
        </button>
    );
}
