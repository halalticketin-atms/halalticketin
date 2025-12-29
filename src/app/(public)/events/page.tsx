'use client';

import { useState, useMemo, useEffect, useEffectEvent, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Search,
    Calendar,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import { PublicEventRecord } from '@/lib/events-api';
import { FavoriteButton } from '@/components/ui/FavoriteButton';

const categories = ['All', 'Conference', 'Workshop', 'Iftar', 'Sisters', 'Youth', 'Charity', 'Education', 'Other'];

/**
 * Transform a public event record into display format.
 */
function formatEventForDisplay(event: PublicEventRecord) {
    const start = event.startDatetime ? new Date(event.startDatetime) : null;

    const date = start
        ? start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
        : 'Date TBD';

    const time = start
        ? start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '';

    let location = 'Location TBD';
    if (event.locationType === 'online') {
        location = 'Online Event';
    } else if (event.city) {
        location = event.city;
    }

    let venue = '';
    if (event.venue) {
        venue = event.venue;
    } else if (event.locationType === 'online') {
        venue = 'Online';
    }

    return {
        id: event.id,
        slug: event.slug,
        title: event.title || 'Untitled Event',
        date,
        time,
        location,
        venue,
        price: null as number | null, // Price unknown from list endpoint - requires fetching ticket data
        category: event.category ?? 'Other',
        imageUrl: event.bannerImageUrl,
        attendees: 0, // Placeholder
        organizerName: event.organizerName,
        organizerAvatarUrl: event.organizerAvatarUrl,
        // Pass through favorite status from API (null if unauthenticated)
        isFavorited: event.isFavorited,
    };
}

function BrowseEventsContent() {
    const searchParams = useSearchParams();
    const { events: publicEvents, isLoading, isLoadingMore, error, hasMore, loadMore } = usePublicEvents();

    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const syncFiltersFromParams = useEffectEvent((query: string, location: string) => {
        setSearchQuery(query);
        setLocationFilter(location);
    });

    // Sync state with URL params on mount
    useEffect(() => {
        const q = searchParams.get('q') || '';
        const loc = searchParams.get('location') || '';
        syncFiltersFromParams(q, loc);
    }, [searchParams]);

    // Transform API events to display format
    const events = useMemo(() => {
        return publicEvents.map(formatEventForDisplay);
    }, [publicEvents]);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            const matchesSearch = searchQuery === '' ||
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.location.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLocation = locationFilter === '' ||
                event.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
                event.venue.toLowerCase().includes(locationFilter.toLowerCase());
            // Handle comma-separated categories from backend
            const eventCategories = event.category.split(',').map((c) => c.trim());
            const matchesCategory = selectedCategory === 'All' || eventCategories.includes(selectedCategory);
            return matchesSearch && matchesLocation && matchesCategory;
        });
    }, [events, searchQuery, locationFilter, selectedCategory]);

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header Section */}
            <div className="bg-background border-b relative overflow-hidden -mt-[var(--nav-safe-offset)] pt-[calc(var(--nav-safe-offset)+3rem)] pb-12">
                {/* Background Glow - matches Home page vibe */}
                <div className="absolute inset-0 bg-gradient-radial from-[oklch(0.78_0.14_165/0.1)] via-transparent to-transparent opacity-50 pointer-events-none" />

                <div className="container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="text-center"
                    >
                        <Badge variant="secondary" className="mb-4">
                            Browse Events
                        </Badge>
                        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            Explore <span className="text-gradient">Events</span>
                        </h1>
                        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
                            Find meaningful events, workshops, and gatherings near you.
                        </p>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="mt-8 max-w-2xl mx-auto"
                    >
                        <div className="relative group">
                            <Input
                                placeholder="Search events or locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 pl-12 pr-4 text-base rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-[var(--brand-cyan)] focus-visible:border-[var(--brand-teal)]"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                        </div>
                    </motion.div>

                    {/* Category Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="mt-8 flex flex-wrap justify-center gap-2"
                    >
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className={`rounded-full transition-all ${selectedCategory === category
                                    ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white border-0 shadow-md hover:opacity-90'
                                    : 'hover:border-[var(--brand-cyan)] hover:text-[var(--brand-teal)]'
                                    }`}
                            >
                                {category}
                            </Button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Events Grid */}
            <div className="container py-12">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-8">
                    <p className="text-muted-foreground font-medium">
                        Showing <span className="text-foreground font-bold">{filteredEvents.length}</span> events
                    </p>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-cyan)]" />
                        <span className="mt-4 text-muted-foreground font-medium">Finding the best events for you...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <Card className="p-12 text-center border-destructive/20 bg-destructive/5">
                        <Calendar className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-destructive">Unable to load events</h3>
                        <p className="text-destructive/80 mt-2">{error}</p>
                        <Button variant="outline" className="mt-4 border-destructive/30 hover:bg-destructive/10" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </Card>
                )}

                {/* Events Grid */}
                {!isLoading && !error && (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredEvents.length === 0 ? (
                            <Card className="sm:col-span-2 xl:col-span-3 p-16 text-center border-dashed border-2 bg-transparent shadow-none">
                                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
                                    <Calendar className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-xl font-bold">No events found</h3>
                                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                    We couldn&rsquo;t find any events matching your criteria. Try adjusting your search or check back later.
                                </p>
                                <div className="mt-8 flex gap-4 justify-center">
                                    <Button variant="outline" onClick={() => {
                                        setSearchQuery('');
                                        setLocationFilter('');
                                        setSelectedCategory('All');
                                    }}>
                                        Clear Filters
                                    </Button>
                                    <Button asChild className="bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white hover:opacity-90">
                                        <Link href="/events/new">Host an Event</Link>
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <>
                                {filteredEvents.map((event, index) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.03 }}
                                    >
                                        <Link href={`/events/${event.slug || event.id}`} className="block h-full">
                                            <Card className="group h-full overflow-hidden border-border/50 transition-all duration-300 hover:shadow-xl hover:shadow-[var(--brand-cyan)]/10 hover:border-[var(--brand-cyan)]/40 bg-card">
                                                {/* Large Poster Image */}
                                                <div className="relative aspect-[4/5] overflow-hidden">
                                                    {event.imageUrl ? (
                                                        <Image
                                                            src={event.imageUrl}
                                                            alt={event.title}
                                                            fill
                                                            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-mint)]/20 to-[var(--brand-cyan)]/20 flex items-center justify-center text-muted-foreground">
                                                            <Calendar className="h-12 w-12 opacity-30" />
                                                        </div>
                                                    )}
                                                    {/* Like Button */}
                                                    <div className="absolute right-3 top-3">
                                                        <FavoriteButton
                                                            eventId={event.id}
                                                            size="sm"
                                                            initialFavorited={event.isFavorited}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Info Section */}
                                                <div className="p-3">
                                                    <h3 className="font-display font-bold text-sm leading-snug line-clamp-2 group-hover:text-[var(--brand-teal)] transition-colors">
                                                        {event.title}
                                                    </h3>
                                                    {event.organizerName && (
                                                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                            <div
                                                                className={`relative h-5 w-5 overflow-hidden rounded-full flex items-center justify-center text-[10px] font-semibold text-foreground/70 ${event.organizerAvatarUrl ? 'bg-transparent' : 'bg-muted'}`}
                                                            >
                                                                {event.organizerAvatarUrl ? (
                                                                    <Image
                                                                        src={event.organizerAvatarUrl}
                                                                        alt={event.organizerName}
                                                                        fill
                                                                        className="object-cover"
                                                                    />
                                                                ) : (
                                                                    <span>{event.organizerName.charAt(0).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <span className="truncate">{event.organizerName}</span>
                                                        </div>
                                                    )}
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {event.date}
                                                    </p>
                                                    <p className="mt-0.5 text-xs font-medium text-foreground">
                                                        {event.price === null ? 'View' : event.price === 0 ? 'Free' : `£${event.price}`}
                                                    </p>
                                                </div>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* Load More - only show when there are more events to load */}
                {!isLoading && !error && hasMore && (
                    <div className="mt-16 text-center">
                        <Button
                            variant="outline"
                            size="lg"
                            className="rounded-full px-8 hover:border-[var(--brand-cyan)] hover:text-[var(--brand-teal)]"
                            onClick={loadMore}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Loading...
                                </>
                            ) : (
                                'Load more events'
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BrowseEventsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-muted/30 pt-32 md:pt-40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <BrowseEventsContent />
        </Suspense>
    );
}
