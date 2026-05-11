import { describe, expect, it } from 'vitest';

import { getMetaTrackingStatus } from './meta-tracking-status';

describe('getMetaTrackingStatus', () => {
  it('marks tracking as not configured without a Pixel ID', () => {
    expect(getMetaTrackingStatus({ metaPixelId: null, metaCapiTokenLast4: null })).toEqual({
      tone: 'muted',
      label: 'Not configured',
      summary: 'Add a Pixel ID to start tracking opted-in event and checkout activity.',
      purchaseReliability: 'Purchase tracking starts after a Pixel is connected.',
    });
  });

  it('marks browser-only tracking when a Pixel ID is saved without CAPI', () => {
    expect(getMetaTrackingStatus({ metaPixelId: '123456789012345', metaCapiTokenLast4: null })).toEqual({
      tone: 'warning',
      label: 'Pixel only',
      summary: 'Browser Pixel events are active after marketing consent.',
      purchaseReliability: 'Add a Conversions API token to improve Purchase reliability.',
    });
  });

  it('marks Purchase CAPI as connected when a token is saved with a Pixel ID', () => {
    expect(getMetaTrackingStatus({ metaPixelId: '123456789012345', metaCapiTokenLast4: '6789' })).toEqual({
      tone: 'success',
      label: 'Pixel + CAPI',
      summary: 'Browser Pixel events and server-side Purchase tracking are active.',
      purchaseReliability: 'Purchase uses browser/server deduplication.',
    });
  });
});
