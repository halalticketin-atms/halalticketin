'use client';

import { getAuthSessionRevision, getAuthToken, subscribeAuthSession } from './api';
import { WEB_SESSION_ACTIVATION_COOKIE, WEB_SESSION_NONCE_PATTERN } from './web-session-types';
import { hasWebSessionCredentialBinding, WEB_SESSION_BINDING_STORAGE_KEY, invalidateWebSessionActivation, notifyWebSession, setWebSessionActivation, subscribeWebSession, WEB_SESSION_NONCE_STORAGE_KEY } from './web-session-activation';

export { subscribeWebSession };
let writes: Promise<unknown> = Promise.resolve();
let acknowledgedNonce: string | null = null;
let pending: { revision: number; promise: Promise<boolean> } | null = null;

export function isWebSessionSeedCurrent(nonce: string): boolean {
    if (typeof window === 'undefined') return true;
    try {
        if (!hasWebSessionCredentialBinding(getAuthToken()) || !WEB_SESSION_NONCE_PATTERN.test(nonce)) return false;
        const activation = document.cookie.split('; ').find(item => item.startsWith(`${WEB_SESSION_ACTIVATION_COOKIE}=`))?.split('=')[1];
        return activation === nonce && window.localStorage.getItem(WEB_SESSION_NONCE_STORAGE_KEY) === nonce;
    } catch { return false; }
}

async function writeSession(method: 'POST' | 'DELETE', body?: { accessToken: string; nonce: string }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
        const response = await fetch('/api/web-session', {
            method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        return response.ok;
    } catch { return false; }
    finally { clearTimeout(timeout); }
}

export function ensureWebSession(force = false): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    let token: string | null;
    let revision: number;
    try { token = getAuthToken(); revision = getAuthSessionRevision(); } catch { return Promise.resolve(false); }
    if (!token) return Promise.resolve(false);
    if (pending?.revision === revision) return pending.promise;
    let needsRepair = false;
    const promise = writes.then(async () => {
        if (getAuthSessionRevision() !== revision || getAuthToken() !== token) return false;
        const existing = window.localStorage.getItem(WEB_SESSION_NONCE_STORAGE_KEY);
        const matching = existing && hasWebSessionCredentialBinding(token) && WEB_SESSION_NONCE_PATTERN.test(existing);
        if (!force && matching && acknowledgedNonce === existing && isWebSessionSeedCurrent(existing)) return true;
        const nonce = matching ? existing : crypto.randomUUID().replaceAll('-', '');
        if (!matching) {
            setWebSessionActivation(null);
            window.localStorage.setItem(WEB_SESSION_NONCE_STORAGE_KEY, nonce);
            window.localStorage.setItem(WEB_SESSION_BINDING_STORAGE_KEY, token);
            notifyWebSession();
        }
        const acknowledged = await writeSession('POST', { accessToken: token, nonce });
        // Only this current write may activate SSR. Server responses never set the marker.
        if (getAuthSessionRevision() !== revision || getAuthToken() !== token || window.localStorage.getItem(WEB_SESSION_NONCE_STORAGE_KEY) !== nonce) {
            // A different tab may already have written its current cookie. Repair using shared credentials.
            needsRepair = true;
            return false;
        }
        if (acknowledged) {
            acknowledgedNonce = nonce;
            setWebSessionActivation(nonce);
        } else setWebSessionActivation(null);
        notifyWebSession();
        return acknowledged;
    }).catch(() => false);
    writes = promise;
    pending = { revision, promise };
    void promise.finally(() => {
        if (pending?.promise === promise) pending = null;
        if (needsRepair) void ensureWebSession(true);
    });
    return promise;
}

export function invalidateWebSession(): void {
    acknowledgedNonce = null;
    invalidateWebSessionActivation();
    writes = writes.then(async () => {
        // A subsequent sign-in owns its cookie; a delayed logout must not delete it.
        if (!getAuthToken()) {
            await writeSession('DELETE');
            if (getAuthToken()) void ensureWebSession();
        }
    }).catch(() => {});
}

if (typeof window !== 'undefined') {
    subscribeAuthSession(() => { if (getAuthToken()) void ensureWebSession(); else invalidateWebSession(); });
    window.addEventListener('storage', event => {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        if (event.key === 'halal-ticketin-access-token' || event.key === null) {
            getAuthToken();
            if (getAuthToken()) void ensureWebSession(); else invalidateWebSession();
        } else if (event.key === WEB_SESSION_NONCE_STORAGE_KEY || event.key === WEB_SESSION_BINDING_STORAGE_KEY) notifyWebSession();
    });
}
