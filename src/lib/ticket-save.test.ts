import { describe, expect, it } from 'vitest';

import { shouldIncludeTicketIdsForSave } from './ticket-save';

describe('shouldIncludeTicketIdsForSave', () => {
  it('returns false when event has not been created yet', () => {
    expect(shouldIncludeTicketIdsForSave(undefined)).toBe(false);
    expect(shouldIncludeTicketIdsForSave(null)).toBe(false);
    expect(shouldIncludeTicketIdsForSave('')).toBe(false);
    expect(shouldIncludeTicketIdsForSave('   ')).toBe(false);
  });

  it('returns true for existing event ids', () => {
    expect(shouldIncludeTicketIdsForSave('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });
});

