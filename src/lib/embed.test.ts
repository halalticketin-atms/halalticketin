import { describe, expect, it } from 'vitest';
import {
    buildEmbedCheckoutSnippet,
    buildEmbedCheckoutUrl,
    EMBED_BRAND_COLOURS,
    normalizeEmbedAppearance,
    normalizeEmbedTheme,
} from './embed';

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

    it('normalizes the supported appearance controls and rejects arbitrary CSS', () => {
        expect(
            normalizeEmbedAppearance({
                theme: 'dark',
                accent: '#abc',
                background: 'transparent',
                text: '#F8FAFC',
                font: 'serif',
                radius: '40',
                minimal: '1',
                showDetails: '0',
            }),
        ).toEqual({
            theme: 'dark',
            accent: '#aabbcc',
            background: 'transparent',
            text: '#f8fafc',
            font: 'serif',
            radius: 24,
            minimal: true,
            showDetails: false,
        });

        expect(normalizeEmbedAppearance({ accent: 'var(--host-colour)', radius: null })).toMatchObject({
            accent: '#0f766e',
            radius: 12,
        });
    });

    it('encodes slugs and serializes supported non-default controls only', () => {
        const url = buildEmbedCheckoutUrl({
            baseUrl: 'https://halalticketin.com/',
            eventSlug: 'night & prayer',
            theme: 'dark',
            background: 'transparent',
            showDetails: false,
        });

        expect(url).toBe(
            'https://halalticketin.com/embed/checkout/night%20%26%20prayer?theme=dark&background=transparent&showDetails=false',
        );
    });

    it('creates a multi-widget-safe snippet and escapes HTML attributes', () => {
        const snippet = buildEmbedCheckoutSnippet({
            slug: 'night "& prayer',
            siteUrl: 'https://halalticketin.com/',
            theme: 'light',
            minimal: true,
        });

        expect(snippet).toBe([
            '<div data-halal-ticketin-checkout data-event-slug="night &quot;&amp; prayer" data-theme="light" data-minimal="true"></div>',
            '<script src="https://halalticketin.com/embed/checkout.js"></script>',
        ].join('\n'));
    });

    // Brand colours differ from the frozen runtime fallbacks, so a new snippet must state them
    // outright. Otherwise a pasted embed would silently follow whatever the runtime defaults to.
    it('writes brand colours into the snippet rather than relying on runtime fallbacks', () => {
        const snippet = buildEmbedCheckoutSnippet({
            slug: 'prayer-event',
            theme: 'light',
            ...EMBED_BRAND_COLOURS.light,
        });

        expect(snippet).toContain(`data-accent="${EMBED_BRAND_COLOURS.light.accent}"`);
        expect(snippet).toContain(`data-text="${EMBED_BRAND_COLOURS.light.text}"`);
    });
});
