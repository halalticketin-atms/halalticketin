import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/pricing',
  useRouter: () => ({ push: vi.fn() }),
}));

import { Header } from './Header';

describe('header entrance timing', () => {
  it('includes the existing fade in server markup, before hydration', () => {
    const markup = renderToStaticMarkup(React.createElement(Header));
    const nav = markup.match(/<nav\b[^>]*>/)?.[0];
    expect(nav).toBeDefined();
    expect(nav).toContain('animate-in');
    expect(nav).toContain('fade-in');
    expect(nav).toContain('duration-300');
    expect(nav).toContain('fill-mode-forwards');
  });

  it('reserves the logo source ratio without changing its CSS height', () => {
    const markup = renderToStaticMarkup(React.createElement(Header));
    const logo = markup.match(/<img\b[^>]*alt="HalalTicketin&#x27; Logo"[^>]*>/)?.[0];
    expect(logo).toContain('width="1186"');
    expect(logo).toContain('height="448"');
    expect(logo).toContain('class="h-8 w-auto"');
    expect(logo).toContain('sizes="85px"');
  });
});
