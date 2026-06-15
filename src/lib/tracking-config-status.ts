const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const TIKTOK_PIXEL_ID_PATTERN = /^[A-Za-z0-9]{5,64}$/;
const GOOGLE_ADS_CONVERSION_ID_PATTERN = /^AW-[0-9]+$/;
const GOOGLE_ADS_PURCHASE_CONVERSION_LABEL_MAX_LENGTH = 120;

export const isValidGa4MeasurementId = (value: string) => GA4_MEASUREMENT_ID_PATTERN.test(value.trim());
export const isValidTikTokPixelId = (value: string) => TIKTOK_PIXEL_ID_PATTERN.test(value.trim());
export const isValidGoogleAdsConversionId = (value: string) =>
    GOOGLE_ADS_CONVERSION_ID_PATTERN.test(value.trim());
export const isValidGoogleAdsPurchaseConversionLabel = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed.length <= GOOGLE_ADS_PURCHASE_CONVERSION_LABEL_MAX_LENGTH;
};
