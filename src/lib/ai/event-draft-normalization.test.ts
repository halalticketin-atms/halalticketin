import { describe, expect, it } from 'vitest';

import { buildDraftFromAiPayload } from './event-draft';

describe('AI event draft normalization', () => {
  it('does not turn unknown AI fields into guessed event settings', () => {
    const draft = buildDraftFromAiPayload({
      formData: {
        title: null,
        visibility: null,
        locationType: null,
        currency: null,
        attendeeInfoMode: null,
      },
      tickets: [],
      promoCodes: [],
      review: {
        confidence: 'low',
        extractedFrom: ['prompt'],
        needsReview: ['Add event date'],
        missingImportantFields: ['date', 'tickets'],
      },
    }, 'poster.png');

    expect(draft.formData).toMatchObject({ title: 'poster' });
    expect(draft.formData).not.toHaveProperty('visibility');
    expect(draft.formData).not.toHaveProperty('locationType');
    expect(draft.formData).not.toHaveProperty('currency');
    expect(draft.formData).not.toHaveProperty('attendeeInfoMode');
    expect(draft.preserveEmptyTickets).toBe(true);
    expect(draft.aiReview?.needsReview).toEqual(expect.arrayContaining([
      'Confirm event visibility',
      'Confirm event format and location',
      'Confirm ticket currency',
      'Confirm attendee information collection',
    ]));
    expect(draft.aiReview?.missingImportantFields).toEqual(expect.arrayContaining([
      'visibility',
      'location',
      'currency',
      'attendeeInfoMode',
    ]));
  });

  it('skips ambiguous ticket rows rather than creating accidental free or paid tickets', () => {
    const draft = buildDraftFromAiPayload({
      formData: { title: 'Community Dinner' },
      tickets: [
        { name: 'Admission', type: null, price: null, isFree: null, quantity: null },
        { name: 'General', type: 'paid', price: '12.50', isFree: false, quantity: null },
      ],
      promoCodes: [],
    }, 'Community Dinner');

    expect(draft.tickets).toHaveLength(1);
    expect(draft.tickets?.[0]).toMatchObject({
      name: 'General',
      type: 'paid',
      price: '12.50',
    });
    expect(draft.tickets?.[0].quantity).toBe(0);
    expect(draft.tickets?.[0].maxPerOrder).toBe(0);
  });

  it('skips promo codes missing a concrete code or discount value', () => {
    const draft = buildDraftFromAiPayload({
      formData: { title: 'Lecture' },
      tickets: [],
      promoCodes: [
        { code: null, discountType: 'percentage', discountValue: '10', usageLimit: null },
        { code: 'EARLY10', discountType: 'percentage', discountValue: '10', usageLimit: null },
      ],
    }, 'Lecture');

    expect(draft.promoCodes).toHaveLength(1);
    expect(draft.promoCodes?.[0]).toMatchObject({
      code: 'EARLY10',
      discountType: 'percentage',
      discountValue: '10',
      usageLimit: 0,
    });
  });
});
