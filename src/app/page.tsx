'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Search, MapPin, ArrowRight, Ticket, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Floating event cards data - using brand colors
const floatingEvents = [
  {
    id: 1,
    title: 'Community Iftar',
    location: 'London',
    color: 'bg-[oklch(0.78_0.14_165)]',  // Brand mint
    rotation: -6,
    position: { top: '15%', left: '5%' },
    delay: 0,
  },
  {
    id: 2,
    title: 'Youth Conference',
    location: 'Birmingham',
    color: 'bg-[oklch(0.72_0.15_185)]',  // Brand cyan
    rotation: 4,
    position: { top: '25%', right: '8%' },
    delay: 0.2,
  },
  {
    id: 3,
    title: 'Islamic Finance',
    location: 'Manchester',
    color: 'bg-[oklch(0.65_0.12_190)]',  // Brand teal
    rotation: -3,
    position: { bottom: '30%', left: '8%' },
    delay: 0.4,
  },
  {
    id: 4,
    title: 'Sisters Brunch',
    location: 'Leeds',
    color: 'bg-[oklch(0.82_0.1_155)]',   // Light green accent
    rotation: 5,
    position: { bottom: '25%', right: '5%' },
    delay: 0.6,
  },
];

function FloatingEventCard({
  event,
}: {
  event: (typeof floatingEvents)[0];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: event.rotation }}
      animate={{ opacity: 1, y: 0, rotate: event.rotation }}
      transition={{
        duration: 0.8,
        delay: event.delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="absolute hidden lg:block"
      style={event.position as React.CSSProperties}
    >
      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: event.delay,
        }}
        whileHover={{ scale: 1.05, rotate: 0 }}
        className="cursor-pointer"
      >
        <Card className="w-48 border-none shadow-2xl backdrop-blur-sm">
          <div className={`h-2 rounded-t-lg ${event.color}`} />
          <CardContent className="p-4">
            <p className="font-display text-sm font-semibold">{event.title}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {event.location}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (location.trim()) params.set('location', location.trim());
    router.push(`/events${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden gradient-mesh">
        {/* Floating Event Cards */}
        {floatingEvents.map((event) => (
          <FloatingEventCard key={event.id} event={event} />
        ))}

        {/* Background Decorative Elements */}
        <div className="absolute inset-0 bg-noise pointer-events-none" />

        {/* Animated gradient orbs - brand colors */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[oklch(0.78_0.14_165/0.25)] blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[oklch(0.72_0.15_185/0.25)] blur-3xl"
        />

        {/* Main Content */}
        <div className="container relative z-10 flex min-h-[90vh] flex-col items-center justify-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="mb-6 px-4 py-2 text-sm font-medium border border-border/50"
              >
                <Sparkles className="mr-2 h-4 w-4 text-[oklch(0.8_0.16_85)]" />
                Discover Community Events
              </Badge>
            </motion.div>

            {/* Headline */}
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Find your next
              <br />
              <span className="text-gradient">community event.</span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl"
            >
              The trusted platform for discovering and hosting halal events.
              Connect with your community through meaningful experiences.
            </motion.p>
          </motion.div>

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-12 w-full max-w-2xl"
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-md shadow-xl">
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

                  {/* Location Input */}
                  <div className="relative flex-1 sm:max-w-[200px]">
                    <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-12 border-0 bg-muted/50 pl-10 text-base focus-visible:ring-1"
                    />
                  </div>

                  {/* Search Button */}
                  <Button type="submit" size="lg" className="h-12 px-8 font-semibold">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 md:py-32">
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-50" />
        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-2xl text-center"
          >
            <Badge variant="secondary" className="mb-4">
              Why HalalTicketin&apos;?
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Everything you need to
              <br />
              <span className="text-gradient">host amazing events.</span>
            </h2>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              {
                icon: Ticket,
                title: 'Easy Ticketing',
                description:
                  'Create beautiful event pages and sell tickets in minutes. Free and paid options available.',
                color: 'text-[oklch(0.72_0.15_185)]',   // Brand cyan
                bgColor: 'bg-[oklch(0.72_0.15_185/0.1)]',
              },
              {
                icon: Users,
                title: 'Community First',
                description:
                  'Built specifically for Muslim communities. Find events that matter to you.',
                color: 'text-[oklch(0.78_0.14_165)]',   // Brand mint
                bgColor: 'bg-[oklch(0.78_0.14_165/0.1)]',
              },
              {
                icon: Sparkles,
                title: 'Seamless Experience',
                description:
                  'From discovery to check-in, we make the entire journey smooth and delightful.',
                color: 'text-[oklch(0.65_0.12_190)]',   // Brand teal
                bgColor: 'bg-[oklch(0.65_0.12_190/0.1)]',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group h-full border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bgColor}`}
                    >
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-display text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-[oklch(0.65_0.18_180/0.05)]" />
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-30" />

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Ready to bring your
              <br />
              community together?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Join thousands of organisers who trust HalalTicketin&apos; to create
              memorable events for their communities.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="h-14 px-8 text-base font-semibold" asChild>
                <Link href="/register">
                  Start For Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-semibold"
                asChild
              >
                <Link href="/events">Browse Events</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
