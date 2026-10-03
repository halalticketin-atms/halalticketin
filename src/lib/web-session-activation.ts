import { WEB_SESSION_ACTIVATION_COOKIE } from './web-session-types';

export const WEB_SESSION_NONCE_STORAGE_KEY = 'halal-ticketin:web-session-nonce';
export const WEB_SESSION_BINDING_STORAGE_KEY = 'halal-ticketin:web-session-binding';
export function hasWebSessionCredentialBinding(token: string | null) {
    if (typeof window === 'undefined' || !token) return false;
    try { return window.localStorage.getItem(WEB_SESSION_BINDING_STORAGE_KEY) === token; } catch { return false; }
}
const listeners = new Set<() => void>();
export const notifyWebSession = () => listeners.forEach(listener => listener());
export const subscribeWebSession = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

export function setWebSessionActivation(nonce: string | null) {
    if (typeof document === 'undefined') return;
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${WEB_SESSION_ACTIVATION_COOKIE}=${nonce ?? ''}; Path=/; SameSite=Lax${secure}${nonce ? '' : '; Max-Age=0'}`;
}

/** Disable SSR before shared credentials change, even when the network is offline. */
export function invalidateWebSessionActivation() {
    setWebSessionActivation(null);
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.removeItem(WEB_SESSION_NONCE_STORAGE_KEY);
            window.localStorage.removeItem(WEB_SESSION_BINDING_STORAGE_KEY);
        } catch { /* Cookie already disabled. */ }
    }
    notifyWebSession();
}
