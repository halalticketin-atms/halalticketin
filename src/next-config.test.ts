import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config';

describe('event URL redirects', () => {
  it('permanently redirects the singular Marriage Through the Seasons slug', async () => {
    expect(nextConfig.redirects).toBeTypeOf('function');

    const redirects = await nextConfig.redirects!();

    expect(redirects).toContainEqual({
      source: '/events/marriage-through-the-season',
      destination: '/events/marriage-through-the-seasons',
      permanent: true,
    });
  });
});
