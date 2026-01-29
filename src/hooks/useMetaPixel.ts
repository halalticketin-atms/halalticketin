'use client';

import { useCallback, useEffect } from 'react';
import { useCookieConsent } from '@/context/cookie-consent-context';
import { initMetaPixel, teardownMetaPixel, trackPixelEvent, type PixelEventOptions } from '@/lib/meta-pixel';

export function useMetaPixel() {
    const { marketingAllowed } = useCookieConsent();

    useEffect(() => {
        if (!marketingAllowed) {
            teardownMetaPixel();
        }
    }, [marketingAllowed]);

    const track = useCallback(
        (pixelId: string | null | undefined, eventName: string, params?: Record<string, unknown>, options?: PixelEventOptions) => {
            const normalizedId = pixelId?.trim();
            if (!marketingAllowed || !normalizedId) {
                return;
            }

            initMetaPixel(normalizedId);
            trackPixelEvent(normalizedId, eventName, params, options);
        },
        [marketingAllowed]
    );

    return {
        canTrack: marketingAllowed,
        track
    };
}
