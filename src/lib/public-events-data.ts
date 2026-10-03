import 'server-only';
import type { PublicEventRecord } from '@/lib/events-api';

export interface PublicEventsSnapshot {
    events: PublicEventRecord[];
    hasMore: boolean;
}

export async function getPublicEventsSnapshot(): Promise<PublicEventsSnapshot | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/v1/public/events?limit=12`, {
            cache: 'no-store',
            credentials: 'omit',
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        // Browser loading remains available when the anonymous server request fails.
        return null;
    }
}
