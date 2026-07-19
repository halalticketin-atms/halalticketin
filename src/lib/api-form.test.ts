import { afterEach, describe, expect, it, vi } from 'vitest';

import api from './api';

describe('ApiClient multipart requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves the multipart content type and boundary to fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const body = new FormData();
    body.append('image', new File(['image bytes'], 'flyer.png', { type: 'image/png' }));

    await api.postForm('/ai-draft', body);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3001/ai-draft');
    expect(options.method).toBe('POST');
    expect(options.body).toBe(body);
    expect(options.headers).toBeInstanceOf(Headers);
    expect((options.headers as Headers).has('Content-Type')).toBe(false);
  });
});
