declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
        __htGoogleTagInitialized?: boolean;
        __htConfiguredGoogleTagDestinations?: Set<string>;
    }
}

const GOOGLE_TAG_SCRIPT_SELECTOR = 'script[data-ht-google-tag="true"]';

const getOrCreateGtag = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    window.dataLayer = window.dataLayer ?? [];
    if (typeof window.gtag !== 'function') {
        window.gtag = (...args: unknown[]) => {
            window.dataLayer?.push(args);
        };
    }

    if (!window.__htGoogleTagInitialized) {
        window.gtag('js', new Date());
        window.__htGoogleTagInitialized = true;
    }

    return window.gtag;
};

const ensureGoogleTagLibrary = (destinationId: string) => {
    if (typeof document === 'undefined' || document.querySelector(GOOGLE_TAG_SCRIPT_SELECTOR)) {
        return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(destinationId)}`;
    script.dataset.htGoogleTag = 'true';
    document.head.appendChild(script);
};

export interface GoogleTagConsentState {
    analyticsAllowed: boolean;
    marketingAllowed: boolean;
}

const buildGoogleConsentUpdate = ({
    analyticsAllowed,
    marketingAllowed,
}: GoogleTagConsentState) => ({
    analytics_storage: analyticsAllowed ? 'granted' : 'denied',
    ad_storage: marketingAllowed ? 'granted' : 'denied',
    ad_user_data: marketingAllowed ? 'granted' : 'denied',
    ad_personalization: marketingAllowed ? 'granted' : 'denied',
});

export const configureGoogleTagDestination = (
    destinationId: string,
    consent?: GoogleTagConsentState,
) => {
    if (!destinationId) {
        return null;
    }

    const gtag = getOrCreateGtag();
    if (!gtag) {
        return null;
    }

    ensureGoogleTagLibrary(destinationId);
    if (consent) {
        gtag('consent', 'update', buildGoogleConsentUpdate(consent));
    }
    window.__htConfiguredGoogleTagDestinations =
        window.__htConfiguredGoogleTagDestinations ?? new Set<string>();

    if (!window.__htConfiguredGoogleTagDestinations.has(destinationId)) {
        gtag('config', destinationId, { send_page_view: false });
        window.__htConfiguredGoogleTagDestinations.add(destinationId);
    }

    return gtag;
};
