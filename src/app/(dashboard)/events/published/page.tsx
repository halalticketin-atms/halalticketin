'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventPublishedSuccess } from '@/components/events/EventPublishedSuccess';
import { Loader2 } from 'lucide-react';

interface EventData {
    title: string;
    date: string | null;
    time: string | null;
    venue: string | null;
    city: string | null;
    slug: string;
    isPrivate: boolean;
    dashboardHref: string;
}

function SuccessContent() {
    const searchParams = useSearchParams();
    const [eventData, setEventData] = useState<EventData | null>(null);

    useEffect(() => {
        // Parse event data from URL search params
        const title = searchParams.get('title') || 'Your Event';
        const date = searchParams.get('date');
        const time = searchParams.get('time');
        const venue = searchParams.get('venue');
        const city = searchParams.get('city');
        const slug = searchParams.get('slug') || '';
        const isPrivate = searchParams.get('private') === 'true';
        const organizerId = searchParams.get('organizer');

        const dashboardHref = organizerId
            ? `/dashboard/o/${organizerId}/events`
            : '/dashboard';

        setEventData({
            title,
            date,
            time,
            venue,
            city,
            slug,
            isPrivate,
            dashboardHref,
        });
    }, [searchParams]);

    if (!eventData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <EventPublishedSuccess
            eventTitle={eventData.title}
            eventDate={eventData.date}
            eventTime={eventData.time}
            eventVenue={eventData.venue}
            eventCity={eventData.city}
            eventSlug={eventData.slug}
            dashboardHref={eventData.dashboardHref}
            isPrivate={eventData.isPrivate}
        />
    );
}

export default function EventPublishedSuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <SuccessContent />
        </Suspense>
    );
}
