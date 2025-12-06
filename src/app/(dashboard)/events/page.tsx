'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import {
    Search,
    MapPin,
    Calendar,
    Filter,
    Heart,
    ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Placeholder events data with Unsplash images
const events = [
    {
        id: '1',
        title: 'Community Iftar 2024',
        date: 'Dec 15, 2024',
        time: '4:30 PM',
        location: 'London',
        venue: 'London Central Mosque',
        price: 10,
        category: 'Iftar',
        imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600&h=400&fit=crop',
        attendees: 156,
    },
    {
        id: '2',
        title: 'Islamic Finance Workshop',
        date: 'Jan 10, 2025',
        time: '10:00 AM',
        location: 'Online',
        venue: 'Virtual Event',
        price: 25,
        category: 'Workshop',
        imageUrl: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=600&h=400&fit=crop',
        attendees: 89,
    },
    {
        id: '3',
        title: 'Youth Leadership Conference',
        date: 'Feb 1, 2025',
        time: '9:00 AM',
        location: 'Birmingham',
        venue: 'Birmingham ICC',
        price: 0,
        category: 'Conference',
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
        attendees: 342,
    },
    {
        id: '4',
        title: 'Sisters Wellness Retreat',
        date: 'Feb 15, 2025',
        time: '11:00 AM',
        location: 'Manchester',
        venue: 'Wellness Centre',
        price: 35,
        category: 'Sisters',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop',
        attendees: 45,
    },
    {
        id: '5',
        title: 'Quran Recitation Evening',
        date: 'Feb 20, 2025',
        time: '7:00 PM',
        location: 'Leeds',
        venue: 'Leeds Grand Mosque',
        price: 0,
        category: 'Education',
        imageUrl: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=400&fit=crop',
        attendees: 120,
    },
    {
        id: '6',
        title: 'Charity Gala Dinner',
        date: 'Mar 5, 2025',
        time: '6:30 PM',
        location: 'London',
        venue: 'Hilton Park Lane',
        price: 75,
        category: 'Charity',
        imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=400&fit=crop',
        attendees: 200,
    },
];

const categories = ['All', 'Iftar', 'Conference', 'Workshop', 'Sisters', 'Youth', 'Charity', 'Education'];

export default function BrowseEventsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());

    const filteredEvents = events.filter((event) => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
        <div className="min-h-screen bg-muted/30">
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

                {/* Events Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map((event, index) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                        >
                            <Link href={`/events/${event.id}`}>
                                <Card className="group overflow-hidden border-border/50 transition-all hover:shadow-lg hover:border-primary/20">
                                    {/* Image */}
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        <Image
                                            src={event.imageUrl}
                                            alt={event.title}
                                            fill
                                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
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
                                                <span>{event.date} • {event.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MapPin className="h-4 w-4 shrink-0" />
                                                <span className="truncate">{event.venue}</span>
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
                </div>

                {/* Empty State */}
                {filteredEvents.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground text-lg">No events found matching your criteria</p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('All');
                            }}
                        >
                            Clear filters
                        </Button>
                    </div>
                )}

                {/* Load More */}
                {filteredEvents.length > 0 && (
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
