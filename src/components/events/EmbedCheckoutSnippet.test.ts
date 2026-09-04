import { describe, expect, it } from 'vitest';
import { buildEmbedCheckoutSnippet } from '../../lib/embed';

describe('buildEmbedCheckoutSnippet', () => {
    it('builds a snippet with slug and theme', () => {
        const snippet = buildEmbedCheckoutSnippet({
            slug: 'prayer-event',
            theme: 'light',
            siteUrl: 'https://halalticketin.com',
        });

        expect(snippet).toBe([
            '<div id="halal-ticketin-checkout" data-event-slug="prayer-event" data-theme="light"></div>',
            '<script src="https://halalticketin.com/embed/checkout.js"></script>',
        ].join('\n'));
    });
});
