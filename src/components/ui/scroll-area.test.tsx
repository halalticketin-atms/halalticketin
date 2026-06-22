import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ScrollArea } from './scroll-area';

describe('ScrollArea', () => {
  it('clips content to the scroll viewport', () => {
    const html = renderToStaticMarkup(<ScrollArea>Content</ScrollArea>);

    expect(html).toContain('overflow-hidden');
  });
});
