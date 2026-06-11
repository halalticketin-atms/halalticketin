'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/context/cookie-consent-context';
import type { ConsentEventSource } from '@/lib/consent-events';

export function useMarketingConsentRequirement(marketingNeeded: boolean, source: ConsentEventSource = 'event_page') {
    const { setMarketingNeeded } = useCookieConsent();

    useEffect(() => {
        setMarketingNeeded(marketingNeeded, source);
        return () => setMarketingNeeded(false);
    }, [marketingNeeded, setMarketingNeeded, source]);
}
