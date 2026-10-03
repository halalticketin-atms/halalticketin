import { getPublicEventInitialData, getPublicEventRenderTime } from '@/lib/public-event-server';
import { EmbedCheckoutClient } from './EmbedCheckoutClient';

export default async function EmbedCheckoutPage({ params, searchParams }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const [{ slug }, query] = await Promise.all([params, searchParams]);
    const preview = Array.isArray(query.preview) ? query.preview[0] : query.preview;
    const previewRequested = preview === '1' || preview === 'true';
    const initialData = previewRequested ? null : await getPublicEventInitialData(slug);

    return <EmbedCheckoutClient
        key={`${slug}:${previewRequested}`}
        slug={slug}
        initialData={initialData}
        initialRenderTime={getPublicEventRenderTime()}
    />;
}
