const CUSTOM_QUESTION_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidCustomQuestionDate = (value: string) => {
  if (!CUSTOM_QUESTION_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day));

  return (
    normalized.getUTCFullYear() === year &&
    normalized.getUTCMonth() === month - 1 &&
    normalized.getUTCDate() === day
  );
};

export const formatCustomQuestionDateForDisplay = (value: string) => {
  if (!isValidCustomQuestionDate(value)) {
    return value;
  }

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};
