import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import Home from './HomePageClient';

describe('homepage initial content', () => {
  it('keeps the heading visible in server markup with the smaller Motion features', () => {
    const markup = renderToStaticMarkup(React.createElement(Home));
    expect(markup).toContain('Your home for');
    expect(markup).toContain('meaningful events.');
    const headingContainer = markup.match(/<div\b[^>]*class="text-center"[^>]*>/)?.[0];
    expect(headingContainer).toBeDefined();
    expect(headingContainer).toContain('opacity:1');
    expect(headingContainer).not.toContain('visibility:hidden');
  });
});
