import api from './api';

export interface StampPurchaseSessionResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  message?: string;
}

export interface StampHistoryItem {
  id: string;
  amount: number;
  pricePerStamp: string;
  totalPaid: string;
  currency: string;
  createdAt: string;
}

export interface StampUsageItem {
  id: string;
  campaignId: string;
  stampsUsed: number;
  recipientCount: number;
  reason: string;
  beforeBalance: number;
  afterBalance: number;
  createdAt: string;
}

export interface StampBalanceResponse {
  balance: number;
  totalPurchased: number;
  lastPurchaseAt: string | null;
  history: StampHistoryItem[];
  usage: StampUsageItem[];
}

export async function createStampPurchaseSession(
  organizerId: string,
  stamps: number
): Promise<StampPurchaseSessionResponse> {
  try {
    const result = await api.post<StampPurchaseSessionResponse>(
      `/api/v1/organizers/${organizerId}/stamps/purchase-session`,
      { stamps }
    );
    return result;
  } catch (error) {
    console.error('Stamp purchase request failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create purchase session'
    };
  }
}

export async function getStampBalance(organizerId: string): Promise<StampBalanceResponse> {
  try {
    return await api.get<StampBalanceResponse>(`/api/v1/organizers/${organizerId}/stamps`);
  } catch (error) {
    console.error('Failed to get stamp balance:', error);
    return {
      balance: 0,
      totalPurchased: 0,
      lastPurchaseAt: null,
      history: [],
      usage: []
    };
  }
}
