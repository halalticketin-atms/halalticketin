'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/lib/supabase';

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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                throw error;
            }

            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to send reset email. Please try again.');
        } finally {
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
                                {/* Back link */}
                                <motion.div {...staggerItemProps}>
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-[var(--brand-cyan)] transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to login
                                    </Link>
                                </motion.div>

                                {/* Header */}
                                <motion.div {...staggerItemProps} className="text-center space-y-2">
                                    <h1 className="text-3xl font-display font-bold">
                                        <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                            Reset Password
                                        </span>
                                    </h1>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        {isSuccess
                                            ? 'Check your email for a reset link'
                                            : 'Enter your email to receive a reset link'}
                                    </p>
                                </motion.div>

                                {isSuccess ? (
                                    /* Success state */
                                    <motion.div
                                        {...staggerItemProps}
                                        className="text-center space-y-6"
                                    >
                                        <div className="flex justify-center">
                                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                                                <CheckCircle className="h-8 w-8 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-slate-700 dark:text-slate-300">
                                                We&apos;ve sent a password reset link to:
                                            </p>
                                            <p className="font-semibold text-slate-900 dark:text-white">
                                                {email}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
                                        </p>
                                        <Button
                                            onClick={() => {
                                                setIsSuccess(false);
                                                setEmail('');
                                            }}
                                            variant="outline"
                                            className="w-full h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-200 rounded-xl"
                                        >
                                            Send to a different email
                                        </Button>
                                    </motion.div>
                                ) : (
                                    /* Form */
                                    <motion.form
                                        {...staggerItemProps}
                                        onSubmit={handleSubmit}
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
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all rounded-xl"
                                                required
                                            />
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
                                                'Send Reset Link'
                                            )}
                                        </Button>
                                    </motion.form>
                                )}

                                {/* Sign up link */}
                                <motion.div {...staggerItemProps} className="text-center">
                                    <p className="text-slate-600 dark:text-slate-400">
                                        Remember your password?{' '}
                                        <Link
                                            href="/login"
                                            className="font-semibold text-[var(--brand-cyan)] hover:text-[var(--brand-teal)] transition-colors"
                                        >
                                            Sign in
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
