import { describe, expect, it } from 'vitest';

import {
    getPublicOrganizerContactFormError,
    isPublicOrganizerContactFormValid,
    normalizePublicOrganizerContactForm,
} from './public-organizer-contact';

describe('public organizer contact form helpers', () => {
    it('normalizes values by trimming whitespace', () => {
        expect(
            normalizePublicOrganizerContactForm({
                name: '  Jane Doe  ',
                email: '  jane@example.com  ',
                message: '  Hello organiser, I have a quick question.  ',
            })
        ).toEqual({
            name: 'Jane Doe',
            email: 'jane@example.com',
            message: 'Hello organiser, I have a quick question.',
        });
    });

    it('validates required and malformed inputs', () => {
        expect(
            getPublicOrganizerContactFormError({
                name: ' ',
                email: 'jane@example.com',
                message: 'This message is definitely long enough.',
            })
        ).toBe('Please enter your name.');

        expect(
            getPublicOrganizerContactFormError({
                name: 'Jane Doe',
                email: 'not-an-email',
                message: 'This message is definitely long enough.',
            })
        ).toBe('Please enter a valid email address.');
    });

    it('enforces message length limits', () => {
        expect(
            getPublicOrganizerContactFormError({
                name: 'Jane Doe',
                email: 'jane@example.com',
                message: 'Too short',
            })
        ).toBe('Message must be at least 20 characters.');

        expect(
            getPublicOrganizerContactFormError({
                name: 'Jane Doe',
                email: 'jane@example.com',
                message: 'A'.repeat(2001),
            })
        ).toBe('Message must be 2000 characters or fewer.');
    });

    it('returns valid for acceptable form values', () => {
        expect(
            isPublicOrganizerContactFormValid({
                name: 'Jane Doe',
                email: 'jane@example.com',
                message: 'Assalamu alaikum, can you confirm parking details for this event?',
            })
        ).toBe(true);
    });
});
