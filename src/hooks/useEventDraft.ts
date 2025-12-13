'use client';

import { useState, type ChangeEvent } from 'react';

export type DraftLocationType = 'physical' | 'online' | 'hybrid';

export interface DraftFormData {
  title: string;
  description: string;
  bannerImageDataUrl: string;
  category: string;
  organizerName: string;
  visibility: 'public' | 'private';
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
  onlineUrl: string;
}

export interface DraftTicketType {
  id: string;
  name: string;
  price: string;
  isFree: boolean;
  quantity: number;
  maxPerOrder: number;
  description: string;
  salesStart: string;
  salesEnd: string;
  hasEarlyBird: boolean;
  earlyBirdPrice: string;
  earlyBirdEndDate: string;
  visibility: 'public' | 'hidden';
}

export interface DraftPromoCode {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  usageLimit: number;
  validFrom: string;
  validUntil: string;
}

export interface DraftEventInitial {
  eventId?: string;
  formData?: Partial<DraftFormData>;
  tickets?: DraftTicketType[];
  promoCodes?: DraftPromoCode[];
  currentStep?: number;
}

const stepsCountDefault = 3;

const defaultFormData: DraftFormData = {
  title: '',
  description: '',
  bannerImageDataUrl: '',
  category: '',
  organizerName: '',
  visibility: 'public',
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
  onlineUrl: '',
};

const createDefaultTicket = (): DraftTicketType => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: 'General Admission',
  price: '',
  isFree: false,
  quantity: 100,
  maxPerOrder: 10,
  description: '',
  salesStart: '',
  salesEnd: '',
  hasEarlyBird: false,
  earlyBirdPrice: '',
  earlyBirdEndDate: '',
  visibility: 'public',
});

export function useEventDraft(initial?: DraftEventInitial, totalSteps: number = stepsCountDefault) {
  const [currentStep, setCurrentStep] = useState(initial?.currentStep ?? 1);
  const [formData, setFormData] = useState<DraftFormData>({
    ...defaultFormData,
    ...initial?.formData,
  });
  const [tickets, setTickets] = useState<DraftTicketType[]>(
    initial?.tickets && initial.tickets.length > 0 ? initial.tickets : [createDefaultTicket()],
  );
  const [promoCodes, setPromoCodes] = useState<DraftPromoCode[]>(initial?.promoCodes ?? []);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const removeTicket = (id: string) => {
    setTickets((prev) => (prev.length > 1 ? prev.filter((ticket) => ticket.id !== id) : prev));
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
        validUntil: '',
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
    addPromoCode,
    updatePromoCode,
    removePromoCode,
    nextStep,
    prevStep,
    progressPercentage,
    isPreviewOpen,
    setIsPreviewOpen,
  };
}
