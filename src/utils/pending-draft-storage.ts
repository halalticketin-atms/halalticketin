import type { DraftEventInitial } from '@/hooks/useEventDraft';

export type DraftEntrySource = 'ai' | 'clone' | 'draft';

interface PendingDraftMeta {
  label?: string;
  description?: string;
  key?: string;
}

export interface PendingDraftPayload {
  source: DraftEntrySource;
  draft: DraftEventInitial;
  meta?: PendingDraftMeta;
}

const STORAGE_KEY = 'halalticketin:pending-draft';

export function savePendingDraft(payload: PendingDraftPayload) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage might be unavailable; fail silently for scaffold.
  }
}

export function consumePendingDraft(): PendingDraftPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PendingDraftPayload;
  } catch {
    return null;
  }
}
