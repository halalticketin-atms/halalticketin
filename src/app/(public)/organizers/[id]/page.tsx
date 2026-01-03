'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
    ArrowLeft,
    Calendar,
    Clock,
    ExternalLink,
    Globe,
    Instagram,
    Linkedin,
    Loader2,
    MapPin,
    Share2,
    Twitter,
    Users,
    UserPlus,
    UserCheck,
    Youtube
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import {
    fetchPublicOrganizerProfile,
    type PublicOrganizerProfile,
    type PublicOrganizerEvent
} from '@/lib/organizers-api';
import {
    followOrganizer,
    unfollowOrganizer,
    checkIsFollowing
} from '@/lib/follows-api';
import { ShareDialog } from '@/components/share/ShareDialog';
import { toast } from '@/lib/notifications';

/**
 * Format date for event cards
 */
function formatEventDate(dateString: string | null): string {
    if (!dateString) return 'Date TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Get location display string
 */
function getLocationString(event: PublicOrganizerEvent): string {
    if (event.locationType === 'online') return 'Online Event';
    const parts = [event.venue, event.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location TBD';
}

/**
 * TikTok icon component (not available in lucide-react)
 */
function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
    );
}

/**
 * Social icon mapping
 */
function SocialIcon({ platform }: { platform: string }) {
    const lower = platform.toLowerCase();
    if (lower.includes('instagram')) return <Instagram className="h-4 w-4" />;
    if (lower.includes('tiktok')) return <TikTokIcon className="h-4 w-4" />;
    if (lower.includes('linkedin')) return <Linkedin className="h-4 w-4" />;
    if (lower.includes('youtube')) return <Youtube className="h-4 w-4" />;
    if (lower.includes('twitter') || lower.includes('x')) return <Twitter className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
}

/**
 * Event card component
 */
function EventCard({
    event,
    organizerName,
    organizerAvatarUrl,
    isPast = false
}: {
    event: PublicOrganizerEvent;
    organizerName: string;
    organizerAvatarUrl: string | null;
    isPast?: boolean;
}) {
    const eventUrl = event.slug ? `/events/${event.slug}` : `/events/${event.id}`;
    const handlePastClick = () => {
        toast.info('Event has ended', {
            description: 'This event is no longer available. It has already happened.',
        });
    };

    const card = (
        <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full p-0">
            <div className="relative aspect-[4/5] overflow-hidden">
                {event.bannerImageUrl ? (
                    <Image
                        src={event.bannerImageUrl}
                        alt={event.title || 'Event'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-primary/40" />
                    </div>
                )}
                {event.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                        {event.category}
                    </span>
                )}
            </div>
            <CardContent className="p-4">
                <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {event.title || 'Untitled Event'}
                </h3>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="relative h-5 w-5 overflow-hidden rounded-full flex items-center justify-center bg-white text-[10px] font-semibold text-foreground/70">
                        {organizerAvatarUrl ? (
                            <Image
                                src={organizerAvatarUrl}
                                alt={organizerName}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <span>{organizerName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <span className="truncate">Hosted by {organizerName}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{formatEventDate(event.startDatetime)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {event.locationType === 'online' ? (
                            <Globe className="h-4 w-4 text-primary" />
                        ) : (
                            <MapPin className="h-4 w-4 text-primary" />
                        )}
                        <span className="truncate">{getLocationString(event)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (isPast) {
        return (
            <button type="button" className="text-left" onClick={handlePastClick}>
                {card}
            </button>
        );
    }

    return <Link href={eventUrl}>{card}</Link>;
}

/**
 * Empty state component
 */
function EmptyEvents({ message }: { message: string }) {
    return (
        <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto opacity-30 mb-3" />
            <p>{message}</p>
        </div>
    );
}

/**
 * Public Organizer Profile Page
 */
export default function OrganizerProfilePage() {
    const params = useParams();
    const organizerId = params.id as string;
    const { user, isLoading: authLoading } = useAuth();
    const isAuthenticated = !authLoading && !!user;

    const [organizer, setOrganizer] = useState<PublicOrganizerProfile | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<PublicOrganizerEvent[]>([]);
    const [pastEvents, setPastEvents] = useState<PublicOrganizerEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Follow state
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [isFollowLoading, setIsFollowLoading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            if (!organizerId) return;

            setIsLoading(true);
            setError(null);

            try {
                const data = await fetchPublicOrganizerProfile(organizerId);
                setOrganizer(data.organizer);
                setFollowerCount(data.organizer.followerCount);
                setUpcomingEvents(data.upcomingEvents);
                setPastEvents(data.pastEvents);
            } catch (err) {
                console.error('Failed to load organizer profile:', err);
                setError('This organizer profile could not be found.');
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [organizerId]);

    // Check follow status when user is authenticated
    useEffect(() => {
        const checkFollowStatus = async () => {
            if (!isAuthenticated || !organizerId) return;

            try {
                const result = await checkIsFollowing(organizerId);
                setIsFollowing(result.following);
            } catch (err) {
                // Ignore errors - user just won't see follow status
                console.error('Failed to check follow status:', err);
            }
        };

        checkFollowStatus();
    }, [isAuthenticated, organizerId]);

    const handleFollow = async () => {
        if (!isAuthenticated) {
            // Redirect to login
            window.location.href = `/login?next=/organizers/${organizerId}`;
            return;
        }

        setIsFollowLoading(true);
        try {
            if (isFollowing) {
                await unfollowOrganizer(organizerId);
                setIsFollowing(false);
                setFollowerCount(prev => Math.max(0, prev - 1));
            } else {
                await followOrganizer(organizerId);
                setIsFollowing(true);
                setFollowerCount(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to update follow status:', err);
        } finally {
            setIsFollowLoading(false);
        }
    };

    const socialLinks = useMemo(() => {
        if (!organizer?.socialLinks) return [];
        return Object.entries(organizer.socialLinks).filter(([, url]) => url);
    }, [organizer?.socialLinks]);
    const [isShareOpen, setIsShareOpen] = useState(false);

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !organizer) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md rounded-2xl border bg-background p-8 text-center shadow-lg"
                >
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h1 className="font-display text-2xl font-bold">Organizer not found</h1>
                    <p className="mt-2 text-muted-foreground">
                        {error || "This organizer profile doesn't exist."}
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/events">Browse Events</Link>
                    </Button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <ShareDialog
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                title={organizer.name || 'Organizer profile'}
                text="Organizer profile"
            />
            {/* Hero Section */}
            <div className="relative">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#00CDAC]/10 to-[#02AAB0]/10" />

                <div className="container relative pt-6 sm:pt-8 pb-12 sm:pb-20 px-4 sm:px-6">
                    {/* Back Button */}
                    <Button variant="ghost" size="sm" asChild className="mb-6 sm:mb-8">
                        <Link href="/events">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Events
                        </Link>
                    </Button>

                    {/* Profile Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6"
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-2xl overflow-hidden ring-4 ring-background shadow-xl bg-white">
                                {organizer.avatarUrl ? (
                                    <Image
                                        src={organizer.avatarUrl}
                                        alt={organizer.name}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-3xl sm:text-4xl font-display font-bold text-primary/40">
                                            {organizer.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 w-full">
                            <h1 className="font-display text-2xl sm:text-4xl font-bold break-words">
                                {organizer.name}
                            </h1>

                            {(organizer.city || organizer.country) && (
                                <p className="mt-1 text-muted-foreground text-sm sm:text-base flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{[organizer.city, organizer.country].filter(Boolean).join(', ')}</span>
                                </p>
                            )}

                            {/* Stats & Actions */}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm sm:text-base">
                                    <Users className="h-4 w-4" />
                                    <span className="font-medium text-foreground">{followerCount}</span>
                                    <span>followers</span>
                                </div>

                                {/* Follow button */}
                                <Button
                                    size="sm"
                                    variant={isFollowing ? "default" : "outline"}
                                    onClick={handleFollow}
                                    disabled={isFollowLoading}
                                    className="min-w-[90px] sm:min-w-[100px] transition-all"
                                >
                                    {isFollowLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : isFollowing ? (
                                        <>
                                            <UserCheck className="h-4 w-4 mr-1.5" />
                                            Following
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="h-4 w-4 mr-1.5" />
                                            Follow
                                        </>
                                    )}
                                </Button>

                                <Button size="sm" variant="outline" onClick={() => setIsShareOpen(true)}>
                                    <Share2 className="h-4 w-4 mr-1.5" />
                                    Share
                                </Button>

                            </div>

                            {/* Social Links */}
                            {(socialLinks.length > 0 || organizer.website) && (
                                <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
                                    {organizer.website && (
                                        <a
                                            href={organizer.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            Website
                                        </a>
                                    )}
                                    {socialLinks.map(([platform, url]) => (
                                        <a
                                            key={platform}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                                        >
                                            <SocialIcon platform={platform} />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Bio */}
                            {organizer.bio && (
                                <p className="mt-3 sm:mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed break-words">
                                    {organizer.bio}
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Events Section */}
            <div className="container pt-6 sm:pt-8 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Tabs defaultValue="upcoming" className="w-full">
                        <TabsList className="mb-6 bg-muted/50 p-1">
                            <TabsTrigger
                                value="upcoming"
                                className="gap-2 px-4 py-2 text-sm sm:text-base font-normal"
                            >
                                <Calendar className="h-4 w-4" />
                                Upcoming ({upcomingEvents.length})
                            </TabsTrigger>
                            <TabsTrigger
                                value="past"
                                className="gap-2 px-4 py-2 text-sm sm:text-base font-normal"
                            >
                                <Clock className="h-4 w-4" />
                                Past ({pastEvents.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="upcoming">
                            {upcomingEvents.length > 0 ? (
                                <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                                    {upcomingEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            organizerName={organizer.name}
                                            organizerAvatarUrl={organizer.avatarUrl}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyEvents message="No upcoming events at the moment." />
                            )}
                        </TabsContent>

                        <TabsContent value="past">
                            {pastEvents.length > 0 ? (
                                <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                                    {pastEvents.map((event) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            organizerName={organizer.name}
                                            organizerAvatarUrl={organizer.avatarUrl}
                                            isPast
                                        />
                                    ))}
                                </div>
                            ) : (
                                <EmptyEvents message="No past events to show." />
                            )}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>
        </div>
    );
}
