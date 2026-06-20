import { describe, expect, it } from 'vitest';

import { validateMinimumAttendeeAge } from './event-minimum-age';

describe('validateMinimumAttendeeAge', () => {
  it('accepts integer ages from 0 to 120', () => {
    expect(validateMinimumAttendeeAge(0)).toBeNull();
    expect(validateMinimumAttendeeAge(18)).toBeNull();
    expect(validateMinimumAttendeeAge(120)).toBeNull();
  });

  it('returns an inline error for missing, fractional, or out-of-range values', () => {
    expect(validateMinimumAttendeeAge('')).toBe('Enter a minimum age from 0 to 120.');
    expect(validateMinimumAttendeeAge(-1)).toBe('Enter a minimum age from 0 to 120.');
    expect(validateMinimumAttendeeAge(13.5)).toBe('Enter a whole-number minimum age.');
    expect(validateMinimumAttendeeAge(121)).toBe('Enter a minimum age from 0 to 120.');
  });
});
