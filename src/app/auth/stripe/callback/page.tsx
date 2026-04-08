'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import api, { ApiError } from '@/lib/api';

const handledStripeCallbackRequests = new Set<string>();

function StripeConnectCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const requestKey = [code ?? '', state ?? '', error ?? '', errorDescription ?? ''].join(':');

    useEffect(() => {
        if (handledStripeCallbackRequests.has(requestKey)) {
            return;
        }

        handledStripeCallbackRequests.add(requestKey);

        const completeStripeConnect = async () => {
            if (error) {
                const params = new URLSearchParams({ tab: 'payments', stripe: 'error' });
                if (errorDescription) {
                    params.set('stripe_error', errorDescription);
                }
                router.replace(`/settings?${params.toString()}`);
                return;
            }

            if (!code || !state) {
                router.replace('/settings?tab=payments&stripe=error');
                return;
            }

            try {
                const response = await api.post<{
                    organizerId: string;
                }>('/api/v1/organizers/stripe/connect/complete', { code, state });

                const params = new URLSearchParams({
                    tab: 'payments',
                    organizerId: response.organizerId,
                    stripe: 'connected',
                });

                router.replace(`/settings?${params.toString()}`);
            } catch (error) {
                const params = new URLSearchParams({ tab: 'payments', stripe: 'error' });
                if (error instanceof ApiError) {
                    params.set('stripe_error', error.message);
                }
                router.replace(`/settings?${params.toString()}`);
            }
        };

        void completeStripeConnect();
    }, [code, error, errorDescription, requestKey, router, state]);

    return (
        <div className="min-h-screen flex items-center justify-center gradient-mesh">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-cyan)]" />
                <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                        Connecting Stripe...
                    </h2>
                    <p className="mt-2 text-muted-foreground">
                        Please wait while we finish your Stripe connection.
                    </p>
                </div>
            </div>
        </div>
    );
}

function StripeConnectCallbackFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center gradient-mesh">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-cyan)]" />
        </div>
    );
}

export default function StripeConnectCallbackPage() {
    return (
        <Suspense fallback={<StripeConnectCallbackFallback />}>
            <StripeConnectCallbackContent />
        </Suspense>
    );
}
