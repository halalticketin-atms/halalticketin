import type { DraftCustomQuestion } from '@/hooks/useEventDraft';
import type { CustomQuestionLibraryItem, CustomQuestionPayload } from './events-api';

export const MAX_CUSTOM_QUESTIONS = 20;
export const MAX_CUSTOM_QUESTION_LABEL_LENGTH = 500;

type QuestionDefinition = Pick<
  CustomQuestionPayload,
  'label' | 'type' | 'required' | 'options'
>;

export const getCustomQuestionKey = (question: QuestionDefinition) =>
  JSON.stringify({
    label: question.label,
    type: question.type,
    required: question.required,
    options: question.options ?? [],
  });

export const isQuestionAlreadyPresent = (
  question: QuestionDefinition,
  existingQuestions: DraftCustomQuestion[],
) => {
  const key = getCustomQuestionKey(question);
  return existingQuestions.some((existingQuestion) => getCustomQuestionKey(existingQuestion) === key);
};

export const addLibraryQuestions = (
  existingQuestions: DraftCustomQuestion[],
  selectedQuestions: CustomQuestionLibraryItem[],
  createId: () => string,
) => {
  const questions = [...existingQuestions];
  let addedCount = 0;
  let skippedDuplicateCount = 0;
  let skippedLimitCount = 0;

  for (const selectedQuestion of selectedQuestions) {
    if (isQuestionAlreadyPresent(selectedQuestion, questions)) {
      skippedDuplicateCount += 1;
      continue;
    }

    if (questions.length >= MAX_CUSTOM_QUESTIONS) {
      skippedLimitCount += 1;
      continue;
    }

    questions.push({
      id: createId(),
      label: selectedQuestion.label,
      type: selectedQuestion.type,
      required: selectedQuestion.required,
      ...(selectedQuestion.options ? { options: [...selectedQuestion.options] } : {}),
    });
    addedCount += 1;
  }

  return { questions, addedCount, skippedDuplicateCount, skippedLimitCount };
};

export const createCustomQuestionId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `q-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
