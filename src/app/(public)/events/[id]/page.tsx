'use client';

import { useParams } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';

export default function EventDetailsPage() {
    const params = useParams();
    const slug = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const { event, tickets, isLoading, error, accessStatus, accessCode, setAccessCode } = usePublicEvent(slug ?? null);

    return (
        <PublicEventPageContent
            event={event}
            tickets={tickets}
            isLoading={isLoading}
            error={error}
            accessStatus={accessStatus}
            accessMessage={error}
            accessCode={accessCode}
            onAccessSubmit={setAccessCode}
        />
    );
}
