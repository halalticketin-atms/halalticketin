'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/context/cookie-consent-context';
import type { ConsentEventSource } from '@/lib/consent-events';

export function useTrackingConsentRequirement(
    {
        analyticsNeeded,
        marketingNeeded,
        source = 'event_page',
    }: {
        analyticsNeeded?: boolean;
        marketingNeeded?: boolean;
        source?: ConsentEventSource;
    }
) {
    const { setConsentNeeded } = useCookieConsent();

    useEffect(() => {
        setConsentNeeded({ analytics: analyticsNeeded, marketing: marketingNeeded }, source);
        return () => setConsentNeeded({ analytics: false, marketing: false });
    }, [analyticsNeeded, marketingNeeded, setConsentNeeded, source]);
}

export function useMarketingConsentRequirement(marketingNeeded: boolean, source: ConsentEventSource = 'event_page') {
    useTrackingConsentRequirement({ marketingNeeded, source });
}
