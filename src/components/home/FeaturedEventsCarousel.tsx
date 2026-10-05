'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
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

function FeaturedEventCard({ event }: { event: PublicEventRecord }) {
  const href = `/events/${event.slug || event.id}`;
  return (
    <Link
      href={href}
      className="group block min-w-0 snap-start rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      aria-label={event.title || 'View event'}
    >
      <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-xl border-0 bg-transparent p-0 shadow-none">
        {/* Required poster canvas: 1350 × 1080 (5:4). */}
        <div className="relative aspect-[1350/1080] w-full shrink-0 overflow-hidden rounded-xl bg-muted/40">
          {event.bannerImageUrl ? (
            <Image
              src={event.bannerImageUrl}
              alt={event.title || 'Event'}
              fill
              sizes="(max-width: 639px) 85vw, (max-width: 1023px) 45vw, 400px"
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--brand-mint)]/25 to-[var(--brand-cyan)]/25">
              <Calendar className="h-10 w-10 opacity-30 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col px-1 pt-5 pb-2">
          <p className="mb-2 text-sm font-semibold text-foreground">{formatDate(event.startDatetime)}</p>
          <h3
            className="font-display line-clamp-2 min-h-[3.125rem] text-lg font-bold leading-snug text-teal-800 transition-colors duration-150 group-hover:text-cyan-700 group-focus-visible:text-cyan-700 dark:text-teal-200 dark:group-hover:text-cyan-300 sm:min-h-14 sm:text-xl"
            title={event.title || 'Untitled Event'}
          >
            {event.title || 'Untitled Event'}
          </h3>
          <div className="mt-3 flex min-h-6 min-w-0 items-center gap-2.5 sm:min-h-7">
            {event.organizerName && (
              <>
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
              </>
            )}
          </div>
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
  return <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading events" role="status">
    {[0, 1, 2].map(i => <div key={i} className="aspect-[4/5] rounded-xl bg-muted/60 motion-safe:animate-pulse" />)}
  </div>;
}

export default function FeaturedEventsCarousel() {
  return <FeaturedEventsRail {...usePublicEvents({ limit: 24 })} />;
}

export function FeaturedEventsRail({ events, isLoading, error }: { events: PublicEventRecord[]; isLoading: boolean; error: string | null }) {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const [now] = useState(() => Date.now());
  const upcoming = useMemo(() => events.filter(event => {
    if (!event.startDatetime) return true;
    const start = new Date(event.startDatetime).getTime();
    return Number.isNaN(start) || start >= now - 86400000;
  }).sort((a, b) => {
    const time = (date: string | null) => date ? new Date(date).getTime() || Infinity : Infinity;
    return time(a.startDatetime) - time(b.startDatetime);
  }).slice(0, 20), [events, now]);

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({ start: track.scrollLeft <= 1, end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateEdges();
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [isLoading, upcoming, updateEdges]);

  function scroll(direction: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.getBoundingClientRect().width + 24;
    const visible = Math.max(1, Math.floor((track.clientWidth + 24) / step));
    track.scrollBy({ left: direction * step * visible, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  }

  if (!isLoading && error) return (
    <section aria-labelledby="upcoming-events-heading" className="container py-16 md:py-20">
      <h2 id="upcoming-events-heading" className="font-display text-4xl font-bold tracking-tight leading-[0.95] sm:text-5xl md:text-6xl lg:text-7xl">Upcoming <span className="text-gradient">events</span></h2>
      <p className="mt-4 text-muted-foreground" role="status">Events could not be loaded. Please try again shortly.</p>
      <Link href="/events" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Browse all events</Link>
    </section>
  );
  if (!isLoading && upcoming.length === 0) return null;

  return (
    <section aria-labelledby="upcoming-events-heading" className="py-16 md:py-20">
      <div className="container">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 id="upcoming-events-heading" className="font-display text-4xl font-bold tracking-tight leading-[0.95] sm:text-5xl md:text-6xl lg:text-7xl">Upcoming <span className="text-gradient">events</span></h2>
          <div className="flex items-center gap-5">
            <Link href="/events" className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-4 hover:underline">Browse all events</Link>
            {!isLoading && !(edges.start && edges.end) && <div className="flex gap-2">
              <button type="button" aria-label="Previous events" aria-controls="upcoming-events-track" disabled={edges.start} onClick={() => scroll(-1)} className="flex size-11 items-center justify-center rounded-full border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"><ChevronLeft className="size-5" /></button>
              <button type="button" aria-label="Next events" aria-controls="upcoming-events-track" disabled={edges.end} onClick={() => scroll(1)} className="flex size-11 items-center justify-center rounded-full border border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"><ChevronRight className="size-5" /></button>
            </div>}
          </div>
        </div>
        {isLoading ? <FeaturedSkeleton /> : <div
          id="upcoming-events-track"
          ref={trackRef}
          onScroll={updateEdges}
          tabIndex={0}
          aria-label="Upcoming events, scroll to explore"
          className="grid auto-cols-[85%] grid-flow-col items-stretch gap-6 overflow-x-auto overscroll-x-contain snap-x snap-mandatory rounded-xl pb-4 scrollbar-hide sm:auto-cols-[calc((100%-1.5rem)/2)] lg:auto-cols-[calc((100%-3rem)/3)] focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {upcoming.map(event => <FeaturedEventCard key={event.id} event={event} />)}
        </div>}
      </div>
    </section>
  );
}
