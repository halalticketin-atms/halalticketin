import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { GiftedTicketBadge } from './GiftedTicketBadge';

describe('GiftedTicketBadge', () => {
  it('renders the gifted ticket count when count is positive', () => {
    const html = renderToStaticMarkup(<GiftedTicketBadge count={3} />);

    expect(html).toContain('3 gifted');
  });

  it('renders nothing when count is zero', () => {
    const html = renderToStaticMarkup(<GiftedTicketBadge count={0} />);

    expect(html).toBe('');
  });
});
