'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowRight,
    ArrowLeft,
    ShoppingBag,
    Megaphone,
    Loader2,
    User,
    Mail,
    Lock,
    Calendar,
    MapPin,
    Building2,
    CreditCard,
    CheckCircle,
    Check,
    Heart,
    Sparkles,
    Camera,
    X,
    Eye,
    EyeOff,

    Globe,
    Coins,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

import api, { setAuthToken } from '@/lib/api';
import { getAuthUiError, type AuthUiError } from '@/lib/auth-error-messages';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/notifications';
import { fileToDataUrl, uploadOrganizerAvatar } from '@/lib/upload-api';
import { COUNTRIES, TIMEZONES } from '@/lib/organizer-options';
import { getPasswordValidationError } from '@/lib/password';
import { getLastAuthMethod, setLastAuthMethod, type LastAuthMethod } from '@/lib/last-auth-method';
import { getDefaultInviteNextPath } from '@/lib/pending-invite';

const TERMS_VERSION = '2024-12-20';
const SUPPORT_URL = '/contact';
const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
const AVATAR_ACCEPT = ALLOWED_AVATAR_MIME_TYPES.join(',');
const PENDING_ORG_AVATAR_KEY = 'halal-ticketin:pending-organizer-avatar';

const CURRENCIES = [
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'dh' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
    { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' }
];

const BUYER_STEPS = [
    { id: 'intent', title: 'Welcome', description: 'Choose your path', icon: Sparkles },
    { id: 'credentials', title: 'Account', description: 'Create your account', icon: User },
    { id: 'profile', title: 'Profile', description: 'About you', icon: MapPin },
];

const ORGANIZER_STEPS = [
    { id: 'intent', title: 'Welcome', description: 'Choose your path', icon: Sparkles },
    { id: 'credentials', title: 'Account', description: 'Create your account', icon: User },
    { id: 'about-you', title: 'About You', description: 'Personal info', icon: User },
    { id: 'organization', title: 'Organization', description: 'Your brand', icon: Building2 },
    { id: 'location', title: 'Location', description: 'Where you are', icon: Globe },
    { id: 'currency', title: 'Currency', description: 'Get paid', icon: Coins },
    { id: 'stripe', title: 'Payments', description: 'Connect Stripe', icon: CreditCard },
];

// Simplified flow for users joining via invitation - no org creation needed
const INVITE_STEPS = [
    { id: 'credentials', title: 'Account', description: 'Create your account', icon: User },
    { id: 'profile', title: 'Profile', description: 'About you', icon: MapPin },
];

interface SignupOnboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultRole?: 'buyer' | 'organizer';
    redirectAfterComplete?: string;
    onComplete?: (redirectTo: string) => void;
    /** Pre-fill and lock email for invitation flow */
    inviteEmail?: string;
    inviteToken?: string;
    authMode?: 'new' | 'existing';
    prefill?: {
        email?: string;
        name?: string;
    };
}

interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
}

interface RegisterResponse {
    userId: string;
    email: string;
    isOrganizer: boolean;
    organizerId?: string;
    requiresEmailConfirmation?: boolean;
}

type Step = 'intent' | 'credentials' | 'profile' | 'about-you' | 'organization' | 'location' | 'currency' | 'stripe' | 'complete';

interface FormData {
    role: 'buyer' | 'organizer';
    email: string;
    password: string;
    name: string;
    gender: 'male' | 'female' | '';
    dateOfBirth: string;
    homeCountry: string;
    homeCity: string;
    organizerName: string;
    organizerType: 'individual' | 'organization' | 'charity';
    organizerCharityNumber: string;
    organizerCountry: string;
    organizerCity: string;
    organizerCurrency: string;
    organizerTimezone: string;
}

const initialFormData: FormData = {
    role: 'organizer',
    email: '',
    password: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    homeCountry: '',
    homeCity: '',
    organizerName: '',
    organizerType: 'individual',
    organizerCharityNumber: '',
    organizerCountry: '',
    organizerCity: '',
    organizerCurrency: 'GBP',
    organizerTimezone: 'Europe/London',
};

const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 40 : -40, opacity: 0 }),
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const staggerItem = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

// Dynamic content for the left panel based on current step
const STEP_CONTENT: Record<Step, { headline: string; subtext: string }> = {
    intent: { headline: 'Get Started', subtext: "Connect with your community by ticketin' the right way" },
    credentials: { headline: 'Create Account', subtext: 'Set up your login details' },
    profile: { headline: 'About You', subtext: 'Help us personalize your experience' },
    'about-you': { headline: 'Tell us about you', subtext: 'A bit more about yourself' },
    organization: { headline: 'Your Brand', subtext: 'Set up your organiser profile' },
    location: { headline: 'Where are you?', subtext: 'Set your default location preferences' },
    currency: { headline: 'Default Currency', subtext: "We'll use this as your default analytics currency but each event can have its own." },
    stripe: { headline: 'Connect Payments', subtext: 'Link your Stripe account' },
    complete: { headline: 'All Done!', subtext: 'Welcome aboard' },
};

export function SignupOnboardingDialog({
    open,
    onOpenChange,
    defaultRole,
    redirectAfterComplete,
    onComplete,
    inviteEmail,
    inviteToken,
    authMode = 'new',
    prefill,
}: SignupOnboardingDialogProps) {
    // Invite mode: user is joining an existing org via invitation
    const isInviteFlow = Boolean(inviteToken || inviteEmail);
    const inviteContinuationPath = isInviteFlow
        ? (
            (redirectAfterComplete && redirectAfterComplete.startsWith('/') ? redirectAfterComplete : undefined)
            ?? getDefaultInviteNextPath(inviteToken)
            ?? '/dashboard'
        )
        : null;
    const isAuthenticatedOnboarding = authMode === 'existing';
    const shouldSkipWelcome = isAuthenticatedOnboarding && Boolean(defaultRole) && !isInviteFlow;

    // In invite mode, start at credentials step (skip role selection)
    const [step, setStep] = useState<Step>(
        isInviteFlow ? 'credentials' : (shouldSkipWelcome ? 'credentials' : 'intent')
    );
    const [direction, setDirection] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        ...initialFormData,
        role: defaultRole ?? 'organizer',
        // Pre-fill email from invitation
        email: inviteEmail ?? prefill?.email ?? '',
        name: prefill?.name ?? '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<AuthUiError | null>(null);
    const [organizerId, setOrganizerId] = useState<string | null>(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
    const [lastUsed, setLastUsed] = useState<LastAuthMethod | null>(null);
    const registerInFlightRef = useRef(false);
    const emailEditedRef = useRef(false);
    const lastCheckedEmailRef = useRef<string | null>(null);
    const lastCheckedOrganizerNameRef = useRef<string | null>(null);
    // Track the highest step reached for free navigation between unlocked steps
    const [highestStepReached, setHighestStepReached] = useState<Step>(
        isInviteFlow ? 'credentials' : (shouldSkipWelcome ? 'credentials' : 'intent')
    );

    const setErrorMessage = (message: string, options?: { showSupportLink?: boolean }) => {
        setError({ message, showSupportLink: options?.showSupportLink ?? false });
    };

    const renderErrorMessage = (errorMessage: AuthUiError) => (
        <>
            {errorMessage.message}
            {errorMessage.showSupportLink ? (
                <>
                    {' '}
                    <a
                        href={SUPPORT_URL}
                        className="text-(--brand-teal) hover:text-(--brand-cyan) font-medium underline underline-offset-2 transition-colors"
                    >
                        Contact support
                    </a>.
                </>
            ) : null}
        </>
    );



    // Avatar upload state
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { refresh } = useAuth();

    // Use simplified steps for invite flow (no org creation needed)
    const baseSteps = formData.role === 'organizer' ? ORGANIZER_STEPS : BUYER_STEPS;
    const steps = isInviteFlow
        ? INVITE_STEPS
        : (shouldSkipWelcome ? baseSteps.filter(s => s.id !== 'intent') : baseSteps);

    // Filter steps for the initial Welcome screen to reduce cognitive load
    // Only show "Welcome" initially, and hide "Welcome" when on other steps
    const sidebarSteps = step === 'intent'
        ? steps.filter(s => s.id === 'intent')
        : steps.filter(s => s.id !== 'intent');

    const currentStepIndex = steps.findIndex(s => s.id === step);
    const canGoBack = currentStepIndex > 0;
    const isEmailLocked = isInviteFlow
        || (isAuthenticatedOnboarding && Boolean(prefill?.email) && !emailEditedRef.current);
    const showSignInEmailHint = isAuthenticatedOnboarding && !isInviteFlow && Boolean(prefill?.email) && !emailEditedRef.current;

    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (!prefill && !inviteEmail) {
            return;
        }

        setFormData((prev) => {
            const fallbackEmail = prev.email || prefill?.email || prev.email;
            const fallbackName = prev.name || prefill?.name || prev.name;

            return {
                ...prev,
                email: inviteEmail ?? fallbackEmail,
                name: fallbackName,
            };
        });
    }, [inviteEmail, prefill]);

    useEffect(() => {
        const stored = getLastAuthMethod();
        setLastUsed(stored?.method ?? null);
    }, []);

    useEffect(() => {
        if (isInviteFlow || isAuthenticatedOnboarding) {
            return;
        }
        if (!lastCheckedEmailRef.current) {
            return;
        }
        const normalizedEmail = formData.email.trim().toLowerCase();
        if (normalizedEmail && normalizedEmail === lastCheckedEmailRef.current) {
            return;
        }
        lastCheckedEmailRef.current = null;
        setHighestStepReached((prev) => (prev === 'credentials' ? prev : 'credentials'));
    }, [formData.email, isInviteFlow, isAuthenticatedOnboarding]);

    useEffect(() => {
        if (isInviteFlow || formData.role !== 'organizer') {
            return;
        }
        if (!lastCheckedOrganizerNameRef.current) {
            return;
        }
        const trimmedName = formData.organizerName.trim();
        if (trimmedName && trimmedName === lastCheckedOrganizerNameRef.current) {
            return;
        }
        lastCheckedOrganizerNameRef.current = null;
        setHighestStepReached((prev) => (prev === 'organization' ? prev : 'organization'));
    }, [formData.organizerName, formData.role, isInviteFlow]);

    useEffect(() => {
        if (formData.role !== 'organizer') {
            lastCheckedOrganizerNameRef.current = null;
        }
    }, [formData.role]);

    const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
            setErrorMessage('Please upload a JPG, PNG, GIF, or WebP image');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage('Image must be 5MB or less');
            return;
        }

        setAvatarFile(file);
        setError(null);

        // Create preview
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

    const goToStep = (stepId: Step, dir = 0) => {
        const targetIndex = steps.findIndex(s => s.id === stepId);
        const highestIndex = steps.findIndex(s => s.id === highestStepReached);
        // Allow navigation to any step up to the highest step reached
        if (targetIndex <= highestIndex) {
            setDirection(dir || (targetIndex > currentStepIndex ? 1 : -1));
            setStep(stepId);
        }
    };

    // Update highest step reached when moving forward
    useEffect(() => {
        const currentIndex = steps.findIndex(s => s.id === step);
        const highestIndex = steps.findIndex(s => s.id === highestStepReached);
        if (currentIndex > highestIndex) {
            setHighestStepReached(step);
        }
    }, [step, steps, highestStepReached]);



    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const callbackUrl = new URL('/auth/callback', window.location.origin);
            callbackUrl.searchParams.set('role', formData.role);
            if (redirectAfterComplete) {
                callbackUrl.searchParams.set('next', redirectAfterComplete);
            }

            const { error } = await getSupabase().auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: callbackUrl.toString(),
                },
            });

            if (error) {
                throw error;
            }

            toast.info('Redirecting to Google...');
        } catch (err) {
            console.error(err);
            toast.error(err, 'Unable to sign in with Google');
            setError(getAuthUiError(err, { fallbackMessage: 'Unable to sign in with Google.' }));
            setIsLoading(false);
        }
    };

    const handleNext = async () => {
        setError(null);
        setDirection(1);

        switch (step) {
            case 'intent':
                setStep('credentials');
                break;
            case 'credentials': {
                const trimmedName = formData.name.trim();
                if (!trimmedName) {
                    setErrorMessage('Full name is required');
                    return;
                }
                if (trimmedName.length < 2) {
                    setErrorMessage('Full name must be at least 2 characters');
                    return;
                }
                const trimmedEmail = formData.email.trim();
                if (!trimmedEmail) {
                    setErrorMessage('Email is required');
                    return;
                }
                if (trimmedName !== formData.name) {
                    updateField('name', trimmedName);
                }
                if (trimmedEmail !== formData.email) {
                    updateField('email', trimmedEmail);
                }
                if (!isAuthenticatedOnboarding) {
                    const passwordError = getPasswordValidationError(formData.password);
                    if (passwordError) {
                        setErrorMessage(passwordError);
                        return;
                    }

                    // Step-wise validation: check email availability before proceeding
                    try {
                        setIsLoading(true);
                        await api.post('/api/v1/auth/check-email', { email: trimmedEmail });
                        lastCheckedEmailRef.current = trimmedEmail.toLowerCase();
                    } catch (err) {
                        console.error('[SignupOnboardingDialog] Email check error:', err);
                        const uiError = getAuthUiError(err, {
                            fallbackMessage: 'Email is already linked to an account. Sign in instead or use a different email.',
                            nameLabel: 'Email',
                        });
                        // For email conflicts, don't show support link since user can resolve it themselves
                        if (uiError.field === 'email') {
                            uiError.showSupportLink = false;
                        }
                        setError(uiError);
                        return;
                    } finally {
                        setIsLoading(false);
                    }
                }
                // Invite flow skips organizer-specific onboarding and goes straight to profile.
                if (isInviteFlow) {
                    setStep('profile');
                    break;
                }

                // Organizers go through granular steps, buyers go to profile
                setStep(formData.role === 'organizer' ? 'about-you' : 'profile');
                break;
            }
            case 'about-you':
                if (!formData.gender || !formData.dateOfBirth) {
                    setErrorMessage('All fields are required');
                    return;
                }
                setStep('organization');
                break;
            case 'organization': {
                const trimmedOrganizerName = formData.organizerName.trim();
                const trimmedOrganizerCharityNumber = formData.organizerCharityNumber.trim();
                if (formData.organizerType === 'charity' && !trimmedOrganizerCharityNumber) {
                    setErrorMessage('Charity number is required');
                    return;
                }
                if (!trimmedOrganizerName) {
                    setErrorMessage('Organization name is required');
                    return;
                }
                if (!formData.organizerType) {
                    setErrorMessage('Organization type is required');
                    return;
                }
                if (trimmedOrganizerName !== formData.organizerName) {
                    updateField('organizerName', trimmedOrganizerName);
                }
                if (trimmedOrganizerCharityNumber !== formData.organizerCharityNumber) {
                    updateField('organizerCharityNumber', trimmedOrganizerCharityNumber);
                }

                // Step-wise validation: check organization name availability before proceeding
                if (!isInviteFlow) {
                    try {
                        setIsLoading(true);
                        await api.post('/api/v1/auth/check-organizer-name', { name: trimmedOrganizerName });
                        lastCheckedOrganizerNameRef.current = trimmedOrganizerName;
                    } catch (err) {
                        console.error('[SignupOnboardingDialog] Org name check error:', err);
                        const uiError = getAuthUiError(err, {
                            fallbackMessage: 'Organization name is already taken. Please choose a different name.',
                            nameLabel: 'Organization name',
                        });
                        // For org name conflicts, don't show support link since user can resolve it themselves
                        if (uiError.field === 'organizerName') {
                            uiError.showSupportLink = false;
                        }
                        setError(uiError);
                        return;
                    } finally {
                        setIsLoading(false);
                    }
                }

                setStep('location');
                break;
            }
            case 'location': {
                const trimmedOrganizerCity = formData.organizerCity.trim();
                if (!formData.organizerCountry || !trimmedOrganizerCity || !formData.organizerTimezone) {
                    setErrorMessage('All fields are required');
                    return;
                }
                if (trimmedOrganizerCity !== formData.organizerCity) {
                    updateField('organizerCity', trimmedOrganizerCity);
                }
                setStep('currency');
                break;
            }
            case 'currency':
                if (!formData.organizerCurrency) {
                    setErrorMessage('Please select a currency');
                    return;
                }
                if (!acceptedTerms) {
                    setErrorMessage('You must accept the Terms of Use to create an account');
                    return;
                }
                await handleRegister();
                break;
            case 'profile': {
                // Buyer profile
                if (!formData.gender || !formData.dateOfBirth) {
                    setErrorMessage('All fields are required');
                    return;
                }
                const trimmedHomeCity = formData.homeCity.trim();
                if (!formData.homeCountry || !trimmedHomeCity) {
                    setErrorMessage('All fields are required');
                    return;
                }
                if (trimmedHomeCity !== formData.homeCity) {
                    updateField('homeCity', trimmedHomeCity);
                }
                if (!acceptedTerms) {
                    setErrorMessage('You must accept the Terms of Use to create an account');
                    return;
                }
                await handleRegister();
                break;
            }
            case 'stripe':
                handleComplete();
                break;
            case 'complete':
                handleComplete();
                break;
        }
    };
    const handleBack = () => {
        setDirection(-1);

        switch (step) {
            case 'currency':
                setStep('location');
                return;
            case 'location':
                setStep('organization');
                return;
            case 'organization':
                setStep('about-you');
                return;
            case 'about-you':
                setStep('credentials');
                return;
        }

        const previousStep = currentStepIndex > 0
            ? (steps[currentStepIndex - 1]?.id as Step | undefined)
            : undefined;
        if (previousStep) {
            setStep(previousStep);
        }
    };

    const getRegistrationError = (err: unknown) => {
        return getAuthUiError(err, {
            fallbackMessage: "We couldn't create your account. Please try again.",
            nameLabel: formData.role === 'organizer' ? 'Organization name' : 'Full name',
        });
    };

    const handleRegister = async () => {
        if (registerInFlightRef.current) {
            return;
        }

        registerInFlightRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const isOrganizer = formData.role === 'organizer';
            const organizerName = formData.organizerName.trim();
            const resolvedHomeCountry = formData.homeCountry || (isOrganizer ? formData.organizerCountry : '');
            const resolvedHomeCity = formData.homeCity || (isOrganizer ? formData.organizerCity : '');

            const payload: Record<string, unknown> = {
                email: formData.email,
                name: formData.name || undefined,
                isOrganizer,
                termsAccepted: acceptedTerms,
                termsVersion: TERMS_VERSION,
            };
            if (inviteToken && isInviteFlow) {
                payload.inviteToken = inviteToken;
            }

            if (formData.gender) payload.gender = formData.gender;
            if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
            if (resolvedHomeCountry) payload.homeCountry = resolvedHomeCountry;
            if (resolvedHomeCity) payload.homeCity = resolvedHomeCity;

            // Skip organizer creation for invite flow - they're joining an existing org
            if (isOrganizer && !isInviteFlow) {
                payload.organizer = {
                    name: organizerName || undefined,
                    type: formData.organizerType,
                    charityNumber: formData.organizerType === 'charity'
                        ? (formData.organizerCharityNumber.trim() || undefined)
                        : undefined,
                    country: formData.organizerCountry || undefined,
                    city: formData.organizerCity || undefined,
                    currency: formData.organizerCurrency || undefined,
                    timezone: formData.organizerTimezone || undefined,
                };
            }

            let organizerIdFromRegister: string | null = null;

            if (isAuthenticatedOnboarding) {
                const registerResponse = await api.post<RegisterResponse>('/api/v1/auth/onboarding', payload);
                organizerIdFromRegister = registerResponse.organizerId ?? null;

                if (organizerIdFromRegister) {
                    setOrganizerId(organizerIdFromRegister);
                }

                await refresh();
            } else {
                payload.password = formData.password;

                const registerResponse = await api.post<RegisterResponse>('/api/v1/auth/register', payload);
                organizerIdFromRegister = registerResponse.organizerId ?? null;

                if (organizerIdFromRegister) {
                    setOrganizerId(organizerIdFromRegister);
                }

                if (registerResponse.requiresEmailConfirmation) {
                    if (avatarFile && organizerIdFromRegister) {
                        try {
                            const dataUrl = avatarPreview || await fileToDataUrl(avatarFile);
                            window.localStorage.setItem(
                                PENDING_ORG_AVATAR_KEY,
                                JSON.stringify({ organizerId: organizerIdFromRegister, dataUrl })
                            );
                        } catch (storageError) {
                            console.warn('Failed to store organizer logo for later upload:', storageError);
                        }
                    }
                    setPendingEmailConfirmation(true);
                    setDirection(1);
                    setStep('complete');
                    return;
                }

                const loginResponse = await api.post<LoginResponse>('/api/v1/auth/login', {
                    email: formData.email,
                    password: formData.password,
                });

                setAuthToken(loginResponse.accessToken);
                setLastAuthMethod('password');
                setLastUsed('password');
                await refresh();
            }

            if (avatarFile && formData.role === 'organizer') {
                const organizerIdForUpload = organizerIdFromRegister;

                if (!organizerIdForUpload) {
                    console.warn('Organizer logo upload skipped: missing organizer ID');
                } else {
                    try {
                        await uploadOrganizerAvatar(organizerIdForUpload, avatarFile);
                        await refresh(); // Refresh to get updated avatar URL
                    } catch (uploadError) {
                        console.warn('Organizer logo upload error:', uploadError);
                        // Don't fail registration for logo upload issues
                    }
                }
            }

            setDirection(1);
            // Invite flow: skip Stripe step (they're joining, not creating an org)
            if (isInviteFlow) {
                setStep('complete');
            } else if (formData.role === 'organizer') {
                setStep('stripe');
            } else {
                setStep('complete');
            }
        } catch (err) {
            console.error('Registration error:', err);
            const uiError = getRegistrationError(err);
            setError(uiError);

            if (uiError.field === 'email' && steps.some((s) => s.id === 'credentials')) {
                setDirection(-1);
                setStep('credentials');
            }

            if (uiError.field === 'organizerName' && steps.some((s) => s.id === 'organization')) {
                setDirection(-1);
                setStep('organization');
            }
        } finally {
            setIsLoading(false);
            registerInFlightRef.current = false;
        }
    };

    const handleComplete = () => {
        if (pendingEmailConfirmation) {
            const loginContinuationPath = isInviteFlow ? inviteContinuationPath : redirectAfterComplete;
            if (loginContinuationPath && loginContinuationPath.startsWith('/')) {
                router.push(`/login?next=${encodeURIComponent(loginContinuationPath)}`);
            } else {
                router.push('/login');
            }
            onOpenChange(false);
            return;
        }

        const redirectTo = isInviteFlow
            ? (inviteContinuationPath ?? '/dashboard')
            : (redirectAfterComplete ?? (formData.role === 'organizer' ? '/dashboard' : '/events'));
        if (onComplete) {
            onComplete(redirectTo);
        } else {
            router.push(redirectTo);
        }
        onOpenChange(false);
    };

    const handleStripeConnect = async () => {
        if (!organizerId) {
            setErrorMessage('No organiser found. Please try again.');
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
                setErrorMessage('Unable to get Stripe connect URL');
            }
        } catch (err) {
            console.error('Stripe connect error:', err);
            setError(getAuthUiError(err, { fallbackMessage: 'Unable to connect Stripe. You can set this up later.' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerificationEmail = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const callbackContinuationPath = isInviteFlow ? inviteContinuationPath : redirectAfterComplete;
            const emailRedirectTo = `${window.location.origin}/auth/callback${callbackContinuationPath ? `?next=${encodeURIComponent(callbackContinuationPath)}` : ''}`;
            const { error } = await getSupabase().auth.resend({
                type: 'signup',
                email: formData.email,
                options: { emailRedirectTo },
            });

            if (error) {
                throw error;
            }

            toast.success('Verification email sent', { description: 'Check your inbox and spam folder.' });
        } catch (err) {
            console.error('Resend verification error:', err);
            toast.error(err, 'Unable to resend verification email');
            setError(getAuthUiError(err, { fallbackMessage: 'Unable to resend verification email.' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-0 gap-0 max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] border-0 shadow-2xl bg-white dark:bg-slate-900 *:data-[slot=dialog-close]:z-50 *:data-[slot=dialog-close]:bg-white *:data-[slot=dialog-close]:dark:bg-slate-800 *:data-[slot=dialog-close]:rounded-full *:data-[slot=dialog-close]:p-1.5 *:data-[slot=dialog-close]:shadow-md">
                <VisuallyHidden>
                    <DialogTitle>Create your account</DialogTitle>
                    <DialogDescription>Multi-step signup form</DialogDescription>
                </VisuallyHidden>



                {/* Mobile Header - Clean horizontal step bar */}
                {step !== 'complete' && (
                    <div className="lg:hidden bg-linear-to-r from-(--brand-mint) to-(--brand-cyan) shrink-0 relative z-10">
                        <div className="pl-4 pr-12 py-2.5">
                            <div className="flex items-center justify-between">
                                {/* Logo - white version for contrast */}
                                <div className="relative h-7 w-24 shrink-0">
                                    <Image
                                        src="/images/HTlogocr.png"
                                        alt="Halal Ticketin"
                                        fill
                                        className="object-contain object-left brightness-0 invert"
                                        priority
                                    />
                                </div>

                                {/* Step Progress - Centered, excluding intent step */}
                                <div className="flex items-center justify-center flex-1">
                                    {sidebarSteps.filter(s => s.id !== 'intent').map((s, idx) => {
                                        const stepIndex = steps.findIndex((stepItem) => stepItem.id === s.id);
                                        const highestIndex = steps.findIndex((stepItem) => stepItem.id === highestStepReached);
                                        const isCompleted = stepIndex > -1 && stepIndex < currentStepIndex;
                                        const isActive = step === s.id;
                                        // Allow clicking any step up to the highest reached
                                        const isClickable = stepIndex > -1 && stepIndex <= highestIndex;
                                        // Show all steps up to the highest reached (exclude intent which is step 0)
                                        const isVisible = stepIndex > 0 && stepIndex <= highestIndex;
                                        const stepNumber = idx + 1;

                                        if (!isVisible) return null;

                                        return (
                                            <motion.div
                                                key={s.id}
                                                className="flex items-center"
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <motion.button
                                                    onClick={() => {
                                                        if (isClickable) {
                                                            goToStep(s.id as Step);
                                                        }
                                                    }}
                                                    disabled={!isClickable}
                                                    className={cn(
                                                        'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all',
                                                        isActive
                                                            ? 'bg-white text-slate-800 shadow-md scale-110'
                                                            : isCompleted
                                                                ? 'bg-white/90 text-emerald-600'
                                                                : 'bg-white/40 text-slate-500',
                                                        isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                                                    )}
                                                    whileTap={isClickable ? { scale: 0.95 } : {}}
                                                >
                                                    {isCompleted ? <Check className="h-3 w-3" /> : stepNumber}
                                                </motion.button>
                                                {stepIndex < currentStepIndex && (
                                                    <motion.div
                                                        className="h-0.5 w-2 mx-0.5 bg-white/70"
                                                        initial={{ scaleX: 0 }}
                                                        animate={{ scaleX: 1 }}
                                                    />
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
                    {/* Desktop Left Panel - Split Screen */}
                    {step !== 'complete' && (
                        <aside className="hidden lg:flex flex-col w-[38%] shrink-0 bg-linear-to-br from-(--brand-mint) via-(--brand-cyan) to-(--brand-teal) relative overflow-hidden">
                            {/* Subtle overlay for depth */}
                            <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent" />

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full p-8">
                                {/* Dynamic Content - positioned higher */}
                                <div className="flex-1 flex flex-col justify-center -mt-4">
                                    <motion.div
                                        key={step}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3, ease: 'easeOut' }}
                                        className="space-y-3"
                                    >
                                        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                                            {STEP_CONTENT[step].headline}
                                        </h2>
                                        <p className="text-white/80 text-lg">
                                            {STEP_CONTENT[step].subtext}
                                        </p>
                                    </motion.div>

                                    {/* Horizontal Step Progress - Just below text */}
                                    {step !== 'intent' && (
                                        <div className="pt-6">
                                            <div className="flex items-center">
                                                {sidebarSteps.map((s, idx) => {
                                                    const stepIndex = steps.findIndex((stepItem) => stepItem.id === s.id);
                                                    const highestIndex = steps.findIndex((stepItem) => stepItem.id === highestStepReached);
                                                    const isCompleted = stepIndex > -1 && stepIndex < currentStepIndex;
                                                    const isActive = step === s.id;
                                                    // Allow clicking any step up to the highest reached
                                                    const isClickable = stepIndex > -1 && stepIndex <= highestIndex;
                                                    // Show all steps up to the highest reached
                                                    const isVisible = stepIndex <= highestIndex;
                                                    const stepNumber = idx + 1;

                                                    if (!isVisible) return null;

                                                    return (
                                                        <motion.div
                                                            key={s.id}
                                                            className="flex items-center"
                                                            initial={{ opacity: 0, scale: 0.5 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                        >
                                                            <motion.button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isClickable) {
                                                                        goToStep(s.id as Step);
                                                                    }
                                                                }}
                                                                disabled={!isClickable}
                                                                className={cn(
                                                                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                                                                    isActive
                                                                        ? 'bg-white text-slate-800 shadow-lg scale-110'
                                                                        : isCompleted
                                                                            ? 'bg-white/90 text-emerald-600'
                                                                            : 'bg-white/40 text-slate-500',
                                                                    isClickable ? 'cursor-pointer hover:bg-white/80' : 'cursor-not-allowed'
                                                                )}
                                                                whileHover={isClickable ? { scale: 1.15 } : {}}
                                                                whileTap={isClickable ? { scale: 0.95 } : {}}
                                                            >
                                                                {isCompleted ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <span>{stepNumber}</span>
                                                                )}
                                                            </motion.button>
                                                            {stepIndex < currentStepIndex && (
                                                                <motion.div
                                                                    className="h-0.5 w-4 mx-0.5 bg-white/70"
                                                                    initial={{ scaleX: 0 }}
                                                                    animate={{ scaleX: 1 }}
                                                                    transition={{ duration: 0.2, delay: idx * 0.05 + 0.1 }}
                                                                />
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Logo at bottom right - white version */}
                                <div className="mt-auto flex justify-end">
                                    <div className="relative h-10 w-32">
                                        <Image
                                            src="/images/HTlogocr.png"
                                            alt="Halal Ticketin"
                                            fill
                                            className="object-contain object-right brightness-0 invert"
                                            priority
                                        />
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 lg:p-10">
                        <AnimatePresence mode="wait" custom={direction}>
                            {/* Step: Intent */}
                            {step === 'intent' && (
                                <motion.div
                                    key="intent"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-8"
                                >
                                    <motion.div variants={staggerContainer} initial="hidden" animate="show">
                                        <motion.div variants={staggerItem} className="text-center lg:text-left space-y-6">

                                            <div className="text-center lg:text-left">
                                                <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-white mb-2 tracking-tight">
                                                    {STEP_CONTENT.intent.headline}
                                                </h2>
                                                <p className="text-slate-600 dark:text-slate-400 text-lg">
                                                    {STEP_CONTENT.intent.subtext}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </motion.div>

                                    <RadioGroup
                                        value={formData.role}
                                        onValueChange={(value) => updateField('role', value as 'buyer' | 'organizer')}
                                        className="grid grid-cols-1 gap-4"
                                    >
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Label
                                                htmlFor="role-organizer"
                                                className={cn(
                                                    'flex items-start gap-5 p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group',
                                                    formData.role === 'organizer'
                                                        ? 'border-(--brand-teal) bg-teal-50 dark:bg-teal-950/30 shadow-lg shadow-teal-500/10'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                                )}
                                            >
                                                <RadioGroupItem value="organizer" id="role-organizer" className="mt-1 hidden" />
                                                <div className={cn(
                                                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                                                    formData.role === 'organizer'
                                                        ? 'bg-linear-to-br from-(--brand-teal) to-emerald-500 text-white shadow-lg'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-200'
                                                )}>
                                                    <Megaphone className="h-7 w-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-xl text-slate-800 dark:text-white">Sell Tickets</span>
                                                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                        Create and manage your own events
                                                    </p>
                                                </div>
                                                {formData.role === 'organizer' && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linear-to-br from-(--brand-teal) to-emerald-500 flex items-center justify-center"
                                                    >
                                                        <Check className="h-5 w-5 text-white" />
                                                    </motion.div>
                                                )}
                                            </Label>
                                        </motion.div>

                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Label
                                                htmlFor="role-buyer"
                                                className={cn(
                                                    'flex items-start gap-5 p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group',
                                                    formData.role === 'buyer'
                                                        ? 'border-(--brand-cyan) bg-cyan-50 dark:bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                                                )}
                                            >
                                                <RadioGroupItem value="buyer" id="role-buyer" className="mt-1 hidden" />
                                                <div className={cn(
                                                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                                                    formData.role === 'buyer'
                                                        ? 'bg-linear-to-br from-(--brand-cyan) to-(--brand-teal) text-white shadow-lg'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-slate-200'
                                                )}>
                                                    <ShoppingBag className="h-7 w-7" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-xl text-slate-800 dark:text-white">Buy Tickets</span>
                                                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                                                        Discover and attend amazing halal-friendly events
                                                    </p>
                                                </div>
                                                {formData.role === 'buyer' && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-linear-to-br from-(--brand-cyan) to-(--brand-teal) flex items-center justify-center"
                                                    >
                                                        <Check className="h-5 w-5 text-white" />
                                                    </motion.div>
                                                )}
                                            </Label>
                                        </motion.div>
                                    </RadioGroup>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="space-y-4"
                                    >
                                        <Button
                                            onClick={handleNext}
                                            className="w-full h-14 text-lg font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5"
                                        >
                                            Continue
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>

                                        {!isAuthenticatedOnboarding && (
                                            <>
                                                <div className="flex items-center gap-4">
                                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
                                                    <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                                                        or
                                                    </span>
                                                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-300 to-transparent dark:via-slate-600" />
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    onClick={handleGoogleLogin}
                                                    disabled={isLoading}
                                                    className="w-full h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 font-semibold text-slate-700 dark:text-slate-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 rounded-xl relative overflow-visible"
                                                >
                                                    {lastUsed === 'google' && (
                                                        <span className="absolute -top-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-linear-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-500/30 border border-amber-300/50 whitespace-nowrap z-10">
                                                            Last used
                                                        </span>
                                                    )}
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
                                            </>
                                        )}
                                    </motion.div>
                                </motion.div>
                            )}

                            {/* Step: Credentials */}
                            {step === 'credentials' && (
                                <motion.div
                                    key="credentials"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">
                                            Create your account
                                        </h2>
                                    </div>

                                    <motion.div
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="show"
                                        className="space-y-4"
                                    >
                                        <motion.div variants={staggerItem} className="space-y-2">
                                            <Label htmlFor="name" className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <User className="h-4 w-4 text-slate-400" />
                                                Full Name
                                            </Label>
                                            <Input
                                                id="name"
                                                placeholder="Your full name"
                                                value={formData.name}
                                                onChange={(e) => updateField('name', e.target.value)}
                                                minLength={2}
                                                maxLength={80}
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-(--brand-cyan) focus:ring-(--brand-cyan)/20 transition-all"
                                            />
                                        </motion.div>

                                        <motion.div variants={staggerItem} className="space-y-2">
                                            <Label htmlFor="email" className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                Email Address
                                                {isInviteFlow && (
                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                                                        (from invitation)
                                                    </span>
                                                )}
                                                {showSignInEmailHint && (
                                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                                                        (from sign-in)
                                                    </span>
                                                )}
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={formData.email}
                                                onChange={(e) => {
                                                    emailEditedRef.current = true;
                                                    updateField('email', e.target.value);
                                                }}
                                                disabled={isEmailLocked}
                                                maxLength={254}
                                                className={cn(
                                                    "h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-(--brand-cyan) focus:ring-(--brand-cyan)/20 transition-all rounded-xl",
                                                    isEmailLocked && "bg-slate-100 dark:bg-slate-800 cursor-not-allowed opacity-80"
                                                )}
                                                required
                                            />
                                        </motion.div>

                                        {!isAuthenticatedOnboarding && (
                                            <motion.div variants={staggerItem} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="password" className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                                                        <Lock className="h-4 w-4 text-slate-400" />
                                                        Choose a password
                                                    </Label>
                                                    <div className="relative group">
                                                        <Input
                                                            id="password"
                                                            type={showPassword ? 'text' : 'password'}
                                                            placeholder="••••••••"
                                                            value={formData.password}
                                                            onChange={(e) => updateField('password', e.target.value)}
                                                            onFocus={() => setPasswordFocused(true)}
                                                            onBlur={() => setPasswordFocused(false)}
                                                            className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-(--brand-cyan) focus:ring-(--brand-cyan)/20 transition-all pr-12 rounded-xl"
                                                            required
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
                                                </div>

                                                {/* Password requirements - animated reveal on focus */}
                                                <AnimatePresence>
                                                    {(passwordFocused || formData.password.length > 0) && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                                            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                                            transition={{ duration: 0.2, ease: 'easeOut' }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                {([
                                                                    { label: '8+ characters', regex: /.{8,}/ },
                                                                    { label: 'Upper & Lowercase', regex: /^(?=.*[a-z])(?=.*[A-Z]).+$/ },
                                                                    { label: 'Numbers', regex: /\d/ },
                                                                    { label: 'Symbols', regex: /[^A-Za-z0-9\s]/ },
                                                                ]).map((req) => {
                                                                    const isMet = req.regex.test(formData.password);
                                                                    return (
                                                                        <div key={req.label} className="flex items-center gap-2.5">
                                                                            <div className={cn(
                                                                                "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300 border",
                                                                                isMet
                                                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                                                    : formData.password
                                                                                        ? "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400"
                                                                                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300"
                                                                            )}>
                                                                                <Check className={cn("h-3 w-3 transition-transform duration-300", isMet ? "scale-100" : "scale-0")} />
                                                                            </div>
                                                                            <span className={cn(
                                                                                "text-[13px] transition-colors duration-300",
                                                                                isMet ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500"
                                                                            )}>
                                                                                {req.label}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            disabled={isLoading || !canGoBack}
                                            className="h-12 px-6 border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 shadow-lg shadow-cyan-500/20"
                                        >
                                            Continue
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
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
                                    <motion.div variants={staggerContainer} initial="hidden" animate="show">
                                        <div className="space-y-4">
                                            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>
                                                        Gender
                                                    </Label>
                                                    <Select
                                                        value={formData.gender}
                                                        onValueChange={(value) => updateField('gender', value as 'male' | 'female')}
                                                    >
                                                        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-slate-400" />
                                                        Date of Birth
                                                    </Label>
                                                    <DatePicker
                                                        value={formData.dateOfBirth}
                                                        onChange={(value) => updateField('dateOfBirth', value)}
                                                        placeholder="Select date of birth"
                                                        className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                        maxDate={new Date()}
                                                        showYearMonthDropdowns
                                                    />
                                                </div>
                                            </motion.div>

                                            <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        Country
                                                    </Label>
                                                    <Select
                                                        value={formData.homeCountry}
                                                        onValueChange={(value) => updateField('homeCountry', value)}
                                                    >
                                                        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
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
                                                    <Label>City</Label>
                                                    <Input
                                                        placeholder="Your city"
                                                        value={formData.homeCity}
                                                        onChange={(e) => updateField('homeCity', e.target.value)}
                                                        className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                    />
                                                </div>
                                            </motion.div>
                                        </div>
                                    </motion.div>

                                    <motion.div variants={staggerItem} className="pt-4">
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                                            <Checkbox
                                                id="terms-of-use"
                                                checked={acceptedTerms}
                                                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                                className="mt-0.5 h-5 w-5 border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:bg-(--brand-teal) data-[state=checked]:border-(--brand-teal)"
                                            />
                                            <Label
                                                htmlFor="terms-of-use"
                                                className="flex-1 block text-sm text-slate-600 dark:text-slate-400 cursor-pointer leading-relaxed"
                                            >
                                                I agree to the{' '}
                                                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-(--brand-teal) hover:text-(--brand-cyan) font-medium underline underline-offset-2 transition-colors">Terms of Use</a>{' '}
                                                and{' '}
                                                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-(--brand-teal) hover:text-(--brand-cyan) font-medium underline underline-offset-2 transition-colors">Privacy Policy</a>
                                            </Label>
                                        </div>
                                    </motion.div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            disabled={isLoading || !canGoBack}
                                            className="h-12 px-6 border-2"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 shadow-lg shadow-cyan-500/20"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Creating account...
                                                </>
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight className="ml-2 h-5 w-5" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: About You (Organizer) */}
                            {step === 'about-you' && (
                                <motion.div
                                    key="about-you"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">
                                            Tell us about you
                                        </h2>
                                    </div>

                                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Gender</Label>
                                            <Select
                                                value={formData.gender}
                                                onValueChange={(value) => updateField('gender', value as 'male' | 'female')}
                                            >
                                                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Date of Birth</Label>
                                            <DatePicker
                                                value={formData.dateOfBirth}
                                                onChange={(value) => updateField('dateOfBirth', value)}
                                                placeholder="Select date of birth"
                                                className="h-11 bg-white dark:bg-slate-800"
                                                maxDate={new Date()}
                                                showYearMonthDropdowns
                                            />
                                        </div>
                                    </motion.div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={handleBack} disabled={isLoading} className="h-12 px-6 border-2">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal)"
                                        >
                                            Next Step <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Organization Details */}
                            {step === 'organization' && (
                                <motion.div
                                    key="organization"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">Organization Details</h2>
                                    </div>

                                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="relative group">
                                                <input
                                                    ref={avatarInputRef}
                                                    type="file"
                                                    accept={AVATAR_ACCEPT}
                                                    onChange={handleAvatarSelect}
                                                    className="hidden"
                                                    id="avatar-upload-org"
                                                />
                                                <label
                                                    htmlFor="avatar-upload-org"
                                                    className={cn(
                                                        'relative flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-all overflow-hidden',
                                                        avatarPreview
                                                            ? 'border-transparent'
                                                            : 'border-slate-300 dark:border-slate-600 hover:border-(--brand-cyan) bg-slate-50 dark:bg-slate-800'
                                                    )}
                                                >
                                                    {avatarPreview ? (
                                                        <Image
                                                            src={avatarPreview}
                                                            alt="Avatar preview"
                                                            fill
                                                            sizes="64px"
                                                            className="object-cover"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <Camera className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </label>
                                                {avatarPreview && (
                                                    <button
                                                        type="button"
                                                        onClick={removeAvatar}
                                                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors z-10"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Upload Logo</p>
                                                <p className="text-xs text-slate-500">400x400px, JPG/PNG, 2MB max</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Organization Name</Label>
                                            <Input
                                                placeholder="Brand or organization name"
                                                value={formData.organizerName}
                                                onChange={(e) => updateField('organizerName', e.target.value)}
                                                className="h-11 bg-white dark:bg-slate-800"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <RadioGroup
                                                value={formData.organizerType}
                                                onValueChange={(value) => updateField('organizerType', value as FormData['organizerType'])}
                                                className="grid grid-cols-3 gap-2"
                                            >
                                                {['individual', 'organization', 'charity'].map((type) => (
                                                    <Label
                                                        key={type}
                                                        htmlFor={`type-${type}`}
                                                        className={cn(
                                                            'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-all text-center',
                                                            formData.organizerType === type
                                                                ? 'border-(--brand-cyan) bg-cyan-50/50 dark:bg-cyan-950/20'
                                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                        )}
                                                    >
                                                        <RadioGroupItem value={type} id={`type-${type}`} className="sr-only" />
                                                        {type === 'individual' && <User className="h-4 w-4 opacity-70" />}
                                                        {type === 'organization' && <Building2 className="h-4 w-4 opacity-70" />}
                                                        {type === 'charity' && <Heart className="h-4 w-4 opacity-70" />}
                                                        <span className="text-xs font-medium capitalize">{type}</span>
                                                    </Label>
                                                ))}
                                            </RadioGroup>
                                        </div>

                                        {formData.organizerType === 'charity' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                                                <Label>Charity Number</Label>
                                                <Input
                                                    placeholder="Registration number"
                                                    value={formData.organizerCharityNumber}
                                                    onChange={(e) => updateField('organizerCharityNumber', e.target.value)}
                                                    className="h-11 bg-white dark:bg-slate-800"
                                                />
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={handleBack} disabled={isLoading} className="h-12 px-6 border-2">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal)"
                                        >
                                            Next Step <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Location */}
                            {step === 'location' && (
                                <motion.div
                                    key="location"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">Location & Timezone</h2>
                                    </div>

                                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Country</Label>
                                            <Select
                                                value={formData.organizerCountry}
                                                onValueChange={(value) => updateField('organizerCountry', value)}
                                            >
                                                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
                                            <Label>City</Label>
                                            <Input
                                                placeholder="City"
                                                value={formData.organizerCity}
                                                onChange={(e) => updateField('organizerCity', e.target.value)}
                                                className="h-11 bg-white dark:bg-slate-800"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Timezone</Label>
                                            <Select
                                                value={formData.organizerTimezone}
                                                onValueChange={(value) => updateField('organizerTimezone', value)}
                                            >
                                                <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={handleBack} disabled={isLoading} className="h-12 px-6 border-2">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal)"
                                        >
                                            Next Step <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Currency */}
                            {step === 'currency' && (
                                <motion.div
                                    key="currency"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">Currency</h2>

                                    </div>

                                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            {CURRENCIES.map((currency) => (
                                                <div
                                                    key={currency.code}
                                                    onClick={() => updateField('organizerCurrency', currency.code)}
                                                    className={cn(
                                                        "cursor-pointer flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                                                        formData.organizerCurrency === currency.code
                                                            ? "border-(--brand-cyan) bg-cyan-50/50 dark:bg-cyan-950/20"
                                                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-bold text-xs">{currency.symbol}</div>
                                                        <span className="text-sm font-medium">{currency.name}</span>
                                                    </div>
                                                    {formData.organizerCurrency === currency.code && <Check className="w-4 h-4 text-(--brand-cyan)" />}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700">
                                                <Checkbox
                                                    id="terms-of-use-org"
                                                    checked={acceptedTerms}
                                                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                                                    className="mt-0.5 h-4 w-4 border-2 border-slate-400 dark:border-slate-500 data-[state=checked]:bg-(--brand-teal) data-[state=checked]:border-(--brand-teal)"
                                                />
                                                <Label
                                                    htmlFor="terms-of-use-org"
                                                    className="flex-1 block text-sm text-slate-600 dark:text-slate-400 cursor-pointer leading-relaxed"
                                                >
                                                    I agree to the{' '}
                                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-(--brand-teal) hover:text-(--brand-cyan) font-medium underline underline-offset-2 transition-colors">Terms of Use</a>{' '}
                                                    and{' '}
                                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-(--brand-teal) hover:text-(--brand-cyan) font-medium underline underline-offset-2 transition-colors">Privacy Policy</a>
                                                </Label>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800"
                                        >
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={handleBack} disabled={isLoading} className="h-12 px-6 border-2">
                                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal)"
                                        >
                                            Create Account <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step: Stripe Connect */}
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
                                    </div>

                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="bg-linear-to-br from-violet-50 via-indigo-50 to-purple-50 dark:from-violet-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-3xl p-10 text-center relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.15),transparent_50%)]" />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.15),transparent_50%)]" />
                                        <div className="relative">
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                                className="w-20 h-20 mx-auto mb-6 bg-linear-to-r from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/30"
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
                                            {renderErrorMessage(error)}
                                        </motion.p>
                                    )}

                                    <div className="space-y-3">
                                        <Button
                                            onClick={handleStripeConnect}
                                            disabled={isLoading}
                                            className="w-full h-14 text-lg font-semibold bg-linear-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 shadow-xl shadow-violet-500/20"
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
                                            className="w-full h-12 text-slate-500 hover:text-slate-700"
                                        >
                                            Skip for now, set up later in Settings
                                        </Button>
                                    </div>

                                    <p className="text-xs text-center text-slate-500">
                                        You can publish free events without Stripe. Paid events require payment setup.
                                    </p>
                                </motion.div>
                            )}

                            {/* Step: Complete */}
                            {step === 'complete' && (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                    className="text-center space-y-8 py-10"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                                        className="relative inline-block"
                                    >
                                        <div className="absolute inset-0 bg-linear-to-br from-emerald-400 to-green-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                                        <div className="relative w-24 h-24 bg-linear-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                                            <CheckCircle className="h-12 w-12 text-white" />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-white">
                                            {pendingEmailConfirmation ? 'Check your email' : 'You\'re all set!'}
                                        </h2>
                                        <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg">
                                            {pendingEmailConfirmation
                                                ? 'We sent a verification link. Click it to confirm your email and sign in.'
                                                : (formData.role === 'organizer'
                                                    ? 'Your organiser account is ready. Let\'s create your first event!'
                                                    : 'Welcome! Explore amazing events happening near you.')}
                                        </p>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                    >
                                        <div className="space-y-3">
                                            <Button
                                                onClick={handleComplete}
                                                className="h-14 px-10 text-lg font-semibold bg-linear-to-r from-(--brand-cyan) to-(--brand-teal) hover:from-(--brand-teal) hover:to-emerald-500 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all w-full"
                                                disabled={isLoading}
                                            >
                                                {pendingEmailConfirmation
                                                    ? 'Go to Login'
                                                    : (formData.role === 'organizer' ? 'Go to Dashboard' : 'Browse Events')}
                                                <ArrowRight className="ml-2 h-5 w-5" />
                                            </Button>

                                            {pendingEmailConfirmation && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={handleResendVerificationEmail}
                                                    disabled={isLoading || !formData.email}
                                                    className="w-full h-12 text-slate-500 hover:text-slate-700"
                                                >
                                                    Resend verification email
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}
