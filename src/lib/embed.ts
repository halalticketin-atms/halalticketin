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
