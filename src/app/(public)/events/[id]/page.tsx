'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';

export default function EventDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const slug = Array.isArray(params?.id) ? params?.id[0] : params?.id;
    const { event, tickets, isLoading, error, accessStatus, accessCode, setAccessCode } = usePublicEvent(slug ?? null);

    useEffect(() => {
        if (!event?.slug || !slug || event.slug === slug) {
            return;
        }

        const suffix =
            typeof window === 'undefined' ? '' : `${window.location.search}${window.location.hash}`;
        router.replace(`/events/${event.slug}${suffix}`, { scroll: false });
    }, [event?.slug, router, slug]);

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
