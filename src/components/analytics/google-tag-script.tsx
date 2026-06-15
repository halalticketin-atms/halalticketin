'use client';

import Script from 'next/script';
import { useCookieConsent } from '@/context/cookie-consent-context';

const GOOGLE_TAG_BASE_SNIPPET = `
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  if (!window.__htGoogleTagInitialized) {
    window.gtag('js', new Date());
    window.__htGoogleTagInitialized = true;
  }
`;

export function GoogleTagScript() {
    const { analyticsAllowed, marketingAllowed } = useCookieConsent();

    if (!analyticsAllowed && !marketingAllowed) {
        return null;
    }

    return (
        <Script id="google-tag-base" strategy="afterInteractive">
            {GOOGLE_TAG_BASE_SNIPPET}
        </Script>
    );
}
