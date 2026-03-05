import { describe, expect, it } from 'vitest';

import { getTicketSavePlan, shouldIncludeTicketIdsForSave } from './ticket-save';

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

describe('getTicketSavePlan', () => {
  const baseTicket = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'General Admission',
    price: '0',
    customFee: '',
    isFree: true,
    type: 'free' as const,
    quantity: 100,
    minPerOrder: 0,
    maxPerOrder: 0,
    description: '',
    salesStart: '',
    salesStartTime: '',
    salesEnd: '',
    salesEndTime: '',
    hasEarlyBird: false,
    earlyBirdPrice: '',
    earlyBirdEndDate: '',
    visibility: 'public' as const,
    absorbFee: false,
  };

  it('skips ticket persistence when the effective ticket payload is unchanged', () => {
    const firstPlan = getTicketSavePlan({
      tickets: [baseTicket],
      currency: 'GBP',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: null,
    });

    const secondPlan = getTicketSavePlan({
      tickets: [baseTicket],
      currency: 'GBP',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: firstPlan.serializedPayload,
    });

    expect(secondPlan.shouldSave).toBe(false);
    expect(secondPlan.payloads).toEqual(firstPlan.payloads);
  });

  it('requires ticket persistence when a ticket field changes', () => {
    const firstPlan = getTicketSavePlan({
      tickets: [baseTicket],
      currency: 'GBP',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: null,
    });

    const secondPlan = getTicketSavePlan({
      tickets: [{ ...baseTicket, quantity: 150 }],
      currency: 'GBP',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: firstPlan.serializedPayload,
    });

    expect(secondPlan.shouldSave).toBe(true);
  });

  it('requires ticket persistence when event currency changes because payloads change', () => {
    const firstPlan = getTicketSavePlan({
      tickets: [baseTicket],
      currency: 'GBP',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: null,
    });

    const secondPlan = getTicketSavePlan({
      tickets: [baseTicket],
      currency: 'EUR',
      timeZone: 'Europe/London',
      existingEventId: '550e8400-e29b-41d4-a716-446655440000',
      lastSavedSerializedPayload: firstPlan.serializedPayload,
    });

    expect(secondPlan.shouldSave).toBe(true);
  });
});
