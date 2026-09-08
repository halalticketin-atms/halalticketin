import { EMBED_RUNTIME_SURFACE, type EmbedAppearance } from './embed';

function luminance(hex: string): number {
    const channels = [1, 3, 5].map(start => {
        const value = parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string): number {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function readableText(background: string, preferred: string): string {
    if (contrast(background, preferred) >= 4.5) return preferred;
    return contrast(background, '#000000') > contrast(background, '#ffffff') ? '#000000' : '#ffffff';
}

export function embedAppearanceStyles(settings: EmbedAppearance): Record<string, string> {
    // A transparent page still needs an opaque themed panel behind the checkout itself.
    const surface = settings.background === 'transparent'
        ? EMBED_RUNTIME_SURFACE[settings.theme]
        : settings.background;
    const text = settings.text === '#000000' || settings.text === '#ffffff'
        ? settings.text
        : readableText(surface, settings.text);
    return {
        '--nav-safe-offset': '0px',
        '--background': settings.background,
        '--foreground': text,
        '--card': surface,
        '--card-foreground': text,
        '--popover': surface,
        '--popover-foreground': text,
        '--primary': settings.accent,
        '--primary-foreground': readableText(settings.accent, '#ffffff'),
        '--secondary': surface,
        '--secondary-foreground': text,
        '--muted': surface,
        '--muted-foreground': text,
        '--accent': surface,
        '--accent-foreground': text,
        '--border': `color-mix(in srgb, ${text} 25%, transparent)`,
        '--input': `color-mix(in srgb, ${text} 40%, transparent)`,
        '--ring': settings.accent,
        '--radius': `${settings.radius}px`,
        '--embed-accent-text': readableText(surface, settings.accent),
        '--embed-font': settings.font === 'serif' ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, "Segoe UI", sans-serif',
        '--embed-color-scheme': settings.background === 'transparent' ? 'normal' : settings.theme,
    };
}
