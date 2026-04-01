import { describe, expect, it } from 'vitest';

import { ApiError } from './api';
import {
  getGiftClaimLoadErrorMessage,
  isRetryableGiftClaimLoadError,
} from './gift-claim-page';

describe('gift claim page load helpers', () => {
  it('treats generic load failures as retryable', () => {
    expect(isRetryableGiftClaimLoadError(new Error('Network request failed'))).toBe(true);
    expect(getGiftClaimLoadErrorMessage(new Error('Network request failed'))).toBe(
      'Network request failed',
    );
  });

  it('treats invalid-link style failures as non-retryable', () => {
    expect(
      isRetryableGiftClaimLoadError(new Error('Gift claim link is invalid.')),
    ).toBe(false);
    expect(
      isRetryableGiftClaimLoadError(new ApiError('Gift claim not found', 404, null)),
    ).toBe(false);
  });
});
