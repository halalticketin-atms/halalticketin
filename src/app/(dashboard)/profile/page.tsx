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
    Bell,
    Shield,
    CreditCard,
    LogOut,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';

const menuItems = [
    { icon: Bell, label: 'Notifications', href: '/settings', badge: '3' },
    { icon: CreditCard, label: 'Payment Methods', href: '/settings' },
    { icon: Shield, label: 'Privacy & Security', href: '/settings' },
    { icon: Settings, label: 'Account Settings', href: '/settings' },
];

export default function ProfilePage() {
    const router = useRouter();
    const { user, memberships, isLoading, signOut } = useAuth();
    const isAuthenticated = Boolean(user);

    const displayName = user?.name || user?.email?.split('@')[0] || 'Guest User';
    const displayEmail = user?.email ?? 'Sign in to add your email';
    const avatarImage = user?.avatarUrl ?? '';
    const avatarFallback = displayName.charAt(0).toUpperCase();

    const stats = [
        { label: 'Organizer Teams', value: memberships.length, icon: Users },
        { label: 'Events Organized', value: 0, icon: Calendar },
        { label: 'Events Attended', value: 0, icon: Ticket },
    ];

    const upcomingEvents: Array<{ id: string; title: string; date: string; image?: string }> = [];
    const pastEvents: typeof upcomingEvents = [];

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Profile Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.5, 0.3],
                        }}
                        transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <motion.div
                        className="absolute -left-20 top-40 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.4, 0.2, 0.4],
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                </div>

                <div className="container relative py-12 lg:py-16">
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
                        {/* Avatar */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="relative"
                        >
                            <div className="relative">
                                <Avatar className="h-28 w-28 border-4 border-background shadow-xl sm:h-32 sm:w-32">
                                    <AvatarImage src={avatarImage} alt={displayName} />
                                    <AvatarFallback className="text-3xl">{avatarFallback}</AvatarFallback>
                                </Avatar>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
                                >
                                    <Edit3 className="h-4 w-4" />
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Profile Info */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="flex-1 text-center sm:text-left"
                        >
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <h1 className="font-display text-2xl font-bold sm:text-3xl">{displayName}</h1>
                                {memberships.length > 0 && (
                                    <Badge variant="secondary" className="gap-1">
                                        <Shield className="h-3 w-3 text-primary" />
                                        Organizer
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                                <MapPin className="h-4 w-4" />
                                <span>{user ? 'No location set yet' : 'Update your profile to add location'}</span>
                                <span>•</span>
                                <span>{user ? 'Profile created recently' : 'Not signed in'}</span>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{displayEmail}</p>
                            <p className="mt-3 max-w-md text-center text-muted-foreground sm:text-left">
                                {user
                                    ? 'Complete your profile to share more about your community work.'
                                    : 'Sign in to create your HalalTicketin profile and manage events.'}
                            </p>

                            {/* Action Buttons */}
                            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Share2 className="h-4 w-4" />
                                    Share Profile
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" asChild>
                                    <Link href="/settings">
                                        <Settings className="h-4 w-4" />
                                        Edit Profile
                                    </Link>
                                </Button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Stats */}
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mt-8 grid grid-cols-3 gap-4 sm:max-w-md"
                    >
                        {stats.map((stat) => (
                            <motion.div
                                key={stat.label}
                                whileHover={{ y: -4 }}
                                className="rounded-xl bg-background/80 p-4 text-center shadow-sm backdrop-blur-sm"
                            >
                                <stat.icon className="mx-auto h-5 w-5 text-primary mb-1" />
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>

            {/* Content */}
            <div className="container py-8 lg:py-12">
                <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                    {/* Main Content */}
                    <div className="flex-1">
                        <Tabs defaultValue="upcoming" className="space-y-6">
                            <TabsList className="w-full justify-start">
                                <TabsTrigger value="upcoming" className="gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Upcoming
                                </TabsTrigger>
                                <TabsTrigger value="past" className="gap-2">
                                    <Ticket className="h-4 w-4" />
                                    Past Events
                                </TabsTrigger>
                                <TabsTrigger value="saved" className="gap-2">
                                    <Heart className="h-4 w-4" />
                                    Saved
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upcoming" className="space-y-4">
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.map((event, index) => (
                                        <motion.div
                                            key={event.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.1 }}
                                        >
                                            <Link href={`/events/${event.id}`}>
                                                <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                                                    <CardContent className="flex items-center gap-4 p-4">
                                                        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                                                            {event.image ? (
                                                                <Image
                                                                    src={event.image}
                                                                    alt={event.title}
                                                                    fill
                                                                    className="object-cover transition-transform group-hover:scale-105"
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                                    No image
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                                {event.title}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">{event.date}</p>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center">
                                        <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <p className="mt-4 text-muted-foreground">No upcoming events</p>
                                        <Button className="mt-4" asChild>
                                            <Link href="/events">Browse Events</Link>
                                        </Button>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="past" className="space-y-4">
                                {pastEvents.length > 0 ? pastEvents.map((event, index) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ duration: 0.3, delay: index * 0.1 }}
                                    >
                                        <Link href={`/events/${event.id}`}>
                                            <Card className="group overflow-hidden transition-all hover:shadow-md hover:border-primary/20">
                                                <CardContent className="flex items-center gap-4 p-4">
                                                    <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg">
                                                        {event.image ? (
                                                            <Image
                                                                src={event.image}
                                                                alt={event.title}
                                                                fill
                                                                className="object-cover transition-transform group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                                                No image
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                                            {event.title}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">{event.date}</p>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                )) : (
                                    <div className="py-12 text-center">
                                        <Ticket className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                        <p className="mt-4 text-muted-foreground">No past events yet</p>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="saved" className="py-12 text-center">
                                <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <p className="mt-4 text-muted-foreground">No saved events yet</p>
                                <Button className="mt-4" asChild>
                                    <Link href="/events">Discover Events</Link>
                                </Button>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-80">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <h3 className="mb-4 font-semibold">Quick Actions</h3>
                            <Card className="overflow-hidden">
                                <CardContent className="p-0">
                                    {menuItems.map((item) => (
                                        <Link
                                            key={item.label}
                                            href={item.href}
                                            className="flex items-center gap-3 border-b last:border-b-0 p-4 transition-colors hover:bg-muted/50"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                <item.icon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <span className="flex-1 font-medium">{item.label}</span>
                                            {item.badge && (
                                                <Badge variant="default" className="h-6 w-6 rounded-full p-0 justify-center">
                                                    {item.badge}
                                                </Badge>
                                            )}
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Logout Button */}
                            {isAuthenticated && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                                    onClick={() => {
                                        signOut();
                                        router.push('/login');
                                    }}
                                >
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            )}
                            {!isAuthenticated && !isLoading && (
                                <Button className="w-full mt-4" asChild>
                                    <Link href="/login">Sign In</Link>
                                </Button>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
