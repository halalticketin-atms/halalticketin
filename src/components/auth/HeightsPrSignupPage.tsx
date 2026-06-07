'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
    ArrowLeft,
    ArrowRight,
    Camera,
    Check,
    CheckCircle2,
    ChevronRight,
    CircleDollarSign,
    Globe2,
    Loader2,
    LockKeyhole,
    Mail,
    MapPin,
    Newspaper,
    ShieldCheck,
    Sparkles,
    UserRound,
    X,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { getHeightsPrAccess } from '@/lib/heightspr-access';
import { COUNTRIES, TIMEZONES } from '@/lib/organizer-options';
import { getSupabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

import {
    ORGANIZER_SIGNUP_STEPS,
    useOrganizerSignupController,
} from './use-organizer-signup-controller';
import type { OrganizerSignupStep } from './organizer-signup-rules';

const CURRENCIES = [
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'dh' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
];

const STEP_DETAILS: Record<OrganizerSignupStep, {
    eyebrow: string;
    title: string;
    description: string;
}> = {
    credentials: {
        eyebrow: 'Account',
        title: 'First, the person behind the events.',
        description: 'Create your secure login. We will use these details for your organiser account.',
    },
    'about-you': {
        eyebrow: 'About you',
        title: 'A few details about you.',
        description: 'This information belongs to your account and is not shown on your public organiser page.',
    },
    organization: {
        eyebrow: 'Your organisation',
        title: 'Give your events a recognisable home.',
        description: 'Add the name and contact details attendees should associate with your events.',
    },
    location: {
        eyebrow: 'Location',
        title: 'Set your home base.',
        description: 'These defaults make event creation faster. You can still run events anywhere.',
    },
    currency: {
        eyebrow: 'Currency',
        title: 'Choose how you want to report.',
        description: 'This becomes your default analytics currency. Individual events can use another currency.',
    },
};

function BrandMark({ inverse = false }: { inverse?: boolean }) {
    return (
        <div className="flex items-center gap-3" aria-label="HeightsPR in partnership with Halal Ticketin">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1d342f]/15 bg-[#f04f3f] text-sm font-black tracking-[-0.08em] text-white shadow-[0_8px_24px_rgba(240,79,63,0.25)]">
                HPR
            </div>
            <div className="leading-none">
                <p className={cn(
                    'font-display text-[17px] font-extrabold tracking-[-0.04em]',
                    inverse ? 'text-[#f7f0df]' : 'text-[#172b27]',
                )}>
                    HeightsPR
                </p>
                <p className={cn(
                    'mt-1 text-[9px] font-bold uppercase tracking-[0.22em]',
                    inverse ? 'text-[#cbd3cf]' : 'text-[#6c7a75]',
                )}>
                    Organiser access
                </p>
            </div>
        </div>
    );
}

function LoadingPanel() {
    return (
        <div className="flex min-h-[calc(100dvh-var(--nav-safe-offset))] items-center justify-center bg-[#f3efe5]">
            <Loader2 className="h-7 w-7 animate-spin text-[#f04f3f]" aria-label="Loading signup" />
        </div>
    );
}

function BlockedPanel() {
    return (
        <main className="relative flex min-h-[calc(100dvh-var(--nav-safe-offset))] items-center justify-center overflow-hidden bg-[#17322c] px-5 py-16">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#f7f0df_0.7px,transparent_0.7px)] [background-size:9px_9px]" />
            <section className="relative w-full max-w-xl border border-white/15 bg-[#f7f0df] p-7 shadow-[18px_18px_0_#f04f3f] sm:p-10">
                <BrandMark />
                <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#17322c] text-[#f7f0df]">
                    <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="mt-6 font-display text-3xl font-black tracking-[-0.05em] text-[#172b27] sm:text-4xl">
                    Your account already belongs to an organiser.
                </h1>
                <p className="mt-4 max-w-md text-base leading-7 text-[#54645f]">
                    The HeightsPR route is reserved for creating a new organiser. Your existing organiser has not been changed or tagged.
                </p>
                <Button asChild className="mt-8 h-12 rounded-none bg-[#f04f3f] px-6 font-bold text-white hover:bg-[#d94133]">
                    <Link href="/dashboard">
                        Return to dashboard
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </section>
        </main>
    );
}

function HeightsPrSignupForm({
    authenticated,
    prefill,
}: {
    authenticated: boolean;
    prefill: { email?: string; name?: string };
}) {
    const router = useRouter();
    const { refresh } = useAuth();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const controller = useOrganizerSignupController({
        authenticated,
        heightsprReferral: true,
        prefill,
        redirectAfterComplete: '/dashboard',
        refresh,
    });
    const currentIndex = ORGANIZER_SIGNUP_STEPS.indexOf(
        controller.step as OrganizerSignupStep,
    );
    const activeDetails = STEP_DETAILS[
        (currentIndex >= 0 ? controller.step : 'currency') as OrganizerSignupStep
    ];

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        await controller.advance();
    };

    const handleGoogleLogin = async () => {
        controller.setError(null);
        const callbackUrl = new URL('/auth/callback', window.location.origin);
        callbackUrl.searchParams.set('role', 'organizer');
        callbackUrl.searchParams.set('next', '/heightspr');
        const { error } = await getSupabase().auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: callbackUrl.toString(),
            },
        });
        if (error) {
            controller.setErrorMessage('Unable to continue with Google. Please try again.');
        }
    };

    const complete = () => {
        if (controller.pendingEmailConfirmation) {
            router.push('/login?next=%2Fdashboard');
            return;
        }
        router.push('/dashboard');
    };

    const renderFields = () => {
        switch (controller.step) {
            case 'credentials':
                return (
                    <div className="space-y-5" data-testid="heightspr-step-credentials">
                        <div className="space-y-2">
                            <Label htmlFor="heightspr-name">Full name</Label>
                            <div className="relative">
                                <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82908b]" />
                                <Input
                                    id="heightspr-name"
                                    autoComplete="name"
                                    value={controller.form.name}
                                    onChange={(event) => controller.updateField('name', event.target.value)}
                                    placeholder="Your full name"
                                    className="h-12 rounded-none border-[#c9c4b8] bg-white/75 pl-10 focus-visible:ring-[#f04f3f]"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="heightspr-email">Email address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82908b]" />
                                <Input
                                    id="heightspr-email"
                                    type="email"
                                    autoComplete="email"
                                    value={controller.form.email}
                                    onChange={(event) => controller.updateField('email', event.target.value)}
                                    readOnly={authenticated && Boolean(prefill.email)}
                                    placeholder="you@example.com"
                                    className="h-12 rounded-none border-[#c9c4b8] bg-white/75 pl-10 focus-visible:ring-[#f04f3f] read-only:bg-[#eae5da]"
                                />
                            </div>
                            {authenticated && prefill.email ? (
                                <p className="text-xs text-[#6c7a75]">Using your signed-in email address.</p>
                            ) : null}
                        </div>
                        {!authenticated ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="heightspr-password">Password</Label>
                                    <div className="relative">
                                        <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82908b]" />
                                        <Input
                                            id="heightspr-password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={controller.form.password}
                                            onChange={(event) => controller.updateField('password', event.target.value)}
                                            placeholder="8+ characters with a number and symbol"
                                            className="h-12 rounded-none border-[#c9c4b8] bg-white/75 px-10 focus-visible:ring-[#f04f3f]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#40514b] underline-offset-4 hover:underline"
                                        >
                                            {showPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                                <div className="relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-[#d7d1c5]" />
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-[#f7f3e9] px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7e8a85]">
                                            or
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGoogleLogin}
                                    className="h-12 w-full rounded-none border-[#17322c] bg-transparent font-bold text-[#17322c] hover:bg-[#17322c] hover:text-white"
                                >
                                    Continue with Google
                                </Button>
                            </>
                        ) : null}
                    </div>
                );
            case 'about-you':
                return (
                    <div className="space-y-5" data-testid="heightspr-step-about-you">
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <Select
                                value={controller.form.gender}
                                onValueChange={(value) => controller.updateField('gender', value as 'male' | 'female')}
                            >
                                <SelectTrigger className="h-12 rounded-none border-[#c9c4b8] bg-white/75">
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Date of birth</Label>
                            <DatePicker
                                value={controller.form.dateOfBirth}
                                onChange={(value) => controller.updateField('dateOfBirth', value)}
                                placeholder="Select date of birth"
                                className="h-12 rounded-none border-[#c9c4b8] bg-white/75"
                                maxDate={new Date()}
                                showYearMonthDropdowns
                            />
                        </div>
                        <div className="border-l-2 border-[#f04f3f] bg-[#eee8dc] px-4 py-3 text-sm leading-6 text-[#52615c]">
                            These details help keep your account accurate and are not displayed publicly.
                        </div>
                    </div>
                );
            case 'organization':
                return (
                    <div className="space-y-5" data-testid="heightspr-step-organization">
                        <div className="flex items-center gap-4 border-b border-[#d7d1c5] pb-5">
                            <div className="relative">
                                <input
                                    ref={avatarInputRef}
                                    id="heightspr-logo"
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={controller.selectAvatar}
                                    className="sr-only"
                                />
                                <Label
                                    htmlFor="heightspr-logo"
                                    className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-[#77847f] bg-white text-[#52615c] hover:border-[#f04f3f]"
                                >
                                    {controller.avatarPreview ? (
                                        <Image
                                            src={controller.avatarPreview}
                                            alt="Organisation logo preview"
                                            fill
                                            sizes="80px"
                                            unoptimized
                                            className="object-cover"
                                        />
                                    ) : (
                                        <Camera className="h-5 w-5" />
                                    )}
                                </Label>
                                {controller.avatarPreview ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            controller.removeAvatar();
                                            if (avatarInputRef.current) {
                                                avatarInputRef.current.value = '';
                                            }
                                        }}
                                        aria-label="Remove logo"
                                        className="absolute -right-1 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-[#17322c] text-white"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                ) : null}
                            </div>
                            <div>
                                <p className="font-bold text-[#17322c]">Organisation logo</p>
                                <p className="mt-1 text-xs leading-5 text-[#6c7a75]">JPG, PNG, GIF or WebP. Maximum 5MB.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="heightspr-organizer-name">Organisation name</Label>
                            <Input
                                id="heightspr-organizer-name"
                                value={controller.form.organizerName}
                                onChange={(event) => controller.updateField('organizerName', event.target.value)}
                                placeholder="Your public organiser name"
                                className="h-12 rounded-none border-[#c9c4b8] bg-white/75"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Organisation type</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    ['individual', 'Individual'],
                                    ['organization', 'Organisation'],
                                    ['charity', 'Charity'],
                                ] as const).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => controller.updateField('organizerType', value)}
                                        className={cn(
                                            'min-h-12 border px-2 text-xs font-bold transition-colors sm:text-sm',
                                            controller.form.organizerType === value
                                                ? 'border-[#17322c] bg-[#17322c] text-white'
                                                : 'border-[#c9c4b8] bg-white/75 text-[#52615c] hover:border-[#f04f3f]',
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {controller.form.organizerType === 'charity' ? (
                            <div className="space-y-2">
                                <Label htmlFor="heightspr-charity-number">Charity number</Label>
                                <Input
                                    id="heightspr-charity-number"
                                    value={controller.form.organizerCharityNumber}
                                    onChange={(event) => controller.updateField('organizerCharityNumber', event.target.value)}
                                    placeholder="Registered charity number"
                                    className="h-12 rounded-none border-[#c9c4b8] bg-white/75"
                                />
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <Label htmlFor="heightspr-contact-email">Attendee contact email</Label>
                            <Input
                                id="heightspr-contact-email"
                                type="email"
                                value={controller.form.organizerContactEmail}
                                onChange={(event) => controller.updateField('organizerContactEmail', event.target.value)}
                                placeholder="events@yourorganisation.com"
                                className="h-12 rounded-none border-[#c9c4b8] bg-white/75"
                            />
                        </div>
                    </div>
                );
            case 'location':
                return (
                    <div className="space-y-5" data-testid="heightspr-step-location">
                        <div className="space-y-2">
                            <Label>Country</Label>
                            <Select
                                value={controller.form.organizerCountry}
                                onValueChange={(value) => controller.updateField('organizerCountry', value)}
                            >
                                <SelectTrigger className="h-12 rounded-none border-[#c9c4b8] bg-white/75">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map((country) => (
                                        <SelectItem key={country.code} value={country.code}>
                                            {country.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="heightspr-city">City</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82908b]" />
                                <Input
                                    id="heightspr-city"
                                    value={controller.form.organizerCity}
                                    onChange={(event) => controller.updateField('organizerCity', event.target.value)}
                                    placeholder="Your home city"
                                    className="h-12 rounded-none border-[#c9c4b8] bg-white/75 pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Timezone</Label>
                            <Select
                                value={controller.form.organizerTimezone}
                                onValueChange={(value) => controller.updateField('organizerTimezone', value)}
                            >
                                <SelectTrigger className="h-12 rounded-none border-[#c9c4b8] bg-white/75">
                                    <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIMEZONES.map((timezone) => (
                                        <SelectItem key={timezone.value} value={timezone.value}>
                                            {timezone.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'currency':
                return (
                    <div className="space-y-5" data-testid="heightspr-step-currency">
                        <div className="space-y-2">
                            <Label>Default currency</Label>
                            <Select
                                value={controller.form.organizerCurrency}
                                onValueChange={(value) => controller.updateField('organizerCurrency', value)}
                            >
                                <SelectTrigger className="h-14 rounded-none border-[#c9c4b8] bg-white/75">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map((currency) => (
                                        <SelectItem key={currency.code} value={currency.code}>
                                            <span className="flex items-center gap-3">
                                                <span className="w-5 font-bold">{currency.symbol}</span>
                                                {currency.code} · {currency.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-start gap-3 border border-[#c9c4b8] bg-white/55 p-4">
                            <Checkbox
                                id="heightspr-terms"
                                checked={controller.acceptedTerms}
                                onCheckedChange={(checked) => controller.setAcceptedTerms(checked === true)}
                                className="mt-0.5 border-[#65736e] data-[state=checked]:border-[#f04f3f] data-[state=checked]:bg-[#f04f3f]"
                            />
                            <Label htmlFor="heightspr-terms" className="cursor-pointer text-sm font-normal leading-6 text-[#52615c]">
                                I agree to Halal Ticketin&apos;s{' '}
                                <Link href="/terms" target="_blank" className="font-bold text-[#17322c] underline underline-offset-4">
                                    Terms of Use
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" target="_blank" className="font-bold text-[#17322c] underline underline-offset-4">
                                    Privacy Policy
                                </Link>.
                            </Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs font-bold uppercase tracking-[0.12em] text-[#62706b]">
                            <div className="flex items-center gap-2 border-t border-[#c9c4b8] pt-3">
                                <ShieldCheck className="h-4 w-4 text-[#f04f3f]" />
                                Secure account
                            </div>
                            <div className="flex items-center gap-2 border-t border-[#c9c4b8] pt-3">
                                <CircleDollarSign className="h-4 w-4 text-[#f04f3f]" />
                                Stripe payouts
                            </div>
                        </div>
                    </div>
                );
            case 'stripe':
                return (
                    <div className="space-y-6" data-testid="heightspr-step-stripe">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#17322c] text-[#f7f0df]">
                            <CircleDollarSign className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f04f3f]">Account created</p>
                            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.05em] text-[#172b27]">
                                Connect Stripe when you are ready to sell.
                            </h2>
                            <p className="mt-4 leading-7 text-[#5d6b66]">
                                Stripe securely handles attendee payments and transfers ticket revenue to your account.
                            </p>
                        </div>
                        {controller.error ? (
                            <p className="border-l-2 border-[#c53c32] bg-[#f8dfd9] px-4 py-3 text-sm text-[#8d2c25]">
                                {controller.error.message}
                            </p>
                        ) : null}
                        <div className="space-y-3">
                            <Button
                                type="button"
                                onClick={controller.connectStripe}
                                disabled={controller.isLoading}
                                className="h-13 w-full rounded-none bg-[#f04f3f] font-bold text-white hover:bg-[#d94133]"
                            >
                                {controller.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Connect Stripe
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={complete}
                                className="h-12 w-full rounded-none font-bold text-[#17322c]"
                            >
                                I&apos;ll do this later
                            </Button>
                        </div>
                    </div>
                );
            case 'complete':
                return (
                    <div className="space-y-6" data-testid="heightspr-step-complete">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f04f3f] text-white">
                            <Mail className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f04f3f]">One final step</p>
                            <h2 className="mt-3 font-display text-3xl font-black tracking-[-0.05em] text-[#172b27]">
                                Check your inbox to verify your email.
                            </h2>
                            <p className="mt-4 leading-7 text-[#5d6b66]">
                                We sent a confirmation link to <strong>{controller.form.email}</strong>. Your organiser is ready and will be available after verification.
                            </p>
                        </div>
                        {controller.error ? (
                            <p className="border-l-2 border-[#c53c32] bg-[#f8dfd9] px-4 py-3 text-sm text-[#8d2c25]">
                                {controller.error.message}
                            </p>
                        ) : null}
                        <div className="space-y-3">
                            <Button
                                type="button"
                                onClick={complete}
                                className="h-13 w-full rounded-none bg-[#17322c] font-bold text-white hover:bg-[#29483f]"
                            >
                                Continue to sign in
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={controller.resendVerificationEmail}
                                disabled={controller.isLoading}
                                className="h-12 w-full rounded-none font-bold text-[#17322c]"
                            >
                                Resend verification email
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    const isCoreStep = currentIndex >= 0;

    return (
        <main className="relative min-h-[calc(100dvh-var(--nav-safe-offset))] overflow-hidden bg-[#f3efe5] text-[#172b27]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:radial-gradient(#586660_0.55px,transparent_0.55px)] [background-size:8px_8px]" />
            <div className="relative mx-auto grid min-h-[calc(100dvh-var(--nav-safe-offset))] max-w-[1520px] lg:grid-cols-[minmax(330px,0.82fr)_minmax(520px,1.18fr)]">
                <aside className="relative overflow-hidden bg-[#17322c] px-6 py-8 text-[#f7f0df] sm:px-10 lg:flex lg:min-h-full lg:flex-col lg:px-12 lg:py-12">
                    <div className="absolute -right-28 top-32 h-72 w-72 rounded-full border border-[#f7f0df]/15" />
                    <div className="absolute -right-10 top-52 h-44 w-44 rounded-full bg-[#f04f3f]" />
                    <div className="absolute bottom-0 left-0 h-44 w-full opacity-20 [background-image:linear-gradient(135deg,transparent_46%,#f7f0df_47%,#f7f0df_49%,transparent_50%)] [background-size:18px_18px]" />

                    <div className="relative flex items-center justify-between">
                        <BrandMark inverse />
                        <div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8d4c8] sm:flex">
                            <span>Powered by</span>
                            <div className="relative h-7 w-24">
                                <Image
                                    src="/logos/HTlogocr.png"
                                    alt="Halal Ticketin"
                                    fill
                                    sizes="96px"
                                    priority
                                    className="object-contain object-right brightness-0 invert"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative mt-12 max-w-xl lg:my-auto lg:mt-20">
                        <div className="inline-flex items-center gap-2 border border-[#f7f0df]/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#f4b048]">
                            <Newspaper className="h-3.5 w-3.5" />
                            HeightsPR partner access
                        </div>
                        <h1 className="mt-7 max-w-lg font-display text-[clamp(2.4rem,5vw,5rem)] font-black leading-[0.94] tracking-[-0.065em]">
                            Your next event deserves a full house.
                        </h1>
                        <p className="mt-6 max-w-md text-base leading-7 text-[#d1d8d4] sm:text-lg">
                            Create your organiser account, publish tickets and build an audience with Halal Ticketin.
                        </p>
                        <div className="mt-8 hidden gap-5 border-t border-[#f7f0df]/15 pt-6 text-sm text-[#d1d8d4] lg:grid">
                            {[
                                'Keep control of your organiser profile',
                                'Secure attendee payments through Stripe',
                                'Create and manage events from one dashboard',
                            ].map((benefit) => (
                                <div key={benefit} className="flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#f4b048]" />
                                    {benefit}
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                <section className="relative flex min-h-[680px] items-center px-5 py-10 sm:px-10 lg:px-16 lg:py-14">
                    <div className="mx-auto w-full max-w-[620px]">
                        {isCoreStep ? (
                            <>
                                <div className="mb-8 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2" aria-label={`Step ${currentIndex + 1} of ${ORGANIZER_SIGNUP_STEPS.length}`}>
                                        {ORGANIZER_SIGNUP_STEPS.map((signupStep, index) => {
                                            const isActive = index === currentIndex;
                                            const isComplete = index < currentIndex;
                                            const isAvailable = index <= controller.highestStepIndex;
                                            return (
                                                <button
                                                    key={signupStep}
                                                    type="button"
                                                    disabled={!isAvailable}
                                                    onClick={() => controller.goToStep(signupStep)}
                                                    aria-label={`Go to ${STEP_DETAILS[signupStep].eyebrow}`}
                                                    className={cn(
                                                        'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition-all',
                                                        isActive && 'border-[#f04f3f] bg-[#f04f3f] text-white shadow-[0_5px_0_#17322c]',
                                                        isComplete && 'border-[#17322c] bg-[#17322c] text-white',
                                                        !isActive && !isComplete && 'border-[#bcb7ab] bg-transparent text-[#78847f]',
                                                        isAvailable && 'cursor-pointer',
                                                    )}
                                                >
                                                    {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8782]">
                                        {currentIndex + 1} / {ORGANIZER_SIGNUP_STEPS.length}
                                    </span>
                                </div>

                                <div className="mb-8">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f04f3f]">
                                        {activeDetails.eyebrow}
                                    </p>
                                    <h2 className="mt-3 max-w-xl font-display text-3xl font-black leading-[1.03] tracking-[-0.05em] text-[#172b27] sm:text-4xl">
                                        {activeDetails.title}
                                    </h2>
                                    <p className="mt-4 max-w-lg leading-7 text-[#5d6b66]">
                                        {activeDetails.description}
                                    </p>
                                </div>
                            </>
                        ) : null}

                        <AnimatePresence mode="wait">
                            <motion.form
                                key={controller.step}
                                onSubmit={handleSubmit}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.24, ease: 'easeOut' }}
                            >
                                {renderFields()}

                                {isCoreStep && controller.error ? (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        role="alert"
                                        className="mt-5 border-l-2 border-[#c53c32] bg-[#f8dfd9] px-4 py-3 text-sm text-[#8d2c25]"
                                    >
                                        {controller.error.message}
                                        {controller.error.showSupportLink ? (
                                            <>
                                                {' '}
                                                <Link href="/contact" className="font-bold underline">Contact support</Link>.
                                            </>
                                        ) : null}
                                    </motion.p>
                                ) : null}

                                {isCoreStep ? (
                                    <div className="mt-8 flex items-center gap-3">
                                        {currentIndex > 0 ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={controller.back}
                                                disabled={controller.isLoading}
                                                className="h-13 rounded-none border-[#17322c] bg-transparent px-5 text-[#17322c] hover:bg-[#e4dfd3]"
                                            >
                                                <ArrowLeft className="mr-2 h-4 w-4" />
                                                Back
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            onClick={() => void controller.advance()}
                                            disabled={controller.isLoading}
                                            className="h-13 flex-1 rounded-none bg-[#f04f3f] px-6 font-bold text-white shadow-[7px_7px_0_#17322c] transition-transform hover:-translate-y-0.5 hover:bg-[#d94133]"
                                        >
                                            {controller.isLoading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : null}
                                            {controller.step === 'currency'
                                                ? (authenticated ? 'Create organiser' : 'Create account')
                                                : 'Continue'}
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : null}
                            </motion.form>
                        </AnimatePresence>

                        <div className="mt-10 flex items-center justify-between border-t border-[#d1cbc0] pt-5 text-xs text-[#6d7974]">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-[#f04f3f]" />
                                Dedicated HeightsPR signup
                            </span>
                            <span className="flex items-center gap-2">
                                <Globe2 className="h-3.5 w-3.5" />
                                Organisers only
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

export function HeightsPrSignupPage() {
    const { user, memberships, isLoading } = useAuth();
    const access = getHeightsPrAccess({
        authLoading: isLoading,
        user,
        memberships,
    });

    if (access === 'loading') {
        return <LoadingPanel />;
    }
    if (access === 'blocked') {
        return <BlockedPanel />;
    }

    return (
        <HeightsPrSignupForm
            authenticated={Boolean(user)}
            prefill={{
                email: user?.email || undefined,
                name: user?.name || undefined,
            }}
        />
    );
}
