'use client';

import api from '@/lib/api';
import type {
  DraftEventInitial,
  DraftFormData,
  DraftTicketType,
  DraftPromoCode,
} from '@/hooks/useEventDraft';
import type { AiDraftReview } from '@/utils/pending-draft-storage';

type AiVisibility = 'public' | 'private' | 'unlisted' | null;
type AiNullable<T> = T | null | undefined;
type AiNullableFields<T> = {
  [K in keyof T]?: T[K] | null;
};
type AiDraftFormData = AiNullableFields<Omit<DraftFormData, 'visibility' | 'customQuestions'>> & {
  visibility?: AiVisibility;
  customQuestions?: Array<{
    id?: string | null;
    label?: string | null;
    type?: 'text' | 'select' | 'checkbox' | 'date' | null;
    required?: boolean | null;
    options?: string[] | null;
  }> | null;
};
type AiTicket = {
  id?: AiNullable<string>;
  name?: AiNullable<string>;
  price?: AiNullable<string>;
  customFee?: AiNullable<string>;
  isFree?: AiNullable<boolean>;
  type?: AiNullable<'paid' | 'free' | 'donation'>;
  quantity?: AiNullable<number>;
  minPerOrder?: AiNullable<number>;
  maxPerOrder?: AiNullable<number>;
  description?: AiNullable<string>;
  salesStart?: AiNullable<string>;
  salesStartTime?: AiNullable<string>;
  salesEnd?: AiNullable<string>;
  salesEndTime?: AiNullable<string>;
  hasEarlyBird?: AiNullable<boolean>;
  earlyBirdPrice?: AiNullable<string>;
  earlyBirdEndDate?: AiNullable<string>;
  visibility?: AiNullable<'public' | 'hidden'>;
};
type AiPromoCode = {
  id?: AiNullable<string>;
  code?: AiNullable<string>;
  discountType?: AiNullable<'percentage' | 'fixed'>;
  discountValue?: AiNullable<string>;
  usageLimit?: AiNullable<number>;
  validFrom?: AiNullable<string>;
  validFromTime?: AiNullable<string>;
  validUntil?: AiNullable<string>;
  validUntilTime?: AiNullable<string>;
};
type AiDraftResponse = {
  formData?: Partial<AiDraftFormData> | null;
  tickets?: AiTicket[] | null;
  promoCodes?: AiPromoCode[] | null;
  review?: AiDraftReview | null;
};

type BackendAiResponse = {
  draft: AiDraftResponse;
  titleHint?: string;
};

type GenerateEventDraftParams = {
  organizerId: string;
  prompt: string;
  imageFile?: File;
  titleHint?: string;
};

export type AiDraftEventInitial = DraftEventInitial & {
  aiReview?: AiDraftReview;
};

export async function generateEventDraft({
  organizerId,
  prompt,
  imageFile,
  titleHint,
}: GenerateEventDraftParams): Promise<AiDraftEventInitial> {
  const trimmedPrompt = prompt.trim();
  let response: BackendAiResponse;

  if (imageFile) {
    const body = new FormData();
    body.append('organizerId', organizerId);
    body.append('prompt', trimmedPrompt);
    if (titleHint !== undefined) {
      body.append('titleHint', titleHint);
    }
    body.append('image', imageFile);

    response = await api.postForm<BackendAiResponse>('/api/v1/ai/generate-event-draft', body);
  } else {
    const body: {
      organizerId: string;
      prompt: string;
      titleHint?: string;
    } = {
      organizerId,
      prompt: trimmedPrompt,
      titleHint,
    };

    response = await api.post<BackendAiResponse>('/api/v1/ai/generate-event-draft', body);
  }

  return buildDraftFromAiPayload(response.draft, titleHint ?? trimmedPrompt);
}

export function buildDraftFromAiPayload(
  payload: AiDraftResponse,
  titleHint: string,
): AiDraftEventInitial {
  const now = Date.now();
  const formData = normalizeFormData(payload.formData ?? {}, titleHint);

  const tickets: DraftTicketType[] =
    payload.tickets && payload.tickets.length
      ? payload.tickets.flatMap((ticket, index) => {
        const normalized = normalizeTicket(ticket, index, now);
        return normalized ? [normalized] : [];
      })
      : [];

  const promoCodes: DraftPromoCode[] =
    payload.promoCodes && payload.promoCodes.length
      ? payload.promoCodes.flatMap((promo, index) => {
        const normalized = normalizePromoCode(promo, index, now);
        return normalized ? [normalized] : [];
      })
      : [];

  return {
    formData,
    tickets,
    promoCodes,
    currentStep: 1,
    aiReview: buildAiReview(payload.review, formData),
    preserveEmptyTickets: true,
  };
}

const AI_DEFAULT_REVIEW_REQUIREMENTS: Array<{
  field: keyof Pick<
    DraftFormData,
    'visibility' | 'locationType' | 'currency' | 'attendeeInfoMode'
  >;
  missingField: string;
  warning: string;
}> = [
  {
    field: 'visibility',
    missingField: 'visibility',
    warning: 'Confirm event visibility',
  },
  {
    field: 'locationType',
    missingField: 'location',
    warning: 'Confirm event format and location',
  },
  {
    field: 'currency',
    missingField: 'currency',
    warning: 'Confirm ticket currency',
  },
  {
    field: 'attendeeInfoMode',
    missingField: 'attendeeInfoMode',
    warning: 'Confirm attendee information collection',
  },
];

const buildAiReview = (
  review: AiDraftReview | null | undefined,
  formData: Partial<DraftFormData>,
): AiDraftReview | undefined => {
  const needsReview = new Set(review?.needsReview ?? []);
  const missingImportantFields = new Set(review?.missingImportantFields ?? []);

  for (const requirement of AI_DEFAULT_REVIEW_REQUIREMENTS) {
    if (formData[requirement.field] === undefined) {
      needsReview.add(requirement.warning);
      missingImportantFields.add(requirement.missingField);
    }
  }

  if (!review && needsReview.size === 0 && missingImportantFields.size === 0) {
    return undefined;
  }

  return {
    ...review,
    needsReview: Array.from(needsReview),
    missingImportantFields: Array.from(missingImportantFields),
  };
};

function normalizeFormData(
  raw: Partial<AiDraftFormData>,
  titleHint: string,
): Partial<DraftFormData> {
  const safeTitleHint = titleHint
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  const title =
    (raw.title ?? '').trim() ||
    (safeTitleHint ? safeTitleHint : 'New Event');

  const formData: Partial<DraftFormData> = { title };
  const assignString = <K extends keyof DraftFormData>(key: K, value: unknown) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      formData[key] = value.trim() as DraftFormData[K];
    }
  };

  assignString('description', raw.description);
  const categories = parseCategories(raw);
  if (categories.length > 0) formData.categories = categories;
  if (raw.visibility === 'public' || raw.visibility === 'private') formData.visibility = raw.visibility;
  assignString('date', raw.date);
  assignString('endDate', raw.endDate);
  if (typeof raw.isMultiDay === 'boolean') formData.isMultiDay = raw.isMultiDay;
  assignString('startTime', raw.startTime);
  assignString('endTime', raw.endTime);
  assignString('timezone', raw.timezone);
  if (raw.locationType === 'physical' || raw.locationType === 'online' || raw.locationType === 'hybrid') {
    formData.locationType = raw.locationType;
  }
  assignString('venue', raw.venue);
  assignString('address', raw.address);
  assignString('city', raw.city);
  assignString('onlineUrl', raw.onlineUrl);
  if (raw.currency === 'GBP' || raw.currency === 'USD' || raw.currency === 'EUR') {
    formData.currency = raw.currency;
  }
  assignString('refundPolicy', raw.refundPolicy);
  if (raw.attendeeInfoMode === 'per_ticket' || raw.attendeeInfoMode === 'buyer_choice') {
    formData.attendeeInfoMode = raw.attendeeInfoMode;
  }
  const customQuestions = normalizeCustomQuestions(raw.customQuestions);
  if (customQuestions.length > 0) formData.customQuestions = customQuestions;

  return formData;
}

function parseCategories(raw: Partial<AiDraftFormData>): string[] {
  if (Array.isArray(raw.categories)) {
    return raw.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
  }
  return [];
}

function normalizeTicket(
  raw: AiTicket,
  index: number,
  seed: number,
): DraftTicketType | null {
  const price = typeof raw.price === 'string' ? raw.price.trim() : '';
  const numericPrice = Number.parseFloat(price);
  const hasPositivePrice = Number.isFinite(numericPrice) && numericPrice > 0;
  const resolvedType: DraftTicketType['type'] | null =
    raw.type === 'free' && raw.isFree === true
      ? 'free'
      : raw.type === 'donation'
        ? 'donation'
        : raw.type === 'paid' && hasPositivePrice
          ? 'paid'
          : hasPositivePrice
            ? 'paid'
            : null;

  if (!resolvedType) {
    return null;
  }

  const baseId = raw.id && String(raw.id).trim().length > 0
    ? String(raw.id).trim()
    : `ai-ticket-${seed}-${index}`;

  const quantity =
    typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 0;
  const maxPerOrder =
    typeof raw.maxPerOrder === 'number' && raw.maxPerOrder > 0
      ? raw.maxPerOrder
      : 0;

  const visibility: DraftTicketType['visibility'] =
    raw.visibility === 'hidden' ? 'hidden' : 'public';
  const customFee =
    raw.customFee !== undefined && raw.customFee !== null ? String(raw.customFee) : '';
  const earlyBirdPrice = typeof raw.earlyBirdPrice === 'string' ? raw.earlyBirdPrice.trim() : '';

  return {
    id: baseId,
    name: raw.name && raw.name.trim().length > 0 ? raw.name : 'Standard Ticket',
    price: resolvedType === 'free' ? (price || '0') : price,
    customFee,
    isFree: resolvedType === 'free',
    type: resolvedType,
    quantity,
    minPerOrder: 0,
    maxPerOrder,
    description: raw.description ?? '',
    salesStart: raw.salesStart ?? '',
    salesStartTime: raw.salesStartTime ?? '',
    salesEnd: raw.salesEnd ?? '',
    salesEndTime: raw.salesEndTime ?? '',
    hasEarlyBird: raw.hasEarlyBird === true && earlyBirdPrice.length > 0,
    earlyBirdPrice,
    earlyBirdEndDate: raw.earlyBirdEndDate ?? '',
    visibility,
    waitlistEnabled: true,
  };
}

function normalizePromoCode(
  raw: AiPromoCode,
  index: number,
  seed: number,
): DraftPromoCode | null {
  const code = typeof raw.code === 'string' ? raw.code.trim() : '';
  const discountValue = typeof raw.discountValue === 'string' ? raw.discountValue.trim() : '';
  if (!code || !discountValue) {
    return null;
  }

  const baseId = raw.id && String(raw.id).trim().length > 0
    ? String(raw.id).trim()
    : `ai-promo-${seed}-${index}`;

  const discountType: DraftPromoCode['discountType'] =
    raw.discountType === 'fixed' ? 'fixed' : 'percentage';

  const usageLimit =
    typeof raw.usageLimit === 'number' && raw.usageLimit > 0
      ? raw.usageLimit
      : 0;

  return {
    id: baseId,
    code,
    discountType,
    discountValue,
    usageLimit,
    validFrom: raw.validFrom ?? '',
    validFromTime: raw.validFromTime ?? '',
    validUntil: raw.validUntil ?? '',
    validUntilTime: raw.validUntilTime ?? '',
  };
}

function normalizeCustomQuestions(raw: AiDraftFormData['customQuestions']): DraftFormData['customQuestions'] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((question, index) => {
    const label = typeof question.label === 'string' ? question.label.trim() : '';
    if (!label || !question.type) return [];
    return [{
      id: typeof question.id === 'string' && question.id.trim() ? question.id.trim() : `ai-question-${index}`,
      label,
      type: question.type,
      required: question.required === true,
      options: Array.isArray(question.options)
        ? question.options.filter((option) => typeof option === 'string' && option.trim().length > 0)
        : undefined,
    }];
  });
}
