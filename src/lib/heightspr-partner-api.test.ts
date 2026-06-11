import { describe, expect, it, vi } from 'vitest';

const { apiGetMock } = vi.hoisted(() => ({
    apiGetMock: vi.fn(),
}));

vi.mock('./api', () => ({
    default: {
        get: apiGetMock,
    },
}));

import { getHeightsPrPartnerOrganizers } from './heightspr-partner-api';

describe('HeightsPR partner API', () => {
    it('loads the scoped HeightsPR organizer signup list', async () => {
        apiGetMock.mockResolvedValue({ data: [], total: 0 });

        await expect(getHeightsPrPartnerOrganizers()).resolves.toEqual({
            data: [],
            total: 0,
        });

        expect(apiGetMock).toHaveBeenCalledWith('/api/v1/partners/heightspr/organizers');
    });
});
