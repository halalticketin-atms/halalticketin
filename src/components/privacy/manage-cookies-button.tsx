'use client';

import { useCookieConsent } from '@/context/cookie-consent-context';

export function ManageCookiesButton({ className }: { className?: string }) {
    const { openPreferences } = useCookieConsent();

    return (
        <button
            type="button"
            onClick={openPreferences}
            className={className ?? 'min-h-8 inline-flex items-center px-2 text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline'}
        >
            Manage cookies
        </button>
    );
}
