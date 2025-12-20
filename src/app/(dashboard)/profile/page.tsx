'use client';

import { useState } from 'react';
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
    const [activeTab, setActiveTab] = useState('upcoming');

    const displayName = user?.name || user?.email?.split('@')[0] || 'Guest User';
    const displayEmail = user?.email ?? 'Sign in';
    const avatarImage = user?.avatarUrl ?? '';
    const avatarFallback = displayName.charAt(0).toUpperCase();

    // Map events for display
    const formatEvent = (event: any) => ({
        id: event.id,
        slug: event.slug,
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
        <div className="relative min-h-screen bg-background -mt-[var(--nav-safe-offset)] overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute inset-0 bg-noise pointer-events-none opacity-50" />
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-[oklch(0.78_0.14_165/0.2)] blur-[100px] pointer-events-none"
            />
            <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-20 left-0 h-[500px] w-[500px] rounded-full bg-[oklch(0.72_0.15_185/0.2)] blur-[100px] pointer-events-none"
            />

            {/* Content Wrapper */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10"
            >
                {/* Minimal Header */}
                <div className="border-b pt-[calc(var(--nav-safe-offset)+2rem)] pb-8 bg-background/50 backdrop-blur-sm">
                    <div className="container max-w-4xl">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Avatar */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{ scale: 1.05 }}
                                className="relative shrink-0 cursor-pointer"
                            >
                                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background bg-muted shadow-lg transition-transform text-2xl md:text-3xl">
                                    <AvatarImage src={avatarImage} alt={displayName} className="object-cover" />
                                    <AvatarFallback>{avatarFallback}</AvatarFallback>
                                </Avatar>
                                {user && (
                                    <Link
                                        href="/settings"
                                        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted transition-colors text-muted-foreground hover:scale-110 active:scale-95 duration-200"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </Link>
                                )}
                            </motion.div>

                            {/* Profile Info */}
                            <div className="flex-1 min-w-0 space-y-4">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-1">
                                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{displayName}</h1>
                                        {memberships.length > 0 && (
                                            <Badge variant="secondary" className="font-normal border-primary/20 bg-primary/5 text-primary">
                                                Organizer
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground">{displayEmail}</p>
                                </div>

                                {/* Bio / Description Placeholder */}
                                <p className="max-w-xl text-sm md:text-base leading-relaxed">
                                    {user
                                        ? 'Welcome to your profile. Manage your events and tickets here.'
                                        : 'Sign in to create your HalalTicketin profile and manage events.'}
                                </p>

                                {/* Inline Stats & Metadata */}
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="h-4 w-4 text-primary/60" />
                                        <span>{user ? 'Location not set' : 'Unknown location'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4 text-primary/60" />
                                        <span>Joined {new Date().getFullYear()}</span>
                                    </div>
                                    <div className="flex items-center gap-4 pl-2 border-l border-border/50">
                                        <span className="hover:text-primary transition-colors cursor-pointer group">
                                            <strong className="text-foreground group-hover:text-primary transition-colors">{memberships.length}</strong> <span className="opacity-80">Teams</span>
                                        </span>
                                        <span className="hover:text-primary transition-colors cursor-pointer group">
                                            <strong className="text-foreground group-hover:text-primary transition-colors">{counts.all}</strong> <span className="opacity-80">Events</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 shrink-0">
                                <Button variant="outline" size="sm" className="rounded-full px-5 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-300 active:scale-95">
                                    Share
                                </Button>
                                <Button variant="outline" size="sm" className="rounded-full px-5 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-300 active:scale-95" asChild>
                                    <Link href="/settings">Edit Profile</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <div className="container max-w-4xl py-8">
                    <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full justify-start bg-transparent border-b border-border/40 rounded-none h-auto p-0 mb-8 space-x-8">
                            {['Upcoming', 'Past Events', 'Saved'].map((tab) => {
                                const value = tab.toLowerCase().replace(' ', '-');
                                const actualValue = tab === 'Past Events' ? 'past' : tab.toLowerCase();
                                const isActive = activeTab === actualValue;

                                return (
                                    <TabsTrigger
                                        key={tab}
                                        value={actualValue}
                                        className="relative rounded-none border-0 bg-transparent px-0 pb-3 pt-0 text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                                    >
                                        <span className="text-lg font-medium">{tab}</span>
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        <div className="min-h-[400px]">
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
                        </div>
                    </Tabs>
                </div>
            </motion.div>
        </div>
    );
}

function EventCard({ event }: { event: { id: string; slug?: string; title: string; date: string; image?: string | null } }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <Link href={`/events/${event.slug || event.id}`} className="block h-full">
                <Card className="group overflow-hidden border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20">
                    <CardContent className="flex items-center gap-5 p-4">
                        <div className="relative w-16 sm:w-20 aspect-[4/5] shrink-0 overflow-hidden rounded-xl bg-muted shadow-inner">
                            {event.image ? (
                                <Image
                                    src={event.image}
                                    alt={event.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-muted-foreground/50">
                                    <Calendar className="h-6 w-6 opacity-20" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0 py-1">
                            <h3 className="font-display font-semibold text-lg truncate mb-1.5 group-hover:text-primary transition-colors">
                                {event.title}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5 text-primary/60" />
                                <span>{event.date}</span>
                            </div>
                        </div>
                        <div className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center bg-background/50 group-hover:border-primary/30 group-hover:bg-primary/10 transition-colors">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
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
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl border-muted bg-muted/5">
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
