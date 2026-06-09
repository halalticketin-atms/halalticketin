import { describe, expect, it } from 'vitest';

import {
    getAuthCallbackUrl,
    getOrganizerPaymentSetupPath,
    resolveAuthOnboardingPath,
    resolveOrganizerEmailVerificationContinuation,
    resolveSingleOrganizerPaymentSetupSelection,
} from './auth-onboarding-continuation';

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

    it('builds a payment setup path with an optional organizer selection', () => {
        expect(getOrganizerPaymentSetupPath()).toBe('/settings?tab=payments');
        expect(getOrganizerPaymentSetupPath('org_123')).toBe(
            '/settings?tab=payments&organizerId=org_123',
        );
    });

    it('sends organiser email-confirmation continuations to payment setup', () => {
        expect(resolveOrganizerEmailVerificationContinuation({
            role: 'organizer',
            isInviteFlow: false,
            organizerId: 'org_123',
            fallbackPath: '/dashboard',
        })).toBe('/settings?tab=payments&organizerId=org_123');
    });

    it('does not replace buyer or invite email-confirmation continuations', () => {
        expect(resolveOrganizerEmailVerificationContinuation({
            role: 'buyer',
            isInviteFlow: false,
            organizerId: null,
            fallbackPath: '/events',
        })).toBe('/events');

        expect(resolveOrganizerEmailVerificationContinuation({
            role: 'organizer',
            isInviteFlow: true,
            organizerId: 'org_123',
            fallbackPath: '/invitations/accept?token=invite-token-123',
        })).toBe('/invitations/accept?token=invite-token-123');
    });

    it('preserves safe callback continuations for verification resends', () => {
        expect(getAuthCallbackUrl(
            'https://halalticketin.test',
            '/settings?tab=payments&organizerId=org_123',
        )).toBe(
            'https://halalticketin.test/auth/callback?next=%2Fsettings%3Ftab%3Dpayments%26organizerId%3Dorg_123',
        );

        expect(getAuthCallbackUrl(
            'https://halalticketin.test',
            '/dashboard#top',
        )).toBe(
            'https://halalticketin.test/auth/callback?next=%2Fdashboard%23top',
        );

        expect(getAuthCallbackUrl(
            'https://halalticketin.test',
            'https://evil.example/settings',
        )).toBe('https://halalticketin.test/auth/callback');
    });

    it('rejects protocol-relative and slash-backslash callback continuations', () => {
        expect(getAuthCallbackUrl(
            'https://halalticketin.test',
            '//evil.example',
        )).toBe('https://halalticketin.test/auth/callback');

        expect(getAuthCallbackUrl(
            'https://halalticketin.test',
            '/\\evil.example',
        )).toBe('https://halalticketin.test/auth/callback');
    });

    it('does not carry unsafe continuation paths into onboarding redirects', () => {
        expect(resolveOrganizerEmailVerificationContinuation({
            role: 'buyer',
            isInviteFlow: false,
            organizerId: null,
            fallbackPath: '//evil.example',
        })).toBeUndefined();

        expect(resolveAuthOnboardingPath({
            role: 'buyer',
            continuationPath: '/\\evil.example',
            inviteToken: null,
        })).toBe('/register?role=buyer');
    });

    it('selects the sole active organiser for unscoped payment setup links', () => {
        expect(resolveSingleOrganizerPaymentSetupSelection({
            requestedTab: 'payments',
            requestedOrganizerId: null,
            activeOrganizerId: null,
            activeOrganizerIds: ['org_123'],
        })).toBe('org_123');

        expect(resolveSingleOrganizerPaymentSetupSelection({
            requestedTab: 'payments',
            requestedOrganizerId: null,
            activeOrganizerId: 'org_123',
            activeOrganizerIds: ['org_123'],
        })).toBeNull();

        expect(resolveSingleOrganizerPaymentSetupSelection({
            requestedTab: 'payments',
            requestedOrganizerId: null,
            activeOrganizerId: 'org_old',
            activeOrganizerIds: ['org_old', 'org_new'],
        })).toBeNull();
    });
});
