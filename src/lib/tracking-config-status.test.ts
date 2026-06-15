import { describe, expect, it } from 'vitest';
import {
    isValidGa4MeasurementId,
    isValidGoogleAdsConversionId,
    isValidGoogleAdsPurchaseConversionLabel,
    isValidTikTokPixelId,
} from './tracking-config-status';

describe('tracking config status helpers', () => {
    it('validates GA4 Measurement IDs', () => {
        expect(isValidGa4MeasurementId('G-ABC123')).toBe(true);
        expect(isValidGa4MeasurementId('UA-123')).toBe(false);
    });

    it('validates TikTok Pixel IDs', () => {
        expect(isValidTikTokPixelId('CABC12345')).toBe(true);
        expect(isValidTikTokPixelId('abcd5')).toBe(true);
        expect(isValidTikTokPixelId('abc')).toBe(false);
        expect(isValidTikTokPixelId('CABC-12345')).toBe(false);
    });

    it('validates Google Ads conversion IDs', () => {
        expect(isValidGoogleAdsConversionId('AW-123456789')).toBe(true);
        expect(isValidGoogleAdsConversionId('AW-')).toBe(false);
        expect(isValidGoogleAdsConversionId('G-123456789')).toBe(false);
    });

    it('validates Google Ads purchase conversion labels', () => {
        expect(isValidGoogleAdsPurchaseConversionLabel('purchaseLabel123')).toBe(true);
        expect(isValidGoogleAdsPurchaseConversionLabel('')).toBe(false);
        expect(isValidGoogleAdsPurchaseConversionLabel('x'.repeat(121))).toBe(false);
    });
});
