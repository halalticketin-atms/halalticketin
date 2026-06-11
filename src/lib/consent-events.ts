import api from '@/lib/api';

export type ConsentEventAction = 'accepted' | 'rejected' | 'updated';
export type ConsentEventSource = 'event_page' | 'checkout' | 'footer' | 'embed';

export interface ConsentEventPayload {
    action: ConsentEventAction;
    marketing: boolean;
    source: ConsentEventSource;
    version: number;
}

export const CONSENT_EVENT_VERSION = 1;

export async function logConsentEvent(payload: ConsentEventPayload): Promise<void> {
    try {
        await api.post('/api/v1/consent/events', payload);
    } catch {
        // Consent preference still applies locally if aggregate reporting fails.
    }
}
