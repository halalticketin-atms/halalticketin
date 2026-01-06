import { describe, expect, it } from 'vitest';

import { formatCreditSplitNote } from './credit-notes';

describe('formatCreditSplitNote', () => {
    it('returns a note when credits only cover part of the order', () => {
        expect(formatCreditSplitNote(6, 10)).toBe(
            '6 tickets use the organizer fee and 4 tickets use the platform fee because the organizer ran out of credits.'
        );
    });

    it('returns null when no credits are applied', () => {
        expect(formatCreditSplitNote(0, 10)).toBeNull();
    });

    it('returns null when credits cover all paid tickets', () => {
        expect(formatCreditSplitNote(10, 10)).toBeNull();
    });
});
