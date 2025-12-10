'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DraftEventInitial } from '@/hooks/useEventDraft';
import { EventWizard } from '@/app/(dashboard)/events/create/page';

const mockEventDrafts: Record<string, DraftEventInitial> = {
  '1': {
    formData: {
      title: 'Community Iftar 2024',
      description: 'Join us for a warm community iftar with inspiring talks and delicious food.',
      category: 'Community',
      organizerName: 'London Islamic Centre',
      date: '2024-12-15',
      startTime: '18:00',
      endTime: '22:00',
      timezone: 'Europe/London',
      locationType: 'physical',
      venue: 'London Islamic Centre',
      address: '123 Crescent Road',
      city: 'London',
    },
    tickets: [
      {
        id: 't-iftar-general',
        name: 'General Admission',
        price: '15',
        isFree: false,
        quantity: 120,
        maxPerOrder: 6,
        description: 'Includes full meal and dessert.',
        salesStart: '2024-10-01',
        salesEnd: '2024-12-14',
        hasEarlyBird: true,
        earlyBirdPrice: '12',
        earlyBirdEndDate: '2024-11-15',
        visibility: 'public',
      },
    ],
  },
  '2': {
    formData: {
      title: 'Islamic Finance Workshop',
      description: 'Interactive workshop covering fundamentals of Islamic finance and fintech.',
      category: 'Education',
      organizerName: 'HalalTicketin’ Team',
      date: '2025-01-10',
      startTime: '14:00',
      endTime: '17:00',
      timezone: 'Europe/London',
      locationType: 'online',
      onlineUrl: 'https://example.com/finance-workshop',
    },
    tickets: [
      {
        id: 't-workshop-standard',
        name: 'Workshop Access',
        price: '25',
        isFree: false,
        quantity: 80,
        maxPerOrder: 5,
        description: 'Includes live Q&A and downloadable resources.',
        salesStart: '2024-11-01',
        salesEnd: '2025-01-09',
        hasEarlyBird: false,
        earlyBirdPrice: '',
        earlyBirdEndDate: '',
        visibility: 'public',
      },
    ],
  },
};

export default function EditEventPage() {
  const params = useParams<{ id: string }>();
  const eventId = params?.id ?? '';
  const initialDraft = mockEventDrafts[eventId];

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
                <Link href="/dashboard/events">Back to My Events</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <EventWizard mode="edit" initialDraft={initialDraft} />;
}

