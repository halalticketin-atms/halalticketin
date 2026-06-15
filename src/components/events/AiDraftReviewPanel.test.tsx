import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AiDraftReviewPanel } from './AiDraftReviewPanel';

describe('AiDraftReviewPanel', () => {
  it('renders review navigation and limits visible warnings to three', () => {
    const html = renderToStaticMarkup(
      <AiDraftReviewPanel
        review={{
          confidence: 'low',
          needsReview: [
            'Confirm event visibility',
            'Confirm event format and location',
            'Confirm ticket currency',
            'Confirm attendee information collection',
          ],
        }}
        onReviewDetails={vi.fn()}
        onReviewTickets={vi.fn()}
        onReviewPolicies={vi.fn()}
      />,
    );

    expect(html).toContain('AI draft ready');
    expect(html).toContain('Review details');
    expect(html).toContain('Review tickets');
    expect(html).toContain('Review policies');
    expect(html.match(/data-ai-review-warning=/g)).toHaveLength(3);
    expect(html).not.toContain('Confirm attendee information collection');
  });
});
