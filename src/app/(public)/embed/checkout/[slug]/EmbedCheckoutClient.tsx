'use client';

import { useSearchParams } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { EmbedCheckoutWidget } from '@/components/embed/EmbedCheckoutWidget';
import type { PublicEventData } from '@/lib/public-event-server';

export function EmbedCheckoutClient({ slug, initialData, initialRenderTime }: {
    slug: string;
    initialData: PublicEventData | null;
    initialRenderTime: number;
}) {
    const searchParams = useSearchParams();
    const theme = searchParams.get('theme') ?? 'light';
    const previewParam = searchParams.get('preview');
    const previewRequested = previewParam === '1' || previewParam === 'true';
    const { event, tickets, isLoading, error, accessStatus, accessCode, setAccessCode, isValidated } = usePublicEvent(
        slug,
        { preview: previewRequested, initialData },
    );
    const isPreview = searchParams.get('configure') === '1' || (event?.status ? event.status !== 'published' : false);

    return (
        <EmbedCheckoutWidget
            event={event}
            tickets={tickets}
            isLoading={isLoading}
            isValidated={isValidated}
            initialRenderTime={initialRenderTime}
            error={error}
            theme={theme}
            eventSlug={slug}
            appearance={{
                accent: searchParams.get('accent'),
                background: searchParams.get('background'),
                text: searchParams.get('text'),
                font: searchParams.get('font'),
                radius: searchParams.get('radius'),
                minimal: searchParams.get('minimal'),
                showDetails: searchParams.get('showDetails'),
            }}
            isPreview={isPreview}
            accessStatus={accessStatus}
            accessMessage={error}
            accessCode={accessCode}
            onAccessSubmit={setAccessCode}
        />
    );
}
