import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    clearPendingInviteContext,
    getPendingInviteContext,
    resolveContinuationPath,
    savePendingInviteContext,
} from './pending-invite';

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

describe('pending invite context', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            localStorage: new MemoryStorage(),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('saves and reads pending invite context with normalized email', () => {
        savePendingInviteContext({
            token: 'invite-token-1234567890',
            invitedEmail: ' INVITED@Example.com ',
            nextPath: '/invitations/accept?token=invite-token-1234567890',
        });

        const context = getPendingInviteContext();
        expect(context).not.toBeNull();
        expect(context?.token).toBe('invite-token-1234567890');
        expect(context?.invitedEmail).toBe('invited@example.com');
        expect(context?.nextPath).toBe('/invitations/accept?token=invite-token-1234567890');
    });

    it('invalidates expired pending invite context', () => {
        const nowSpy = vi.spyOn(Date, 'now');
        nowSpy.mockReturnValue(1_000_000);
        savePendingInviteContext({
            token: 'invite-token-1234567890',
            nextPath: '/invitations/accept?token=invite-token-1234567890',
        });

        nowSpy.mockReturnValue(1_000_000 + 8 * 24 * 60 * 60 * 1000);
        const context = getPendingInviteContext();

        expect(context).toBeNull();
    });

    it('resolves continuation path with explicit-next precedence over pending context', () => {
        const pending = {
            token: 'invite-token-1234567890',
            invitedEmail: 'invitee@example.com',
            nextPath: '/invitations/accept?token=invite-token-1234567890',
            createdAt: Date.now(),
        };

        expect(resolveContinuationPath('/dashboard', pending)).toBe('/dashboard');
        expect(resolveContinuationPath(null, pending)).toBe('/invitations/accept?token=invite-token-1234567890');
    });

    it('clears stored context', () => {
        savePendingInviteContext({
            token: 'invite-token-1234567890',
            nextPath: '/invitations/accept?token=invite-token-1234567890',
        });

        clearPendingInviteContext();
        expect(getPendingInviteContext()).toBeNull();
    });
});
