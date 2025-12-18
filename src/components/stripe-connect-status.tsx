'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, CreditCard, Loader2, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

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
}

interface ConnectLinkResponse {
    connectUrl: string;
}

// Check if we're in dev mode
const isDevMode = () => {
    if (typeof window === 'undefined') return false;
    return process.env.NODE_ENV === 'development' ||
        process.env.NEXT_PUBLIC_DEV_MODE === 'true' ||
        window.location.hostname === 'localhost';
};

export function StripeConnectStatus({ organizerId }: StripeConnectStatusProps) {
    const [status, setStatus] = useState<StripeStatusResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devModeSkipped, setDevModeSkipped] = useState(false);

    const fetchStatus = useCallback(async () => {
        // If dev mode skipped, return simulated completed status
        if (devModeSkipped) {
            setStatus({
                hasStripeAccount: true,
                accountId: 'acct_dev_simulated',
                onboardingStatus: 'completed',
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true
            });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await api.get<StripeStatusResponse>(
                `/api/v1/organizers/${organizerId}/stripe/status`
            );
            setStatus(response);
        } catch (err) {
            // In dev mode, allow continuing even if API fails
            if (isDevMode()) {
                setStatus({
                    hasStripeAccount: false,
                    onboardingStatus: 'pending'
                });
                setError(null);
            } else {
                setError(err instanceof Error ? err.message : 'Failed to load Stripe status');
            }
        } finally {
            setLoading(false);
        }
    }, [organizerId, devModeSkipped]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            setError(null);
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

    const handleDevSkip = async () => {
        try {
            // Call backend to create simulated Stripe account in database
            await api.post(`/api/v1/organizers/${organizerId}/stripe/dev-bypass`);

            // Update local state to show completed
            setDevModeSkipped(true);
            setStatus({
                hasStripeAccount: true,
                accountId: 'acct_dev_simulated',
                onboardingStatus: 'completed',
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true
            });
            setError(null);
        } catch {
            // Fallback to local-only simulation if backend fails
            setDevModeSkipped(true);
            setStatus({
                hasStripeAccount: true,
                accountId: 'acct_dev_simulated',
                onboardingStatus: 'completed',
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true
            });
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
    const showDevMode = isDevMode();

    return (
        <Card className={isComplete ? 'border-green-200 dark:border-green-800' : ''}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        <CardTitle>Payment Setup</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {devModeSkipped && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                <Bug className="h-3 w-3 mr-1" />
                                Dev Mode
                            </Badge>
                        )}
                        {isComplete && (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                {devModeSkipped ? 'Simulated' : 'Connected'}
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
                <CardDescription>
                    {devModeSkipped
                        ? 'Development mode: Stripe Connect simulated as complete. Paid event publishing is enabled for testing.'
                        : isComplete
                            ? 'Your Stripe account is connected. You can receive payments for your events.'
                            : isInProgress
                                ? 'Please complete your Stripe account setup to receive payments.'
                                : 'Connect your Stripe account to accept payments for paid events.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Dev Mode Banner */}
                {showDevMode && !devModeSkipped && !isComplete && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Bug className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                    Development Testing Mode
                                </p>
                                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                    Skip Stripe setup to test paid event flows without creating a real account.
                                    This simulates a completed Stripe Connect account.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDevSkip}
                                    className="mt-3 border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
                                >
                                    <Bug className="h-3 w-3 mr-1" />
                                    Skip for Development Testing
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                        {error}
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
                    {isPending && !devModeSkipped && (
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

                    {isComplete && !devModeSkipped && (
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

                    {devModeSkipped && (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDevModeSkipped(false);
                                fetchStatus();
                            }}
                        >
                            Exit Dev Mode
                        </Button>
                    )}

                    <Button variant="ghost" onClick={fetchStatus} disabled={loading}>
                        Refresh Status
                    </Button>
                </div>

                {isPending && !devModeSkipped && !showDevMode && (
                    <p className="text-xs text-muted-foreground">
                        You&apos;ll need to complete Stripe verification to publish paid events.
                        Free events can be published without Stripe.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
