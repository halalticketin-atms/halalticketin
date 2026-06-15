import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasTrackedProviderPurchase, markProviderPurchaseTracked } from './purchase-dedupe';

class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
        return this.store.size;
    }

    clear() {
        this.store.clear();
    }

    getItem(key: string) {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number) {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.store.delete(key);
    }

    setItem(key: string, value: string) {
        this.store.set(key, value);
    }
}

describe('provider purchase dedupe', () => {
    const localStorage = new MemoryStorage();

    beforeEach(() => {
        vi.stubGlobal('window', { localStorage });
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('uses provider-specific keys so Meta, GA4, and TikTok do not block each other', () => {
        expect(hasTrackedProviderPurchase('meta', 'order_123')).toBe(false);
        markProviderPurchaseTracked('meta', 'order_123');

        expect(hasTrackedProviderPurchase('meta', 'order_123')).toBe(true);
        expect(hasTrackedProviderPurchase('ga4', 'order_123')).toBe(false);
        expect(hasTrackedProviderPurchase('tiktok', 'order_123')).toBe(false);
    });
});
