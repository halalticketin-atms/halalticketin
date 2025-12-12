'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MailCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { useOrganizers } from '@/context/organizer-context';
import { acceptInvitationToken } from '@/lib/organizers-api';
import { buildDashboardPath } from '@/lib/organizer-path';

function AcceptInvitationContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, isLoading, refresh } = useAuth();
    const { refresh: refreshOrganizers, setActiveOrganizerId } = useOrganizers();
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    const nextLoginUrl = useMemo(() => {
        if (!token) return '/login';
        const destination = `/invitations/accept?token=${encodeURIComponent(token)}`;
        return `/login?next=${encodeURIComponent(destination)}`;
    }, [token]);

    useEffect(() => {
        if (!token || !user || status === 'processing' || status === 'success') {
            return;
        }

        const accept = async () => {
            try {
                setStatus('processing');
                setMessage(null);
                const response = await acceptInvitationToken(token);
                await refresh();
                await refreshOrganizers();
                setActiveOrganizerId(response.membership.organizerId, { persist: true });
                setStatus('success');
                setMessage('Invitation accepted! Redirecting you to the dashboard...');
                setTimeout(() => {
                    router.push(buildDashboardPath(response.membership.organizerId));
                }, 1200);
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Unable to accept invitation.');
            }
        };

        void accept();
    }, [token, user, status, refresh, refreshOrganizers, setActiveOrganizerId, router]);

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-display">Team Invitation</CardTitle>
                    <p className="text-sm text-muted-foreground">Join organiser workspaces in one click.</p>
                </CardHeader>
                <CardContent className="space-y-6 py-6">
                    {!token ? (
                        <div className="space-y-3 text-center">
                            <ShieldAlert className="h-9 w-9 text-destructive mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                This link is missing an invitation token. Please use the original link from your email.
                            </p>
                        </div>
                    ) : !user && !isLoading ? (
                        <div className="space-y-4 text-center">
                            <ShieldAlert className="h-9 w-9 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                You need to sign in with the email that was invited before accepting.
                            </p>
                            <Button asChild className="w-full">
                                <Link href={nextLoginUrl}>Sign in to continue</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 text-center">
                            <div className="flex justify-center">
                                {status === 'success' ? (
                                    <MailCheck className="h-10 w-10 text-primary" />
                                ) : status === 'error' ? (
                                    <ShieldAlert className="h-10 w-10 text-destructive" />
                                ) : (
                                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                )}
                            </div>
                            <div>
                                <p className="text-lg font-semibold">
                                    {status === 'success'
                                        ? 'All set!'
                                        : status === 'error'
                                            ? 'Something went wrong'
                                            : 'Confirming your invitation'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {message ??
                                        (status === 'processing'
                                            ? 'This only takes a moment.'
                                            : 'Accepting this invite will grant you access to the organiser dashboard.')}
                                </p>
                            </div>

                            {status === 'error' && (
                                <div className="space-y-2">
                                    <Button variant="outline" asChild className="w-full">
                                        <Link href="/dashboard">Go to dashboard</Link>
                                    </Button>
                                    <Button variant="secondary" onClick={() => setStatus('idle')} className="w-full">
                                        Try again
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function AcceptInvitationFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export default function AcceptInvitationPage() {
    return (
        <Suspense fallback={<AcceptInvitationFallback />}>
            <AcceptInvitationContent />
        </Suspense>
    );
}

