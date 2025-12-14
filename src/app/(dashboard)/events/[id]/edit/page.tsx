'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWizard } from '@/app/(dashboard)/events/create/page';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';
import { fetchEventDetails, fetchEventPromoCodes } from '@/lib/events-api';
import type { DraftEventInitial } from '@/hooks/useEventDraft';
import { buildDraftFromEventRecord } from '@/lib/ticket-mappers';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
};

export default function EditEventPage() {
    const params = useParams<{ id: string }>();
    const eventId = params?.id ?? '';
    const { activeOrganizerId } = useOrganizers();
    const eventsDashboardHref = activeOrganizerId
        ? `${buildDashboardPath(activeOrganizerId)}/events`
        : '/dashboard';

    const [initialDraft, setInitialDraft] = useState<DraftEventInitial | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventId) {
            setInitialDraft(null);
            setIsLoading(false);
            setError('Invalid event id.');
            return;
        }

        let cancelled = false;
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [eventResponse, promoResponse] = await Promise.all([
                    fetchEventDetails(eventId),
                    fetchEventPromoCodes(eventId).catch(() => ({ promoCodes: [] })),
                ]);
                if (cancelled) return;
                setInitialDraft(
                    buildDraftFromEventRecord(
                        eventResponse.event,
                        eventResponse.tickets,
                        promoResponse.promoCodes
                    )
                );
            } catch (err) {
                if (cancelled) return;
                setInitialDraft(null);
                setError(getErrorMessage(err, 'Unable to load this event.'));
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [eventId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30">
                <div className="container py-12 max-w-2xl">
                    <Card>
                        <CardContent className="py-12 text-center space-y-4">
                            <p className="text-lg font-semibold">Loading event...</p>
                            <p className="text-muted-foreground">Please wait while we fetch your event details.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!initialDraft || error) {
        return (
            <div className="min-h-screen bg-muted/30">
                <div className="container py-12 max-w-2xl">
                    <Card>
                        <CardContent className="py-12 text-center space-y-4">
                            <p className="text-lg font-semibold">Event unavailable</p>
                            <p className="text-muted-foreground">
                                {error ??
                                    'We could not load that event. Please return to your events dashboard and try again.'}
                            </p>
                            <Button asChild>
                                <Link href={eventsDashboardHref}>Back to My Events</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <EventWizard
            mode="edit"
            initialDraft={initialDraft}
            entryContext={{
                label: 'Editing existing event',
                description: 'Changes will update this event once you publish.',
            }}
        />
    );
}
