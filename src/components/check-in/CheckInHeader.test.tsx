import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CheckInHeader } from './CheckInHeader';

vi.mock('lucide-react', () => ({
  AlertCircle: () => React.createElement('svg'),
  ChevronDown: () => React.createElement('svg'),
  Radio: () => React.createElement('svg'),
  Search: () => React.createElement('svg'),
  ScanLine: () => React.createElement('svg'),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectItem: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  SelectValue: () => React.createElement('div'),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', null, children),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

describe('CheckInHeader', () => {
  it('does not render the gift claim organizer copy', () => {
    const html = renderToStaticMarkup(
      <CheckInHeader
        events={[{ id: 'event-1', name: 'Community Dinner' }]}
        selectedEventId="event-1"
        onEventChange={() => {}}
        stats={{
          totalTickets: 10,
          checkedIn: 5,
          notCheckedIn: 5,
          requiresClaimCount: 3,
          percentage: 50,
        }}
      />,
    );

    expect(html).not.toContain('awaiting gift claim');
  });

  it('renders surfaced action errors when provided', () => {
    const html = renderToStaticMarkup(
      <CheckInHeader
        events={[{ id: 'event-1', name: 'Community Dinner' }]}
        selectedEventId="event-1"
        onEventChange={() => {}}
        stats={{
          totalTickets: 10,
          checkedIn: 5,
          notCheckedIn: 5,
          requiresClaimCount: 3,
          percentage: 50,
        }}
        error="Gift ticket must be claimed first."
      />,
    );

    expect(html).toContain('Gift ticket must be claimed first.');
  });
});
