import 'server-only';

import { cache } from 'react';
import type { PublicEventRecord, PublicTicketRecord } from '@/lib/events-api';

export type PublicEventData = {
    event: PublicEventRecord;
    tickets: PublicTicketRecord[];
};

export const getPublicEventRenderTime = cache(() => Date.now());

// Share anonymous data within this render only, including metadata and JSON-LD.
export const getPublicEventInitialData = cache(async (slug: string): Promise<PublicEventData | null> => {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseUrl}/api/v1/public/events/${encodeURIComponent(slug)}`, {
            cache: 'no-store',
            credentials: 'omit',
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
            return null;
        }
        return await response.json() as PublicEventData;
    } catch {
        return null;
    }
});
