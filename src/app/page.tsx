'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Search, MapPin, ArrowRight, QrCode, HeartHandshake, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOptionalAuth } from '@/context/auth-context';

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
    <motion.div
      initial={{ opacity: 0, y: shouldUseLiteAnimations ? 16 : 40, rotate: event.rotation }}
      animate={{ opacity: 1, y: 0, rotate: event.rotation }}
      transition={{
        duration: shouldUseLiteAnimations ? 0.45 : 0.8,
        delay: event.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute hidden lg:block"
      style={event.position as React.CSSProperties}
    >
      <motion.div
        animate={shouldUseLiteAnimations ? { y: 0 } : { y: [0, -10, 0] }}
        transition={{
          duration: shouldUseLiteAnimations ? 0.2 : 7,
          repeat: shouldUseLiteAnimations ? 0 : Infinity,
          ease: shouldUseLiteAnimations ? 'linear' : 'easeInOut',
          delay: shouldUseLiteAnimations ? 0 : event.delay,
        }}
        whileHover={{ scale: 1.05, rotate: 0 }}
        className="cursor-pointer"
      >
        <Card className="w-48 border-none shadow-2xl backdrop-blur-sm py-0 overflow-hidden">
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
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const auth = useOptionalAuth();
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const isSafari =
    typeof navigator !== 'undefined' &&
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser|Android/i.test(navigator.userAgent);
  const startForFreeHref = auth?.user ? '/dashboard' : '/register?role=organizer';
  const shouldUseLiteAnimations = Boolean(prefersReducedMotion) || isSafari;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    router.push(`/events${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <>
      {/* Hero Section - extends behind header for seamless background */}
      {/* Updated to 100svh to fix mobile address bar whitespace issues */}
      <section className="relative min-h-[100svh] overflow-hidden gradient-mesh -mt-[var(--nav-safe-offset)] pt-[var(--nav-safe-offset)]">
        {/* Floating Event Cards */}
        {floatingEvents.map((event) => (
          <FloatingEventCard key={event.id} event={event} shouldUseLiteAnimations={shouldUseLiteAnimations} />
        ))}

        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-noise pointer-events-none" />

        {/* Animated gradient orbs - desktop only for performance, static on mobile */}
        {shouldUseLiteAnimations ? (
          <>
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.18)] blur-2xl" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[oklch(0.72_0.15_185/0.18)] blur-2xl" />
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.35 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.25)] blur-3xl"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.35 }}
              animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[oklch(0.72_0.15_185/0.25)] blur-3xl"
            />
          </>
        )}

        {/* Bottom gradient fade for seamless transition */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        {/* Main Content */}
        {/* Main Content */}
        {/* Updated to 100svh to match hero section height */}
        <div className="container relative z-10 flex min-h-[100svh] flex-col items-center justify-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
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
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
            >
              Connect with your community by <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]">ticketin’</span> the right away
            </motion.p>
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 w-full max-w-2xl"
          >
            <Card
              className={`border-border/50 bg-card/80 shadow-xl ${shouldUseLiteAnimations ? '' : 'backdrop-blur-md'}`}
            >
              <CardContent className="p-3 sm:p-4">
                <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
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
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative pt-20 pb-32 md:pt-24 md:pb-40 overflow-hidden">
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

        {/* Ambient gradient orbs - static on mobile, animated on desktop */}
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[oklch(0.78_0.14_165/0.15)] blur-3xl pointer-events-none lg:animate-[pulse_12s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-[oklch(0.72_0.15_185/0.12)] blur-3xl pointer-events-none lg:animate-[pulse_15s_ease-in-out_infinite]" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-[oklch(0.65_0.12_190/0.1)] blur-3xl pointer-events-none lg:animate-[pulse_10s_ease-in-out_infinite]" />

        {/* Top gradient fade for seamless transition from hero */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center mb-20"
          >
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-1.5">
              Why organisers choose us?
            </Badge>
            <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Everything you need to
              <br />
              <span className="text-gradient">host meaningful events.</span>
            </h2>
          </motion.div>

          {/* Bento Grid Layout - Enhanced Design */}
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid gap-8 md:grid-cols-3">
              {/* Card 1: Text first, icon bottom-left */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5 }}
              >
                <div className="group h-full rounded-3xl p-[1.5px] bg-gradient-to-br from-[oklch(0.72_0.15_185/0.5)] to-[oklch(0.72_0.15_185/0.1)] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[oklch(0.72_0.15_185/0.15)]">
                  <Card className="h-full rounded-[22px] border-0 bg-card overflow-hidden relative">
                    <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-[oklch(0.72_0.15_185/0.1)] blur-3xl pointer-events-none" />
                    <CardContent className="relative p-10">
                      {/* Title + Icon side by side */}
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                          Effortless ticketing
                        </h3>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.72_0.15_185/0.12)] transition-transform duration-300 group-hover:scale-110">
                          <QrCode className="h-7 w-7 text-[oklch(0.72_0.15_185)]" strokeWidth={1.5} />
                        </div>
                      </div>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        Create <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.72_0.15_185)] to-[oklch(0.65_0.12_190)]">professional</span> event pages and start selling tickets in minutes.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Card 2: Horizontal header - Icon + Title side by side */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="group h-full rounded-3xl p-[1.5px] bg-gradient-to-br from-[oklch(0.78_0.14_165/0.5)] to-[oklch(0.78_0.14_165/0.1)] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[oklch(0.78_0.14_165/0.15)]">
                  <Card className="h-full rounded-[22px] border-0 bg-card overflow-hidden relative">
                    <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-[oklch(0.78_0.14_165/0.1)] blur-3xl pointer-events-none" />
                    <CardContent className="relative p-10">
                      {/* Horizontal header: Icon + Title */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.78_0.14_165/0.12)] transition-transform duration-300 group-hover:scale-110">
                          <HeartHandshake className="h-7 w-7 text-[oklch(0.78_0.14_165)]" strokeWidth={1.5} />
                        </div>
                        <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                          Community First
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        Designed to support organisers and attendees alike, with a focus on <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.78_0.14_165)] to-[oklch(0.72_0.15_185)]">real engagement</span>.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>

              {/* Card 3: Content first, icon as finishing accent */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="group h-full rounded-3xl p-[1.5px] bg-gradient-to-br from-[oklch(0.65_0.12_190/0.5)] to-[oklch(0.65_0.12_190/0.1)] transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-[oklch(0.65_0.12_190/0.15)]">
                  <Card className="h-full rounded-[22px] border-0 bg-card overflow-hidden relative">
                    <div className="absolute -bottom-24 -right-12 h-68 w-68 rounded-full bg-[oklch(0.65_0.12_190/0.1)] blur-3xl pointer-events-none" />
                    <CardContent className="relative p-10">
                      {/* Title + Icon side by side */}
                      <div className="flex items-center justify-between gap-4 mb-5">
                        <h3 className="font-display text-xl md:text-2xl font-bold tracking-tight">
                          Seamless Experience
                        </h3>
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[oklch(0.65_0.12_190/0.12)] transition-transform duration-300 group-hover:scale-110">
                          <BadgeCheck className="h-7 w-7 text-[oklch(0.65_0.12_190)]" strokeWidth={1.5} />
                        </div>
                      </div>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        From event discovery to check-in, we ensure a <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.65_0.12_190)] to-[oklch(0.72_0.15_185)]">smooth, reliable</span> experience.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade for seamless transition to CTA */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </section>

      {/* CTA Section - Brutalist Minimalist */}
      <section className="relative overflow-hidden py-32 md:py-40">
        {/* Subtle noise texture */}
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-20" />

        {/* Ambient gradient orbs - static on mobile, animated on desktop */}
        <div className="absolute -top-20 -right-32 h-80 w-80 rounded-full bg-[oklch(0.72_0.15_185/0.15)] blur-3xl pointer-events-none lg:animate-[pulse_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.12)] blur-3xl pointer-events-none lg:animate-[pulse_11s_ease-in-out_infinite]" />
        <div className="absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-[oklch(0.65_0.12_190/0.08)] blur-3xl pointer-events-none lg:animate-[pulse_16s_ease-in-out_infinite]" />

        {/* Top gradient fade for seamless transition from features */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
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
          </motion.div>

          {/* Bottom accent line */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="mt-20 h-px bg-gradient-to-r from-[oklch(0.72_0.15_185/0.5)] via-[oklch(0.78_0.14_165/0.3)] to-transparent origin-left"
          />
        </div>
      </section>
    </>
  );
}
