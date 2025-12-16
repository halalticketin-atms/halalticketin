'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Building2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import api from '@/lib/api';
import { buildDashboardPath } from '@/lib/organizer-path';

export default function DashboardLandingPage() {
    const router = useRouter();
    const { user, isLoading: authLoading, isOrganizer } = useAuth();
    const {
        organizers,
        isLoading: organizersLoading,
        activeOrganizerId,
        setActiveOrganizerId,
        refresh,
        error: organizerError,
    } = useOrganizers();

    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (!organizersLoading && activeOrganizerId) {
            setRedirecting(true);
            router.replace(buildDashboardPath(activeOrganizerId));
        }
    }, [activeOrganizerId, organizersLoading, router]);

    const handleCreateOrganizer = async () => {
        if (!name.trim()) {
            setError('Please enter an organizer name');
            return;
        }

        try {
            setCreating(true);
            setError(null);
            const response = await api.post<{
                organizer: { id: string };
            }>('/api/v1/organizers', { name: name.trim() });
            setName('');
            setActiveOrganizerId(response.organizer.id);
            router.replace(buildDashboardPath(response.organizer.id));
            await refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to create organizer';
            setError(message);
        } finally {
            setCreating(false);
        }
    };

    const organizerCards = useMemo(
        () =>
            organizers.map((organizer) => (
                <Card key={organizer.id} className="border border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {organizer.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground capitalize">{organizer.role}</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Status: <span className="capitalize">{organizer.status}</span>
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => router.push(buildDashboardPath(organizer.id))}
                        >
                            Continue
                        </Button>
                    </CardContent>
                </Card>
            )),
        [organizers, router]
    );

    if (!user && !authLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            Sign in to manage organizers, events, and team members.
                        </p>
                        <Button asChild className="w-full">
                            <a href="/login">Go to login</a>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (organizersLoading || redirecting) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    // If user is not an organizer, redirect them to browse events
    if (!isOrganizer) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Browse Events</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            The organizer dashboard is for event creators. You can browse and purchase tickets for amazing halal-friendly events!
                        </p>
                        <div className="space-y-2">
                            <Button asChild className="w-full">
                                <a href="/events">Browse Events</a>
                            </Button>
                            <Button asChild variant="outline" className="w-full">
                                <a href="/profile">View My Profile</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <div className="container pt-32 pb-12 space-y-10">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center space-y-3"
                >
                    <p className="text-sm font-semibold text-primary uppercase tracking-widest">
                        Organizer dashboard
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">
                        Choose an organizer to continue
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Switch between organizer accounts or create a new one to start hosting events.
                    </p>
                </motion.div>

                {organizersLoading && (
                    <div className="flex items-center justify-center">
                        <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    </div>
                )}

                {organizerError && (
                    <p className="text-center text-sm text-destructive">{organizerError}</p>
                )}

                {!organizersLoading && organizers.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {organizerCards}
                    </div>
                )}

                {!organizersLoading && organizers.length === 0 && (
                    <Card className="max-w-2xl mx-auto border-dashed border-2 border-primary/40">
                        <CardContent className="py-10 text-center space-y-4">
                            <Users className="h-12 w-12 text-primary mx-auto" />
                            <div className="space-y-2">
                                <h2 className="text-xl font-semibold">Create your first organizer</h2>
                                <p className="text-muted-foreground">
                                    Set up an organizer profile to start publishing halal-friendly events.
                                </p>
                            </div>
                            <div className="space-y-3 max-w-md mx-auto">
                                <Input
                                    placeholder="Organizer name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    disabled={creating}
                                />
                                {error && <p className="text-sm text-destructive">{error}</p>}
                                <Button onClick={handleCreateOrganizer} disabled={creating} className="w-full">
                                    {creating ? 'Creating...' : 'Create organizer'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
