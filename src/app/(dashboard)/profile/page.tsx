'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
    Settings,
    Calendar,
    Ticket,
    Heart,
    MapPin,
    ChevronRight,
    Edit3,
    Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { useOrganizerEvents } from '@/hooks/useOrganizerEvents';

export default function ProfilePage() {
    const router = useRouter();
    const { user, memberships, isLoading: authLoading, signOut } = useAuth();
    const { activeOrganizerId } = useOrganizers();
    const { events, isLoading: eventsLoading, getByStatus, counts } = useOrganizerEvents(activeOrganizerId);

    const displayName = user?.name || user?.email?.split('@')[0] || 'Guest User';
    const displayEmail = user?.email ?? 'Sign in';
    const avatarImage = user?.avatarUrl ?? '';
    const avatarFallback = displayName.charAt(0).toUpperCase();

    // Map events for display
    const formatEvent = (event: any) => ({
        id: event.id,
        title: event.title,
        date: event.startDatetime ? new Date(event.startDatetime).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'TBD',
        image: event.bannerImageUrl
    });

    const upcomingEvents = getByStatus('active').map(formatEvent);
    const pastEvents = getByStatus('past').map(formatEvent);

    return (
        <div className="min-h-screen bg-background -mt-[var(--nav-safe-offset)]">
            {/* Minimal Header */}
            <div className="border-b pt-[calc(var(--nav-safe-offset)+2rem)] pb-8">
                <div className="container max-w-4xl">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background bg-muted">
                                <AvatarImage src={avatarImage} alt={displayName} className="object-cover" />
                                <AvatarFallback className="text-2xl md:text-3xl">{avatarFallback}</AvatarFallback>
                            </Avatar>
                            {user && (
                                <Link
                                    href="/settings"
                                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition-colors text-muted-foreground"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </Link>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 min-w-0 space-y-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{displayName}</h1>
                                    {memberships.length > 0 && (
                                        <Badge variant="secondary" className="font-normal">
                                            Organizer
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground">{displayEmail}</p>
                            </div>

                            {/* Bio / Description Placeholder */}
                            <p className="max-w-xl text-sm md:text-base">
                                {user
                                    ? 'Welcome to your profile. Manage your events and tickets here.'
                                    : 'Sign in to create your HalalTicketin profile and manage events.'}
                            </p>

                            {/* Inline Stats & Metadata */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    <span>{user ? 'Location not set' : 'Unknown location'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span>Joined {new Date().getFullYear()}</span>
                                </div>
                                <div className="flex items-center gap-4 pl-2 border-l">
                                    <span className="hover:underline cursor-pointer">
                                        <strong className="text-foreground">{memberships.length}</strong> <span className="opacity-80">Teams</span>
                                    </span>
                                    <span className="hover:underline cursor-pointer">
                                        <strong className="text-foreground">{counts.all}</strong> <span className="opacity-80">Events</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 shrink-0">
                            <Button variant="outline" size="sm" className="rounded-full px-5">
                                Share
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-full px-5" asChild>
                                <Link href="/settings">Edit Profile</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="container max-w-4xl py-8">
                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-8 space-x-8">
                        {['Upcoming', 'Past Events', 'Saved'].map((tab) => {
                            const value = tab.toLowerCase().replace(' ', '-');
                            const actualValue = tab === 'Past Events' ? 'past' : tab.toLowerCase();

                            return (
                                <TabsTrigger
                                    key={tab}
                                    value={actualValue}
                                    className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors"
                                >
                                    {tab}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent value="upcoming" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon={Calendar}
                                title="No upcoming events"
                                description="You don't have any upcoming events scheduled."
                                actionLabel="Create Event"
                                actionHref="/events/new"
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="past" className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {pastEvents.length > 0 ? (
                            pastEvents.map((event) => (
                                <EventCard key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon={Ticket}
                                title="No past events"
                                description="Events you've organized in the past will appear here."
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="saved" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <EmptyState
                            icon={Heart}
                            title="No saved events"
                            description="Events you save will appear here for quick access."
                            actionLabel="Discover Events"
                            actionHref="/events"
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function EventCard({ event }: { event: any }) {
    return (
        <Link href={`/events/${event.id}`}>
            <Card className="group overflow-hidden border-0 bg-muted/30 hover:bg-muted/60 transition-colors shadow-none">
                <CardContent className="flex items-center gap-4 p-4">
                    <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {event.image ? (
                            <Image
                                src={event.image}
                                alt={event.title}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <Calendar className="h-8 w-8 opacity-20" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                        <h3 className="font-semibold text-lg truncate mb-1 group-hover:text-primary transition-colors">
                            {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                </CardContent>
            </Card>
        </Link>
    );
}

function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    actionHref
}: {
    icon: any,
    title: string,
    description: string,
    actionLabel?: string,
    actionHref?: string
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl border-muted">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-6">{description}</p>
            {actionLabel && actionHref && (
                <Button asChild variant="outline" className="rounded-full">
                    <Link href={actionHref}>{actionLabel}</Link>
                </Button>
            )}
        </div>
    );
}
