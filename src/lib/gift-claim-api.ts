import api from './api';

export interface GiftClaimQuestion {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox' | 'date';
  required: boolean;
  options?: string[];
}

export interface GiftClaimTicket {
  id: string;
  ticketCode: string | null;
  ticketTypeName: string;
  attendeeName: string | null;
  attendeeEmail: string | null;
  attendeeGender: 'male' | 'female' | null;
  attendeeAge: number | null;
  giftDeliveryMode?: 'email' | 'link' | null;
  giftClaimExpiresAt?: string | null;
  giftClaimedAt?: string | null;
  customAnswers: Record<string, string>;
}

export interface GiftClaimEvent {
  id: string;
  title: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  timezone: string;
  locationType: 'in_person' | 'online' | 'hybrid';
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  onlineUrl: string | null;
  customQuestions?: GiftClaimQuestion[];
}

export interface GiftClaimResponse {
  state: 'claimable' | 'claimed' | 'expired';
  ticket: GiftClaimTicket;
  event: GiftClaimEvent;
  giftedByName: string;
}

export interface GiftClaimSubmitRequest {
  name?: string;
  email?: string;
  gender?: 'male' | 'female';
  age?: number;
  customAnswers?: Record<string, string>;
}

export const fetchGiftClaim = async (token: string) =>
  api.get<GiftClaimResponse>(`/api/v1/public/gift-claims/${encodeURIComponent(token)}`);

export const submitGiftClaim = async (token: string, payload: GiftClaimSubmitRequest) =>
  api.post<GiftClaimResponse>(`/api/v1/public/gift-claims/${encodeURIComponent(token)}/claim`, payload);
