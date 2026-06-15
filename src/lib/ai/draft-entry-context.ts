import type { DraftEventInitial } from '@/hooks/useEventDraft';
import type {
  AiDraftReview,
  DraftEntrySource,
  PendingDraftPayload,
} from '@/utils/pending-draft-storage';

export type DraftEntryContext = {
  source: 'scratch' | DraftEntrySource;
  label: string;
  description?: string;
  aiReview?: AiDraftReview;
};

export type DraftEntryResolution = {
  initialDraft?: DraftEventInitial;
  entryContext: DraftEntryContext;
  wizardKey: string;
};

const ENTRY_CONTEXT_DEFAULTS: Record<'scratch' | DraftEntrySource, DraftEntryContext> = {
  scratch: {
    source: 'scratch',
    label: 'Start from scratch',
  },
  ai: {
    source: 'ai',
    label: 'AI suggestion',
    description: 'Generated via the assistant. Double-check details before publishing.',
  },
  clone: {
    source: 'clone',
    label: 'Cloned from event',
    description: 'Copied from a previous event. Update the schedule or tickets if needed.',
  },
  draft: {
    source: 'draft',
    label: 'Draft in progress',
    description: 'Continue editing a saved draft without losing earlier work.',
  },
};

export const resolveDraftEntryContext = (
  source: DraftEntrySource | null,
  pending: PendingDraftPayload | null,
): DraftEntryResolution => {
  if (!source) {
    return {
      entryContext: ENTRY_CONTEXT_DEFAULTS.scratch,
      wizardKey: 'scratch',
    };
  }

  if (pending?.source === source) {
    const fallback = ENTRY_CONTEXT_DEFAULTS[source];
    return {
      initialDraft: pending.draft,
      entryContext: {
        source,
        label: pending.meta?.label ?? fallback.label,
        description: pending.meta?.description ?? fallback.description,
        ...(source === 'ai' && pending.meta?.aiReview
          ? { aiReview: pending.meta.aiReview }
          : {}),
      },
      wizardKey: `${source}-${pending.meta?.key ?? source}`,
    };
  }

  return {
    entryContext: {
      source: 'scratch',
      label: 'Start from scratch',
      description: 'We could not load that draft, so you can continue manually.',
    },
    wizardKey: `scratch-${source}`,
  };
};
