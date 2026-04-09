'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, ExternalLink, CreditCard, Loader2, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api, { ApiError } from '@/lib/api';
import {
    clearStripeConnectCallbackParams,
    readStripeConnectCallbackBanner,
    type StripeConnectCallbackBanner,
} from '@/lib/stripe-connect-callback';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface StripeConnectStatusProps {
    organizerId: string;
}

interface StripeStatusResponse {
    hasStripeAccount: boolean;
    accountId?: string;
    onboardingStatus: 'pending' | 'in_progress' | 'completed';
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    detailsSubmitted?: boolean;
    disconnectBlocked?: boolean;
    blockingEvents?: BlockingEvent[];
}

interface ConnectLinkResponse {
    connectUrl: string;
}

type BlockingEvent = {
    id: string;
    title: string;
};

export function StripeConnectStatus({ organizerId }: StripeConnectStatusProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<StripeStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [blockDialogEvents, setBlockDialogEvents] = useState<BlockingEvent[]>([]);
    const [callbackBanner, setCallbackBanner] = useState<StripeConnectCallbackBanner | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get<StripeStatusResponse>(
                `/api/v1/organizers/${organizerId}/stripe/status`
            );
            setStatus(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load Stripe status');
        } finally {
            setLoading(false);
        }
    }, [organizerId]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        const nextBanner = readStripeConnectCallbackBanner(searchParams, organizerId);
        if (!nextBanner) {
            return;
        }

        setCallbackBanner(nextBanner);

        const nextParams = clearStripeConnectCallbackParams(searchParams);
        const nextQuery = nextParams.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        router.replace(nextUrl, { scroll: false });
    }, [organizerId, pathname, router, searchParams]);

    useEffect(() => {
        setCallbackBanner((current) =>
            current?.organizerId === organizerId ? current : null
        );
    }, [organizerId]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setError(null);
            setCallbackBanner(null);
            const response = await api.post<ConnectLinkResponse>(
                `/api/v1/organizers/${organizerId}/stripe/connect-link`
            );
            // Redirect to Stripe onboarding
            window.location.href = response.connectUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start Stripe setup');
            setConnecting(false);
        }
    };

    const handleDisconnect = () => {
        if (disconnectBlocked) {
            setBlockDialogEvents(blockingEvents);
            setBlockDialogOpen(true);
            return;
        }

        setConfirmDisconnectOpen(true);
    };

    const handleConfirmDisconnect = async () => {
        try {
            setConfirmDisconnectOpen(false);
            setDisconnecting(true);
            setError(null);
            setCallbackBanner(null);
            await api.post(`/api/v1/organizers/${organizerId}/stripe/disconnect`);
            await fetchStatus();
        } catch (err) {
            if (err instanceof ApiError) {
                const payload = err.payload as { error?: { details?: { events?: BlockingEvent[] } } } | null;
                const blockingEvents = payload?.error?.details?.events;
                if (Array.isArray(blockingEvents) && blockingEvents.length > 0) {
                    setBlockDialogEvents(blockingEvents);
                    setBlockDialogOpen(true);
                    setError(null);
                } else {
                    setError(err.message);
                }
            } else {
                setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe');
            }
        } finally {
            setDisconnecting(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    const isComplete = status?.onboardingStatus === 'completed';
    const isInProgress = status?.onboardingStatus === 'in_progress';
    const isPending = !status?.hasStripeAccount || status?.onboardingStatus === 'pending';
    const blockingEvents = status?.blockingEvents ?? [];
    const disconnectBlocked = Boolean(status?.disconnectBlocked && blockingEvents.length > 0);
    const showConnectedBanner = Boolean(
        !error &&
        callbackBanner?.organizerId === organizerId &&
        callbackBanner.type === 'connected' &&
        status?.hasStripeAccount
    );
    const showErrorBanner = Boolean(
        !error &&
        callbackBanner?.organizerId === organizerId &&
        callbackBanner.type === 'error'
    );

    return (
        <>
            <Card className={isComplete ? 'border-green-200 dark:border-green-800' : ''}>
                <CardHeader className="bg-(--brand-cyan)/5 border-b border-border/40 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-foreground" />
                            <CardTitle className="text-base font-medium">Payment Setup</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {isComplete && (
                                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Connected
                                </Badge>
                            )}
                            {isInProgress && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Incomplete
                                </Badge>
                            )}
                            {isPending && (
                                <Badge variant="outline">
                                    Not Connected
                                </Badge>
                            )}
                        </div>
                    </div>
                    <CardDescription className="text-xs">
                        {isComplete
                            ? 'Your Stripe account is connected. You can receive payments for your events.'
                            : isInProgress
                                ? 'Please complete your Stripe account setup to receive payments.'
                                : 'Connect your Stripe account to accept payments for paid events.'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    {showConnectedBanner && (
                        <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">
                            Stripe account connected successfully.
                        </div>
                    )}

                    {showErrorBanner && (
                        <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                            {callbackBanner?.message || 'Unable to connect Stripe account.'}
                        </div>
                    )}

                    {isComplete && status && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${status.chargesEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-muted-foreground">
                                    {status.chargesEnabled ? 'Charges enabled' : 'Charges pending'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className={`w-2 h-2 rounded-full ${status.payoutsEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-muted-foreground">
                                    {status.payoutsEnabled ? 'Payouts enabled' : 'Payouts pending'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                        {isPending && (
                            <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                                {connecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CreditCard className="h-4 w-4" />
                                )}
                                {connecting ? 'Connecting...' : 'Connect Stripe Account'}
                            </Button>
                        )}

                        {isInProgress && (
                            <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                                {connecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                {connecting ? 'Loading...' : 'Complete Setup'}
                            </Button>
                        )}

                        {isComplete && (
                            <Button
                                variant="outline"
                                asChild
                                className="gap-2"
                            >
                                <a
                                    href="https://dashboard.stripe.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Open Stripe Dashboard
                                </a>
                            </Button>
                        )}

                        {status?.hasStripeAccount && (
                            <Button
                                variant="destructive"
                                onClick={handleDisconnect}
                                disabled={disconnecting || connecting || loading}
                                className="gap-2"
                            >
                                {disconnecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Link2Off className="h-4 w-4" />
                                )}
                                {disconnecting ? 'Disconnecting...' : 'Disconnect Stripe'}
                            </Button>
                        )}

                        <Button variant="ghost" onClick={fetchStatus} disabled={loading}>
                            Refresh Status
                        </Button>
                    </div>

                    {isPending && (
                        <p className="text-xs text-muted-foreground">
                            You&apos;ll need to complete Stripe verification to publish paid events.
                            Free events can be published without Stripe.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Unable to disconnect Stripe</DialogTitle>
                        <DialogDescription>
                            Active paid events need to be resolved before you can disconnect Stripe.
                        </DialogDescription>
                    </DialogHeader>
                    {blockDialogEvents.length > 0 && (
                        <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                            <p className="font-medium text-amber-900 dark:text-amber-100">Active paid events:</p>
                            <ul className="mt-2 space-y-1 text-amber-900/80 dark:text-amber-100/80">
                                {blockDialogEvents.slice(0, 5).map((event) => (
                                    <li key={event.id} className="truncate">
                                        {event.title}
                                    </li>
                                ))}
                                {blockDialogEvents.length > 5 && (
                                    <li>+ {blockDialogEvents.length - 5} more</li>
                                )}
                            </ul>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setBlockDialogOpen(false)}>Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmDisconnectOpen} onOpenChange={setConfirmDisconnectOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Disconnect Stripe?</DialogTitle>
                        <DialogDescription>
                            Disconnecting will disable paid events until you reconnect Stripe.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDisconnectOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDisconnect} disabled={disconnecting}>
                            {disconnecting ? 'Disconnecting...' : 'Disconnect Stripe'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
