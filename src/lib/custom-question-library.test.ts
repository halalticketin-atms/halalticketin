import { describe, expect, it } from 'vitest';

import {
  addLibraryQuestions,
  getCustomQuestionKey,
  isQuestionAlreadyPresent,
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

  it('skips exact duplicates and never exceeds ten questions', () => {
    const existing = Array.from({ length: 9 }, (_, index) => ({
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

    expect(result.questions).toHaveLength(10);
    expect(result.questions.at(-1)?.label).toBe('Accessibility requirements');
    expect(result.addedCount).toBe(1);
    expect(result.skippedDuplicateCount).toBe(1);
    expect(result.skippedLimitCount).toBe(1);
  });
});
