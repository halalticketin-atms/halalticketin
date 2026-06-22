import { describe, expect, it } from 'vitest';

import {
  buildGiftClaimSubmitPayload,
  hasGiftClaimValidationErrors,
  parseCheckboxSelections,
  serializeCheckboxSelections,
  validateGiftClaimForm,
} from './gift-claim-form';

describe('gift claim checkbox selections', () => {
  it('round-trips checkbox selections through JSON encoding', () => {
    const answer = serializeCheckboxSelections(['Red, White, and Blue', 'Gold']);

    expect(parseCheckboxSelections(answer)).toEqual(['Red, White, and Blue', 'Gold']);
  });

  it('falls back to legacy comma-delimited answers', () => {
    expect(parseCheckboxSelections('Halal,Vegan')).toEqual(['Halal', 'Vegan']);
  });
});

describe('buildGiftClaimSubmitPayload', () => {
  it('omits blank email and trims claim submission fields', () => {
    expect(
      buildGiftClaimSubmitPayload({
        name: '  Claimed Recipient  ',
        email: '   ',
        gender: 'female',
        age: '22',
        customAnswers: {
          q1: 'No nuts',
        },
      }),
    ).toEqual({
      name: 'Claimed Recipient',
      gender: 'female',
      age: 22,
      customAnswers: {
        q1: 'No nuts',
      },
    });
  });
});

describe('validateGiftClaimForm', () => {
  it('requires attendee fields and required custom questions', () => {
    const errors = validateGiftClaimForm({
      name: 'A',
      gender: '',
      age: '',
      customAnswers: {},
      questions: [
        {
          id: 'q1',
          label: 'Dietary notes',
          type: 'text',
          required: true,
        },
      ],
    });

    expect(errors).toEqual({
      name: 'Enter the recipient name.',
      gender: 'Select a gender.',
      age: 'Enter an age.',
      customAnswers: {
        q1: 'Answer "Dietary notes".',
      },
    });
    expect(hasGiftClaimValidationErrors(errors)).toBe(true);
  });

  it('accepts answered checkbox questions with comma-containing option labels', () => {
    const errors = validateGiftClaimForm({
      name: 'Claimed Recipient',
      gender: 'female',
      age: '22',
      customAnswers: {
        q1: serializeCheckboxSelections(['Red, White, and Blue']),
      },
      questions: [
        {
          id: 'q1',
          label: 'Preferences',
          type: 'checkbox',
          required: true,
          options: ['Red, White, and Blue', 'Green'],
        },
      ],
    });

    expect(errors).toEqual({ customAnswers: {} });
    expect(hasGiftClaimValidationErrors(errors)).toBe(false);
  });

  it('requires required date questions to contain a valid YYYY-MM-DD value', () => {
    const question = {
      id: 'dob',
      label: 'Date of birth',
      type: 'date' as const,
      required: true,
    };

    expect(
      validateGiftClaimForm({
        name: 'Claimed Recipient',
        gender: 'female',
        age: '22',
        customAnswers: {},
        questions: [question],
      }).customAnswers,
    ).toEqual({
      dob: 'Enter a valid date for "Date of birth".',
    });

    expect(
      validateGiftClaimForm({
        name: 'Claimed Recipient',
        gender: 'female',
        age: '22',
        customAnswers: { dob: '2026-13-40' },
        questions: [question],
      }).customAnswers,
    ).toEqual({
      dob: 'Enter a valid date for "Date of birth".',
    });

    expect(
      validateGiftClaimForm({
        name: 'Claimed Recipient',
        gender: 'female',
        age: '22',
        customAnswers: { dob: '2001-09-14' },
        questions: [question],
      }),
    ).toEqual({ customAnswers: {} });
  });

  it('allows optional date questions to stay blank', () => {
    expect(
      validateGiftClaimForm({
        name: 'Claimed Recipient',
        gender: 'female',
        age: '22',
        customAnswers: {},
        questions: [
          {
            id: 'dob',
            label: 'Date of birth',
            type: 'date',
            required: false,
          },
        ],
      }),
    ).toEqual({ customAnswers: {} });
  });
});
