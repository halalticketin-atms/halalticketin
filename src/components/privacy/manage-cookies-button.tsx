'use client';

import { useCookieConsent } from '@/context/cookie-consent-context';

export function ManageCookiesButton({ className }: { className?: string }) {
    const { openPreferences } = useCookieConsent();

    return (
        <button
            type="button"
            onClick={openPreferences}
            className={className ?? 'text-sm text-muted-foreground hover:text-foreground transition-colors'}
        >
            Manage cookies
        </button>
    );
}
