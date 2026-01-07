'use client';

import api from '@/lib/api';
import type {
  DraftEventInitial,
  DraftFormData,
  DraftTicketType,
  DraftPromoCode,
} from '@/hooks/useEventDraft';

type AiDraftResponse = {
  formData?: Partial<DraftFormData> | null;
  tickets?: Partial<DraftTicketType>[] | null;
  promoCodes?: Partial<DraftPromoCode>[] | null;
};

type BackendAiResponse = {
  draft: AiDraftResponse;
  titleHint?: string;
};

type GenerateEventDraftParams = {
  prompt: string;
  imageFile?: File;
  titleHint?: string;
};

export async function generateEventDraft({
  prompt,
  imageFile,
  titleHint,
}: GenerateEventDraftParams): Promise<DraftEventInitial> {
  // Prepare request body
  const body: {
    prompt: string;
    imageBase64?: string;
    mimeType?: string;
    titleHint?: string;
  } = {
    prompt: prompt.trim(),
    titleHint,
  };

  // Convert image to base64 if provided
  if (imageFile) {
    const base64Image = await fileToBase64(imageFile);
    body.imageBase64 = base64Image;
    body.mimeType = imageFile.type || 'image/png';
  }

  // Call backend AI endpoint (requires authentication)
  const response = await api.post<BackendAiResponse>('/api/v1/ai/generate-event-draft', body);

  return buildDraftFromAiPayload(response.draft, titleHint ?? prompt.trim() ?? '');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file as data URL'));
        return;
      }
      const commaIndex = result.indexOf(',');
      if (commaIndex === -1) {
        reject(new Error('Unexpected data URL format'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

function buildDraftFromAiPayload(
  payload: AiDraftResponse,
  titleHint: string,
): DraftEventInitial {
  const now = Date.now();
  const formData = normalizeFormData(payload.formData ?? {}, titleHint);

  const tickets: DraftTicketType[] =
    payload.tickets && payload.tickets.length
      ? payload.tickets.map((ticket, index) => normalizeTicket(ticket, index, now))
      : [];

  const promoCodes: DraftPromoCode[] =
    payload.promoCodes && payload.promoCodes.length
      ? payload.promoCodes.map((promo, index) => normalizePromoCode(promo, index, now))
      : [];

  return {
    formData,
    tickets,
    promoCodes,
    currentStep: 1,
  };
}

function normalizeFormData(
  raw: Partial<DraftFormData>,
  titleHint: string,
): DraftFormData {
  const safeTitleHint = titleHint
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim();

  const title =
    (raw.title ?? '').trim() ||
    (safeTitleHint ? safeTitleHint : 'New Event');

  const description = (raw.description ?? '').trim();

  const timezone = (raw.timezone ?? '').trim() || 'Europe/London';

  let locationType: DraftFormData['locationType'] = 'physical';
  if (raw.locationType === 'online' || raw.locationType === 'hybrid') {
    locationType = raw.locationType;
  }

  return {
    title,
    description,
    bannerImageDataUrl: raw.bannerImageDataUrl ?? '',
    categories: parseCategories(raw),
    visibility: raw.visibility === 'private' ? 'private' : 'public',
    date: raw.date ?? '',
    endDate: raw.endDate ?? '',
    isMultiDay: Boolean(raw.isMultiDay),
    startTime: raw.startTime ?? '',
    endTime: raw.endTime ?? '',
    timezone,
    locationType,
    venue: raw.venue ?? '',
    address: raw.address ?? '',
    city: raw.city ?? '',
    onlineUrl: raw.onlineUrl ?? '',
    absorbFee: raw.absorbFee ?? false,
    currency: raw.currency ?? 'GBP',
    refundPolicy: raw.refundPolicy ?? '',
    attendeeInfoMode: raw.attendeeInfoMode ?? 'buyer_choice',
    customQuestions: raw.customQuestions ?? [],
  };
}

function parseCategories(raw: Partial<DraftFormData> & { category?: string }): string[] {
  // Handle array of categories
  if (Array.isArray(raw.categories)) {
    return raw.categories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
  }
  // Handle legacy single category string
  if (typeof raw.category === 'string' && raw.category.trim().length > 0) {
    return raw.category.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
  }
  return [];
}

function normalizeTicket(
  raw: Partial<DraftTicketType>,
  index: number,
  seed: number,
): DraftTicketType {
  const baseId = raw.id && String(raw.id).trim().length > 0
    ? String(raw.id).trim()
    : `ai-ticket-${seed}-${index}`;

  const quantity =
    typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 100;
  const maxPerOrder =
    typeof raw.maxPerOrder === 'number' && raw.maxPerOrder > 0
      ? raw.maxPerOrder
      : 10;

  const visibility: DraftTicketType['visibility'] =
    raw.visibility === 'hidden' ? 'hidden' : 'public';
  const customFee =
    raw.customFee !== undefined && raw.customFee !== null ? String(raw.customFee) : '';
  const resolvedType: DraftTicketType['type'] =
    raw.type === 'donation'
      ? 'donation'
      : raw.type === 'free' || raw.isFree
        ? 'free'
        : 'paid';

  return {
    id: baseId,
    name: raw.name && raw.name.trim().length > 0 ? raw.name : 'Standard Ticket',
    price: raw.price ?? '',
    customFee,
    isFree: resolvedType === 'free',
    type: resolvedType,
    quantity,
    maxPerOrder,
    description: raw.description ?? '',
    salesStart: raw.salesStart ?? '',
    salesEnd: raw.salesEnd ?? '',
    hasEarlyBird: Boolean(raw.hasEarlyBird),
    earlyBirdPrice: raw.earlyBirdPrice ?? '',
    earlyBirdEndDate: raw.earlyBirdEndDate ?? '',
    visibility,
  };
}

function normalizePromoCode(
  raw: Partial<DraftPromoCode>,
  index: number,
  seed: number,
): DraftPromoCode {
  const baseId = raw.id && String(raw.id).trim().length > 0
    ? String(raw.id).trim()
    : `ai-promo-${seed}-${index}`;

  const discountType: DraftPromoCode['discountType'] =
    raw.discountType === 'fixed' ? 'fixed' : 'percentage';

  const usageLimit =
    typeof raw.usageLimit === 'number' && raw.usageLimit > 0
      ? raw.usageLimit
      : 100;

  return {
    id: baseId,
    code: raw.code ?? '',
    discountType,
    discountValue: raw.discountValue ?? '',
    usageLimit,
    validFrom: raw.validFrom ?? '',
    validUntil: raw.validUntil ?? '',
  };
}
