'use client';

import type {
  DraftEventInitial,
  DraftFormData,
  DraftTicketType,
  DraftPromoCode,
} from '@/hooks/useEventDraft';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL =
  process.env.NEXT_PUBLIC_GEMINI_MODEL_NAME ?? 'gemini-2.5-flash';

type AiDraftResponse = {
  formData?: Partial<DraftFormData> | null;
  tickets?: Partial<DraftTicketType>[] | null;
  promoCodes?: Partial<DraftPromoCode>[] | null;
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
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured');
  }

  const parts: Array<Record<string, unknown>> = [];

  const instruction = [
    'You are an assistant that extracts structured event details for an event ticketing platform.',
    'You will receive (1) an event flyer image and/or (2) organiser text describing the event.',
    'Return a single JSON object with this exact shape:',
    '{',
    '  "formData": {',
    '    "title": string | null,',
    '    "description": string | null,',
    '    "category": string | null,',
    '    "organizerName": string | null,',
    '    "date": string | null,            // YYYY-MM-DD if possible',
    '    "endDate": string | null,         // YYYY-MM-DD for multi-day events',
    '    "isMultiDay": boolean | null,',
    '    "startTime": string | null,       // HH:MM 24h if possible',
    '    "endTime": string | null,         // HH:MM 24h if possible',
    '    "timezone": string | null,        // e.g. Europe/London if you can infer',
    '    "locationType": "physical" | "online" | "hybrid" | null,',
    '    "venue": string | null,',
    '    "address": string | null,',
    '    "city": string | null,',
    '    "onlineUrl": string | null',
    '  },',
    '  "tickets": Array<{',
    '    "name": string | null,',
    '    "price": string | null,           // numeric string without currency symbol, e.g. "15"',
    '    "isFree": boolean | null,',
    '    "quantity": number | null,',
    '    "maxPerOrder": number | null,',
    '    "description": string | null,',
    '    "salesStart": string | null,      // YYYY-MM-DD if available',
    '    "salesEnd": string | null,        // YYYY-MM-DD if available',
    '    "hasEarlyBird": boolean | null,',
    '    "earlyBirdPrice": string | null,',
    '    "earlyBirdEndDate": string | null,',
    '    "visibility": "public" | "hidden" | null',
    '  }>,',
    '  "promoCodes": Array<{',
    '    "code": string | null,',
    '    "discountType": "percentage" | "fixed" | null,',
    '    "discountValue": string | null,',
    '    "usageLimit": number | null,',
    '    "validFrom": string | null,       // YYYY-MM-DD',
    '    "validUntil": string | null       // YYYY-MM-DD',
    '  }>',
    '}',
    '',
    'Rules:',
    '- Use information from both the flyer image and the organiser text.',
    '- If text and image conflict, prefer the organiser text.',
    '- If you cannot infer a field, set it to null.',
    '- Do not include any explanation, comments, or Markdown. Respond with JSON only.',
  ].join('\n');

  parts.push({ text: instruction });

  const trimmedPrompt = prompt.trim();
  const organiserText = trimmedPrompt
    ? `Organiser description and instructions:\n${trimmedPrompt}`
    : 'No organiser description was provided. Infer details only from the flyer if possible.';

  parts.push({ text: organiserText });

  if (imageFile) {
    const base64Image = await fileToBase64(imageFile);
    parts.push({
      inlineData: {
        mimeType: imageFile.type || 'image/png',
        data: base64Image,
      },
    });
  }

  const body = {
    contents: [
      {
        parts,
      },
    ],
  };

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(GEMINI_MODEL) +
      ':generateContent?key=' +
      encodeURIComponent(GEMINI_API_KEY),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText =
    data.candidates?.[0]?.content?.parts?.find((p) => typeof p.text === 'string')?.text ?? '';

  if (!rawText) {
    throw new Error('Gemini response did not contain text');
  }

  const jsonText = extractJson(rawText);
  const parsed = JSON.parse(jsonText) as AiDraftResponse;

  return buildDraftFromAiPayload(parsed, titleHint ?? trimmedPrompt ?? '');
}

function extractJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not locate JSON object in Gemini response');
  }
  return text.slice(start, end + 1);
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

  const description =
    (raw.description ?? '').trim() ||
    'Curated by the AI assistant. Review details and adjust anything before publishing.';

  const timezone = (raw.timezone ?? '').trim() || 'Europe/London';

  let locationType: DraftFormData['locationType'] = 'physical';
  if (raw.locationType === 'online' || raw.locationType === 'hybrid') {
    locationType = raw.locationType;
  }

  return {
    title,
    description,
    bannerImageDataUrl: raw.bannerImageDataUrl ?? '',
    category: raw.category ?? '',
    organizerName: raw.organizerName ?? 'HalalTicketin AI Draft',
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
  };
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

  return {
    id: baseId,
    name: raw.name && raw.name.trim().length > 0 ? raw.name : 'Standard Ticket',
    price: raw.price ?? '',
    isFree: Boolean(raw.isFree),
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
