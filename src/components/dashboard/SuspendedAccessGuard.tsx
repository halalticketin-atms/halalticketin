'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Building2, AlertTriangle, Plus, UserX } from 'lucide-react';
import { useOrganizers } from '@/context/organizer-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { buildDashboardPath } from '@/lib/organizer-path';

// Lazy load the dialog
const CreateOrganizerDialog = dynamic(
    () => import('@/components/auth/CreateOrganizerDialog').then(m => ({ default: m.CreateOrganizerDialog })),
    { ssr: false }
);

interface SuspendedAccessGuardProps {
    children: React.ReactNode;
}

export function SuspendedAccessGuard({ children }: SuspendedAccessGuardProps) {
    const params = useParams<{ organizerId: string }>();
    const router = useRouter();
    const { organizers, isLoading, setActiveOrganizerId, refresh } = useOrganizers();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const currentOrganizer = organizers.find((org) => org.id === params.organizerId);
    const isSuspended = currentOrganizer?.status === 'suspended';
    const isRemoved = currentOrganizer?.status === 'removed';
    const isBlocked = isSuspended || isRemoved;

    const handleOrgCreated = async (organizerId: string) => {
        setActiveOrganizerId(organizerId);
        await refresh();
        router.push(buildDashboardPath(organizerId));
    };

    // If still loading, show nothing to prevent flash
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            </div>
        );
    }

    // If no organizer found for this ID, redirect to dashboard selector
    if (!currentOrganizer && !isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="max-w-md w-full mx-4">
                    <CardHeader className="text-center">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                        <CardTitle>Organization Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">
                            You don&apos;t have access to this organization.
                        </p>
                        <Button onClick={() => router.push('/dashboard')} className="w-full">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // If suspended or removed, show blocked message
    if (isBlocked) {
        return (
            <>
                <div className="flex items-center justify-center min-h-[60vh] px-4">
                    <Card className={`max-w-lg w-full ${isRemoved ? 'border-red-200 dark:border-red-900/50' : 'border-amber-200 dark:border-amber-900/50'}`}>
                        <CardHeader className="text-center pb-2">
                            <div className={`mx-auto mb-4 p-4 rounded-full w-fit ${isRemoved ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                {isRemoved ? (
                                    <UserX className="h-8 w-8 text-red-600 dark:text-red-400" />
                                ) : (
                                    <Building2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                )}
                            </div>
                            <CardTitle className="text-xl">
                                {isRemoved ? 'Removed from Team' : 'Access Suspended'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-6">
                            <div className="space-y-2">
                                <p className="text-muted-foreground">
                                    {isRemoved ? (
                                        <>You have been removed from <span className="font-semibold text-foreground">{currentOrganizer.name}</span>.</>
                                    ) : (
                                        <>Your access to <span className="font-semibold text-foreground">{currentOrganizer.name}</span> has been suspended.</>
                                    )}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {isRemoved
                                        ? 'If you believe this was a mistake, please contact the team owner.'
                                        : 'Please contact the team owner for assistance or to restore your access.'
                                    }
                                </p>
                            </div>

                            <div className="border-t pt-6 space-y-3">
                                <p className="text-sm font-medium">Want to start your own organization?</p>
                                <Button
                                    onClick={() => setShowCreateDialog(true)}
                                    variant="outline"
                                    className="w-full gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Your Own Organization
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CreateOrganizerDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onSuccess={handleOrgCreated}
                />
            </>
        );
    }

    // Access granted - render children
    return <>{children}</>;
}
