export type EmbedTheme = 'light' | 'dark';

export function normalizeEmbedTheme(input?: string | null): EmbedTheme {
    return input === 'dark' ? 'dark' : 'light';
}

export function buildEmbedCheckoutUrl(params: {
    baseUrl: string;
    eventSlug: string;
    theme?: string | null;
}): string {
    const theme = normalizeEmbedTheme(params.theme);
    return `${params.baseUrl.replace(/\/$/, '')}/embed/checkout/${params.eventSlug}?theme=${theme}`;
}

export function buildEmbedCheckoutSnippet(params: {
    slug: string;
    theme: EmbedTheme;
    siteUrl?: string;
}): string {
    const base = (params.siteUrl || 'https://halalticketin.com').replace(/\/$/, '');
    return [
        `<div id="halal-ticketin-checkout" data-event-slug="${params.slug}" data-theme="${params.theme}"></div>`,
        `<script src="${base}/embed/checkout.js"></script>`,
    ].join('\n');
}
