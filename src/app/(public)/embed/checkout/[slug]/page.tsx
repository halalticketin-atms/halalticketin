'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { EmbedCheckoutWidget } from '@/components/embed/EmbedCheckoutWidget';

export default function EmbedCheckoutPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    const theme = searchParams.get('theme') ?? 'light';
    const previewParam = searchParams.get('preview');
    const previewRequested = previewParam === '1' || previewParam === 'true';

    const { event, tickets, isLoading, error, accessStatus, accessCode, setAccessCode } = usePublicEvent(
        slug ?? null,
        { preview: previewRequested },
    );
    const isPreview = event?.status ? event.status !== 'published' : false;

    return (
        <EmbedCheckoutWidget
            event={event}
            tickets={tickets}
            isLoading={isLoading}
            error={error}
            theme={theme}
            isPreview={isPreview}
            accessStatus={accessStatus}
            accessMessage={error}
            accessCode={accessCode}
            onAccessSubmit={setAccessCode}
        />
    );
}
