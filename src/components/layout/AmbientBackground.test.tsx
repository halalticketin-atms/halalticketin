import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock('motion/react', async importOriginal => ({
    ...await importOriginal<typeof import('motion/react')>(),
    useReducedMotion: () => preference.reduced,
}));

import { AmbientBackground } from './AmbientBackground';

describe('ambient background hydration', () => {
    it('keeps initial markup stable when the browser prefers reduced motion', () => {
        preference.reduced = false;
        const normal = renderToStaticMarkup(<AmbientBackground showNoise={false} />);
        preference.reduced = true;
        const reduced = renderToStaticMarkup(<AmbientBackground showNoise={false} />);
        expect(reduced).toBe(normal);
    });
});
