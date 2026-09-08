export type EmbedTheme = 'light' | 'dark';
export type EmbedFont = 'system' | 'serif';

export type EmbedAppearance = {
    theme: EmbedTheme;
    accent: string;
    background: string;
    text: string;
    font: EmbedFont;
    radius: number;
    minimal: boolean;
    showDetails: boolean;
};

export type EmbedAppearanceInput = Partial<{
    theme: string | null;
    accent: string | null;
    background: string | null;
    text: string | null;
    font: string | null;
    radius: string | number | null;
    minimal: string | boolean | null;
    showDetails: string | boolean | null;
}>;

/**
 * Halal Ticketin brand colours as sRGB hex, the only form the embed contract accepts.
 * These are the in-gamut equivalents of the oklch brand tokens in `src/app/globals.css`:
 * light accent/text from `--primary` and `--foreground`, dark accent/surface/text from the
 * `.dark` `--primary`, `--card` and `--foreground`.
 *
 * These are the *configurator's* starting values only. They are deliberately not the runtime
 * fallbacks below, so a snippet built here always writes them out as explicit `data-*`
 * attributes and live embeds already on customer sites keep the appearance they were pasted
 * with. Import these rather than restating hex literals.
 */
export const EMBED_BRAND_COLOURS: Record<EmbedTheme, { accent: string; background: string; text: string }> = {
    light: {
        accent: '#00c2b1',
        background: '#ffffff',
        text: '#071512',
    },
    dark: {
        accent: '#00d4c3',
        background: '#051210',
        text: '#ebf4f2',
    },
};

/** Corner radius of the app shell (`--radius: 0.75rem`), shared by the runtime and configurator. */
export const EMBED_DEFAULT_RADIUS = 12;

/**
 * Runtime fallbacks for anything a snippet leaves unset. Frozen: snippets already pasted on
 * customer sites omit whatever matched these values, so changing them would silently restyle
 * live embeds. New brand colours belong in EMBED_BRAND_COLOURS, not here.
 */
const DEFAULT_APPEARANCE: Record<EmbedTheme, Omit<EmbedAppearance, 'theme'>> = {
    light: {
        accent: '#0f766e',
        background: '#ffffff',
        text: '#0f172a',
        font: 'system',
        radius: EMBED_DEFAULT_RADIUS,
        minimal: false,
        showDetails: true,
    },
    dark: {
        accent: '#23d3c3',
        background: '#0a1224',
        text: '#f8fafc',
        font: 'system',
        radius: EMBED_DEFAULT_RADIUS,
        minimal: false,
        showDetails: true,
    },
};

/** The opaque panel colour behind a transparent embed, per theme. Frozen with the fallbacks above. */
export const EMBED_RUNTIME_SURFACE: Record<EmbedTheme, string> = {
    light: DEFAULT_APPEARANCE.light.background,
    dark: DEFAULT_APPEARANCE.dark.background,
};

function normalizeHexColour(input: string | null | undefined): string | null {
    if (!input) return null;
    const value = input.trim();
    const shortMatch = /^#([0-9a-f]{3})$/i.exec(value);
    if (shortMatch) {
        return `#${shortMatch[1]
            .split('')
            .map((character) => character.repeat(2))
            .join('')}`.toLowerCase();
    }

    return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;
}

function normalizeBoolean(input: string | boolean | null | undefined, fallback: boolean): boolean {
    if (input === true || input === 'true' || input === '1') return true;
    if (input === false || input === 'false' || input === '0') return false;
    return fallback;
}

function normalizeRadius(input: string | number | null | undefined, fallback: number): number {
    if (input === null || input === undefined || (typeof input === 'string' && input.trim() === '')) {
        return fallback;
    }
    const value = typeof input === 'number' ? input : Number(input);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(24, Math.max(0, Math.round(value)));
}

export function normalizeEmbedTheme(input?: string | null): EmbedTheme {
    return input === 'dark' ? 'dark' : 'light';
}

export function normalizeEmbedAppearance(input: EmbedAppearanceInput = {}): EmbedAppearance {
    const theme = normalizeEmbedTheme(input.theme);
    const defaults = DEFAULT_APPEARANCE[theme];
    const background = typeof input.background === 'string' ? input.background.trim().toLowerCase() : undefined;

    return {
        theme,
        accent: normalizeHexColour(input.accent) ?? defaults.accent,
        background: background === 'transparent' ? 'transparent' : normalizeHexColour(input.background) ?? defaults.background,
        text: normalizeHexColour(input.text) ?? defaults.text,
        font: input.font === 'serif' ? 'serif' : 'system',
        radius: normalizeRadius(input.radius, defaults.radius),
        minimal: normalizeBoolean(input.minimal, defaults.minimal),
        showDetails: normalizeBoolean(input.showDetails, defaults.showDetails),
    };
}

function appearanceInputFromParams(params: EmbedAppearanceInput & { appearance?: EmbedAppearanceInput }): EmbedAppearanceInput {
    return { ...params.appearance, ...params };
}

function appearanceSearchParams(input: EmbedAppearanceInput): URLSearchParams {
    const appearance = normalizeEmbedAppearance(input);
    const defaults = DEFAULT_APPEARANCE[appearance.theme];
    const query = new URLSearchParams({ theme: appearance.theme });

    if (appearance.accent !== defaults.accent) query.set('accent', appearance.accent);
    if (appearance.background !== defaults.background) query.set('background', appearance.background);
    if (appearance.text !== defaults.text) query.set('text', appearance.text);
    if (appearance.font !== defaults.font) query.set('font', appearance.font);
    if (appearance.radius !== defaults.radius) query.set('radius', String(appearance.radius));
    if (appearance.minimal !== defaults.minimal) query.set('minimal', String(appearance.minimal));
    if (appearance.showDetails !== defaults.showDetails) query.set('showDetails', String(appearance.showDetails));

    return query;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;');
}

export function buildEmbedCheckoutUrl(
    params: {
        baseUrl: string;
        eventSlug: string;
        appearance?: EmbedAppearanceInput;
    } & EmbedAppearanceInput,
): string {
    const query = appearanceSearchParams(appearanceInputFromParams(params));
    const baseUrl = params.baseUrl.replace(/\/$/, '');
    return `${baseUrl}/embed/checkout/${encodeURIComponent(params.eventSlug)}?${query.toString()}`;
}

export function buildEmbedCheckoutSnippet(
    params: {
        slug: string;
        siteUrl?: string;
        appearance?: EmbedAppearanceInput;
    } & EmbedAppearanceInput,
): string {
    const base = (params.siteUrl || 'https://halalticketin.com').replace(/\/$/, '');
    const appearanceInput = appearanceInputFromParams(params);
    const appearance = normalizeEmbedAppearance(appearanceInput);
    const defaults = DEFAULT_APPEARANCE[appearance.theme];
    const attributes = [
        'data-halal-ticketin-checkout',
        `data-event-slug="${escapeHtmlAttribute(params.slug)}"`,
        `data-theme="${appearance.theme}"`,
    ];

    if (appearance.accent !== defaults.accent) attributes.push(`data-accent="${appearance.accent}"`);
    if (appearance.background !== defaults.background) attributes.push(`data-background="${appearance.background}"`);
    if (appearance.text !== defaults.text) attributes.push(`data-text="${appearance.text}"`);
    if (appearance.font !== defaults.font) attributes.push(`data-font="${appearance.font}"`);
    if (appearance.radius !== defaults.radius) attributes.push(`data-radius="${appearance.radius}"`);
    if (appearance.minimal !== defaults.minimal) attributes.push(`data-minimal="${appearance.minimal}"`);
    if (appearance.showDetails !== defaults.showDetails) attributes.push(`data-show-details="${appearance.showDetails}"`);

    return [
        `<div ${attributes.join(' ')}></div>`,
        `<script src="${escapeHtmlAttribute(base)}/embed/checkout.js"></script>`,
    ].join('\n');
}
