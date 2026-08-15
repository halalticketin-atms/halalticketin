import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PublicOrganizerEvent } from '@/lib/organizers-api';
import { OrganizerEventCard } from './OrganizerEventCard';

const event: PublicOrganizerEvent = {
  id: 'event-1',
  slug: 'community-gathering',
  title: 'Community Gathering',
  description: null,
  bannerImageUrl: null,
  startDatetime: '2026-10-02T18:00:00.000Z',
  endDatetime: null,
  timezone: 'Europe/Dublin',
  locationType: 'in_person',
  venue: 'Astra Hall',
  city: 'Dublin',
  country: 'Ireland',
  category: 'Sisters,Youth,Community',
};

describe('OrganizerEventCard', () => {
  it('shows the event details without rendering category tags', () => {
    const html = renderToStaticMarkup(
      <OrganizerEventCard
        event={event}
        organizerName="GUM Events"
        organizerAvatarUrl={null}
      />,
    );

    expect(html).toContain('Community Gathering');
    expect(html).toContain('Hosted by GUM Events');
    expect(html).toContain('Astra Hall, Dublin');
    expect(html).not.toContain('Sisters,Youth,Community');
  });
});
