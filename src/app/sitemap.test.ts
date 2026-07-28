import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPublicEvents } from '@/lib/events-api';
import sitemap, { revalidate } from './sitemap';

vi.mock('@/lib/events-api', () => ({
  fetchPublicEvents: vi.fn(),
}));

const mockedFetchPublicEvents = vi.mocked(fetchPublicEvents);

describe('sitemap', () => {
  beforeEach(() => {
    mockedFetchPublicEvents.mockReset();
  });

  it('refreshes hourly and includes the latest public event and organiser URLs', async () => {
    mockedFetchPublicEvents.mockResolvedValue({
      events: [
        {
          id: 'event-id',
          slug: 'new-community-event',
          organizerId: 'organizer-id',
        },
      ],
      hasMore: false,
    } as Awaited<ReturnType<typeof fetchPublicEvents>>);

    const entries = await sitemap();

    expect(revalidate).toBe(3600);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://www.halalticketin.com/events/new-community-event',
        }),
        expect.objectContaining({
          url: 'https://www.halalticketin.com/organizers/organizer-id',
        }),
      ])
    );
  });
});
