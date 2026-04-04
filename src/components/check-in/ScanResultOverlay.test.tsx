import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ScanResultOverlay } from './ScanResultOverlay';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => React.createElement('svg'),
  CheckCircle: () => React.createElement('svg'),
  X: () => React.createElement('svg'),
  XCircle: () => React.createElement('svg'),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', null, children),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}));

describe('ScanResultOverlay', () => {
  it('renders the needs-claim warning state with instructions', () => {
    const html = renderToStaticMarkup(
      <ScanResultOverlay
        result={{
          status: 'needs_claim',
          message: 'Ask the recipient to click the claim link in their gift email before entry.',
          ticket: {
            id: 'ticket-1',
            ticketCode: 'CODE-1',
            orderId: 'order-1',
            orderNumber: 'order-1',
            attendeeName: 'Gift Recipient',
            attendeeEmail: 'gift@example.com',
            ticketType: 'General Admission',
            checkInStatus: 'not_checked_in',
            status: 'valid',
            requiresClaim: true,
            groupSize: 1,
            groupCheckedIn: 0,
          },
        }}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('Valid but Needs Claiming');
    expect(html).toContain('Gift Recipient');
    expect(html).toContain('Ask the recipient to click the claim link in their gift email before entry.');
  });
});
