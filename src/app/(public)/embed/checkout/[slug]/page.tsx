'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { EmbedCheckoutWidget } from '@/components/embed/EmbedCheckoutWidget';

function EmbedCheckoutContent() {
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

function EmbedCheckoutFallback() {
    return (
        <div className="min-h-[320px] flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
    );
}

export default function EmbedCheckoutPage() {
    return (
        <Suspense fallback={<EmbedCheckoutFallback />}>
            <EmbedCheckoutContent />
        </Suspense>
    );
}
