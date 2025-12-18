'use client';

import { useCallback, useEffect } from 'react';
import { useCookieConsent } from '@/context/cookie-consent-context';
import { ensureMetaPixel, initMetaPixel, trackPixelEvent, type PixelEventOptions } from '@/lib/meta-pixel';

export function useMetaPixel() {
    const { marketingAllowed } = useCookieConsent();

    useEffect(() => {
        if (marketingAllowed) {
            ensureMetaPixel();
        }
    }, [marketingAllowed]);

    const track = useCallback(
        (pixelId: string | null | undefined, eventName: string, params?: Record<string, unknown>, options?: PixelEventOptions) => {
            if (!marketingAllowed || !pixelId) {
                return;
            }

            initMetaPixel(pixelId);
            trackPixelEvent(pixelId, eventName, params, options);
        },
        [marketingAllowed]
    );

    return {
        canTrack: marketingAllowed,
        track
    };
}
