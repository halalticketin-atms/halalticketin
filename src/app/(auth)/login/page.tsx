'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase';
import api, { setAuthToken, setRefreshToken } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { toast } from '@/lib/notifications';

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
};

const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

function LoginContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isLoading: authLoading, refresh, isOrganizer } = useAuth();
    const nextParam = searchParams.get('next');
    const fallbackRedirect = isOrganizer ? '/dashboard' : '/events';
    const safeNextParam = nextParam && nextParam.startsWith('/') ? nextParam : null;
    const redirectPath = safeNextParam ?? fallbackRedirect;
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimateEntry = !isMobile && !prefersReducedMotion;
    const entryMotionProps = shouldAnimateEntry
        ? {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
        }
        : { initial: { opacity: 1, y: 0 } }; // Visible immediately on mobile
    const staggerContainerProps = shouldAnimateEntry
        ? { variants: staggerContainer, initial: 'hidden', animate: 'show' }
        : { initial: { opacity: 1 }, animate: { opacity: 1 } }; // Skip stagger on mobile
    const staggerItemProps = shouldAnimateEntry
        ? { variants: staggerItem }
        : { initial: { opacity: 1, y: 0 } }; // Visible immediately on mobile
    const footerMotionProps = shouldAnimateEntry
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.8 } }
        : { initial: { opacity: 1 } }; // Visible immediately on mobile

    // Detect mobile for animation optimization
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Disable wave animation on mobile or when user prefers reduced motion
    const shouldAnimateWave = !isMobile && !prefersReducedMotion;

    // If already logged in, redirect to intended destination
    useEffect(() => {
        if (!authLoading && user) {
            router.push(redirectPath);
            router.refresh();
        }
    }, [user, authLoading, router, redirectPath]);

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
                <div className="h-12 w-12 rounded-full border-4 border-[var(--brand-cyan)] border-t-transparent animate-spin" />
            </div>
        );
    }

    // If already logged in, show loading while redirecting
    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
                <div className="h-12 w-12 rounded-full border-4 border-[var(--brand-cyan)] border-t-transparent animate-spin" />
            </div>
        );
    }


    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post<LoginResponse>('/api/v1/auth/login', {
                email,
                password,
            });

            setAuthToken(response.accessToken);
            setRefreshToken(response.refreshToken);
            await refresh();

            // Show success toast
            toast.success('Salaam 👋', {
                description: `Signed in as ${email}`,
                duration: 3000,
            });
        } catch (err) {
            console.error(err);
            toast.error(err, 'Unable to sign in');
            setError(err instanceof Error ? err.message : 'Unable to sign in.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await getSupabase().auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback${safeNextParam ? `?next=${encodeURIComponent(safeNextParam)}` : ''}`,
                },
            });

            if (error) {
                throw error;
            }

            toast.info('Redirecting to Google...');
        } catch (err) {
            console.error(err);
            toast.error(err, 'Unable to sign in with Google');
            setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
            {/* Ambient background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-300/10 via-transparent to-teal-300/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                {...entryMotionProps}
                className="w-full max-w-md relative z-10"
            >
                {/* Premium Glass Card */}
                <div className="relative">
                    {/* Glow effect behind card */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-70 hidden md:block" />

                    <div className="relative bg-white/95 md:bg-white/80 dark:bg-slate-900/80 md:backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 overflow-hidden">
                        {/* Top gradient accent */}
                        <div className="h-1.5 bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-teal)] to-emerald-500" />

                        <div className="p-8 sm:p-10">
                            <motion.div
                                {...staggerContainerProps}
                                className="space-y-8"
                            >
                                {/* Header */}
                                <motion.div {...staggerItemProps} className="text-center space-y-2">
                                    <h1 className="text-3xl font-display font-bold">
                                        <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Salaam </span>
                                        {shouldAnimateWave ? (
                                            <motion.span
                                                className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent"
                                                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                            >
                                                👋
                                            </motion.span>
                                        ) : (
                                            <span className="inline-block bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] bg-clip-text text-transparent">👋</span>
                                        )}
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Sign in to continue to your account
                                    </p>
                                </motion.div>

                                {/* Form */}
                                <motion.form
                                    {...staggerItemProps}
                                    onSubmit={handleEmailLogin}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            maxLength={254}
                                            className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all rounded-xl"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                                Password
                                            </Label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-sm text-[var(--brand-cyan)] hover:text-[var(--brand-teal)] transition-colors font-medium"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Enter your password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                minLength={8}
                                                maxLength={128}
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all rounded-xl pr-12"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 font-semibold text-lg bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 rounded-xl"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            'Sign In'
                                        )}
                                    </Button>
                                </motion.form>

                                {/* Divider */}
                                <motion.div {...staggerItemProps} className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
                                    <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                                        or
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
                                </motion.div>

                                {/* Google Login */}
                                <motion.div {...staggerItemProps}>
                                    <Button
                                        variant="outline"
                                        onClick={handleGoogleLogin}
                                        disabled={isLoading}
                                        className="w-full h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 rounded-xl"
                                    >
                                        <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                                            <path
                                                fill="#4285F4"
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            />
                                            <path
                                                fill="#34A853"
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            />
                                            <path
                                                fill="#FBBC05"
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            />
                                            <path
                                                fill="#EA4335"
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            />
                                        </svg>
                                        Continue with Google
                                    </Button>
                                </motion.div>

                                {/* Sign up link */}
                                <motion.div {...staggerItemProps} className="text-center">
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Don&apos;t have an account?{' '}
                                        <Link
                                            href="/register"
                                            className="font-semibold text-[var(--brand-cyan)] hover:text-[var(--brand-teal)] transition-colors"
                                        >
                                            Sign up
                                        </Link>
                                    </p>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <motion.div
                    {...footerMotionProps}
                    className="mt-8 text-center text-sm text-slate-500"
                >
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-[var(--brand-cyan)] hover:text-[var(--brand-teal)] transition-colors font-medium">
                        Terms
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-[var(--brand-cyan)] hover:text-[var(--brand-teal)] transition-colors font-medium">
                        Privacy Policy
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

function LoginFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
            <div className="h-12 w-12 rounded-full border-4 border-[var(--brand-cyan)] border-t-transparent animate-spin" />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<LoginFallback />}>
            <LoginContent />
        </Suspense>
    );
}
