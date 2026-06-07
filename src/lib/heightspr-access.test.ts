import { describe, expect, it } from 'vitest';

import { getHeightsPrAccess } from './heightspr-access';

describe('HeightsPR signup access', () => {
    it('allows signed-out visitors', () => {
        expect(getHeightsPrAccess({
            authLoading: false,
            user: null,
            memberships: [],
        })).toBe('allowed');
    });

    it('allows signed-in accounts without an organiser membership', () => {
        expect(getHeightsPrAccess({
            authLoading: false,
            user: { id: 'user_1' },
            memberships: [],
        })).toBe('allowed');
    });

    it('blocks active and pending organiser members', () => {
        for (const status of ['active', 'pending']) {
            expect(getHeightsPrAccess({
                authLoading: false,
                user: { id: 'user_1' },
                memberships: [{ status }],
            })).toBe('blocked');
        }
    });

    it('does not block a removed historical membership', () => {
        expect(getHeightsPrAccess({
            authLoading: false,
            user: { id: 'user_1' },
            memberships: [{ status: 'removed' }],
        })).toBe('allowed');
    });

    it('waits until auth has resolved before rendering the portal', () => {
        expect(getHeightsPrAccess({
            authLoading: true,
            user: null,
            memberships: [],
        })).toBe('loading');
    });
});
