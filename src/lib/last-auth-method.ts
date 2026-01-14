'use client';

export type LastAuthMethod = 'google' | 'password';

const STORAGE_KEY = 'auth:last_used';

type StoredValue = {
    method: LastAuthMethod;
    at: number;
};

export function getLastAuthMethod(): StoredValue | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<StoredValue>;
        if (!parsed || (parsed.method !== 'google' && parsed.method !== 'password')) return null;
        if (typeof parsed.at !== 'number') return null;
        return { method: parsed.method, at: parsed.at };
    } catch {
        return null;
    }
}

export function setLastAuthMethod(method: LastAuthMethod) {
    if (typeof window === 'undefined') return;
    try {
        const value: StoredValue = { method, at: Date.now() };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // ignore storage errors (private mode, etc.)
    }
}

