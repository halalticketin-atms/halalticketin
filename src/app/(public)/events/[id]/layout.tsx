import type { Metadata } from 'next';
import { cache, type ReactNode } from 'react';
import {
  fetchPublicEventBySlug,
  type PublicEventRecord,
  type PublicTicketRecord,
} from '@/lib/events-api';
import {
  SITE_NAME,
  absoluteUrl,
  cleanSeoText,
  createPageMetadata,
  truncateSeoText,
} from '@/lib/seo';

type RouteParams = Promise<{ id: string }>;

const getEventSeoData = cache(async (id: string) => {
  try {
    return await fetchPublicEventBySlug(id);
  } catch {
    return null;
  }
});

function eventCanonicalPath(event: PublicEventRecord | null, id: string) {
  return `/events/${event?.slug || id}`;
}

function formatEventDate(event: PublicEventRecord) {
  if (!event.startDatetime) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: event.timezone || undefined,
    }).format(new Date(event.startDatetime));
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(event.startDatetime));
  }
}

function formatEventLocation(event: PublicEventRecord) {
  if (event.locationType === 'online') {
    return 'online';
  }

  return [event.venue, event.city, event.country].filter(Boolean).join(', ') || null;
}

function eventDescription(event: PublicEventRecord) {
  const description = cleanSeoText(event.description);
  if (description) {
    return truncateSeoText(description);
  }

  const date = formatEventDate(event);
  const location = formatEventLocation(event);
  const details = [date ? `on ${date}` : null, location ? `in ${location}` : null]
    .filter(Boolean)
    .join(' ');

  return truncateSeoText(
    `Book ${event.title || 'this event'}${details ? ` ${details}` : ''} with HalalTicketin'.`
  );
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === null || entry === undefined || entry === '') {
        return false;
      }
      if (Array.isArray(entry) && entry.length === 0) {
        return false;
      }
      return true;
    })
  );
}

function buildEventStructuredData({
  event,
  tickets,
  canonicalUrl,
}: {
  event: PublicEventRecord;
  tickets: PublicTicketRecord[];
  canonicalUrl: string;
}) {
  const image = event.bannerImageUrl ? [absoluteUrl(event.bannerImageUrl)] : undefined;
  const location =
    event.locationType === 'online'
      ? compactObject({
          '@type': 'VirtualLocation',
          url: event.onlineUrl || canonicalUrl,
        })
      : compactObject({
          '@type': 'Place',
          name: event.venue || formatEventLocation(event) || 'Event location',
          address: compactObject({
            '@type': 'PostalAddress',
            streetAddress: event.address,
            addressLocality: event.city,
            addressCountry: event.country,
          }),
        });

  const offers = tickets
    .filter((ticket) => ticket.visibility !== 'hidden')
    .map((ticket) =>
      compactObject({
        '@type': 'Offer',
        name: ticket.name,
        price: ticket.type === 'free' ? '0' : ticket.price || '0',
        priceCurrency: ticket.currency || event.currency,
        availability:
          ticket.isSoldOut || ticket.remainingQuantity === 0
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/InStock',
        validFrom: ticket.salesStart || undefined,
        url: canonicalUrl,
      })
    );

  return compactObject({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title || 'HalalTicketin event',
    description: eventDescription(event),
    image,
    startDate: event.startDatetime,
    endDate: event.endDatetime || event.startDatetime,
    eventStatus:
      event.status === 'cancelled'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      event.locationType === 'online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : event.locationType === 'hybrid'
          ? 'https://schema.org/MixedEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
    location,
    organizer: event.organizerName
      ? compactObject({
          '@type': 'Organization',
          name: event.organizerName,
          url: absoluteUrl(`/organizers/${event.organizerId}`),
        })
      : undefined,
    offers,
    url: canonicalUrl,
  });
}

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { id } = await params;
  const response = await getEventSeoData(id);
  const event = response?.event ?? null;

  if (!event) {
    return createPageMetadata({
      title: `Event Unavailable | ${SITE_NAME}`,
      description: "This event is currently unavailable on HalalTicketin'.",
      path: eventCanonicalPath(null, id),
      noIndex: true,
    });
  }

  const title = `${event.title || 'Event'} | ${SITE_NAME}`;

  return createPageMetadata({
    title,
    description: eventDescription(event),
    path: eventCanonicalPath(event, id),
    image: event.bannerImageUrl,
    imageAlt: event.title || title,
    keywords: [event.category, event.city, event.country].filter(Boolean) as string[],
  });
}

export default async function EventDetailsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: RouteParams;
}) {
  const { id } = await params;
  const response = await getEventSeoData(id);
  const event = response?.event ?? null;
  const canonicalUrl = absoluteUrl(eventCanonicalPath(event, id));
  const structuredData = event
    ? buildEventStructuredData({
        event,
        tickets: response?.tickets ?? [],
        canonicalUrl,
      })
    : null;

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      {children}
    </>
  );
}
