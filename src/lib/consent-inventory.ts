 

export type ConsentCategoryId = 'essential' | 'marketing';

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
        id: 'marketing',
        label: 'Marketing storage',
        description:
            'Lets event organisers understand how people find their events using Meta Pixel. After you opt in, Meta tooling may load; we only initialise organiser pixels and send tracking events on public event and checkout pages.',
        required: false
    }
];

export const FIRST_PARTY_COOKIES: FirstPartyCookie[] = [
    {
        name: CONSENT_COOKIE_NAME,
        purpose:
            'Remembers whether you opted into marketing storage so optional scripts stay on/off across visits in this browser. For signed-in users, we also sync consent to your account preferences.',
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
        purpose: 'Stops duplicate Meta Pixel “Purchase” events by remembering which orders already fired.',
        retention: 'One flag per order that stays until you clear browser storage.',
        categoryId: 'essential'
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
    }
];

export const getConsentCategory = (id: ConsentCategoryId) => CONSENT_CATEGORIES.find((category) => category.id === id);
