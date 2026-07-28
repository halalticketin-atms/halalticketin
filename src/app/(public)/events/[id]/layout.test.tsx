import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  fetchPublicEventBySlug,
  type PublicEventRecord,
  type PublicTicketRecord,
} from '@/lib/events-api';
import EventDetailsLayout from './layout';

vi.mock('@/lib/events-api', () => ({
  fetchPublicEventBySlug: vi.fn(),
}));

const mockedFetchPublicEventBySlug = vi.mocked(fetchPublicEventBySlug);

describe('EventDetailsLayout structured data', () => {
  it('uses ticket salesStart as offer validFrom without changing canonical URLs', async () => {
    mockedFetchPublicEventBySlug.mockResolvedValue({
      event: {
        id: 'event-id',
        slug: 'community-gathering',
        title: 'Community Gathering',
        description: 'A community event.',
        bannerImageUrl: null,
        startDatetime: '2026-08-20T18:00:00.000Z',
        endDatetime: '2026-08-20T20:00:00.000Z',
        timezone: 'Europe/Dublin',
        status: 'published',
        locationType: 'in_person',
        venue: 'Community Hall',
        address: '1 Main Street',
        city: 'Dublin',
        country: 'Ireland',
        onlineUrl: null,
        currency: 'EUR',
        organizerId: 'organizer-id',
        organizerName: 'Community Organiser',
      } as unknown as PublicEventRecord,
      tickets: [
        {
          id: 'scheduled-ticket',
          name: 'Early Bird',
          type: 'paid',
          price: '10.00',
          currency: 'EUR',
          visibility: 'public',
          salesStart: '2026-07-30T09:00:00.000Z',
          remainingQuantity: 20,
          isSoldOut: false,
        },
        {
          id: 'open-ticket',
          name: 'General Admission',
          type: 'paid',
          price: '15.00',
          currency: 'EUR',
          visibility: 'public',
          salesStart: null,
          remainingQuantity: 40,
          isSoldOut: false,
        },
      ] as unknown as PublicTicketRecord[],
    });

    const layout = await EventDetailsLayout({
      children: null,
      params: Promise.resolve({ id: 'community-gathering' }),
    });

    expect(isValidElement(layout)).toBe(true);

    const fragment = layout as ReactElement<{ children: ReactNode }>;
    const script = Children.toArray(fragment.props.children).find(
      (child) => isValidElement(child) && child.type === 'script'
    ) as ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>;
    const structuredData = JSON.parse(script.props.dangerouslySetInnerHTML.__html);

    expect(structuredData.url).toBe(
      'https://www.halalticketin.com/events/community-gathering'
    );
    expect(structuredData.offers).toEqual([
      expect.objectContaining({
        name: 'Early Bird',
        validFrom: '2026-07-30T09:00:00.000Z',
        url: 'https://www.halalticketin.com/events/community-gathering',
      }),
      expect.not.objectContaining({
        validFrom: expect.anything(),
      }),
    ]);
  });
});
