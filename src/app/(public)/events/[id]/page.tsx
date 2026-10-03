import { getPublicEventInitialData, getPublicEventRenderTime } from '@/lib/public-event-server';
import { EventDetailsClient } from './EventDetailsClient';

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const initialData = await getPublicEventInitialData(id);

    return <EventDetailsClient key={id} slug={id} initialData={initialData} initialRenderTime={getPublicEventRenderTime()} />;
}
