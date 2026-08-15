'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Globe, MapPin } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import type { PublicOrganizerEvent } from '@/lib/organizers-api';
import { toast } from '@/lib/notifications';

function formatEventDate(dateString: string | null): string {
  if (!dateString) return 'Date TBD';

  return new Date(dateString).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getLocationString(event: PublicOrganizerEvent): string {
  if (event.locationType === 'online') return 'Online Event';

  const parts = [event.venue, event.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Location TBD';
}

interface OrganizerEventCardProps {
  event: PublicOrganizerEvent;
  organizerName: string;
  organizerAvatarUrl: string | null;
  isPast?: boolean;
}

export function OrganizerEventCard({
  event,
  organizerName,
  organizerAvatarUrl,
  isPast = false,
}: OrganizerEventCardProps) {
  const eventUrl = event.slug ? `/events/${event.slug}` : `/events/${event.id}`;
  const handlePastClick = () => {
    toast.info('Event has ended', {
      description: 'This event is no longer available. It has already happened.',
    });
  };

  const card = (
    <Card className="group h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden">
        {event.bannerImageUrl ? (
          <Image
            src={event.bannerImageUrl}
            alt={event.title || 'Event'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Calendar className="h-10 w-10 text-primary/40" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="line-clamp-2 text-lg font-semibold transition-colors group-hover:text-primary">
          {event.title || 'Untitled Event'}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-semibold text-foreground/70">
            {organizerAvatarUrl ? (
              <Image
                src={organizerAvatarUrl}
                alt={organizerName}
                fill
                className="object-cover"
              />
            ) : (
              <span>{organizerName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="truncate">Hosted by {organizerName}</span>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatEventDate(event.startDatetime)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {event.locationType === 'online' ? (
              <Globe className="h-4 w-4 text-primary" />
            ) : (
              <MapPin className="h-4 w-4 text-primary" />
            )}
            <span className="truncate">{getLocationString(event)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isPast) {
    return (
      <button type="button" className="text-left" onClick={handlePastClick}>
        {card}
      </button>
    );
  }

  return <Link href={eventUrl}>{card}</Link>;
}
