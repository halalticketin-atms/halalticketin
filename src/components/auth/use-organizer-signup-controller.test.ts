import { describe, expect, it, vi } from 'vitest';

import { createOrganizerSignupForm } from './organizer-signup-rules';
import {
    getOrganizerAvatarError,
    ORGANIZER_SIGNUP_STEPS,
    requestOrganizerStripeConnect,
    resendOrganizerVerificationEmail,
    submitOrganizerSignup,
} from './use-organizer-signup-controller';

const form = {
    ...createOrganizerSignupForm(),
    email: 'organiser@example.com',
    password: 'ValidPassword123!',
    name: 'Amina Khan',
    gender: 'female' as const,
    dateOfBirth: '1990-06-07',
    organizerName: 'Amina Events',
    organizerType: 'organization' as const,
    organizerContactEmail: 'bookings@example.com',
    organizerCountry: 'GB',
    organizerCity: 'London',
    organizerCurrency: 'GBP',
    organizerTimezone: 'Europe/London',
};

function createDependencies() {
    return {
        post: vi.fn(),
        refresh: vi.fn().mockResolvedValue(undefined),
        setAuthToken: vi.fn(),
        setLastAuthMethod: vi.fn(),
        uploadOrganizerAvatar: vi.fn().mockResolvedValue(undefined),
        fileToDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,logo'),
        storePendingAvatar: vi.fn(),
    };
}

describe('organiser signup controller submission', () => {
    it('registers new organisers, signs them in, refreshes auth, and uploads their logo', async () => {
        const dependencies = createDependencies();
        const avatar = new File(['logo'], 'logo.png', { type: 'image/png' });
        dependencies.post
            .mockResolvedValueOnce({
                organizerId: 'org_123',
                requiresEmailConfirmation: false,
            })
            .mockResolvedValueOnce({
                accessToken: 'access_123',
            });

        const result = await submitOrganizerSignup({
            form,
            acceptedTerms: true,
            authenticated: false,
            heightsprReferral: false,
            avatarFile: avatar,
            avatarPreview: '',
        }, dependencies);

        expect(dependencies.post).toHaveBeenNthCalledWith(
            1,
            '/api/v1/auth/register',
            expect.not.objectContaining({ heightsprReferral: expect.anything() }),
        );
        expect(dependencies.post).toHaveBeenNthCalledWith(2, '/api/v1/auth/login', {
            email: 'organiser@example.com',
            password: 'ValidPassword123!',
        });
        expect(dependencies.setAuthToken).toHaveBeenCalledWith('access_123');
        expect(dependencies.setLastAuthMethod).toHaveBeenCalledWith('password');
        expect(dependencies.refresh).toHaveBeenCalledTimes(2);
        expect(dependencies.uploadOrganizerAvatar).toHaveBeenCalledWith('org_123', avatar);
        expect(result).toEqual({
            organizerId: 'org_123',
            requiresEmailConfirmation: false,
        });
    });

    it('uses authenticated onboarding and includes the referral marker only when enabled', async () => {
        const dependencies = createDependencies();
        dependencies.post.mockResolvedValue({
            organizerId: 'org_456',
        });

        await submitOrganizerSignup({
            form,
            acceptedTerms: true,
            authenticated: true,
            heightsprReferral: true,
            avatarFile: null,
            avatarPreview: '',
        }, dependencies);

        expect(dependencies.post).toHaveBeenCalledOnce();
        expect(dependencies.post).toHaveBeenCalledWith(
            '/api/v1/auth/onboarding',
            expect.objectContaining({
                heightsprReferral: true,
                isOrganizer: true,
            }),
        );
        expect(dependencies.post.mock.calls[0]?.[1]).not.toHaveProperty('password');
        expect(dependencies.refresh).toHaveBeenCalledOnce();
    });

    it('defers logo upload when email confirmation is required', async () => {
        const dependencies = createDependencies();
        const avatar = new File(['logo'], 'logo.png', { type: 'image/png' });
        dependencies.post.mockResolvedValue({
            organizerId: 'org_pending',
            requiresEmailConfirmation: true,
        });

        const result = await submitOrganizerSignup({
            form,
            acceptedTerms: true,
            authenticated: false,
            heightsprReferral: true,
            avatarFile: avatar,
            avatarPreview: '',
        }, dependencies);

        expect(dependencies.fileToDataUrl).toHaveBeenCalledWith(avatar);
        expect(dependencies.storePendingAvatar).toHaveBeenCalledWith({
            organizerId: 'org_pending',
            dataUrl: 'data:image/png;base64,logo',
        });
        expect(dependencies.uploadOrganizerAvatar).not.toHaveBeenCalled();
        expect(dependencies.post).toHaveBeenCalledOnce();
        expect(result.requiresEmailConfirmation).toBe(true);
    });
});

describe('organiser signup controller continuations', () => {
    it('uses four organiser setup steps without personal demographic details', () => {
        expect(ORGANIZER_SIGNUP_STEPS).toEqual([
            'credentials',
            'organization',
            'location',
            'currency',
        ]);
    });

    it('shares logo validation rules across signup presentations', () => {
        expect(
            getOrganizerAvatarError(new File(['logo'], 'logo.svg', { type: 'image/svg+xml' })),
        ).toBe('Please upload a JPG, PNG, GIF, or WebP image');
        expect(
            getOrganizerAvatarError(
                new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'logo.png', {
                    type: 'image/png',
                }),
            ),
        ).toBe('Image must be 5MB or less');
        expect(
            getOrganizerAvatarError(new File(['logo'], 'logo.png', { type: 'image/png' })),
        ).toBeNull();
    });

    it('returns the Stripe continuation URL and rejects missing URLs', async () => {
        const post = vi.fn().mockResolvedValue({ connectUrl: 'https://connect.stripe.test/abc' });

        await expect(requestOrganizerStripeConnect('org_123', post)).resolves.toBe(
            'https://connect.stripe.test/abc',
        );
        expect(post).toHaveBeenCalledWith(
            '/api/v1/organizers/org_123/stripe/connect-link',
            undefined,
        );

        post.mockResolvedValueOnce({});
        await expect(requestOrganizerStripeConnect('org_123', post)).rejects.toThrow(
            'Unable to get Stripe connect URL',
        );
    });

    it('resends verification with the shared callback continuation', async () => {
        const resend = vi.fn().mockResolvedValue({ error: null });

        await resendOrganizerVerificationEmail(
            {
                email: 'organiser@example.com',
                redirectAfterComplete: '/heightspr',
                origin: 'https://halalticketin.test',
            },
            resend,
        );

        expect(resend).toHaveBeenCalledWith({
            type: 'signup',
            email: 'organiser@example.com',
            options: {
                emailRedirectTo:
                    'https://halalticketin.test/auth/callback?next=%2Fheightspr',
            },
        });
    });

    it('drops unsafe verification callback continuations', async () => {
        const resend = vi.fn().mockResolvedValue({ error: null });

        await resendOrganizerVerificationEmail(
            {
                email: 'organiser@example.com',
                redirectAfterComplete: '//evil.example',
                origin: 'https://halalticketin.test',
            },
            resend,
        );

        expect(resend).toHaveBeenCalledWith({
            type: 'signup',
            email: 'organiser@example.com',
            options: {
                emailRedirectTo: 'https://halalticketin.test/auth/callback',
            },
        });
    });
});
