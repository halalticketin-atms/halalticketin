'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, MailCheck, ShieldAlert } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { acceptTempAccessToken } from '@/lib/check-in-api';
import { buildDashboardPath } from '@/lib/organizer-path';

function TempAccessContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    const destination = useMemo(() => {
        if (!token) return '/check-in/temp-access';
        return `/check-in/temp-access?token=${encodeURIComponent(token)}`;
    }, [token]);

    const loginUrl = useMemo(() => `/login?next=${encodeURIComponent(destination)}`, [destination]);
    const registerUrl = useMemo(() => `/register?next=${encodeURIComponent(destination)}`, [destination]);

    useEffect(() => {
        if (!token || !user || status === 'processing' || status === 'success') {
            return;
        }

        const accept = async () => {
            try {
                setStatus('processing');
                setMessage(null);
                const response = await acceptTempAccessToken(token);
                setStatus('success');
                setMessage('Access confirmed! Redirecting you to check-in...');
                const checkInUrl = `${buildDashboardPath(response.event.organizerId)}/check-in?event=${response.event.id}&mode=scan`;
                setTimeout(() => {
                    router.push(checkInUrl);
                }, 1200);
            } catch (err) {
                console.error(err);
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Unable to accept access.');
            }
        };

        void accept();
    }, [token, user, status, router]);

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-display">Temporary Check-in Access</CardTitle>
                    <p className="text-sm text-muted-foreground">Confirm access to check in attendees.</p>
                </CardHeader>
                <CardContent className="space-y-6 py-6">
                    {!token ? (
                        <div className="space-y-3 text-center">
                            <ShieldAlert className="h-9 w-9 text-destructive mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                This link is missing an access token. Please use the original link from your email.
                            </p>
                        </div>
                    ) : !user && !isLoading ? (
                        <div className="space-y-4 text-center">
                            <ShieldAlert className="h-9 w-9 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">
                                Sign in with the invited email to continue.
                            </p>
                            <div className="space-y-2">
                                <Button asChild className="w-full">
                                    <Link href={loginUrl}>Sign in</Link>
                                </Button>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href={registerUrl}>Create account</Link>
                                </Button>
                            </div>
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
                                            : 'Confirming your access'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {message ??
                                        (status === 'processing'
                                            ? 'This only takes a moment.'
                                            : 'Accepting this access will let you check in attendees.')}
                                </p>
                            </div>

                            {status === 'error' && (
                                <div className="space-y-2">
                                    <Button variant="outline" asChild className="w-full">
                                        <Link href={loginUrl}>Sign in again</Link>
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

function TempAccessFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export default function TempAccessPage() {
    return (
        <Suspense fallback={<TempAccessFallback />}>
            <TempAccessContent />
        </Suspense>
    );
}
