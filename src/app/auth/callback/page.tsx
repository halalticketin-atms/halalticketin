'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { setAuthToken } from '@/lib/api';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Exchange code for session
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    router.push('/login?error=auth_failed');
                    return;
                }

                if (session?.access_token) {
                    // Store the access token
                    setAuthToken(session.access_token);

                    // Get the redirect path
                    const next = searchParams.get('next') || '/dashboard';
                    router.push(next);
                } else {
                    // No session, redirect to login
                    router.push('/login');
                }
            } catch (err) {
                console.error('Callback processing error:', err);
                router.push('/login?error=callback_failed');
            }
        };

        handleCallback();
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center gradient-mesh">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[var(--brand-mint)] to-[var(--brand-cyan)] flex items-center justify-center shadow-lg shadow-[var(--brand-cyan)]/20">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                    </div>
                    <motion.div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand-mint)] to-[var(--brand-cyan)]"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
                <div className="text-center">
                    <h2 className="font-display text-xl font-semibold text-foreground">Signing you in...</h2>
                    <p className="mt-2 text-muted-foreground">Please wait while we complete the authentication</p>
                </div>
            </motion.div>
        </div>
    );
}

function CallbackFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center gradient-mesh">
            <Loader2 className="h-10 w-10 animate-spin text-[var(--brand-cyan)]" />
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<CallbackFallback />}>
            <CallbackContent />
        </Suspense>
    );
}
