'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, Calendar, MapPin, Pause, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import type { PublicEventRecord } from '@/lib/events-api';

function formatDate(value: string | null) {
  if (!value) return 'Date TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Date TBD';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatLocation(event: PublicEventRecord) {
  if (event.locationType === 'online') return 'Online';
  return event.city || event.venue || 'Location TBD';
}

function FeaturedEventCard({
  event,
  isDuplicate = false,
}: {
  event: PublicEventRecord;
  isDuplicate?: boolean;
}) {
  const href = `/events/${event.slug || event.id}`;
  return (
    <Link
      href={href}
      className="group block aspect-[3/4] w-[calc(100vw-2rem)] max-w-[405px] shrink-0 sm:aspect-auto sm:h-[600px] sm:w-[465px] sm:max-w-none"
      aria-label={event.title || 'View event'}
      aria-hidden={isDuplicate || undefined}
      tabIndex={isDuplicate ? -1 : undefined}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden border-border/50 bg-card p-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-[var(--brand-cyan)]/40 group-hover:shadow-xl group-hover:shadow-[var(--brand-cyan)]/10">
        {/* Required poster canvas: 1350 × 1080 (5:4). */}
        <div className="relative aspect-[1350/1080] w-full shrink-0 overflow-hidden bg-muted/40">
          {event.bannerImageUrl ? (
            <Image
              src={event.bannerImageUrl}
              alt={event.title || 'Event'}
              fill
              sizes="(max-width: 639px) calc(100vw - 2rem), 465px"
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--brand-mint)]/25 to-[var(--brand-cyan)]/25">
              <Calendar className="h-10 w-10 opacity-30 text-muted-foreground" />
            </div>
          )}
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-background/90 px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur-sm">
              {formatDate(event.startDatetime)}
            </span>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-6">
          <h3
            className="font-display line-clamp-2 text-lg font-bold leading-snug transition-colors group-hover:text-[var(--brand-teal)] sm:text-xl"
            title={event.title || 'Untitled Event'}
          >
            {event.title || 'Untitled Event'}
          </h3>
          {event.organizerName && (
            <div className="mt-3 flex min-w-0 items-center gap-2.5">
              <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-foreground/70 sm:h-7 sm:w-7">
                {event.organizerAvatarUrl ? (
                  <Image
                    src={event.organizerAvatarUrl}
                    alt=""
                    fill
                    sizes="28px"
                    className="object-cover"
                  />
                ) : (
                  <span>{event.organizerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span
                className="min-w-0 truncate text-sm font-medium text-foreground/70"
                title={event.organizerName}
              >
                {event.organizerName}
              </span>
            </div>
          )}
          <p className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate" title={formatLocation(event)}>
              {formatLocation(event)}
            </span>
          </p>
        </div>
      </Card>
    </Link>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] w-[calc(100vw-2rem)] max-w-[405px] shrink-0 animate-pulse rounded-2xl bg-muted/60 sm:aspect-auto sm:h-[600px] sm:w-[465px] sm:max-w-none"
        />
      ))}
    </div>
  );
}

export default function FeaturedEventsCarousel() {
  const { events, isLoading, error } = usePublicEvents({ limit: 24 });
  const prefersReducedMotion = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const [isFocusPaused, setIsFocusPaused] = useState(false);

  const [now] = useState(() => Date.now());

  const upcoming = useMemo(() => {
    return events
      .filter((e) => {
        if (!e.startDatetime) return true;
        const t = new Date(e.startDatetime).getTime();
        return Number.isNaN(t) || t >= now - 1000 * 60 * 60 * 24;
      })
      .sort((a, b) => {
        const at = a.startDatetime ? new Date(a.startDatetime).getTime() : Infinity;
        const bt = b.startDatetime ? new Date(b.startDatetime).getTime() : Infinity;
        return at - bt;
      })
      .slice(0, 20);
  }, [events, now]);

  // Keep the homepage clean: don't render the section on error or when empty.
  if (!isLoading && (error || upcoming.length === 0)) return null;

  const useMarquee = !prefersReducedMotion && upcoming.length > 2;

  return (
    <section aria-label="Featured events" className="relative overflow-hidden py-16 md:py-20">
      <div className="container relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Upcoming <span className="text-gradient">events</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {useMarquee && (
              <button
                type="button"
                onClick={() => setIsPaused((paused) => !paused)}
                aria-pressed={isPaused}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-teal)] hover:underline"
            >
              Browse all events
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mt-10">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent sm:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent sm:w-24" />

        {isLoading ? (
          <div className="container">
            <FeaturedSkeleton />
          </div>
        ) : useMarquee ? (
          <div
            className="group/marquee overflow-hidden"
            data-testid="featured-events-marquee"
            onFocusCapture={() => setIsFocusPaused(true)}
            onBlurCapture={() => setIsFocusPaused(false)}
          >
            <div
              className="featured-marquee-track flex w-max gap-4 px-4 group-hover/marquee:[animation-play-state:paused]"
              style={{ animationPlayState: isPaused || isFocusPaused ? 'paused' : undefined }}
            >
              {upcoming.map((event) => (
                <FeaturedEventCard key={event.id} event={event} />
              ))}
              {upcoming.map((event) => (
                <FeaturedEventCard key={`${event.id}-duplicate`} event={event} isDuplicate />
              ))}
            </div>
          </div>
        ) : (
          <div className="container">
            <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2" data-testid="featured-events-static">
              {upcoming.map((event) => (
                <FeaturedEventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .featured-marquee-track {
          animation: featured-marquee 60s linear infinite;
        }
        @keyframes featured-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-50% - 0.5rem));
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .featured-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
