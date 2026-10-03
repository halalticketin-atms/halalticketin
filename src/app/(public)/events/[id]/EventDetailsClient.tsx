'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { PublicEventPageContent } from '@/components/events/PublicEventPageContent';
import type { PublicEventData } from '@/lib/public-event-server';

export function EventDetailsClient({ slug, initialData, initialRenderTime }: { slug: string; initialData: PublicEventData | null; initialRenderTime?: number }) {
    const router = useRouter();
    const { event, tickets, isLoading, error, accessStatus, accessCode, setAccessCode, isValidated } = usePublicEvent(slug, { initialData });

    useEffect(() => {
        if (!isValidated || !event?.slug || event.slug === slug) {
            return;
        }

        const suffix = `${window.location.search}${window.location.hash}`;
        router.replace(`/events/${event.slug}${suffix}`, { scroll: false });
    }, [event?.slug, isValidated, router, slug]);

    return (
        // Keep the anonymous snapshot visible while checking current access and availability.
        <div inert={Boolean(event) && !isValidated}>
            <PublicEventPageContent
                event={event}
                tickets={tickets}
                isLoading={isLoading}
                error={error}
                accessStatus={accessStatus}
                accessMessage={error}
                accessCode={accessCode}
                onAccessSubmit={setAccessCode}
                initialRenderTime={initialRenderTime}
            />
        </div>
    );
}
