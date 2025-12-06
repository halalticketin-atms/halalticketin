'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Calendar,
    Clock,
    MapPin,
    Share2,
    Heart,
    Users,
    Ticket,
    Plus,
    Minus,
    ChevronLeft,
    ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Placeholder event data
const eventData = {
    id: '1',
    title: 'Community Iftar 2024',
    subtitle: 'A beautiful evening of breaking fast together',
    description: `Join us for a beautiful community iftar gathering. We will be hosting a special evening of breaking fast together, featuring traditional dishes and a wonderful atmosphere of brotherhood and sisterhood.

This year's iftar will feature:
• Traditional dishes from various cultures
• Inspiring talks from community leaders
• Activities for children
• Networking opportunities

All proceeds go towards supporting local community initiatives.`,
    date: 'Saturday, December 15, 2024',
    time: '4:30 PM - 8:00 PM',
    location: 'London Central Mosque',
    address: '146 Park Road, London NW8 7RG',
    category: 'Iftar',
    organizer: {
        name: 'London Muslim Community',
        avatar: '',
        followers: 1250,
        verified: true,
    },
    imageUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1200&h=600&fit=crop',
    attendees: 156,
    capacity: 250,
    tickets: [
        { id: '1', name: 'General Admission', price: 10, available: 55, description: 'Standard entry' },
        { id: '2', name: 'Family Pass (4)', price: 30, available: 20, description: 'Entry for 4 people' },
        { id: '3', name: 'VIP', price: 50, available: 10, description: 'Front row seating + refreshments' },
    ],
};

export default function EventDetailsPage() {
    const params = useParams();
    const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
    const [isLiked, setIsLiked] = useState(false);

    const updateQuantity = (ticketId: string, delta: number) => {
        setTicketQuantities(prev => ({
            ...prev,
            [ticketId]: Math.max(0, (prev[ticketId] || 0) + delta),
        }));
    };

    const totalTickets = Object.values(ticketQuantities).reduce((a, b) => a + b, 0);
    const totalPrice = eventData.tickets.reduce((total, ticket) => {
        return total + (ticketQuantities[ticket.id] || 0) * ticket.price;
    }, 0);

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative">
                {/* Back Button */}
                <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
                        asChild
                    >
                        <Link href="/events">
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>

                {/* Action Buttons */}
                <div className="absolute right-4 top-4 z-10 flex gap-2 sm:right-6 sm:top-6">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={() => setIsLiked(!isLiked)}
                    >
                        <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm"
                    >
                        <Share2 className="h-5 w-5" />
                    </Button>
                </div>

                {/* Hero Image */}
                <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
                    <Image
                        src={eventData.imageUrl}
                        alt={eventData.title}
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                </div>

                {/* Event Title Overlay */}
                <div className="container relative -mt-20 sm:-mt-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Badge className="mb-3">{eventData.category}</Badge>
                        <h1 className="font-display text-3xl font-bold sm:text-4xl lg:text-5xl">
                            {eventData.title}
                        </h1>
                        <p className="mt-2 text-lg text-muted-foreground">{eventData.subtitle}</p>
                    </motion.div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container py-8 lg:py-12">
                <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                    {/* Left Column - Event Details */}
                    <div className="flex-1 space-y-8">
                        {/* Quick Info Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="grid gap-4 sm:grid-cols-3"
                        >
                            <Card className="border-border/50">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Calendar className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">Date</p>
                                        <p className="font-medium truncate">{eventData.date}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">Time</p>
                                        <p className="font-medium truncate">{eventData.time}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-border/50">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-muted-foreground">Attending</p>
                                        <p className="font-medium">{eventData.attendees} / {eventData.capacity}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Location */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <h2 className="mb-4 font-display text-xl font-semibold">Location</h2>
                            <Card className="border-border/50 overflow-hidden">
                                <CardContent className="p-0">
                                    {/* Map Placeholder */}
                                    <div className="relative h-40 overflow-hidden">
                                        <Image
                                            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=400&fit=crop"
                                            alt="Map location"
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                                                <MapPin className="h-6 w-6" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="font-medium">{eventData.location}</p>
                                        <p className="text-sm text-muted-foreground">{eventData.address}</p>
                                        <Button variant="link" className="mt-2 h-auto p-0 text-primary">
                                            Get directions <ExternalLink className="ml-1 h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* About */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <h2 className="mb-4 font-display text-xl font-semibold">About this event</h2>
                            <Card className="border-border/50">
                                <CardContent className="p-6">
                                    <div className="prose prose-sm max-w-none text-muted-foreground">
                                        {eventData.description.split('\n\n').map((paragraph, i) => (
                                            <p key={i} className={i > 0 ? 'mt-4' : ''}>
                                                {paragraph.split('\n').map((line, j) => (
                                                    <span key={j}>
                                                        {line}
                                                        {j < paragraph.split('\n').length - 1 && <br />}
                                                    </span>
                                                ))}
                                            </p>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Organizer */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                        >
                            <h2 className="mb-4 font-display text-xl font-semibold">Hosted by</h2>
                            <Card className="border-border/50">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-14 w-14">
                                            <AvatarImage src={eventData.organizer.avatar} />
                                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                                                {eventData.organizer.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{eventData.organizer.name}</p>
                                                {eventData.organizer.verified && (
                                                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {eventData.organizer.followers.toLocaleString()} followers
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline">Follow</Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Right Column - Ticket Selection (Sticky) */}
                    <div className="lg:w-96">
                        <div className="lg:sticky lg:top-24">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            >
                                <Card className="border-border/50 shadow-lg">
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-2 mb-6">
                                            <Ticket className="h-5 w-5 text-primary" />
                                            <h3 className="font-display text-lg font-semibold">Select Tickets</h3>
                                        </div>

                                        <div className="space-y-4">
                                            {eventData.tickets.map((ticket) => (
                                                <div
                                                    key={ticket.id}
                                                    className="rounded-xl border border-border/50 p-4 transition-all hover:border-primary/30"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <p className="font-medium">{ticket.name}</p>
                                                            <p className="text-sm text-muted-foreground">{ticket.description}</p>
                                                        </div>
                                                        <p className="font-semibold text-lg">
                                                            {ticket.price === 0 ? 'Free' : `£${ticket.price}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-muted-foreground">
                                                            {ticket.available} remaining
                                                        </p>
                                                        <div className="flex items-center gap-3">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => updateQuantity(ticket.id, -1)}
                                                                disabled={(ticketQuantities[ticket.id] || 0) === 0}
                                                            >
                                                                <Minus className="h-4 w-4" />
                                                            </Button>
                                                            <span className="w-6 text-center font-medium">
                                                                {ticketQuantities[ticket.id] || 0}
                                                            </span>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => updateQuantity(ticket.id, 1)}
                                                                disabled={(ticketQuantities[ticket.id] || 0) >= ticket.available}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total & Checkout */}
                                        <div className="mt-6 border-t pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-muted-foreground">
                                                    {totalTickets} {totalTickets === 1 ? 'ticket' : 'tickets'}
                                                </span>
                                                <span className="text-2xl font-bold">£{totalPrice}</span>
                                            </div>
                                            <Button
                                                className="w-full h-12 text-base font-semibold"
                                                size="lg"
                                                disabled={totalTickets === 0}
                                            >
                                                {totalTickets === 0 ? 'Select tickets' : 'Get Tickets'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
