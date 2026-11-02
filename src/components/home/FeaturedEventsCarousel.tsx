'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import type { PublicEventRecord } from '@/lib/events-api';
import styles from './FeaturedEventsCarousel.module.css';

const POSTER_RATIO = 4 / 5;

/** Reads the date in the event's own timezone, so the day matches the venue. */
function getDateParts(event: PublicEventRecord) {
  const date = event.startDatetime ? new Date(event.startDatetime) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: event.timezone || undefined,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return {
    weekday: part('weekday'),
    day: part('day'),
    month: part('month'),
    time: `${part('hour')}:${part('minute')} ${part('dayPeriod').toLowerCase()}`,
  };
}

function formatLocation(event: PublicEventRecord) {
  if (event.locationType === 'online') return 'Online';
  return event.city || event.venue || 'Location to be confirmed';
}

function Poster({ event }: { event: PublicEventRecord }) {
  const [isOffCanvas, setIsOffCanvas] = useState(false);
  if (!event.bannerImageUrl) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--brand-mint)]/25 to-[var(--brand-cyan)]/25">
        <Calendar className="size-10 text-muted-foreground opacity-30" />
      </div>
    );
  }
  return (
    <>
      {/* Older posters are not 4:5, so their own artwork fills the space around them. */}
      {isOffCanvas && (
        <Image src={event.bannerImageUrl} alt="" fill sizes="320px" className="scale-125 object-cover opacity-70 blur-2xl" />
      )}
      <Image
        src={event.bannerImageUrl}
        alt=""
        fill
        sizes="(max-width: 639px) 82vw, (max-width: 1023px) 45vw, (max-width: 1279px) 30vw, 340px"
        className="object-contain"
        onLoad={({ currentTarget }) => {
          const ratio = currentTarget.naturalWidth / currentTarget.naturalHeight;
          setIsOffCanvas(Math.abs(ratio - POSTER_RATIO) > 0.02);
        }}
      />
    </>
  );
}

function EventTicket({ event }: { event: PublicEventRecord }) {
  const date = getDateParts(event);
  const location = formatLocation(event);
  return (
    <Link href={`/events/${event.slug || event.id}`} className={`group ${styles.slot} ${styles.ticket}`}>
      <div className={styles.poster}>
        <Poster event={event} />
        {event.isSoldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">Sold out</span>
        )}
      </div>
      <div className={styles.details}>
        <div className="flex flex-col items-center border-r border-dashed border-border pr-3.5 text-center">
          {date ? <>
            <span className="text-xs font-medium text-muted-foreground">{date.month}</span>
            <span className="font-display text-[1.75rem] font-bold leading-[1.15] tracking-tight text-foreground">{date.day}</span>
            <span className="text-xs font-medium text-muted-foreground">{date.weekday}</span>
          </> : <span className="text-xs font-semibold text-muted-foreground">Date to be confirmed</span>}
        </div>
        <div className="min-w-0">
          <h3 className="font-display line-clamp-2 min-h-[2.625rem] text-[0.9375rem] font-semibold leading-snug tracking-tight text-foreground transition-colors duration-150 group-hover:text-teal-700 dark:group-hover:text-teal-300">
            {event.title || 'Untitled event'}
          </h3>
          {event.organizerName && (
            <p className="mt-2 truncate text-[0.8125rem] font-medium text-foreground/70">{event.organizerName}</p>
          )}
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{date ? `${date.time}, ${location}` : location}</span>
          </p>
        </div>
      </div>
    </Link>
  );
}

function RailSkeleton() {
  return (
    <div className={`${styles.track} overflow-hidden`} role="status" aria-label="Loading events">
      {[0, 1, 2, 3, 4].map(item => (
        <div key={item} className={styles.slot}>
          <div className="aspect-[4/5] rounded-t-[18px] bg-muted/60 motion-safe:animate-pulse" />
          <div className="mt-1 h-[6.75rem] rounded-b-[18px] bg-muted/40 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// The negative margin cancels the U's side bearing, so its stem sits on the cards' left edge.
const headingClass = '-ml-[0.058em] font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl lg:text-6xl';
const arrowClass = 'flex size-11 items-center justify-center rounded-full border border-border bg-card transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-35';

export default function FeaturedEventsCarousel() {
  return <FeaturedEventsRail {...usePublicEvents({ limit: 24 })} />;
}

export function FeaturedEventsRail({ events, isLoading, error }: { events: PublicEventRecord[]; isLoading: boolean; error: string | null }) {
  const prefersReducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
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

  const updateRail = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const start = track.scrollLeft <= 1;
    const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    setEdges(previous => previous.start === start && previous.end === end ? previous : { start, end });
    if (progressRef.current) {
      const visible = track.clientWidth / track.scrollWidth;
      const position = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
      progressRef.current.style.transform = `translateX(${position * (1 - visible) * 100}%) scaleX(${visible})`;
    }
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateRail();
    const observer = new ResizeObserver(updateRail);
    observer.observe(track);
    return () => observer.disconnect();
  }, [isLoading, upcoming, updateRail]);

  function scroll(direction: number) {
    const track = trackRef.current;
    const [first, second] = Array.from(track?.children ?? []);
    if (!track || !first || !second) return;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    const gutter = parseFloat(getComputedStyle(track).paddingLeft);
    const visible = Math.max(1, Math.round((track.clientWidth - gutter * 2) / step));
    track.scrollBy({ left: direction * step * visible, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
  }

  if (!isLoading && error) return (
    <section aria-labelledby="upcoming-events-heading" className="container py-16 md:py-20">
      <h2 id="upcoming-events-heading" className={headingClass}>Upcoming <span className="text-gradient">events</span></h2>
      <p className="mt-4 text-muted-foreground" role="status">Events could not be loaded. Please try again shortly.</p>
      <Link href="/events" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Browse all events</Link>
    </section>
  );
  if (!isLoading && upcoming.length === 0) return null;

  const canScroll = !isLoading && !(edges.start && edges.end);

  return (
    <section aria-labelledby="upcoming-events-heading" className="pb-10 pt-16 md:pb-14 md:pt-24">
      <div className="container">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1 md:mb-6">
          <h2 id="upcoming-events-heading" className={headingClass}>Upcoming <span className="text-gradient">events</span></h2>
          <div className="flex items-center gap-5">
            <Link href="/events" className="inline-flex min-h-11 items-center text-sm font-semibold underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">Browse all events</Link>
            {canScroll && <div className="hidden gap-2 sm:flex">
              <button type="button" aria-label="Previous events" aria-controls="upcoming-events-track" disabled={edges.start} onClick={() => scroll(-1)} className={arrowClass}><ChevronLeft className="size-5" /></button>
              <button type="button" aria-label="Next events" aria-controls="upcoming-events-track" disabled={edges.end} onClick={() => scroll(1)} className={arrowClass}><ChevronRight className="size-5" /></button>
            </div>}
          </div>
        </div>
      </div>
      {isLoading ? <RailSkeleton /> : <div
        id="upcoming-events-track"
        ref={trackRef}
        onScroll={updateRail}
        tabIndex={0}
        aria-label="Upcoming events, scroll to explore"
        className={`${styles.track} scrollbar-hide`}
      >
        {upcoming.map(event => <EventTicket key={event.id} event={event} />)}
      </div>}
      {canScroll && <div className="container" aria-hidden="true">
        <div className="h-[3px] overflow-hidden rounded-full bg-border/70">
          <div ref={progressRef} className={styles.progressFill} />
        </div>
      </div>}
    </section>
  );
}
