'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'motion/react';
import { Building2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { buildDashboardPath } from '@/lib/organizer-path';

// Lazy load the dialog to reduce initial bundle size
const CreateOrganizerDialog = dynamic(
    () => import('@/components/auth/CreateOrganizerDialog').then(m => ({ default: m.CreateOrganizerDialog })),
    { ssr: false }
);

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

    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (!organizersLoading && activeOrganizerId) {
            setRedirecting(true);
            router.replace(buildDashboardPath(activeOrganizerId));
        }
    }, [activeOrganizerId, organizersLoading, router]);

    const handleStartOrganizerOnboarding = () => {
        router.push('/register?role=organizer&forceOnboarding=1&next=%2Fdashboard');
    };

    const organizerCards = useMemo(
        () =>
            organizers.map((organizer) => {
                const isSuspended = organizer.status === 'suspended';
                const isRemoved = organizer.status === 'removed';
                const isBlocked = isSuspended || isRemoved;

                return (
                    <Card key={organizer.id} className={`border border-border/60 ${isBlocked ? 'opacity-75' : ''}`}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                {organizer.name}
                                {isSuspended && (
                                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                        Suspended
                                    </span>
                                )}
                                {isRemoved && (
                                    <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                        Removed
                                    </span>
                                )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground capitalize">{organizer.role.replace('_', ' ')}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isSuspended ? (
                                <p className="text-sm text-muted-foreground">
                                    Your access has been suspended. Contact the team owner for assistance.
                                </p>
                            ) : isRemoved ? (
                                <p className="text-sm text-muted-foreground">
                                    You have been removed from this team.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Status: <span className="capitalize">{organizer.status}</span>
                                </p>
                            )}
                            <Button
                                className="w-full"
                                onClick={() => router.push(buildDashboardPath(organizer.id))}
                                disabled={isBlocked}
                                variant={isBlocked ? 'outline' : 'default'}
                            >
                                {isSuspended ? 'Access Suspended' : isRemoved ? 'Access Removed' : 'Continue'}
                            </Button>
                        </CardContent>
                    </Card>
                );
            }),
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
                            Sign in to manage organisers, events, and team members.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/login">Go to login</Link>
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

    // If user is not an organizer, show upgrade dialog immediately
    if (!isOrganizer) {
        return (
            <>
                <div className="min-h-screen bg-muted/30" />
                <CreateOrganizerDialog
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) {
                            // If user closes dialog, redirect to login
                            router.replace('/login');
                        }
                    }}
                    onSuccess={async (organizerId: string) => {
                        setActiveOrganizerId(organizerId);
                        await refresh();
                        router.replace(buildDashboardPath(organizerId));
                    }}
                />
            </>
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
                        Organiser dashboard
                    </p>
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">
                        Choose an organiser to continue
                    </h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Switch between organiser accounts or create a new one to start hosting events.
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
                                <h2 className="text-xl font-semibold">Create your first organiser</h2>
                                <p className="text-muted-foreground">
                                    Set up an organiser profile to start publishing halal-friendly events.
                                </p>
                            </div>
                            <div className="space-y-3 max-w-md mx-auto">
                                <Button onClick={handleStartOrganizerOnboarding} className="w-full">
                                    Continue with organiser onboarding
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    We&apos;ll collect your organiser details before creating the dashboard.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
