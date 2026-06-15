'use client';

import Script from 'next/script';
import { useCookieConsent } from '@/context/cookie-consent-context';

const TIKTOK_PIXEL_BASE_SNIPPET = `
  !function (w, d, t) {
    if (w[t] && w[t].__htTikTokReady) return;
    w.TiktokAnalyticsObject = t;
    var ttq = w[t] = w[t] || [];
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
    ttq.setAndDefer = function (queue, method) {
      queue[method] = function () {
        queue.push([method].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) {
      ttq.setAndDefer(ttq, ttq.methods[i]);
    }
    ttq._i = ttq._i || {};
    ttq._loaded = ttq._loaded || {};
    ttq.instance = function (pixelId) {
      var instance = ttq._i[pixelId] || [];
      for (var j = 0; j < ttq.methods.length; j++) {
        ttq.setAndDefer(instance, ttq.methods[j]);
      }
      ttq._i[pixelId] = instance;
      return instance;
    };
    ttq.load = function (pixelId, options) {
      ttq._i[pixelId] = ttq._i[pixelId] || [];
      ttq._t = ttq._t || {};
      ttq._t[pixelId] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[pixelId] = options || {};
      if (ttq._loaded[pixelId]) return;
      ttq._loaded[pixelId] = true;
      var script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=' + encodeURIComponent(pixelId) + '&lib=' + encodeURIComponent(t);
      var firstScript = d.getElementsByTagName('script')[0];
      firstScript.parentNode.insertBefore(script, firstScript);
    };
    ttq.__htTikTokReady = true;
  }(window, document, 'ttq');
`;

export function TikTokPixelScript() {
    const { marketingAllowed } = useCookieConsent();

    if (!marketingAllowed) {
        return null;
    }

    return (
        <Script id="tiktok-pixel-base" strategy="afterInteractive">
            {TIKTOK_PIXEL_BASE_SNIPPET}
        </Script>
    );
}
