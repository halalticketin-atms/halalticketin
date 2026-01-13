'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { usePublicEvent } from '@/hooks/usePublicEvents';
import { EmbedCheckoutWidget } from '@/components/embed/EmbedCheckoutWidget';

export default function EmbedCheckoutPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
    const theme = searchParams.get('theme') ?? 'light';

    const { event, tickets, isLoading, error } = usePublicEvent(slug ?? null);

    return (
        <EmbedCheckoutWidget
            event={event}
            tickets={tickets}
            isLoading={isLoading}
            error={error}
            theme={theme}
        />
    );
}
