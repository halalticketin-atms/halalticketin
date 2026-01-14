'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getPasswordValidationError, PASSWORD_REQUIREMENTS_TEXT } from '@/lib/password';

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

function ResetPasswordContent() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimateEntry = !isMobile && !prefersReducedMotion;

    const entryMotionProps = shouldAnimateEntry
        ? {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
        }
        : { initial: { opacity: 1, y: 0 } };

    const staggerContainerProps = shouldAnimateEntry
        ? { variants: staggerContainer, initial: 'hidden', animate: 'show' }
        : { initial: { opacity: 1 }, animate: { opacity: 1 } };

    const staggerItemProps = shouldAnimateEntry
        ? { variants: staggerItem }
        : { initial: { opacity: 1, y: 0 } };

    const footerMotionProps = shouldAnimateEntry
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.8 } }
        : { initial: { opacity: 1 } };

    // Detect mobile for animation optimization
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Check for valid recovery session from the URL hash
    useEffect(() => {
        const checkSession = async () => {
            const supabase = getSupabase();

            // Listen for auth state changes (Supabase will auto-handle the recovery token)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setIsValidSession(true);
                } else if (session) {
                    // User has a valid session (could be from recovery)
                    setIsValidSession(true);
                }
            });

            // Also check current session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsValidSession(true);
            } else {
                // Give a moment for the recovery event to trigger
                setTimeout(() => {
                    setIsValidSession(prev => prev === null ? false : prev);
                }, 1500);
            }

            return () => subscription.unsubscribe();
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const passwordError = getPasswordValidationError(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await getSupabase().auth.updateUser({
                password: password,
            });

            if (error) {
                throw error;
            }

            setIsSuccess(true);

            // Sign out after password reset and redirect to login
            await getSupabase().auth.signOut();

            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state while checking session
    if (isValidSession === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
                <div className="h-12 w-12 rounded-full border-4 border-(--brand-cyan) border-t-transparent animate-spin" />
            </div>
        );
    }

    // Invalid/expired session
    if (isValidSession === false) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-linear-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
                <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                    <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-linear-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-linear-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-3xl" />
                </div>

                <motion.div
                    {...entryMotionProps}
                    className="w-full max-w-md relative z-10"
                >
                    <div className="relative">
                        <div className="absolute -inset-1 bg-linear-to-r from-cyan-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-70 hidden md:block" />

                        <div className="relative bg-white/95 md:bg-white/80 dark:bg-slate-900/80 md:backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 overflow-hidden">
                            <div className="h-1.5 bg-linear-to-r from-rose-500 via-orange-500 to-amber-500" />

                            <div className="p-8 sm:p-10 text-center space-y-6">
                                <div className="h-16 w-16 mx-auto rounded-full bg-linear-to-br from-rose-400 to-orange-500 flex items-center justify-center">
                                    <Lock className="h-8 w-8 text-white" />
                                </div>

                                <div className="space-y-2">
                                    <h1 className="text-2xl font-display font-bold text-slate-800 dark:text-white">
                                        Invalid or Expired Link
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        This password reset link is invalid or has expired. Please request a new one.
                                    </p>
                                </div>

                                <Link href="/forgot-password">
                                    <Button className="w-full h-12 font-semibold text-lg bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 rounded-xl">
                                        Request New Link
                                    </Button>
                                </Link>

                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-(--brand-cyan) transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to login
                                </Link>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-linear-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
            {/* Ambient background glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
                <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-linear-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-linear-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-linear-to-br from-cyan-300/10 via-transparent to-teal-300/10 rounded-full blur-3xl" />
            </div>

            <motion.div
                {...entryMotionProps}
                className="w-full max-w-md relative z-10"
            >
                {/* Premium Glass Card */}
                <div className="relative">
                    {/* Glow effect behind card */}
                    <div className="absolute -inset-1 bg-linear-to-r from-cyan-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-70 hidden md:block" />

                    <div className="relative bg-white/95 md:bg-white/80 dark:bg-slate-900/80 md:backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 dark:border-slate-700/50 overflow-hidden">
                        {/* Top gradient accent */}
                        <div className="h-1.5 bg-linear-to-r from-(--brand-cyan) via-(--brand-teal) to-emerald-500" />

                        <div className="p-8 sm:p-10">
                            <motion.div
                                {...staggerContainerProps}
                                className="space-y-8"
                            >
                                {/* Header */}
                                <motion.div {...staggerItemProps} className="text-center space-y-2">
                                    <h1 className="text-3xl font-display font-bold">
                                        <span className="bg-linear-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                            {isSuccess ? 'Password Reset!' : 'Set New Password'}
                                        </span>
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {isSuccess
                                            ? 'Redirecting you to login...'
                                            : 'Enter your new password below'}
                                    </p>
                                </motion.div>

                                {isSuccess ? (
                                    /* Success state */
                                    <motion.div
                                        {...staggerItemProps}
                                        className="text-center space-y-6"
                                    >
                                        <div className="flex justify-center">
                                            <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                                <CheckCircle className="h-8 w-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-slate-700 dark:text-slate-300">
                                                Your password has been successfully reset.
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                You can now log in with your new password.
                                            </p>
                                        </div>
                                        <Link href="/login">
                                            <Button className="w-full h-12 font-semibold text-lg bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 rounded-xl">
                                                Go to Login
                                            </Button>
                                        </Link>
                                    </motion.div>
                                ) : (
                                    /* Form */
                                    <motion.form
                                        {...staggerItemProps}
                                        onSubmit={handleSubmit}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                                New Password
                                            </Label>
                                            <div className="relative group">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-(--brand-cyan) focus:ring-(--brand-cyan)/20 transition-all rounded-xl pr-12"
                                                    required
                                                    minLength={8}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                {(
                                                    [
                                                        { label: '8+ characters', regex: /.{8,}/ },
                                                        { label: 'Upper & Lowercase', regex: /^(?=.*[a-z])(?=.*[A-Z]).+$/ },
                                                        { label: 'Numbers', regex: /\d/ },
                                                        { label: 'Symbols', regex: /[^A-Za-z0-9\s]/ },
                                                    ]
                                                ).map((req) => {
                                                    const isMet = req.regex.test(password);
                                                    return (
                                                        <div key={req.label} className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "h-4 w-4 rounded-full flex items-center justify-center transition-all duration-300 border",
                                                                isMet
                                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                                    : password
                                                                        ? "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400"
                                                                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300"
                                                            )}>
                                                                <Check className={cn("h-2.5 w-2.5 transition-transform duration-300", isMet ? "scale-100" : "scale-0")} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-[12px] transition-colors duration-300",
                                                                isMet ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500"
                                                            )}>
                                                                {req.label}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                                Confirm Password
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Confirm new password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-(--brand-cyan) focus:ring-(--brand-cyan)/20 transition-all rounded-xl pr-12"
                                                    required
                                                    minLength={8}
                                                    maxLength={128}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                                            className="w-full h-12 font-semibold text-lg bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 rounded-xl"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                'Reset Password'
                                            )}
                                        </Button>
                                    </motion.form>
                                )}
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
                    <Link href="/terms" className="text-(--brand-cyan) hover:text-(--brand-teal) transition-colors font-medium">
                        Terms
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-(--brand-cyan) hover:text-(--brand-teal) transition-colors font-medium">
                        Privacy Policy
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}

function ResetPasswordFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-cyan-50/30 to-teal-50/20">
            <div className="h-12 w-12 rounded-full border-4 border-(--brand-cyan) border-t-transparent animate-spin" />
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordFallback />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
