import { describe, expect, it } from 'vitest';

import {
  addLibraryQuestions,
  getCustomQuestionKey,
  isQuestionAlreadyPresent,
  MAX_CUSTOM_QUESTIONS,
  moveCustomQuestion,
} from './custom-question-library';
import type { CustomQuestionLibraryItem } from './events-api';

const libraryQuestion = (
  overrides: Partial<CustomQuestionLibraryItem> = {},
): CustomQuestionLibraryItem => ({
  key: 'dietary-key',
  label: 'Dietary requirements',
  type: 'select',
  required: true,
  options: ['Halal', 'Vegetarian'],
  usageCount: 2,
  mostRecentEvent: {
    id: 'event-2025',
    title: 'Annual Dinner 2025',
    updatedAt: '2025-01-01T12:00:00.000Z',
  },
  ...overrides,
});

describe('custom question library selection', () => {
  it('matches exact questions without considering their ids', () => {
    const existing = {
      id: 'local-id',
      label: 'Dietary requirements',
      type: 'select' as const,
      required: true,
      options: ['Halal', 'Vegetarian'],
    };

    expect(getCustomQuestionKey(existing)).toBe(getCustomQuestionKey(libraryQuestion()));
    expect(isQuestionAlreadyPresent(libraryQuestion(), [existing])).toBe(true);
    expect(
      isQuestionAlreadyPresent(libraryQuestion({ required: false }), [existing]),
    ).toBe(false);
  });

  it('treats date age validation as part of the question key', () => {
    const plainDate = libraryQuestion({
      key: 'plain-date',
      label: 'Date',
      type: 'date',
      required: true,
      options: undefined,
    });
    const dobDate = libraryQuestion({
      ...plainDate,
      key: 'dob-date',
      ageValidation: true,
    });

    expect(getCustomQuestionKey(plainDate)).not.toBe(getCustomQuestionKey(dobDate));
    expect(isQuestionAlreadyPresent(dobDate, [{ ...plainDate, id: 'plain-date-id' }])).toBe(false);
  });

  it('copies multiple selected questions with fresh ids and independent options', () => {
    const first = libraryQuestion();
    const second = libraryQuestion({
      key: 'accessibility-key',
      label: 'Accessibility requirements',
      type: 'text',
      required: false,
      options: undefined,
    });
    const ids = ['copied-one', 'copied-two'];

    const result = addLibraryQuestions([], [first, second], () => ids.shift()!);

    expect(result.addedCount).toBe(2);
    expect(result.questions.map((question) => question.id)).toEqual(['copied-one', 'copied-two']);
    expect(result.questions[0]).toMatchObject({
      label: first.label,
      type: first.type,
      required: first.required,
      options: first.options,
    });
    expect(result.questions[0].options).not.toBe(first.options);

    result.questions[0].options?.push('Vegan');
    expect(first.options).toEqual(['Halal', 'Vegetarian']);
  });

  it('copies age validation for date questions only', () => {
    const ids = ['date-id', 'text-id'];
    const result = addLibraryQuestions(
      [],
      [
        libraryQuestion({
          key: 'dob-key',
          label: 'Date of birth',
          type: 'date',
          ageValidation: true,
          options: undefined,
        }),
        libraryQuestion({
          key: 'text-key',
          label: 'Notes',
          type: 'text',
          ageValidation: true,
          options: undefined,
        }),
      ],
      () => ids.shift()!,
    );

    expect(result.questions).toEqual([
      expect.objectContaining({ id: 'date-id', type: 'date', ageValidation: true }),
      expect.not.objectContaining({ ageValidation: true }),
    ]);
  });

  it('skips exact duplicates and never exceeds the event question limit', () => {
    const existing = Array.from({ length: MAX_CUSTOM_QUESTIONS - 1 }, (_, index) => ({
      id: `existing-${index}`,
      label: index === 0 ? 'Dietary requirements' : `Question ${index}`,
      type: index === 0 ? ('select' as const) : ('text' as const),
      required: index === 0,
      ...(index === 0 ? { options: ['Halal', 'Vegetarian'] } : {}),
    }));
    const duplicate = libraryQuestion();
    const available = libraryQuestion({
      key: 'available-key',
      label: 'Accessibility requirements',
      type: 'text',
      required: false,
      options: undefined,
    });
    const overLimit = libraryQuestion({
      key: 'over-limit-key',
      label: 'T-shirt size',
      type: 'text',
      required: false,
      options: undefined,
    });

    const result = addLibraryQuestions(existing, [duplicate, available, overLimit], () => 'new-id');

    expect(result.questions).toHaveLength(MAX_CUSTOM_QUESTIONS);
    expect(result.questions.at(-1)?.label).toBe('Accessibility requirements');
    expect(result.addedCount).toBe(1);
    expect(result.skippedDuplicateCount).toBe(1);
    expect(result.skippedLimitCount).toBe(1);
  });
});

describe('custom question ordering', () => {
  it('moves questions while preserving object identity and ids', () => {
    const first = { id: 'q1', label: 'One', type: 'text' as const, required: false };
    const second = { id: 'q2', label: 'Two', type: 'text' as const, required: false };
    const third = { id: 'q3', label: 'Three', type: 'text' as const, required: false };

    const moved = moveCustomQuestion([first, second, third], 2, 0);

    expect(moved).toEqual([third, first, second]);
    expect(moved[0]).toBe(third);
    expect(moved.map((question) => question.id)).toEqual(['q3', 'q1', 'q2']);
  });

  it('returns the original array for invalid or same-position moves', () => {
    const questions = [
      { id: 'q1', label: 'One', type: 'text' as const, required: false },
    ];

    expect(moveCustomQuestion(questions, 0, 0)).toBe(questions);
    expect(moveCustomQuestion(questions, -1, 0)).toBe(questions);
    expect(moveCustomQuestion(questions, 0, 1)).toBe(questions);
  });
});
