import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { EventPublishedSuccess } from './EventPublishedSuccess';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: { children?: React.ReactNode }) =>
          React.createElement('div', props, children),
    },
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('EventPublishedSuccess', () => {
  it('shows updated copy when rendering an event update success state', () => {
    const html = renderToStaticMarkup(
      <EventPublishedSuccess
        eventTitle="Community Dinner"
        eventDate="2026-05-01"
        eventTime="18:00"
        eventVenue="Main Hall"
        eventCity="Dublin"
        eventSlug="community-dinner"
        dashboardHref="/dashboard/o/test/events"
        isUpdate
      />,
    );

    expect(html).toContain('Updated!');
    expect(html).toContain('Your event changes are now live.');
  });

  it('shows published copy for first-time publish success', () => {
    const html = renderToStaticMarkup(
      <EventPublishedSuccess
        eventTitle="Community Dinner"
        eventDate="2026-05-01"
        eventTime="18:00"
        eventVenue="Main Hall"
        eventCity="Dublin"
        eventSlug="community-dinner"
        dashboardHref="/dashboard/o/test/events"
      />,
    );

    expect(html).toContain('Congratulations!');
    expect(html).toContain('Your event is now live.');
  });
});
