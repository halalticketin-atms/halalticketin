import type { getSupabase } from './supabase';

type SupabaseClient = ReturnType<typeof getSupabase>;
let client: SupabaseClient | null = null;
let pausedClient: SupabaseClient | null = null;
export const SESSION_RETIREMENT_STORAGE_KEY = 'halal-ticketin:session-retired';
const listeners = new Set<(client: SupabaseClient) => void>();

export function publishSupabaseClient(ready: SupabaseClient) {
    client = ready;
    if (isSupabaseSessionRetired()) retireSupabaseSession();
    listeners.forEach(listener => listener(ready));
}

export function subscribeSupabaseClient(listener: (client: SupabaseClient) => void) {
    listeners.add(listener);
    if (client) listener(client);
    return () => { listeners.delete(listener); };
}

export function getSupabaseStorageKey() {
    const baseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') throw new Error('Invalid Supabase URL');
    return `sb-${baseUrl.hostname.split('.')[0]}-auth-token`;
}

export const API_SESSION_STORAGE_KEYS = ['halal-ticketin-access-token', 'halal-ticketin-refresh-token'] as const;

// Unreadable storage or callback data cannot establish an anonymous session.
export function needsSupabaseSession() {
    try {
        const retired = window.localStorage.getItem(SESSION_RETIREMENT_STORAGE_KEY) === '1';
        if (!retired && window.localStorage.getItem(getSupabaseStorageKey()) !== null) return true;
        const { pathname, search, hash } = window.location;
        if (['/auth/callback', '/reset-password'].includes(pathname.replace(/\/$/, ''))) return true;
        const params = new URLSearchParams(`${search.replace(/^\?/, '')}&${hash.replace(/^#/, '')}`);
        return ['access_token', 'refresh_token', 'code', 'token_hash', 'type', 'error', 'error_code', 'error_description']
            .some(key => params.has(key));
    } catch {
        return true;
    }
}


export function isSupabaseSessionRetired() {
    if (typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(SESSION_RETIREMENT_STORAGE_KEY) === '1'; } catch { return true; }
}

/** Retire local recovery before credentials disappear, including offline sign-out. */
export function retireSupabaseSession() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(SESSION_RETIREMENT_STORAGE_KEY, '1');
        const key = getSupabaseStorageKey();
        [key, `${key}-user`, `${key}-code-verifier`].forEach(item => window.localStorage.removeItem(item));
    } catch { /* Root also rejects recovery when retirement storage is unreadable. */ }
    if (client && pausedClient !== client && typeof client.auth.stopAutoRefresh === 'function') {
        pausedClient = client;
        void client.auth.stopAutoRefresh().catch(() => {});
    }
}

/** Called after authoritative API credentials exist in shared storage. */
export function acceptSupabaseSession(token: string) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(SESSION_RETIREMENT_STORAGE_KEY);
        const stored = window.localStorage.getItem(getSupabaseStorageKey());
        if (client && pausedClient === client && stored && (JSON.parse(stored) as { access_token?: string }).access_token === token) {
            pausedClient = null;
            void client.auth.startAutoRefresh().catch(() => {});
        }
    } catch { /* Credential acceptance remains available without a readable SDK store. */ }
}
