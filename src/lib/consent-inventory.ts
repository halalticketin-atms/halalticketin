 

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
            "Keeps Halal Ticketin' functioning by remembering your consent choice, keeping you signed in, caching exchange rates, and preventing duplicate purchase tracking. This runs on every visit.",
        required: true
    },
    {
        id: 'marketing',
        label: 'Marketing storage',
        description:
            'Lets event organisers understand how people find their events using Meta Pixel. We only activate it on public + checkout pages after you opt in.',
        required: false
    }
];

export const FIRST_PARTY_COOKIES: FirstPartyCookie[] = [
    {
        name: CONSENT_COOKIE_NAME,
        purpose: 'Remembers whether you opted into marketing storage so we can keep showing (or hiding) optional scripts across visits and devices.',
        retention: `${CONSENT_COOKIE_MAX_AGE_DAYS} days`,
        categoryId: 'essential'
    }
];

export const BROWSER_STORAGE_ITEMS: BrowserStorageItem[] = [
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
        key: 'halalticketin:pending-draft',
        storage: 'sessionStorage',
        purpose: 'Temporarily holds a drafted event while you move between creation screens in the same tab.',
        retention: 'Removed when you close the tab or finish the draft.',
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
        runsWhen: 'Only injected on public event and checkout pages after you enable marketing storage.',
        categoryId: 'marketing'
    }
];

export const getConsentCategory = (id: ConsentCategoryId) => CONSENT_CATEGORIES.find((category) => category.id === id);
