import api from '@/lib/api';

export type ConsentEventAction = 'accepted' | 'rejected' | 'updated';
export type ConsentEventSource = 'event_page' | 'checkout' | 'footer' | 'embed';

export interface ConsentEventPayload {
    action: ConsentEventAction;
    analytics: boolean;
    marketing: boolean;
    source: ConsentEventSource;
    version: 2;
}

export const CONSENT_EVENT_VERSION = 2;

export async function logConsentEvent(payload: ConsentEventPayload): Promise<void> {
    try {
        await api.post('/api/v1/consent/events', payload);
    } catch {
        // Consent preference still applies locally if aggregate reporting fails.
    }
}
