import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postFormMock, postMock } = vi.hoisted(() => ({
  postFormMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  default: {
    post: postMock,
    postForm: postFormMock,
  },
}));

import { generateEventDraft } from './event-draft';

const backendResponse = {
  draft: {
    formData: { title: 'Community Iftar' },
    tickets: [],
    promoCodes: [],
  },
  titleHint: 'iftar.webp',
};

describe('AI event draft upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    postFormMock.mockResolvedValue(backendResponse);
    postMock.mockResolvedValue(backendResponse);
  });

  it('sends an attached flyer as multipart binary data', async () => {
    const image = new File(['fake image bytes'], 'iftar.webp', { type: 'image/webp' });

    await generateEventDraft({
      organizerId: '22222222-2222-4222-8222-222222222222',
      prompt: '  Community iftar from a flyer  ',
      imageFile: image,
      titleHint: 'iftar.webp',
    });

    expect(postFormMock).toHaveBeenCalledOnce();
    const [endpoint, body] = postFormMock.mock.calls[0] as [string, FormData];
    expect(endpoint).toBe('/api/v1/ai/generate-event-draft');
    expect(body.get('organizerId')).toBe('22222222-2222-4222-8222-222222222222');
    expect(body.get('prompt')).toBe('Community iftar from a flyer');
    expect(body.get('titleHint')).toBe('iftar.webp');
    expect(body.get('image')).toBe(image);
    expect(body.has('imageBase64')).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('keeps text-only AI draft requests as JSON', async () => {
    await generateEventDraft({
      organizerId: '22222222-2222-4222-8222-222222222222',
      prompt: '  Community iftar in Dublin  ',
      titleHint: 'Community iftar',
    });

    expect(postMock).toHaveBeenCalledWith('/api/v1/ai/generate-event-draft', {
      organizerId: '22222222-2222-4222-8222-222222222222',
      prompt: 'Community iftar in Dublin',
      titleHint: 'Community iftar',
    });
    expect(postFormMock).not.toHaveBeenCalled();
  });
});
