import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  consumePendingDraft,
  savePendingDraft,
  type PendingDraftPayload,
} from '@/utils/pending-draft-storage';
import { resolveDraftEntryContext } from './draft-entry-context';

const createSessionStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

describe('AI draft entry context', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves AI review metadata from session storage into the wizard context', () => {
    vi.stubGlobal('window', {
      sessionStorage: createSessionStorage(),
    });

    const pending: PendingDraftPayload = {
      source: 'ai',
      draft: {
        formData: { title: 'Community Iftar' },
        tickets: [],
        preserveEmptyTickets: true,
      },
      meta: {
        key: 'ai-123',
        label: 'AI-generated draft',
        description: 'Review the auto-filled details in the editor.',
        aiReview: {
          confidence: 'low',
          needsReview: ['Confirm event visibility', 'Add ticket details'],
          missingImportantFields: ['visibility', 'tickets'],
        },
      },
    };

    savePendingDraft(pending);
    const consumed = consumePendingDraft();
    const resolved = resolveDraftEntryContext('ai', consumed);

    expect(resolved.initialDraft).toEqual(pending.draft);
    expect(resolved.wizardKey).toBe('ai-ai-123');
    expect(resolved.entryContext).toEqual({
      source: 'ai',
      label: 'AI-generated draft',
      description: 'Review the auto-filled details in the editor.',
      aiReview: pending.meta?.aiReview,
    });
  });
});
