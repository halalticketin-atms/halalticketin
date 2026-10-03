import { beforeEach, describe, expect, it, vi } from 'vitest';

const server = vi.hoisted(() => ({
    getPublicEventInitialData: vi.fn(),
    getPublicEventRenderTime: vi.fn(() => 123456789),
}));
vi.mock('@/lib/public-event-server', () => server);
vi.mock('./EmbedCheckoutClient', () => ({ EmbedCheckoutClient: () => null }));

import EmbedCheckoutPage from './page';

beforeEach(() => {
    vi.clearAllMocks();
    server.getPublicEventInitialData.mockResolvedValue({ event: { slug: 'public-gathering' }, tickets: [] });
});

describe('embed server snapshot', () => {
    it('seeds a published embed with anonymous data and the request clock', async () => {
        const result = await EmbedCheckoutPage({
            params: Promise.resolve({ slug: 'public-gathering' }), searchParams: Promise.resolve({ configure: '1' }),
        });
        expect(server.getPublicEventInitialData).toHaveBeenCalledExactlyOnceWith('public-gathering');
        expect(result.props).toMatchObject({
            slug: 'public-gathering', initialData: { event: { slug: 'public-gathering' }, tickets: [] }, initialRenderTime: 123456789,
        });
    });

    it.each(['1', 'true', ['true', 'false']])('leaves preview=%s entirely to the existing browser flow', async preview => {
        const result = await EmbedCheckoutPage({
            params: Promise.resolve({ slug: 'private-draft' }), searchParams: Promise.resolve({ preview }),
        });
        expect(server.getPublicEventInitialData).not.toHaveBeenCalled();
        expect(result.props.initialData).toBeNull();
    });

    it('keeps the browser fallback when anonymous access fails', async () => {
        server.getPublicEventInitialData.mockResolvedValue(null);
        const result = await EmbedCheckoutPage({
            params: Promise.resolve({ slug: 'protected-event' }), searchParams: Promise.resolve({}),
        });
        expect(result.props.initialData).toBeNull();
    });
});
