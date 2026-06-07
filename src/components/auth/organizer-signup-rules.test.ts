import { describe, expect, it } from 'vitest';

import {
    buildOrganizerSignupPayload,
    createOrganizerSignupForm,
    validateOrganizerSignupStep,
} from './organizer-signup-rules';

const completeForm = {
    ...createOrganizerSignupForm(),
    email: 'organiser@example.com',
    password: 'ValidPassword123!',
    name: '  Amina Khan  ',
    gender: 'female' as const,
    dateOfBirth: '1990-06-07',
    organizerName: '  Amina Events  ',
    organizerType: 'charity' as const,
    organizerCharityNumber: '  123456  ',
    organizerContactEmail: '  BOOKINGS@EXAMPLE.COM  ',
    organizerCountry: 'GB',
    organizerCity: '  London  ',
    organizerCurrency: 'GBP',
    organizerTimezone: 'Europe/London',
};

describe('organiser signup rules', () => {
    it('uses the same field defaults for every organiser presentation', () => {
        expect(createOrganizerSignupForm({
            email: 'person@example.com',
            name: 'Person Name',
        })).toEqual({
            email: 'person@example.com',
            password: '',
            name: 'Person Name',
            gender: '',
            dateOfBirth: '',
            organizerName: '',
            organizerType: 'individual',
            organizerCharityNumber: '',
            organizerContactEmail: '',
            organizerCountry: '',
            organizerCity: '',
            organizerCurrency: 'GBP',
            organizerTimezone: 'Europe/London',
        });
    });

    it('does not let unresolved optional prefill values erase field defaults', () => {
        expect(createOrganizerSignupForm({
            email: undefined,
            name: undefined,
        })).toMatchObject({
            email: '',
            name: '',
        });
    });

    it('requires a password for registration but not authenticated onboarding', () => {
        const form = {
            ...completeForm,
            password: '',
        };

        expect(validateOrganizerSignupStep('credentials', form, {
            authenticated: false,
            acceptedTerms: false,
        })).toMatchObject({ error: expect.stringContaining('Password') });

        expect(validateOrganizerSignupStep('credentials', form, {
            authenticated: true,
            acceptedTerms: false,
        })).toEqual({
            form: expect.objectContaining({
                email: 'organiser@example.com',
                name: 'Amina Khan',
            }),
        });
    });

    it('normalizes organisation fields with the modal validation rules', () => {
        expect(validateOrganizerSignupStep('organization', completeForm, {
            authenticated: false,
            acceptedTerms: false,
        })).toEqual({
            form: expect.objectContaining({
                organizerName: 'Amina Events',
                organizerCharityNumber: '123456',
                organizerContactEmail: 'BOOKINGS@EXAMPLE.COM',
            }),
        });
    });

    it('requires terms at the currency step', () => {
        expect(validateOrganizerSignupStep('currency', completeForm, {
            authenticated: false,
            acceptedTerms: false,
        })).toEqual({
            error: 'You must accept the Terms of Use to create an account',
        });
    });

    it('builds identical regular and referral payloads except for explicit referral opt-in', () => {
        const regularPayload = buildOrganizerSignupPayload(completeForm, {
            acceptedTerms: true,
            authenticated: false,
            heightsprReferral: false,
        });
        const referralPayload = buildOrganizerSignupPayload(completeForm, {
            acceptedTerms: true,
            authenticated: false,
            heightsprReferral: true,
        });

        expect(regularPayload).not.toHaveProperty('heightsprReferral');
        expect(referralPayload).toEqual({
            ...regularPayload,
            heightsprReferral: true,
        });
        expect(referralPayload).toMatchObject({
            email: 'organiser@example.com',
            password: 'ValidPassword123!',
            name: 'Amina Khan',
            isOrganizer: true,
            homeCountry: 'GB',
            homeCity: 'London',
            organizer: {
                name: 'Amina Events',
                type: 'charity',
                charityNumber: '123456',
                replyToEmail: 'BOOKINGS@EXAMPLE.COM',
                country: 'GB',
                city: 'London',
                currency: 'GBP',
                timezone: 'Europe/London',
            },
        });
    });

    it('omits passwords from authenticated onboarding payloads', () => {
        expect(buildOrganizerSignupPayload(completeForm, {
            acceptedTerms: true,
            authenticated: true,
            heightsprReferral: true,
        })).not.toHaveProperty('password');
    });
});
