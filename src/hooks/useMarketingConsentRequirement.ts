'use client';

import { useEffect } from 'react';
import { useCookieConsent } from '@/context/cookie-consent-context';

export function useMarketingConsentRequirement(marketingNeeded: boolean) {
    const { setMarketingNeeded } = useCookieConsent();

    useEffect(() => {
        setMarketingNeeded(marketingNeeded);
        return () => setMarketingNeeded(false);
    }, [marketingNeeded, setMarketingNeeded]);
}
