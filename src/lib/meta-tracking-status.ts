export type MetaTrackingStatusTone = 'muted' | 'warning' | 'success';

export interface MetaTrackingStatusInput {
  metaPixelId?: string | null;
  metaCapiTokenLast4?: string | null;
}

export interface MetaTrackingStatus {
  tone: MetaTrackingStatusTone;
  label: string;
  summary: string;
  purchaseReliability: string;
}

export function getMetaTrackingStatus({
  metaPixelId,
  metaCapiTokenLast4,
}: MetaTrackingStatusInput): MetaTrackingStatus {
  const hasPixel = Boolean(metaPixelId?.trim());
  const hasCapi = Boolean(metaCapiTokenLast4?.trim());

  if (!hasPixel) {
    return {
      tone: 'muted',
      label: 'Not configured',
      summary: 'Add a Pixel ID to start tracking opted-in event and checkout activity.',
      purchaseReliability: 'Purchase tracking starts after a Pixel is connected.',
    };
  }

  if (!hasCapi) {
    return {
      tone: 'warning',
      label: 'Pixel only',
      summary: 'Browser Pixel events are active after marketing consent.',
      purchaseReliability: 'Add a Conversions API token to improve Purchase reliability.',
    };
  }

  return {
    tone: 'success',
    label: 'Pixel + CAPI',
    summary: 'Browser Pixel events and server-side Purchase tracking are active.',
    purchaseReliability: 'Purchase uses browser/server deduplication.',
  };
}
