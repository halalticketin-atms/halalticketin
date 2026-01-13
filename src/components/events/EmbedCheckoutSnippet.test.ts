import { describe, expect, it } from 'vitest';
import { buildEmbedCheckoutSnippet } from '../../lib/embed';

describe('buildEmbedCheckoutSnippet', () => {
    it('builds a snippet with slug and theme', () => {
        const snippet = buildEmbedCheckoutSnippet({
            slug: 'prayer-event',
            theme: 'light',
            siteUrl: 'https://halalticketin.com',
        });

        expect(snippet).toContain('data-event-slug="prayer-event"');
        expect(snippet).toContain('data-theme="light"');
        expect(snippet).toContain('https://halalticketin.com/embed/checkout.js');
    });
});
