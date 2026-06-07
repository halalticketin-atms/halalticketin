import { describe, expect, it } from 'vitest';

import { resolveAuthOnboardingPath } from './auth-onboarding-continuation';

describe('auth onboarding continuation', () => {
    it('returns HeightsPR OAuth users to the referral portal', () => {
        expect(resolveAuthOnboardingPath({
            role: 'organizer',
            continuationPath: '/heightspr',
            inviteToken: null,
        })).toBe('/heightspr');
    });

    it('keeps normal onboarding and invitations on the regular register route', () => {
        expect(resolveAuthOnboardingPath({
            role: 'organizer',
            continuationPath: '/dashboard',
            inviteToken: 'invite-token-123',
        })).toBe(
            '/register?role=organizer&next=%2Fdashboard&inviteToken=invite-token-123',
        );
    });
});
