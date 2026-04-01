import { ApiError } from './api';

const NON_RETRYABLE_GIFT_CLAIM_MESSAGES = [
  'gift claim link is invalid',
  'gift claim not found',
  'not found',
  'no longer valid',
];

export const getGiftClaimLoadErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load gift claim.';

export const isRetryableGiftClaimLoadError = (error: unknown) => {
  if (!error) {
    return false;
  }

  if (error instanceof ApiError && error.status === 404) {
    return false;
  }

  const message = getGiftClaimLoadErrorMessage(error).trim().toLowerCase();
  if (!message) {
    return true;
  }

  return !NON_RETRYABLE_GIFT_CLAIM_MESSAGES.some((candidate) => message.includes(candidate));
};
