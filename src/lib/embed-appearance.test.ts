import { describe, expect, it } from 'vitest';
import { normalizeEmbedAppearance } from './embed';
import { embedAppearanceStyles } from './embed-appearance';

describe('embed appearance tokens', () => {
    it('keeps custom colours with sufficient contrast and applies font and radius', () => {
        const styles = embedAppearanceStyles(normalizeEmbedAppearance({ background: '#ffffff', text: '#222222', accent: '#000000', font: 'serif', radius: 0 }));
        expect(styles['--foreground']).toBe('#222222');
        expect(styles['--primary-foreground']).toBe('#ffffff');
        expect(styles['--radius']).toBe('0px');
        expect(styles['--embed-font']).toContain('Georgia');
    });
    it('honours explicit white text while keeping button labels readable', () => {
        const styles = embedAppearanceStyles(normalizeEmbedAppearance({ background: '#ffffff', text: '#ffffff', accent: '#ffffff' }));
        expect(styles['--foreground']).toBe('#ffffff');
        expect(styles['--primary-foreground']).toBe('#000000');
        expect(styles['--embed-accent-text']).toBe('#000000');
    });
    it('keeps transparent pages while using opaque themed checkout panels', () => {
        const styles = embedAppearanceStyles(normalizeEmbedAppearance({ theme: 'dark', background: 'transparent' }));
        expect(styles['--background']).toBe('transparent');
        expect(styles['--embed-color-scheme']).toBe('normal');
        expect(styles['--card']).toBe('#0a1224');
        expect(styles['--foreground']).toBe('#f8fafc');
    });
});
