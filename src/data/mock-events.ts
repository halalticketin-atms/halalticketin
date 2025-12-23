import type { DraftEventInitial } from '@/hooks/useEventDraft';

export type EventStatus = 'ongoing' | 'upcoming' | 'past' | 'draft';

export interface DashboardEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  status: EventStatus;
  ticketsSold: number;
  totalTickets: number;
  imageUrl: string;
  revenue: string;
  templateKey?: DraftTemplateKey;
}

export interface CloneableEventOption {
  id: string;
  title: string;
  location: string;
  summary: string;
  templateKey: DraftTemplateKey;
}

export interface DraftEventOption {
  id: string;
  title: string;
  updatedAt: string;
  description: string;
  progressLabel: string;
  templateKey: DraftTemplateKey;
}

export type DraftTemplateKey =
  | 'communityIftar'
  | 'financeWorkshop'
  | 'youthConference'
  | 'ramadanPrep';

const cloneDraft = (draft: DraftEventInitial): DraftEventInitial =>
  JSON.parse(JSON.stringify(draft));

const draftTemplates: Record<DraftTemplateKey, DraftEventInitial> = {
  communityIftar: {
    formData: {
      title: 'Community Iftar 2024',
      description:
        'Join us for a warm community iftar with inspiring talks, Qur’an recitation, and delicious food.',
      categories: ['Community'],
      organizerName: 'London Islamic Centre',
      date: '2024-12-15',
      endDate: '2024-12-15',
      isMultiDay: false,
      startTime: '18:00',
      endTime: '22:00',
      timezone: 'Europe/London',
      locationType: 'physical',
      venue: 'London Islamic Centre',
      address: '123 Crescent Road',
      city: 'London',
      onlineUrl: '',
    },
    tickets: [
      {
        id: 't-iftar-general',
        name: 'General Admission',
        price: '15',
        isFree: false,
        quantity: 120,
        maxPerOrder: 6,
        description: 'Includes full meal and dessert.',
        salesStart: '2024-10-01',
        salesEnd: '2024-12-14',
        hasEarlyBird: true,
        earlyBirdPrice: '12',
        earlyBirdEndDate: '2024-11-15',
        visibility: 'public',
      },
    ],
    promoCodes: [
      {
        id: 'promo-community',
        code: 'COMMUNITY5',
        discountType: 'fixed',
        discountValue: '5',
        usageLimit: 30,
        validFrom: '2024-10-01',
        validUntil: '2024-11-30',
      },
    ],
    currentStep: 2,
  },
  financeWorkshop: {
    formData: {
      title: 'Islamic Finance Workshop',
      description: 'Interactive workshop covering fundamentals of Islamic finance and fintech.',
      categories: ['Education'],
      organizerName: 'HalalTicketin Team',
      date: '2025-01-10',
      endDate: '2025-01-10',
      isMultiDay: false,
      startTime: '14:00',
      endTime: '17:00',
      timezone: 'Europe/London',
      locationType: 'online',
      venue: '',
      address: '',
      city: '',
      onlineUrl: 'https://example.com/finance-workshop',
    },
    tickets: [
      {
        id: 't-workshop-standard',
        name: 'Workshop Access',
        price: '25',
        isFree: false,
        quantity: 80,
        maxPerOrder: 5,
        description: 'Includes live Q&A and downloadable resources.',
        salesStart: '2024-11-01',
        salesEnd: '2025-01-09',
        hasEarlyBird: false,
        earlyBirdPrice: '',
        earlyBirdEndDate: '',
        visibility: 'public',
      },
    ],
    promoCodes: [
      {
        id: 'promo-early',
        code: 'EARLY10',
        discountType: 'percentage',
        discountValue: '10',
        usageLimit: 50,
        validFrom: '2024-11-01',
        validUntil: '2024-12-15',
      },
    ],
    currentStep: 1,
  },
  youthConference: {
    formData: {
      title: 'Youth Conference 2025',
      description:
        'Two-day conference equipping Muslim youth with leadership tools, mentorship, and spiritual grounding.',
      categories: ['Conference'],
      organizerName: 'UK Youth Collective',
      date: '2025-02-01',
      endDate: '2025-02-02',
      isMultiDay: true,
      startTime: '10:00',
      endTime: '18:00',
      timezone: 'Europe/London',
      locationType: 'physical',
      venue: 'Birmingham Central Mosque',
      address: '45 Crescent Road',
      city: 'Birmingham',
      onlineUrl: '',
    },
    tickets: [
      {
        id: 't-yc-full',
        name: 'Full Conference Pass',
        price: '49',
        isFree: false,
        quantity: 500,
        maxPerOrder: 10,
        description: 'Access to all sessions over the two days.',
        salesStart: '2024-10-01',
        salesEnd: '2025-01-31',
        hasEarlyBird: true,
        earlyBirdPrice: '39',
        earlyBirdEndDate: '2024-12-15',
        visibility: 'public',
      },
      {
        id: 't-yc-student',
        name: 'Student Pass',
        price: '25',
        isFree: false,
        quantity: 200,
        maxPerOrder: 4,
        description: 'Discounted access for students with valid ID.',
        salesStart: '2024-10-01',
        salesEnd: '2025-01-31',
        hasEarlyBird: false,
        earlyBirdPrice: '',
        earlyBirdEndDate: '',
        visibility: 'public',
      },
    ],
    promoCodes: [
      {
        id: 'promo-community-youth',
        code: 'YOUTH10',
        discountType: 'percentage',
        discountValue: '10',
        usageLimit: 100,
        validFrom: '2024-10-01',
        validUntil: '2025-01-01',
      },
    ],
    currentStep: 2,
  },
  ramadanPrep: {
    formData: {
      title: 'Ramadan Prep Workshop',
      description: 'Virtual workshop covering spiritual preparation, meals, and productivity systems.',
      categories: ['Education'],
      organizerName: 'Faith & Focus',
      date: '2025-03-01',
      endDate: '2025-03-01',
      isMultiDay: false,
      startTime: '15:00',
      endTime: '17:30',
      timezone: 'Europe/London',
      locationType: 'online',
      venue: '',
      address: '',
      city: '',
      onlineUrl: 'https://example.com/ramadan-prep',
    },
    tickets: [
      {
        id: 't-ramadan-standard',
        name: 'Workshop Ticket',
        price: '19',
        isFree: false,
        quantity: 100,
        maxPerOrder: 5,
        description: 'Includes workbook and replay access.',
        salesStart: '2024-12-01',
        salesEnd: '2025-02-28',
        hasEarlyBird: true,
        earlyBirdPrice: '15',
        earlyBirdEndDate: '2025-01-15',
        visibility: 'public',
      },
    ],
    promoCodes: [],
    currentStep: 1,
  },
};

export const dashboardEvents: DashboardEvent[] = [];

const safeGetTemplate = (key?: DraftTemplateKey): DraftEventInitial | undefined => {
  if (!key) return undefined;
  const template = draftTemplates[key];
  if (!template) return undefined;
  return cloneDraft(template);
};

export const cloneableEventOptions: CloneableEventOption[] = [];

export const draftEventOptions: DraftEventOption[] = [];

export const checkInEventOptions: Array<{ id: string; name: string; date: string }> = [];

export function getDraftInitialForEvent(eventId: string): DraftEventInitial | undefined {
  const event = dashboardEvents.find((item) => item.id === eventId);
  return safeGetTemplate(event?.templateKey);
}

export function getDraftInitialForDraft(draftId: string): DraftEventInitial | undefined {
  const draft = draftEventOptions.find((item) => item.id === draftId);
  return safeGetTemplate(draft?.templateKey);
}

export function getTemplateByKey(key: DraftTemplateKey): DraftEventInitial {
  return cloneDraft(draftTemplates[key]);
}
