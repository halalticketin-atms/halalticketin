import { describe, expect, it } from 'vitest';
import { buildEmbedCheckoutUrl, normalizeEmbedTheme } from './embed';

describe('embed helpers', () => {
    it('builds an embed URL with event slug and theme', () => {
        const url = buildEmbedCheckoutUrl({
            baseUrl: 'https://halalticketin.com',
            eventSlug: 'prayer-night',
            theme: 'light',
        });

        expect(url).toBe('https://halalticketin.com/embed/checkout/prayer-night?theme=light');
    });

    it('normalizes unsupported themes to light', () => {
        expect(normalizeEmbedTheme('neon')).toBe('light');
    });
});
