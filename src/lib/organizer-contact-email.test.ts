import { describe, expect, it } from 'vitest';

import {
    getOrganizerContactEmailError,
    isValidOrganizerContactEmail,
    normalizeOrganizerContactEmail,
} from './organizer-contact-email';

describe('organizer contact email helpers', () => {
    it('normalizes whitespace around email values', () => {
        expect(normalizeOrganizerContactEmail('  contact@example.com  ')).toBe('contact@example.com');
    });

    it('validates well-formed email values', () => {
        expect(isValidOrganizerContactEmail('contact@example.com')).toBe(true);
        expect(isValidOrganizerContactEmail('not-an-email')).toBe(false);
    });

    it('returns required error when the value is blank', () => {
        expect(getOrganizerContactEmailError('   ')).toBe('Organizer contact email is required.');
    });

    it('returns invalid-format error for malformed email values', () => {
        expect(getOrganizerContactEmailError('not-an-email')).toBe('Please enter a valid organizer contact email.');
    });

    it('supports custom error messages', () => {
        expect(
            getOrganizerContactEmailError('', {
                requiredMessage: 'Custom required',
            })
        ).toBe('Custom required');

        expect(
            getOrganizerContactEmailError('bad-email', {
                invalidMessage: 'Custom invalid',
            })
        ).toBe('Custom invalid');
    });
});
