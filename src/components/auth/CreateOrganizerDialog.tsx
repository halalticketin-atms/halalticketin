'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
    Building2,
    Loader2,
    ArrowRight,
    CreditCard,
    Camera,
    X,
    Check,
    MapPin,
    Sparkles,
    Ticket,
    BarChart3,
    Users,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import api from '@/lib/api';
import { useOrganizers } from '@/context/organizer-context';
import { cn } from '@/lib/utils';
import { uploadOrganizerAvatar } from '@/lib/upload-api';
import { COUNTRIES, CURRENCIES, TIMEZONES } from '@/lib/organizer-options';


const STEPS = [
    { id: 'intro', title: 'Upgrade', description: 'Why upgrade', icon: Sparkles },
    { id: 'profile', title: 'Organization', description: 'Your brand', icon: Building2 },
    { id: 'stripe', title: 'Payments', description: 'Get paid', icon: CreditCard },
];

type Step = 'intro' | 'profile' | 'stripe';

interface CreateOrganizerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (organizerId: string) => void;
}

const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 40 : -40, opacity: 0 }),
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
};

export function CreateOrganizerDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateOrganizerDialogProps) {
    const [step, setStep] = useState<Step>('intro');
    const [direction, setDirection] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [organizerId, setOrganizerId] = useState<string | null>(null);
    const { refresh } = useOrganizers();

    // Form fields
    const [name, setName] = useState('');
    const [organizerType, setOrganizerType] = useState<'individual' | 'organization'>('individual');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [currency, setCurrency] = useState('GBP');
    const [timezone, setTimezone] = useState('Europe/London');

    // Avatar
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const currentStepIndex = STEPS.findIndex(s => s.id === step);
    const progressPercentage = ((currentStepIndex + 1) / STEPS.length) * 100;

    const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setAvatarFile(file);
        setError(null);

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                setAvatarPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const removeAvatar = () => {
        setAvatarFile(null);
        setAvatarPreview('');
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const handleContinueToProfile = () => {
        setDirection(1);
        setStep('profile');
    };

    const handleCreateOrganizer = async () => {
        if (!name.trim()) {
            setError('Please enter an organizer name');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post<{
                organizer: { id: string; name: string };
            }>('/api/v1/organizers', {
                name: name.trim(),
                organizerType,
                country: country || undefined,
                city: city.trim() || undefined,
                defaultTimezone: timezone,
                defaultCurrency: currency,
            });

            const newOrganizerId = response.organizer.id;
            setOrganizerId(newOrganizerId);

            // Upload avatar if provided
            if (avatarFile) {
                try {
                    await uploadOrganizerAvatar(newOrganizerId, avatarFile);
                } catch (uploadError) {
                    console.warn('Logo upload error:', uploadError);
                }
            }

            await refresh();
            setDirection(1);
            setStep('stripe');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to create organizer';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStripeConnect = async () => {
        if (!organizerId) {
            setError('No organizer found. Please try again.');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            const response = await api.post<{ connectUrl: string }>(
                `/api/v1/organizers/${organizerId}/stripe/connect-link`
            );
            if (response.connectUrl) {
                window.location.href = response.connectUrl;
            } else {
                setError('Unable to get Stripe connect URL');
            }
        } catch (err) {
            console.error('Stripe connect error:', err);
            setError(err instanceof Error ? err.message : 'Unable to connect Stripe. You can set this up later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = () => {
        onOpenChange(false);
        if (onSuccess && organizerId) {
            onSuccess(organizerId);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!isLoading) {
            onOpenChange(newOpen);
            if (!newOpen) {
                // Reset state
                setStep('intro');
                setName('');
                setOrganizerType('individual');
                setCountry('');
                setCity('');
                setCurrency('GBP');
                setTimezone('Europe/London');
                setError(null);
                setOrganizerId(null);
                setAvatarFile(null);
                setAvatarPreview('');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-0 gap-0 max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] border-0 shadow-2xl bg-gradient-to-br from-white via-slate-50/80 to-cyan-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 [&>[data-slot=dialog-close]]:z-50 [&>[data-slot=dialog-close]]:bg-white/80 [&>[data-slot=dialog-close]]:dark:bg-slate-800/80 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:backdrop-blur-sm [&>[data-slot=dialog-close]]:shadow-md">
                <VisuallyHidden>
                    <DialogTitle>Upgrade to Organizer</DialogTitle>
                    <DialogDescription>Create your organizer profile to start hosting events</DialogDescription>
                </VisuallyHidden>

                {/* Ambient background glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-3xl" />
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-200/50 dark:bg-slate-700/50 relative z-10 shrink-0">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-teal)] to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                </div>

                {/* Mobile Step Indicator */}
                <div className="lg:hidden border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shrink-0 relative z-10">
                    <div className="px-4 py-4">
                        <div className="flex items-center justify-between">
                            {STEPS.map((s, idx) => {
                                const isActive = step === s.id;
                                const isCompleted = idx < currentStepIndex;

                                return (
                                    <div key={s.id} className="flex flex-col items-center gap-1.5">
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all',
                                                isActive
                                                    ? 'bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-lg shadow-cyan-500/25'
                                                    : isCompleted
                                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                            )}
                                        >
                                            {isCompleted ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                        </div>
                                        <span className={cn(
                                            'text-xs font-medium transition-colors',
                                            isActive ? 'text-[var(--brand-teal)]' : 'text-slate-500'
                                        )}>
                                            {s.title}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
                    {/* Desktop Sidebar */}
                    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-gradient-to-b from-slate-50/80 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border-r border-slate-200/50 dark:border-slate-700/50 p-5 backdrop-blur-sm">
                        <div className="space-y-2">
                            {STEPS.map((s, idx) => {
                                const isActive = step === s.id;
                                const isCompleted = idx < currentStepIndex;

                                return (
                                    <motion.button
                                        key={s.id}
                                        disabled={idx > currentStepIndex}
                                        whileHover={idx <= currentStepIndex ? { x: 4 } : {}}
                                        whileTap={idx <= currentStepIndex ? { scale: 0.98 } : {}}
                                        className={cn(
                                            'w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300',
                                            isActive
                                                ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-xl shadow-cyan-500/20'
                                                : isCompleted
                                                    ? 'bg-white/60 dark:bg-slate-700/40 hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer'
                                                    : 'bg-slate-100/50 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
                                                isActive
                                                    ? 'bg-white/20'
                                                    : isCompleted
                                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                                                        : 'bg-slate-200/80 dark:bg-slate-700'
                                            )}
                                        >
                                            {isCompleted ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold">{s.title}</p>
                                            <p className={cn(
                                                'text-sm truncate',
                                                isActive ? 'text-white/70' : 'text-slate-500'
                                            )}>
                                                {s.description}
                                            </p>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                        <div className="flex-1 p-6 lg:p-10">
                            <AnimatePresence mode="wait" custom={direction}>
                                {/* Step: Intro */}
                                {step === 'intro' && (
                                    <motion.div
                                        key="intro"
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="h-full flex flex-col space-y-6"
                                    >
                                        <motion.div
                                            variants={staggerContainer}
                                            initial="hidden"
                                            animate="show"
                                        >
                                            <motion.div variants={staggerItem} className="text-center lg:text-left">
                                                <h2 className="text-3xl lg:text-4xl font-display font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                                    Upgrade to Organizer
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                                                    You don&apos;t have organizer privileges yet. Upgrade your account to create events and sell tickets.
                                                </p>
                                            </motion.div>

                                            <motion.div
                                                variants={staggerItem}
                                                className="grid gap-3 max-w-lg mx-auto text-left"
                                            >
                                                {[
                                                    { icon: Ticket, title: 'Create Events', description: 'Host in-person or online halal-friendly events' },
                                                    { icon: CreditCard, title: 'Sell Tickets', description: 'Accept payments securely with Stripe' },
                                                    { icon: BarChart3, title: 'Track Analytics', description: 'Monitor sales and attendee insights' },
                                                    { icon: Users, title: 'Manage Teams', description: 'Invite team members to help manage events' },
                                                ].map((feature) => (
                                                    <div
                                                        key={feature.title}
                                                        className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm"
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            <feature.icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-800 dark:text-white">{feature.title}</p>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">{feature.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        </motion.div>

                                        <motion.div variants={staggerItem} className="mt-auto flex justify-end pt-4">
                                            <Button
                                                onClick={handleContinueToProfile}
                                                className="h-12 px-8 text-base font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 shadow-lg shadow-cyan-500/20 rounded-xl"
                                            >
                                                Yes, Upgrade My Account
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* Step: Profile */}
                                {step === 'profile' && (
                                    <motion.div
                                        key="profile"
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="space-y-6"
                                    >
                                        <motion.div
                                            variants={staggerContainer}
                                            initial="hidden"
                                            animate="show"
                                        >
                                            <motion.div variants={staggerItem} className="text-center mb-8">
                                                <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">
                                                    Your Organization
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                    Tell us about your brand or organization
                                                </p>
                                            </motion.div>

                                            {/* Avatar Upload */}
                                            <motion.div variants={staggerItem} className="flex flex-col items-center gap-3 mb-6">
                                                <Label className="text-sm text-slate-600 dark:text-slate-400">
                                                    Brand Logo / Photo <span className="text-slate-400">(Optional)</span>
                                                </Label>
                                                <div className="relative group">
                                                    <input
                                                        ref={avatarInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleAvatarSelect}
                                                        className="hidden"
                                                        id="avatar-upload"
                                                    />
                                                    <label
                                                        htmlFor="avatar-upload"
                                                        className={cn(
                                                            'relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-all overflow-hidden',
                                                            avatarPreview
                                                                ? 'border-transparent'
                                                                : 'border-slate-300 dark:border-slate-600 hover:border-[var(--brand-cyan)] bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                        )}
                                                    >
                                                        {avatarPreview ? (
                                                            <Image
                                                                src={avatarPreview}
                                                                alt="Avatar preview"
                                                                fill
                                                                sizes="96px"
                                                                className="object-cover"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <Camera className="h-8 w-8 text-slate-400" />
                                                        )}
                                                    </label>
                                                    {avatarPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={removeAvatar}
                                                            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </motion.div>

                                            {/* Organization Name */}
                                            <motion.div variants={staggerItem} className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-slate-400" />
                                                    Organization / Brand Name
                                                </Label>
                                                <Input
                                                    placeholder="Your brand or organization name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                    autoFocus
                                                />
                                            </motion.div>

                                            {/* Organization Type */}
                                            <motion.div variants={staggerItem} className="space-y-2 mt-4">
                                                <Label>Organization Type</Label>
                                                <RadioGroup
                                                    value={organizerType}
                                                    onValueChange={(value) => setOrganizerType(value as 'individual' | 'organization')}
                                                    className="flex gap-4"
                                                >
                                                    <Label
                                                        htmlFor="type-individual"
                                                        className={cn(
                                                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1',
                                                            organizerType === 'individual'
                                                                ? 'border-[var(--brand-cyan)] bg-cyan-50/50 dark:bg-cyan-950/30'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                        )}
                                                    >
                                                        <RadioGroupItem value="individual" id="type-individual" />
                                                        Individual
                                                    </Label>
                                                    <Label
                                                        htmlFor="type-org"
                                                        className={cn(
                                                            'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1',
                                                            organizerType === 'organization'
                                                                ? 'border-[var(--brand-cyan)] bg-cyan-50/50 dark:bg-cyan-950/30'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                        )}
                                                    >
                                                        <RadioGroupItem value="organization" id="type-org" />
                                                        Organization
                                                    </Label>
                                                </RadioGroup>
                                            </motion.div>

                                            {/* Country & City */}
                                            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        Country
                                                    </Label>
                                                    <Select value={country} onValueChange={setCountry}>
                                                        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
                                                            <SelectValue placeholder="Select country" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COUNTRIES.map((c) => (
                                                                <SelectItem key={c.code} value={c.code}>
                                                                    {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>City</Label>
                                                    <Input
                                                        placeholder="City"
                                                        value={city}
                                                        onChange={(e) => setCity(e.target.value)}
                                                        className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                    />
                                                </div>
                                            </motion.div>

                                            {/* Currency & Timezone */}
                                            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                                <div className="space-y-2">
                                                    <Label>Currency</Label>
                                                    <Select value={currency} onValueChange={setCurrency}>
                                                        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {CURRENCIES.map((c) => (
                                                                <SelectItem key={c.code} value={c.code}>
                                                                    {c.code} - {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Timezone</Label>
                                                    <Select value={timezone} onValueChange={setTimezone}>
                                                        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {TIMEZONES.map((tz) => (
                                                                <SelectItem key={tz.value} value={tz.value}>
                                                                    {tz.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </motion.div>

                                            {error && (
                                                <motion.p
                                                    variants={staggerItem}
                                                    className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800 mt-4"
                                                >
                                                    {error}
                                                </motion.p>
                                            )}

                                            <motion.div variants={staggerItem} className="pt-6">
                                                <Button
                                                    onClick={handleCreateOrganizer}
                                                    disabled={isLoading || !name.trim()}
                                                    className="w-full h-12 font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 shadow-lg shadow-cyan-500/20"
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                            Creating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            Continue to Payments
                                                            <ArrowRight className="ml-2 h-5 w-5" />
                                                        </>
                                                    )}
                                                </Button>
                                            </motion.div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* Step: Stripe */}
                                {step === 'stripe' && (
                                    <motion.div
                                        key="stripe"
                                        custom={direction}
                                        variants={slideVariants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        className="space-y-8"
                                    >
                                        <div className="text-center">
                                            <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">
                                                Set up payments
                                            </h2>
                                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                Connect Stripe to receive payouts for ticket sales
                                            </p>
                                        </div>

                                        <motion.div
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="bg-gradient-to-br from-violet-50 via-indigo-50 to-purple-50 dark:from-violet-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-3xl p-10 text-center relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_50%)]" />
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]" />
                                            <div className="relative">
                                                <motion.div
                                                    animate={{ y: [0, -5, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                    className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30"
                                                >
                                                    <CreditCard className="h-10 w-10 text-white" />
                                                </motion.div>
                                                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-2">Stripe Connect</h3>
                                                <p className="text-slate-600 dark:text-slate-400">
                                                    Secure payment processing for your events
                                                </p>
                                            </div>
                                        </motion.div>

                                        {error && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                            >
                                                {error}
                                            </motion.p>
                                        )}

                                        <div className="space-y-3">
                                            <Button
                                                onClick={handleStripeConnect}
                                                disabled={isLoading}
                                                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-xl shadow-violet-500/20"
                                            >
                                                {isLoading ? (
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CreditCard className="mr-2 h-5 w-5" />
                                                        Connect Stripe Account
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                onClick={handleComplete}
                                                disabled={isLoading}
                                                className="w-full"
                                            >
                                                Skip for now
                                            </Button>
                                        </div>

                                        <p className="text-xs text-center text-slate-500">
                                            You can set up payments later in your dashboard settings
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </main>
                </div>
            </DialogContent >
        </Dialog >
    );
}
