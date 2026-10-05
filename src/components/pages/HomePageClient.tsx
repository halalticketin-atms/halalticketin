'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Search, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import HostingInvitation from '@/components/home/HostingInvitation';
import FeaturedEventsCarousel from '@/components/home/FeaturedEventsCarousel';
import { useOptionalAuth } from '@/context/auth-context';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Floating event cards data - using brand colors
const floatingEvents = [
  {
    id: 1,
    title: 'Community Iftar',
    city: 'London',
    country: 'United Kingdom',
    color: 'bg-[oklch(0.78_0.14_165)]',  // Brand mint
    rotation: -6,
    position: { top: '15%', left: '5%' },
    delay: 0,
  },
  {
    id: 2,
    title: 'Youth Conference',
    city: 'Doha',
    country: 'Qatar',
    color: 'bg-[oklch(0.72_0.15_185)]',  // Brand cyan
    rotation: 4,
    position: { top: '25%', right: '8%' },
    delay: 0.2,
  },
  {
    id: 3,
    title: 'Islamic Finance',
    city: 'Chicago',
    country: 'United States',
    color: 'bg-[oklch(0.65_0.12_190)]',  // Brand teal
    rotation: -3,
    position: { bottom: '30%', left: '8%' },
    delay: 0.4,
  },
  {
    id: 4,
    title: 'Sisters Brunch',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    color: 'bg-[oklch(0.82_0.1_155)]',   // Light green accent
    rotation: 5,
    position: { bottom: '25%', right: '5%' },
    delay: 0.6,
  },
];

function FloatingEventCard({
  event,
  shouldUseLiteAnimations,
}: {
  event: (typeof floatingEvents)[0];
  shouldUseLiteAnimations: boolean;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: shouldUseLiteAnimations ? 10 : 20, rotate: event.rotation }}
      animate={{ opacity: 1, y: 0, rotate: event.rotation }}
      transition={{
        duration: shouldUseLiteAnimations ? 0.35 : 0.55,
        delay: event.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute hidden lg:block transform-gpu will-change-transform"
      style={event.position as React.CSSProperties}
    >
      <m.div
        animate={shouldUseLiteAnimations ? undefined : { y: [0, -8, 0] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: event.delay,
        }}
        whileHover={shouldUseLiteAnimations ? undefined : { scale: 1.04, rotate: 0 }}
        className="cursor-pointer transform-gpu"
      >
        <Card className={`w-48 border-none shadow-2xl py-0 overflow-hidden ${shouldUseLiteAnimations ? '' : 'backdrop-blur-sm'}`}>
          <div className={`h-2 ${event.color}`} />
          <CardContent className="p-4">
            <p className="font-display text-sm font-semibold text-foreground">{event.title}</p>
            <div className="mt-3 space-y-0.5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {event.city}
              </p>
              <p className="ml-[18px] text-[10px] text-muted-foreground/70 uppercase tracking-wide">{event.country}</p>
            </div>
          </CardContent>
        </Card>
      </m.div>
    </m.div>
  );
}

export default function Home() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const prefersReducedMotion = useReducedMotion();
  const [isSafari, setIsSafari] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const startForFreeHref = auth?.user ? '/dashboard' : '/register?role=organizer';
  const shouldUseLiteAnimations = Boolean(prefersReducedMotion) || isSafari;

  // Preserve native text entered before hydration before later renders control this field.
  useIsomorphicLayoutEffect(() => {
    const nativeValue = searchInputRef.current?.value;
    if (nativeValue !== undefined) setSearchQuery(nativeValue);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const rafId = window.requestAnimationFrame(() => {
      const ua = navigator.userAgent;
      const safari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser|Android/i.test(ua);
      setIsSafari(safari);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    router.push(`/events${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      {/* Hero Section - extends behind header for seamless background */}
      {/* Updated to 100svh to fix mobile address bar whitespace issues */}
      <section className="relative min-h-[100svh] overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[var(--nav-safe-offset)]">
        {/* Floating Event Cards */}
        {floatingEvents.map((event) => (
          <FloatingEventCard key={event.id} event={event} shouldUseLiteAnimations={shouldUseLiteAnimations} />
        ))}

        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-noise pointer-events-none" />

        {/* Animated gradient orbs - CSS-driven to keep JS animation budget low */}
        <div className={`absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.2)] ${shouldUseLiteAnimations ? 'blur-2xl opacity-80' : 'blur-3xl lg:animate-[pulse_12s_ease-in-out_infinite] will-change-transform'}`} />
        <div className={`absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[oklch(0.72_0.15_185/0.2)] ${shouldUseLiteAnimations ? 'blur-2xl opacity-80' : 'blur-3xl lg:animate-[pulse_14s_ease-in-out_infinite] will-change-transform'}`} />

        {/* Bottom gradient fade for seamless transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Main Content */}
        {/* Main Content */}
        {/* Updated to 100svh to match hero section height */}
        <div className="container relative z-10 flex min-h-[100svh] flex-col items-center justify-center py-20">
          <m.div
            initial={shouldUseLiteAnimations ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldUseLiteAnimations ? 0 : 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            {/* Headline */}
            <div className="mx-auto min-h-[130px] sm:min-h-[160px] md:min-h-[190px] lg:min-h-[250px]">
              <h1 className="font-display text-5xl font-bold tracking-tight leading-[0.95] sm:text-6xl md:text-7xl lg:text-8xl">
                Your home for
                <br />
                <span className="text-gradient">meaningful events.</span>
              </h1>
            </div>

            {/* Subheadline */}
            <m.p
              initial={shouldUseLiteAnimations ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: shouldUseLiteAnimations ? 0 : 0.3, duration: shouldUseLiteAnimations ? 0 : 0.5 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
            >
              Connect with your community by <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]">ticketin’</span> the right away
            </m.p>
          </m.div>

          {/* Search Section */}
          <m.div
            initial={shouldUseLiteAnimations ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: shouldUseLiteAnimations ? 0 : 0.45, duration: shouldUseLiteAnimations ? 0 : 0.45 }}
            className="mt-10 w-full max-w-2xl"
          >
            <Card
              className={`border-border/50 bg-card/80 shadow-xl ${shouldUseLiteAnimations ? '' : 'backdrop-blur-md'}`}
            >
              <CardContent className="p-3 sm:p-4">
                <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search events, workshops, conferences..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-12 border-0 bg-muted/50 pl-10 text-base focus-visible:ring-1"
                    />
                  </div>

                  {/* Search Button */}
                  <Button type="submit" size="lg" className="h-12 px-8 font-semibold">
                    <Search className="mr-2 h-4 w-4" />
                    Find Events
                  </Button>
                </form>
              </CardContent>
            </Card>
          </m.div>
        </div>
      </section>

      {/* Upcoming events */}
      <FeaturedEventsCarousel />

      <HostingInvitation startHref={startForFreeHref} />

      {/* CTA Section - Brutalist Minimalist */}
      <section className="relative overflow-hidden py-32 md:py-40">
        {/* Subtle noise texture */}
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />

        {/* Ambient gradient orbs - static on mobile, animated on desktop */}
        <div className={`absolute -top-20 -right-32 h-80 w-80 rounded-full bg-[oklch(0.72_0.15_185/0.15)] pointer-events-none ${shouldUseLiteAnimations ? 'blur-2xl' : 'blur-3xl lg:animate-[pulse_14s_ease-in-out_infinite] will-change-transform'}`} />
        <div className={`absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.12)] pointer-events-none ${shouldUseLiteAnimations ? 'blur-2xl' : 'blur-3xl lg:animate-[pulse_11s_ease-in-out_infinite] will-change-transform'}`} />
        <div className={`absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-[oklch(0.65_0.12_190/0.08)] pointer-events-none ${shouldUseLiteAnimations ? 'blur-2xl' : 'blur-3xl lg:animate-[pulse_16s_ease-in-out_infinite] will-change-transform'}`} />

        {/* Top gradient fade for seamless transition from features */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />

        <div className="container relative z-10">
          <m.div
            initial={shouldUseLiteAnimations ? false : { opacity: 0 }}
            whileInView={shouldUseLiteAnimations ? undefined : { opacity: 1 }}
            viewport={shouldUseLiteAnimations ? undefined : { once: true, margin: '-100px' }}
            transition={{ duration: shouldUseLiteAnimations ? 0 : 0.7 }}
            className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
          >
            {/* Left: Bold headline */}
            <div>
              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95]">
                Ready to bring
                <br />
                your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.72_0.15_185)] to-[oklch(0.78_0.14_165)]">community</span>
                <br />
                together?
              </h2>
            </div>

            {/* Right: CTA content */}
            <div className="md:pl-8 md:border-l border-border/30">
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-md">
                Join organisers who use HalalTicketin to plan and run events that people remember.
              </p>

              {/* Stacked buttons with raw styling */}
              <div className="mt-10 flex flex-col gap-3 sm:max-w-xs">
                <Button size="lg" className="h-14 text-base font-semibold justify-between group" asChild>
                  <Link href={startForFreeHref}>
                    Start For Free
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-14 text-base font-semibold justify-start text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/events">
                    <span className="mr-2 text-xs uppercase tracking-widest opacity-50">or</span>
                    Browse Events →
                  </Link>
                </Button>
              </div>
            </div>
          </m.div>

          {/* Bottom accent line */}
          <m.div
            initial={shouldUseLiteAnimations ? false : { scaleX: 0 }}
            whileInView={shouldUseLiteAnimations ? undefined : { scaleX: 1 }}
            viewport={shouldUseLiteAnimations ? undefined : { once: true }}
            transition={{ duration: shouldUseLiteAnimations ? 0 : 1, delay: shouldUseLiteAnimations ? 0 : 0.3, ease: 'easeOut' }}
            className="mt-20 h-px bg-gradient-to-r from-[oklch(0.72_0.15_185/0.5)] via-[oklch(0.78_0.14_165/0.3)] to-transparent origin-left"
          />
        </div>
      </section>
    </LazyMotion>
  );
}
