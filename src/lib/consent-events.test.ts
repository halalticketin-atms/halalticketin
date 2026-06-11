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
        await logConsentEvent({ action: 'accepted', marketing: true, source: 'event_page', version: 1 });

        expect(postMock).toHaveBeenCalledWith('/api/v1/consent/events', {
            action: 'accepted',
            marketing: true,
            source: 'event_page',
            version: 1
        });
    });

    it('does not throw when aggregate logging fails', async () => {
        postMock.mockRejectedValueOnce(new Error('network down'));

        await expect(logConsentEvent({ action: 'rejected', marketing: false, source: 'checkout', version: 1 })).resolves.toBeUndefined();
    });
});
