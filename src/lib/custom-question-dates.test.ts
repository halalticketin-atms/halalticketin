import { describe, expect, it } from 'vitest';

import { isValidCustomQuestionDob } from './custom-question-dates';

describe('custom question DOB validation', () => {
  it('uses the event timezone for the birthday boundary', () => {
    const today = new Date('2026-06-22T23:30:00Z');

    expect(isValidCustomQuestionDob('2008-06-23', 18, 'Europe/Dublin', today)).toBe(true);
    expect(isValidCustomQuestionDob('2008-06-23', 18, 'Pacific/Honolulu', today)).toBe(false);
  });

  it('rejects future dates', () => {
    const today = new Date('2026-06-22T12:00:00Z');

    expect(isValidCustomQuestionDob('2026-06-23', 0, 'Europe/Dublin', today)).toBe(false);
  });
});
