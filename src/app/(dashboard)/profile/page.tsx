'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
    Settings,
    Calendar,
    Ticket,
    Heart,
    MapPin,
    Star,
    ChevronRight,
    Edit3,
    Share2,
    Bell,
    Shield,
    CreditCard,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Placeholder user data
const userData = {
    name: 'Amina Hassan',
    email: 'amina.hassan@email.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    location: 'London, UK',
    joinedDate: 'Member since March 2024',
    bio: 'Community organizer passionate about bringing people together through meaningful events.',
    stats: {
        eventsAttended: 23,
        eventsOrganized: 5,
        following: 48,
    },
    badges: [
        { name: 'Early Adopter', icon: Star, color: 'text-yellow-500' },
        { name: 'Verified', icon: Shield, color: 'text-primary' },
    ],
};

const upcomingEvents = [
    {
        id: '1',
        title: 'Community Iftar 2024',
        date: 'Dec 15, 2024',
        image: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=300&h=200&fit=crop',
    },
    {
        id: '2',
        title: 'Islamic Finance Workshop',
        date: 'Jan 10, 2025',
        image: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=300&h=200&fit=crop',
    },
];

const pastEvents = [
    {
        id: '3',
        title: 'Youth Conference 2024',
        date: 'Nov 1, 2024',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=300&h=200&fit=crop',
    },
    {
        id: '4',
        title: 'Charity Fundraiser',
        date: 'Oct 15, 2024',
        image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&h=200&fit=crop',
    },
];

const menuItems = [
    { icon: Bell, label: 'Notifications', href: '/settings', badge: '3' },
    { icon: CreditCard, label: 'Payment Methods', href: '/settings' },
    { icon: Shield, label: 'Privacy & Security', href: '/settings' },
    { icon: Settings, label: 'Account Settings', href: '/settings' },
];

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState('upcoming');

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
                                    <AvatarImage src={userData.avatar} alt={userData.name} />
                                    <AvatarFallback className="text-3xl">{userData.name.charAt(0)}</AvatarFallback>
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
                                <h1 className="font-display text-2xl font-bold sm:text-3xl">{userData.name}</h1>
                                {userData.badges.map((badge) => (
                                    <Badge key={badge.name} variant="secondary" className="gap-1">
                                        <badge.icon className={`h-3 w-3 ${badge.color}`} />
                                        {badge.name}
                                    </Badge>
                                ))}
                            </div>
                            <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground sm:justify-start">
                                <MapPin className="h-4 w-4" />
                                <span>{userData.location}</span>
                                <span>•</span>
                                <span>{userData.joinedDate}</span>
                            </div>
                            <p className="mt-3 max-w-md text-center text-muted-foreground sm:text-left">
                                {userData.bio}
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
                        {[
                            { label: 'Events Attended', value: userData.stats.eventsAttended, icon: Ticket },
                            { label: 'Organized', value: userData.stats.eventsOrganized, icon: Calendar },
                            { label: 'Following', value: userData.stats.following, icon: Heart },
                        ].map((stat, index) => (
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
                                                            <Image
                                                                src={event.image}
                                                                alt={event.title}
                                                                fill
                                                                className="object-cover transition-transform group-hover:scale-105"
                                                            />
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
                                {pastEvents.map((event, index) => (
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
                                                        <Image
                                                            src={event.image}
                                                            alt={event.title}
                                                            fill
                                                            className="object-cover transition-transform group-hover:scale-105"
                                                        />
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
                                ))}
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
                                    {menuItems.map((item, index) => (
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
                            <Button
                                variant="ghost"
                                className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
