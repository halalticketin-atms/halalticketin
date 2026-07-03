'use client';

// First-party campaign attribution: UTM labels are aggregate campaign
// identifiers, not personal data, so they are captured without consent
// gating and stored on the order for organizer revenue reporting.

const UTM_STORAGE_KEY = 'ht_utm_params';
const UTM_VALUE_MAX_LENGTH = 255;

export interface StoredUtmParams {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

const readParam = (params: URLSearchParams, name: string): string | undefined => {
    const value = params.get(name)?.trim();
    return value ? value.slice(0, UTM_VALUE_MAX_LENGTH) : undefined;
};

const sanitizeStoredValue = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim()
        ? value.trim().slice(0, UTM_VALUE_MAX_LENGTH)
        : undefined;

export const captureUtmParams = () => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const params = new URLSearchParams(window.location.search);
        const captured: StoredUtmParams = {
            utmSource: readParam(params, 'utm_source'),
            utmMedium: readParam(params, 'utm_medium'),
            utmCampaign: readParam(params, 'utm_campaign'),
        };

        // Last-touch within the session: only overwrite when this URL carries
        // UTM params of its own.
        if (!captured.utmSource && !captured.utmMedium && !captured.utmCampaign) {
            return;
        }

        window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(captured));
    } catch {
        // Ignore storage/URL errors (e.g., privacy mode).
    }
};

export const getStoredUtmParams = (): StoredUtmParams => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const stored: StoredUtmParams = {};
        const utmSource = sanitizeStoredValue(parsed.utmSource);
        const utmMedium = sanitizeStoredValue(parsed.utmMedium);
        const utmCampaign = sanitizeStoredValue(parsed.utmCampaign);
        if (utmSource) {
            stored.utmSource = utmSource;
        }
        if (utmMedium) {
            stored.utmMedium = utmMedium;
        }
        if (utmCampaign) {
            stored.utmCampaign = utmCampaign;
        }
        return stored;
    } catch {
        return {};
    }
};
