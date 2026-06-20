export const DEFAULT_MINIMUM_ATTENDEE_AGE = 0;
export const MAXIMUM_ATTENDEE_AGE = 120;

export const validateMinimumAttendeeAge = (value: number | ''): string | null => {
  if (
    value === '' ||
    value < DEFAULT_MINIMUM_ATTENDEE_AGE ||
    value > MAXIMUM_ATTENDEE_AGE
  ) {
    return `Enter a minimum age from ${DEFAULT_MINIMUM_ATTENDEE_AGE} to ${MAXIMUM_ATTENDEE_AGE}.`;
  }

  if (!Number.isInteger(value)) {
    return 'Enter a whole-number minimum age.';
  }

  return null;
};
