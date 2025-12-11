'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api, { setAuthToken } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { refresh } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Create the Supabase user through the backend
            await api.post('/api/v1/auth/register', {
                email: formData.email,
                password: formData.password,
                name: formData.name,
            });

            // Automatically log them in to obtain an access token
            const response = await api.post<LoginResponse>('/api/v1/auth/login', {
                email: formData.email,
                password: formData.password,
            });

            setAuthToken(response.accessToken);

            await refresh();

            router.push('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Unable to register. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-background">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Gradient Orbs */}
                <motion.div
                    className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-3xl"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0.7, 0.5],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute bottom-[10%] right-[10%] w-96 h-96 rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_165)]/25 to-transparent blur-3xl"
                    animate={{
                        scale: [1.1, 1, 1.1],
                        opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute top-[50%] right-[20%] w-64 h-64 rounded-full bg-gradient-to-br from-[oklch(0.72_0.15_185)]/20 to-transparent blur-3xl"
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Floating Dots */}
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-primary/40"
                        style={{
                            left: `${15 + i * 15}%`,
                            top: `${20 + (i % 3) * 25}%`,
                        }}
                        animate={{
                            y: [0, -20, 0],
                            opacity: [0.3, 0.7, 0.3],
                        }}
                        transition={{
                            duration: 4 + i,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.5,
                        }}
                    />
                ))}
            </div>

            {/* Form Container */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-md z-10"
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-center mb-8"
                >
                    <Link href="/" className="inline-block">
                        <Image
                            src="/images/HTlogocr.png"
                            alt="HalalTicketin'"
                            width={180}
                            height={50}
                            className="h-12 w-auto mx-auto"
                        />
                    </Link>
                </motion.div>

                {/* Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl shadow-primary/5"
                >
                    {/* Header with Icon */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ duration: 0.6, delay: 0.3, type: 'spring', bounce: 0.5 }}
                            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.65_0.15_180)] text-primary-foreground mb-4 shadow-lg shadow-primary/30"
                        >
                            <Sparkles className="h-7 w-7" />
                        </motion.div>
                        <h1 className="font-display text-2xl font-bold text-foreground">
                            Create your account
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Join our community of event enthusiasts
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.4 }}
                            className="space-y-2"
                        >
                            <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="name"
                                    placeholder="Your full name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="h-12 pl-10 bg-muted/50 border-0 rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/30 transition-all"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="space-y-2"
                        >
                            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="h-12 pl-10 bg-muted/50 border-0 rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/30 transition-all"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                            className="space-y-2"
                        >
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="h-12 pl-10 bg-muted/50 border-0 rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/30 transition-all"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.7 }}
                        >
                            <Button
                                type="submit"
                                className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-primary to-[oklch(0.65_0.15_180)] hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                        className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                                    />
                                ) : (
                                    <>
                                        Get started
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </motion.div>

                        {error && (
                            <p className="text-sm text-destructive text-center">
                                {error}
                            </p>
                        )}
                    </form>

                    {/* Divider */}
                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {/* Social Login */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.8 }}
                    >
                        <Button variant="outline" className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50">
                            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Sign In Link */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                    className="mt-6 text-center text-sm text-muted-foreground"
                >
                    Already have an account?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Sign in
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
