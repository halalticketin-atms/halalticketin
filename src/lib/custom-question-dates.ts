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

const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const options = {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  } as const;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat('en-CA', { ...options, timeZone: 'UTC' }).formatToParts(date);
  }

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
    day: Number(parts.find((part) => part.type === 'day')?.value),
  };
};

export const isValidCustomQuestionDob = (
  value: string,
  minimumAge = 0,
  timeZone = 'UTC',
  today = new Date(),
) => {
  if (!isValidCustomQuestionDate(value)) {
    return false;
  }

  const [birthYear, birthMonth, birthDay] = value.split('-').map(Number);
  const current = getDatePartsInTimeZone(today, timeZone || 'UTC');
  const age = current.year - birthYear -
    (current.month < birthMonth || (current.month === birthMonth && current.day < birthDay) ? 1 : 0);

  return age >= minimumAge && age <= 120;
};
