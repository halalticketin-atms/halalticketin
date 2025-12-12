'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EventWizard } from '@/app/(dashboard)/events/create/page';
import { getDraftInitialForEvent } from '@/data/mock-events';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';
  const initialDraft = getDraftInitialForEvent(eventId);
  const { activeOrganizerId } = useOrganizers();
  const eventsDashboardHref = activeOrganizerId ? `${buildDashboardPath(activeOrganizerId)}/events` : '/dashboard';

  if (!initialDraft) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="container py-12 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <p className="text-lg font-semibold">Event not found</p>
              <p className="text-muted-foreground">
                We couldn’t find the event you’re looking for. Please return to your events dashboard.
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
