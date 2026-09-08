import { describe, expect, it } from 'vitest';
import { buildEmbedCheckoutSnippet } from '../../lib/embed';

describe('buildEmbedCheckoutSnippet', () => {
  it('builds a public checkout snippet with appearance settings', () => {
    const snippet = buildEmbedCheckoutSnippet({
      slug: 'prayer-event',
      siteUrl: 'https://halalticketin.com',
      theme: 'dark',
      accent: '#0f766e',
      background: 'transparent',
      text: '#f8fafc',
      font: 'system',
      radius: 12,
      minimal: true,
      showDetails: false,
    });

    expect(snippet).toContain('data-halal-ticketin-checkout');
    expect(snippet).toContain('data-event-slug="prayer-event"');
    expect(snippet).toContain('data-theme="dark"');
    expect(snippet).toContain('data-background="transparent"');
    expect(snippet).toContain('data-minimal="true"');
    expect(snippet).toContain('data-show-details="false"');
    expect(snippet).toContain(
      '<script src="https://halalticketin.com/embed/checkout.js"></script>'
    );
    expect(snippet).not.toContain('preview');
  });
});
