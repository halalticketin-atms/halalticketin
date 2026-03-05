'use client';

import { useState, type ChangeEvent } from 'react';

export type DraftLocationType = 'physical' | 'online' | 'hybrid';
export type DraftAttendeeInfoMode = 'per_ticket' | 'buyer_choice';

export interface DraftCustomQuestion {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface DraftFormData {
  title: string;
  description: string;
  bannerImageDataUrl: string;
  categories: string[];
  totalCapacity: number;
  visibility: 'public' | 'private';
  accessCodeEnabled: boolean;
  accessCode: string;
  date: string;
  endDate: string;
  isMultiDay: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
  locationType: DraftLocationType;
  venue: string;
  address: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  onlineUrl: string;
  absorbFee: boolean;
  currency: string;
  refundPolicy: string;
  attendeeInfoMode: DraftAttendeeInfoMode;
  customQuestions: DraftCustomQuestion[];
}

export interface DraftTicketType {
  id: string;
  name: string;
  price: string;
  customFee: string;
  isFree: boolean;
  type: 'paid' | 'free' | 'donation';
  quantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  description: string;
  salesStart: string;
  salesStartTime: string;
  salesEnd: string;
  salesEndTime: string;
  hasEarlyBird: boolean;
  earlyBirdPrice: string;
  earlyBirdEndDate: string;
  visibility: 'public' | 'hidden';
  absorbFee?: boolean | null; // null = use event default, true/false = explicit override
}

export interface DraftPromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  usageLimit: number;
  validFrom: string;
  validFromTime: string;
  validUntil: string;
  validUntilTime: string;
  isActive?: boolean;
  revealsHiddenTickets?: boolean;
  applicableTicketTypeIds?: string[] | null;
}

export interface DraftEventInitial {
  eventId?: string;
  eventStatus?: 'draft' | 'published' | 'cancelled' | 'archived';
  formData?: Partial<DraftFormData>;
  tickets?: DraftTicketType[];
  promoCodes?: DraftPromoCode[];
  currentStep?: number;
}

const stepsCountDefault = 4;

const defaultFormData: DraftFormData = {
  title: '',
  description: '',
  bannerImageDataUrl: '',
  categories: [],
  totalCapacity: 0,
  visibility: 'public',
  accessCodeEnabled: false,
  accessCode: '',
  date: '',
  endDate: '',
  isMultiDay: false,
  startTime: '',
  endTime: '',
  timezone: 'Europe/London',
  locationType: 'physical',
  venue: '',
  address: '',
  city: '',
  country: '',
  latitude: null,
  longitude: null,
  onlineUrl: '',
  absorbFee: false,
  currency: 'GBP',
  refundPolicy: '',
  attendeeInfoMode: 'buyer_choice',
  customQuestions: [],
};

const createDefaultTicket = (): DraftTicketType => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: 'General Admission',
  price: '',
  customFee: '',
  isFree: false,
  type: 'paid',
  quantity: 100,
  minPerOrder: 0,
  maxPerOrder: 0,
  description: '',
  salesStart: '',
  salesStartTime: '',
  salesEnd: '',
  salesEndTime: '',
  hasEarlyBird: false,
  earlyBirdPrice: '',
  earlyBirdEndDate: '',
  visibility: 'public',
  absorbFee: false, // per-ticket, no event-level default
});

const createDonationTicket = (): DraftTicketType => ({
  id: `donation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: 'Donation',
  price: '0',
  customFee: '',
  isFree: false,
  type: 'donation',
  quantity: 1,
  minPerOrder: 1,
  maxPerOrder: 1,
  description: '',
  salesStart: '',
  salesStartTime: '',
  salesEnd: '',
  salesEndTime: '',
  hasEarlyBird: false,
  earlyBirdPrice: '',
  earlyBirdEndDate: '',
  visibility: 'public',
  absorbFee: false,
});

export function useEventDraft(initial?: DraftEventInitial, totalSteps: number = stepsCountDefault) {
  const normalizeTicketType = (ticket: DraftTicketType): DraftTicketType => {
    const normalizedTicket: DraftTicketType = {
      ...ticket,
      salesStart: ticket.salesStart ?? '',
      salesStartTime: ticket.salesStartTime ?? '',
      salesEnd: ticket.salesEnd ?? '',
      salesEndTime: ticket.salesEndTime ?? '',
      type: ticket.type ?? (ticket.isFree ? 'free' : 'paid'),
    };
    return normalizedTicket;
  };

  const normalizeCustomQuestions = (questions?: DraftCustomQuestion[]) => {
    if (!questions || questions.length === 0) {
      return [];
    }
    return questions.map((question, index) => {
      const id = typeof question.id === 'string' && question.id.trim().length > 0
        ? question.id
        : `q-${index}`;
      const hasOptions = question.type === 'select' || question.type === 'checkbox';
      const options = hasOptions
        ? (Array.isArray(question.options) ? question.options : [])
        : undefined;
      return { ...question, id, options };
    });
  };

  const normalizeVisibility = (value?: string): 'public' | 'private' | undefined => {
    if (value === 'private' || value === 'unlisted') {
      return 'private';
    }
    if (value === 'public') {
      return 'public';
    }
    return undefined;
  };

  const normalizePromoCode = (promo: DraftPromoCode): DraftPromoCode => ({
    ...promo,
    validFrom: promo.validFrom ?? '',
    validFromTime: promo.validFromTime ?? '',
    validUntil: promo.validUntil ?? '',
    validUntilTime: promo.validUntilTime ?? '',
  });

  const normalizedVisibility = normalizeVisibility(initial?.formData?.visibility);
  const normalizedInitialFormData = initial?.formData
    ? {
      ...initial.formData,
      ...(normalizedVisibility && { visibility: normalizedVisibility }),
      customQuestions: normalizeCustomQuestions(initial.formData.customQuestions),
    } as Partial<DraftFormData>
    : undefined;

  const [currentStep, setCurrentStep] = useState(initial?.currentStep ?? 1);
  const [formData, setFormData] = useState<DraftFormData>({
    ...defaultFormData,
    ...normalizedInitialFormData,
  });
  const [tickets, setTickets] = useState<DraftTicketType[]>(
    initial?.tickets && initial.tickets.length > 0
      ? initial.tickets.map(normalizeTicketType)
      : [createDefaultTicket()],
  );
  const [promoCodes, setPromoCodes] = useState<DraftPromoCode[]>(
    initial?.promoCodes?.map(normalizePromoCode) ?? [],
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = 'checked' in e.target ? e.target.checked : false;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const updateTicket = <K extends keyof DraftTicketType>(
    id: string,
    field: K,
    value: DraftTicketType[K],
  ) => {
    setTickets((prev) =>
      prev.map((ticket) => (ticket.id === id ? { ...ticket, [field]: value } : ticket)),
    );
  };

  const addTicket = () => {
    setTickets((prev) => [...prev, createDefaultTicket()]);
  };

  const addDonationTicket = () => {
    setTickets((prev) => {
      if (prev.some((ticket) => ticket.type === 'donation')) {
        return prev;
      }
      return [...prev, createDonationTicket()];
    });
  };

  const removeTicket = (id: string) => {
    setTickets((prev) => (prev.length > 1 ? prev.filter((ticket) => ticket.id !== id) : prev));
  };

  const removeDonationTicket = () => {
    setTickets((prev) => prev.filter((ticket) => ticket.type !== 'donation'));
  };

  const addPromoCode = () => {
    setPromoCodes((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        code: '',
        discountType: 'percentage',
        discountValue: '',
        usageLimit: 100,
        validFrom: '',
        validFromTime: '',
        validUntil: '',
        validUntilTime: '',
      },
    ]);
  };

  const updatePromoCode = <K extends keyof DraftPromoCode>(
    id: string,
    field: K,
    value: DraftPromoCode[K],
  ) => {
    setPromoCodes((prev) => prev.map((promo) => (promo.id === id ? { ...promo, [field]: value } : promo)));
  };

  const removePromoCode = (id: string) => {
    setPromoCodes((prev) => prev.filter((promo) => promo.id !== id));
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const goToStep = (step: number) => {
    setCurrentStep(() => Math.min(Math.max(step, 1), totalSteps));
  };

  const progressPercentage = ((currentStep - 1) / (totalSteps - 1 || 1)) * 100;

  return {
    currentStep,
    setCurrentStep: goToStep,
    formData,
    setFormData,
    tickets,
    setTickets,
    promoCodes,
    setPromoCodes,
    handleInputChange,
    updateTicket,
    addTicket,
    removeTicket,
    addDonationTicket,
    removeDonationTicket,
    addPromoCode,
    updatePromoCode,
    removePromoCode,
    nextStep,
    prevStep,
    progressPercentage,
  };
}
