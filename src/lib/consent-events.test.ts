import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logConsentEvent } from './consent-events';

const postMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
    default: {
        post: postMock
    }
}));

describe('logConsentEvent', () => {
    beforeEach(() => {
        postMock.mockReset();
    });

    it('posts aggregate consent events to the backend', async () => {
        await logConsentEvent({
            action: 'accepted',
            analytics: true,
            marketing: false,
            source: 'event_page',
            version: 2,
        });

        expect(postMock).toHaveBeenCalledWith('/api/v1/consent/events', {
            action: 'accepted',
            analytics: true,
            marketing: false,
            source: 'event_page',
            version: 2
        });
    });

    it('does not throw when aggregate logging fails', async () => {
        postMock.mockRejectedValueOnce(new Error('network down'));

        await expect(logConsentEvent({
            action: 'rejected',
            analytics: false,
            marketing: false,
            source: 'checkout',
            version: 2,
        })).resolves.toBeUndefined();
    });
});
