'use client';

import Script from 'next/script';

// Consent Mode v2 advanced: the tag always boots with a denied default so
// non-consenting visitors still produce cookieless pings. Consent grants are
// applied via gtag('consent', 'update', …) in lib/tracking-consent and
// lib/marketing-tracking/google-tag.
const GOOGLE_TAG_BASE_SNIPPET = `
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };
  if (!window.__htGoogleConsentDefaultSet) {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.__htGoogleConsentDefaultSet = true;
  }
  if (!window.__htGoogleTagInitialized) {
    window.gtag('js', new Date());
    window.__htGoogleTagInitialized = true;
  }
`;

export function GoogleTagScript() {
    return (
        <Script id="google-tag-base" strategy="afterInteractive">
            {GOOGLE_TAG_BASE_SNIPPET}
        </Script>
    );
}
