'use client';

import Script from 'next/script';
import { useCookieConsent } from '@/context/cookie-consent-context';

const META_PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

const META_PIXEL_BASE_SNIPPET = `
  if (!window.fbq) {
    var fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        (fbq.queue = fbq.queue || []).push(arguments);
      }
    };
    fbq.queue = [];
    fbq.version = '2.0';
    fbq.push = fbq;
    window.fbq = fbq;
  }
  if (!window._fbq) {
    window._fbq = window.fbq;
  }
`;

export function MetaPixelScript() {
    const { marketingAllowed } = useCookieConsent();

    if (!marketingAllowed) {
        return null;
    }

    return (
        <>
            <Script id="meta-pixel-base" strategy="afterInteractive">
                {META_PIXEL_BASE_SNIPPET}
            </Script>
            <Script id="meta-pixel-lib" src={META_PIXEL_SRC} strategy="afterInteractive" />
        </>
    );
}
