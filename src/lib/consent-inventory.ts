 

export type ConsentCategoryId = 'essential' | 'analytics' | 'marketing';

export interface ConsentCategory {
    id: ConsentCategoryId;
    label: string;
    description: string;
    required: boolean;
}

export interface FirstPartyCookie {
    name: string;
    purpose: string;
    retention: string;
    categoryId: ConsentCategoryId;
}

export interface BrowserStorageItem {
    key: string;
    storage: 'localStorage' | 'sessionStorage';
    purpose: string;
    retention: string;
    categoryId: ConsentCategoryId;
}

export interface ThirdPartyTechnology {
    name: string;
    provider: string;
    host: string;
    cookies: string[];
    purpose: string;
    runsWhen: string;
    categoryId: ConsentCategoryId;
}

export interface ServerSideMarketingTechnology {
    name: string;
    provider: string;
    endpoint: string;
    purpose: string;
    dataShared: string;
    runsWhen: string;
    categoryId: 'marketing';
}

export const CONSENT_COOKIE_NAME = 'ht_consent';
export const CONSENT_COOKIE_MAX_AGE_DAYS = 180;

export const CONSENT_CATEGORIES: ConsentCategory[] = [
    {
        id: 'essential',
        label: 'Essential storage',
        description:
            "Keeps Halal Ticketin' functioning by remembering your consent choice, keeping you signed in, securing account and invitation flows, and preventing duplicate purchase tracking. This runs on every visit.",
        required: true
    },
    {
        id: 'analytics',
        label: 'Analytics storage',
        description:
            'Lets event organisers measure event page and checkout performance using Google Analytics. After you opt in, Google Analytics tooling may load only on public event and checkout pages where an organiser has configured a GA4 Measurement ID.',
        required: false
    },
    {
        id: 'marketing',
        label: 'Marketing storage',
        description:
            'Lets event organisers understand how people find their events using advertising tools such as Meta Pixel, TikTok Pixel, and Google Ads. After you opt in, we only initialise organiser destinations and send tracking events on public event and checkout pages.',
        required: false
    }
];

export const FIRST_PARTY_COOKIES: FirstPartyCookie[] = [
    {
        name: CONSENT_COOKIE_NAME,
        purpose:
            'Remembers whether you opted into analytics and marketing storage so optional scripts stay on/off across visits in this browser. For signed-in users, we also sync consent to your account preferences.',
        retention: `${CONSENT_COOKIE_MAX_AGE_DAYS} days`,
        categoryId: 'essential'
    }
];

export const BROWSER_STORAGE_ITEMS: BrowserStorageItem[] = [
    {
        key: 'sb-{project-ref}-auth-token',
        storage: 'localStorage',
        purpose: 'Stores your Supabase session payload so social login callbacks and session refresh can complete.',
        retention: 'Until sign-out, session expiry, or manual browser-storage clearing.',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin-access-token',
        storage: 'localStorage',
        purpose: "Stores your Halal Ticketin' API token so you remain signed in without needing cookies.",
        retention: 'Cleared when you sign out or manually clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin-refresh-token',
        storage: 'localStorage',
        purpose: 'Renews your sign-in session when access tokens expire, so you stay signed in without interruptions.',
        retention: 'Cleared when you sign out or manually clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin:last-organizer-id',
        storage: 'localStorage',
        purpose: 'Remembers the organiser workspace you last selected so dashboards open to the right team.',
        retention: 'Until you switch organisers or clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin:exchange-rates',
        storage: 'localStorage',
        purpose: 'Caches exchange rates for up to 30 minutes to avoid unnecessary API calls.',
        retention: 'Automatically refreshed every 30 minutes or when you clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'auth:last_used',
        storage: 'localStorage',
        purpose: 'Remembers the last sign-in method (password or Google) to streamline future sign-in flows.',
        retention: 'Until replaced with a new value or cleared from browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin:pending-invite',
        storage: 'localStorage',
        purpose: 'Temporarily stores invitation context so account creation/sign-in can continue into invitation acceptance.',
        retention: 'Automatically removed after use or expiry (up to 7 days).',
        categoryId: 'essential'
    },
    {
        key: 'halal-ticketin:pending-organizer-avatar',
        storage: 'localStorage',
        purpose: 'Temporarily stores a draft organizer avatar during registration until upload completes.',
        retention: 'Removed after upload attempt or manual browser-storage clearing.',
        categoryId: 'essential'
    },
    {
        key: 'halalticketin:pending-draft',
        storage: 'sessionStorage',
        purpose: 'Temporarily holds a drafted event while you move between creation screens in the same tab.',
        retention: 'Removed when you close the tab or finish the draft.',
        categoryId: 'essential'
    },
    {
        key: 'halalticketin:event-edit-recovery:{eventId}',
        storage: 'sessionStorage',
        purpose:
            'Temporarily stores unsaved event edits in the current browser tab so organisers can recover work after refreshes, route reloads, or tab visibility changes.',
        retention: 'Removed when you close the tab, discard the recovered edits, or save/publish the event.',
        categoryId: 'essential'
    },
    {
        key: 'checkout_draft_{eventId}',
        storage: 'sessionStorage',
        purpose: 'Temporarily stores in-progress public checkout form details per event to support tab refresh recovery.',
        retention: 'Expires after 30 minutes in-tab or when checkout completes.',
        categoryId: 'essential'
    },
    {
        key: 'ht_embed_consent',
        storage: 'sessionStorage',
        purpose: 'Stores consent preference for embedded checkout/event experiences in the current tab session.',
        retention: 'Removed when the embed tab is closed.',
        categoryId: 'essential'
    },
    {
        key: 'ht_purchase_tracked:{orderId}',
        storage: 'localStorage',
        purpose:
            'Legacy flag that stops duplicate Meta Pixel “Purchase” events by remembering which orders already fired.',
        retention: 'One legacy flag per order that stays until you clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'ht_purchase_tracked:{provider}:{orderId}',
        storage: 'localStorage',
        purpose:
            'Stops duplicate optional purchase events by remembering which provider already received a purchase event for an order.',
        retention: 'One flag per order that stays until you clear browser storage.',
        categoryId: 'essential'
    },
    {
        key: 'ht_data_layer_purchase_tracked:{orderId}',
        storage: 'localStorage',
        purpose:
            'Stops duplicate first-party data layer purchase events by remembering which orders already pushed a purchase event.',
        retention: 'One flag per order that stays until you clear browser storage.',
        categoryId: 'essential'
    }
];

export const ANALYTICS_TECHNOLOGIES: ThirdPartyTechnology[] = [
    {
        name: 'Google Analytics 4',
        provider: 'Event organisers via Google',
        host: 'https://www.googletagmanager.com',
        cookies: ['_ga', '_ga_{container-id}'],
        purpose:
            'Allows organisers to measure event page views, checkout starts, and purchases in their own Google Analytics property.',
        runsWhen:
            'The Google tag library can load after you enable analytics or marketing storage. We configure GA4 and send GA4 events only after analytics storage is enabled and only where an organiser has configured a GA4 Measurement ID.',
        categoryId: 'analytics'
    }
];

export const MARKETING_TECHNOLOGIES: ThirdPartyTechnology[] = [
    {
        name: 'Meta Pixel',
        provider: 'Event organisers via Meta',
        host: 'https://connect.facebook.net',
        cookies: ['_fbp', '_fbc'],
        purpose: 'Allows organisers to attribute their ad spend by measuring page views, checkout starts, and purchases.',
        runsWhen:
            'Loaded after you enable marketing storage; we only initialise a pixel and send Meta events on public event and checkout pages where an organiser has configured a Meta Pixel ID.',
        categoryId: 'marketing'
    },
    {
        name: 'TikTok Pixel',
        provider: 'Event organisers via TikTok',
        host: 'https://analytics.tiktok.com',
        cookies: ['_ttp', '_tt_enable_cookie'],
        purpose:
            'Allows organisers to measure event page views, checkout activity, and purchases for TikTok advertising attribution.',
        runsWhen:
            'Loaded after you enable marketing storage; we only initialise a pixel and send TikTok events on public event and checkout pages where an organiser has configured a TikTok Pixel ID.',
        categoryId: 'marketing'
    },
    {
        name: 'Google Ads',
        provider: 'Event organisers via Google',
        host: 'https://www.googletagmanager.com',
        cookies: ['_gcl_au', '_gcl_aw'],
        purpose:
            'Allows organisers to measure completed ticket purchases as conversions in their own Google Ads account.',
        runsWhen:
            'Loaded after you enable marketing storage; we only configure and send purchase conversions where an organiser has configured a Google Ads conversion ID and purchase label.',
        categoryId: 'marketing'
    }
];

export const OPTIONAL_TECHNOLOGIES: ThirdPartyTechnology[] = [
    ...ANALYTICS_TECHNOLOGIES,
    ...MARKETING_TECHNOLOGIES
];

export const SERVER_SIDE_MARKETING_TECHNOLOGIES: ServerSideMarketingTechnology[] = [
    {
        name: 'Meta Conversions API',
        provider: 'Event organisers via Meta',
        endpoint: 'https://graph.facebook.com',
        purpose:
            'Allows organisers to measure completed purchases in Meta Events Manager when browser tracking is blocked or unavailable.',
        dataShared:
            'Purchase event details, order and ticket identifiers, purchase value and currency, hashed attendee email, browser identifiers where present, IP address, user agent, and event page URL.',
        runsWhen:
            'Only after marketing storage is accepted, only for completed purchases, and only where the organiser has configured a Meta Pixel ID and Conversions API token.',
        categoryId: 'marketing'
    },
    {
        name: 'TikTok Events API',
        provider: 'Event organisers via TikTok',
        endpoint: 'https://business-api.tiktok.com',
        purpose:
            'Allows organisers to measure completed purchases in TikTok Events Manager when browser tracking is blocked or unavailable.',
        dataShared:
            'Purchase event details, order and ticket identifiers, purchase value and currency, hashed attendee email, browser identifiers where present, IP address, user agent, and event page URL.',
        runsWhen:
            'Only after marketing storage is accepted, only for completed purchases, and only where the organiser has configured a TikTok Pixel ID and Events API token.',
        categoryId: 'marketing'
    }
];

export const getConsentCategory = (id: ConsentCategoryId) => CONSENT_CATEGORIES.find((category) => category.id === id);
