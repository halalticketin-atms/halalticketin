import type { GiftClaimQuestion, GiftClaimSubmitRequest } from './gift-claim-api';
import { isValidCustomQuestionDate } from './custom-question-dates';

export type GiftClaimValidationErrors = {
  name?: string;
  gender?: string;
  age?: string;
  customAnswers: Record<string, string>;
};

const normalizeSelections = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );

export const createEmptyGiftClaimValidationErrors = (): GiftClaimValidationErrors => ({
  customAnswers: {},
});

export const parseCheckboxSelections = (value?: string) => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeSelections(parsed.filter((item): item is string => typeof item === 'string'));
    }
  } catch {
    // Fall back to legacy comma-delimited values.
  }

  return normalizeSelections(value.split(','));
};

export const serializeCheckboxSelections = (values: string[]) =>
  JSON.stringify(normalizeSelections(values));

const hasRequiredAnswer = (question: GiftClaimQuestion, answer?: string) => {
  if (question.type === 'date') {
    return typeof answer === 'string' && isValidCustomQuestionDate(answer);
  }

  if (question.type === 'checkbox') {
    if (question.options && question.options.length > 0) {
      return parseCheckboxSelections(answer).length > 0;
    }

    return answer === 'true';
  }

  return Boolean(answer?.trim());
};

const hasValidAnswer = (question: GiftClaimQuestion, answer?: string) => {
  if (!answer?.trim()) {
    return true;
  }

  return question.type !== 'date' || isValidCustomQuestionDate(answer);
};

export const validateGiftClaimForm = ({
  name,
  gender,
  age,
  customAnswers,
  questions,
}: {
  name: string;
  gender: 'male' | 'female' | '';
  age: string;
  customAnswers: Record<string, string>;
  questions?: GiftClaimQuestion[];
}): GiftClaimValidationErrors => {
  const errors = createEmptyGiftClaimValidationErrors();

  if (name.trim().length < 2) {
    errors.name = 'Enter the recipient name.';
  }

  if (!gender) {
    errors.gender = 'Select a gender.';
  }

  if (!age.trim()) {
    errors.age = 'Enter an age.';
  } else {
    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      errors.age = 'Enter a valid age.';
    }
  }

  for (const question of questions ?? []) {
    if (!hasValidAnswer(question, customAnswers[question.id])) {
      errors.customAnswers[question.id] = `Enter a valid date for "${question.label}".`;
      continue;
    }

    if (!question.required) {
      continue;
    }

    if (!hasRequiredAnswer(question, customAnswers[question.id])) {
      errors.customAnswers[question.id] =
        question.type === 'date'
          ? `Enter a valid date for "${question.label}".`
          : `Answer "${question.label}".`;
    }
  }

  return errors;
};

export const buildGiftClaimSubmitPayload = ({
  name,
  email,
  gender,
  age,
  customAnswers,
}: {
  name: string;
  email: string;
  gender: 'male' | 'female' | '';
  age: string;
  customAnswers: Record<string, string>;
}): GiftClaimSubmitRequest => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  return {
    name: trimmedName || undefined,
    email: trimmedEmail || undefined,
    gender: gender || undefined,
    age: age.trim() ? Number(age) : undefined,
    customAnswers,
  };
};

export const hasGiftClaimValidationErrors = (errors: GiftClaimValidationErrors) =>
  Boolean(errors.name || errors.gender || errors.age || Object.keys(errors.customAnswers).length > 0);
