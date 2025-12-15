'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Search,
    MapPin,
    Calendar,
    Filter,
    Heart,
    ChevronDown,
    Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePublicEvents } from '@/hooks/usePublicEvents';
import { PublicEventRecord } from '@/lib/events-api';

const categories = ['All', 'Iftar', 'Conference', 'Workshop', 'Sisters', 'Youth', 'Charity', 'Education'];

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
        price: 0, // Will show "Free" or actual price when we have ticket data
        category: 'Community', // Placeholder - events don't have categories yet
        imageUrl: event.bannerImageUrl,
        attendees: 0, // Placeholder
    };
}

function BrowseEventsContent() {
    const searchParams = useSearchParams();
    const { events: publicEvents, isLoading, error } = usePublicEvents();

    // Initialize search state from URL params
    const [searchQuery, setSearchQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());

    // Sync state with URL params on mount
    useEffect(() => {
        const q = searchParams.get('q') || '';
        const loc = searchParams.get('location') || '';
        setSearchQuery(q);
        setLocationFilter(loc);
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
            const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
            return matchesSearch && matchesLocation && matchesCategory;
        });
    }, [events, searchQuery, locationFilter, selectedCategory]);

    const toggleLike = (eventId: string) => {
        setLikedEvents((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(eventId)) {
                newSet.delete(eventId);
            } else {
                newSet.add(eventId);
            }
            return newSet;
        });
    };

    return (
        <div className="min-h-screen bg-muted/30 pt-32 md:pt-40">
            {/* Header Section */}
            <div className="bg-background border-b">
                <div className="container py-8 lg:py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                            Discover Events
                        </h1>
                        <p className="mt-3 text-muted-foreground text-lg">
                            Find meaningful community events near you
                        </p>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="mt-8 max-w-2xl mx-auto"
                    >
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Search events or locations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 pl-12 pr-4 text-base rounded-full border-border/50 bg-background shadow-sm"
                            />
                        </div>
                    </motion.div>

                    {/* Category Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mt-6 flex flex-wrap justify-center gap-2"
                    >
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className="rounded-full"
                            >
                                {category}
                            </Button>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Events Grid */}
            <div className="container py-8 lg:py-12">
                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">{filteredEvents.length}</span> events found
                    </p>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filters
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading events...</span>
                    </div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <Card className="p-12 text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Unable to load events</h3>
                        <p className="text-muted-foreground mt-2">{error}</p>
                    </Card>
                )}

                {/* Events Grid */}
                {!isLoading && !error && (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredEvents.length === 0 ? (
                            <Card className="sm:col-span-2 lg:col-span-3 p-12 text-center">
                                <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold">No events available yet</h3>
                                <p className="text-muted-foreground mt-2">
                                    Once organisers publish events, they will appear here automatically.
                                </p>
                                <Button className="mt-4" asChild>
                                    <Link href="/events/new">Create an event</Link>
                                </Button>
                            </Card>
                        ) : (
                            <>
                                {filteredEvents.map((event, index) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.4, delay: index * 0.05 }}
                                    >
                                        <Link href={`/events/${event.slug || event.id}`}>
                                            <Card className="group overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-primary/20">
                                                {/* Image */}
                                                <div className="relative aspect-[16/10] overflow-hidden">
                                                    {event.imageUrl ? (
                                                        <Image
                                                            src={event.imageUrl}
                                                            alt={event.title}
                                                            fill
                                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground text-sm">
                                                            <Calendar className="h-8 w-8" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                                    {/* Category Badge */}
                                                    <Badge className="absolute left-3 top-3 bg-background/90 text-foreground backdrop-blur-sm">
                                                        {event.category}
                                                    </Badge>

                                                    {/* Like Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            toggleLike(event.id);
                                                        }}
                                                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-transform hover:scale-110"
                                                    >
                                                        <Heart
                                                            className={`h-5 w-5 ${likedEvents.has(event.id)
                                                                ? 'fill-red-500 text-red-500'
                                                                : 'text-muted-foreground'
                                                                }`}
                                                        />
                                                    </button>

                                                    {/* Price */}
                                                    <div className="absolute bottom-3 right-3">
                                                        <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold">
                                                            {event.price === 0 ? 'Free' : `£${event.price}`}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <CardContent className="p-4">
                                                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                                                        {event.title}
                                                    </h3>

                                                    <div className="mt-3 space-y-2">
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Calendar className="h-4 w-4 shrink-0" />
                                                            <span>{event.date}{event.time && ` • ${event.time}`}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <MapPin className="h-4 w-4 shrink-0" />
                                                            <span className="truncate">{event.venue || event.location}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground">
                                                            {event.attendees} attending
                                                        </span>
                                                        <Button size="sm" variant="ghost" className="text-primary">
                                                            View Details
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* Load More */}
                {!isLoading && !error && filteredEvents.length > 0 && (
                    <div className="mt-12 text-center">
                        <Button variant="outline" size="lg">
                            Load more events
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
