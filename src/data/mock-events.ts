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
      category: 'Community',
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
      category: 'Education',
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
      category: 'Conference',
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
      category: 'Education',
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

export const dashboardEvents: DashboardEvent[] = [
  {
    id: '1',
    title: 'Community Iftar 2024',
    description: 'Warm community iftar with spiritual reminders.',
    date: 'Dec 15, 2024',
    time: '6:00 PM',
    location: 'London Islamic Centre',
    status: 'upcoming',
    ticketsSold: 45,
    totalTickets: 100,
    imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=400&h=300&fit=crop',
    revenue: '£450',
    templateKey: 'communityIftar',
  },
  {
    id: '2',
    title: 'Islamic Finance Workshop',
    description: 'Online intensive unpacking halal investing and fintech.',
    date: 'Jan 10, 2025',
    time: '2:00 PM',
    location: 'Online',
    status: 'upcoming',
    ticketsSold: 28,
    totalTickets: 50,
    imageUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=400&h=300&fit=crop',
    revenue: '£700',
    templateKey: 'financeWorkshop',
  },
  {
    id: '3',
    title: 'Youth Conference 2025',
    description: 'Two-day youth leadership summit in Birmingham.',
    date: 'Feb 1, 2025',
    time: '10:00 AM',
    location: 'Birmingham Central Mosque',
    status: 'draft',
    ticketsSold: 0,
    totalTickets: 500,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
    revenue: '£0',
    templateKey: 'youthConference',
  },
  {
    id: '4',
    title: 'Sisters Wellness Retreat',
    description: 'Mindfulness and fitness retreat built for sisters.',
    date: 'Nov 20, 2024',
    time: '9:00 AM',
    location: 'Manchester',
    status: 'ongoing',
    ticketsSold: 156,
    totalTickets: 200,
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
    revenue: '£5,460',
    templateKey: 'ramadanPrep',
  },
  {
    id: '5',
    title: 'Eid Festival 2024',
    description: 'Family-friendly Eid celebration with stalls and rides.',
    date: 'Apr 10, 2024',
    time: '11:00 AM',
    location: 'London',
    status: 'past',
    ticketsSold: 1200,
    totalTickets: 1200,
    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=300&fit=crop',
    revenue: '£12,000',
  },
  {
    id: '6',
    title: 'Halal Food Festival',
    description: 'Showcasing artisans, chefs, and food trucks.',
    date: 'Aug 5, 2024',
    time: '1:00 PM',
    location: 'London',
    status: 'past',
    ticketsSold: 980,
    totalTickets: 1100,
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    revenue: '£14,700',
  },
];

const safeGetTemplate = (key?: DraftTemplateKey): DraftEventInitial | undefined => {
  if (!key) return undefined;
  const template = draftTemplates[key];
  if (!template) return undefined;
  return cloneDraft(template);
};

export const cloneableEventOptions: CloneableEventOption[] = dashboardEvents
  .filter((event) => Boolean(event.templateKey))
  .map((event) => ({
    id: event.id,
    title: event.title,
    location: event.location,
    summary: event.description,
    templateKey: event.templateKey as DraftTemplateKey,
  }));

export const draftEventOptions: DraftEventOption[] = [
  {
    id: 'draft-youth',
    title: 'Youth Conference 2025',
    updatedAt: 'Updated 2 days ago',
    description: 'Need to finalize venue logistics and speaker lineup.',
    progressLabel: 'Step 2 · Tickets',
    templateKey: 'youthConference',
  },
  {
    id: 'draft-ramadan',
    title: 'Ramadan Prep Workshop',
    updatedAt: 'Updated 4 hours ago',
    description: 'Waiting on AI copy for the promo section.',
    progressLabel: 'Step 1 · Basics',
    templateKey: 'ramadanPrep',
  },
];

export const checkInEventOptions = dashboardEvents
  .filter((event) => ['ongoing', 'upcoming'].includes(event.status))
  .slice(0, 3)
  .map((event) => ({
    id: event.id,
    name: event.title,
    date: event.date,
  }));

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
