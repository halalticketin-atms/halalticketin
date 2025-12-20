'use client';

import { useState, useRef, type ChangeEvent } from 'react';
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
    Sparkles,
    Camera,
    X,
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
import api, { setAuthToken } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

const COUNTRIES = [
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AL', name: 'Albania' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AO', name: 'Angola' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AU', name: 'Australia' },
    { code: 'AT', name: 'Austria' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BZ', name: 'Belize' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BR', name: 'Brazil' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BI', name: 'Burundi' },
    { code: 'CV', name: 'Cabo Verde' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CA', name: 'Canada' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'TD', name: 'Chad' },
    { code: 'CL', name: 'Chile' },
    { code: 'CN', name: 'China' },
    { code: 'CO', name: 'Colombia' },
    { code: 'KM', name: 'Comoros' },
    { code: 'CG', name: 'Congo' },
    { code: 'CD', name: 'Congo (DRC)' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CI', name: "Côte d'Ivoire" },
    { code: 'HR', name: 'Croatia' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czechia' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EG', name: 'Egypt' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'EE', name: 'Estonia' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FI', name: 'Finland' },
    { code: 'FR', name: 'France' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GE', name: 'Georgia' },
    { code: 'DE', name: 'Germany' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GR', name: 'Greece' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HU', name: 'Hungary' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IN', name: 'India' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IR', name: 'Iran' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JP', name: 'Japan' },
    { code: 'JO', name: 'Jordan' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KR', name: 'South Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'LA', name: 'Laos' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LY', name: 'Libya' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MV', name: 'Maldives' },
    { code: 'ML', name: 'Mali' },
    { code: 'MT', name: 'Malta' },
    { code: 'MH', name: 'Marshall Islands' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MX', name: 'Mexico' },
    { code: 'FM', name: 'Micronesia' },
    { code: 'MD', name: 'Moldova' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NE', name: 'Niger' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'NO', name: 'Norway' },
    { code: 'OM', name: 'Oman' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PW', name: 'Palau' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PA', name: 'Panama' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'PE', name: 'Peru' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PL', name: 'Poland' },
    { code: 'PT', name: 'Portugal' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'WS', name: 'Samoa' },
    { code: 'SM', name: 'San Marino' },
    { code: 'ST', name: 'Sao Tome and Principe' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SN', name: 'Senegal' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SG', name: 'Singapore' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SO', name: 'Somalia' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ES', name: 'Spain' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SE', name: 'Sweden' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'SY', name: 'Syria' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'TH', name: 'Thailand' },
    { code: 'TL', name: 'Timor-Leste' },
    { code: 'TG', name: 'Togo' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'VA', name: 'Vatican City' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'YE', name: 'Yemen' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' },
];

const CURRENCIES = [
    { code: 'GBP', name: 'British Pound' },
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'AED', name: 'UAE Dirham' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'MYR', name: 'Malaysian Ringgit' },
];

const TIMEZONES = [
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
    { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

const BUYER_STEPS = [
    { id: 'intent', title: 'Welcome', description: 'Choose your path', icon: Sparkles },
    { id: 'credentials', title: 'Account', description: 'Create your account', icon: User },
    { id: 'profile', title: 'Profile', description: 'About you', icon: MapPin },
];

const ORGANIZER_STEPS = [
    { id: 'intent', title: 'Welcome', description: 'Choose your path', icon: Sparkles },
    { id: 'credentials', title: 'Account', description: 'Create your account', icon: User },
    { id: 'profile', title: 'Organization', description: 'Your brand', icon: Building2 },
    { id: 'stripe', title: 'Payments', description: 'Get paid', icon: CreditCard },
];

interface SignupOnboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultRole?: 'buyer' | 'organizer';
    redirectAfterComplete?: string;
    onComplete?: (redirectTo: string) => void;
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
}

type Step = 'intent' | 'credentials' | 'profile' | 'stripe' | 'complete';

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
    organizerType: 'individual' | 'organization';
    organizerCountry: string;
    organizerCity: string;
    organizerCurrency: string;
    organizerTimezone: string;
}

const initialFormData: FormData = {
    role: 'buyer',
    email: '',
    password: '',
    name: '',
    gender: '',
    dateOfBirth: '',
    homeCountry: '',
    homeCity: '',
    organizerName: '',
    organizerType: 'individual',
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

export function SignupOnboardingDialog({
    open,
    onOpenChange,
    defaultRole,
    redirectAfterComplete,
    onComplete,
}: SignupOnboardingDialogProps) {
    const [step, setStep] = useState<Step>('intent');
    const [direction, setDirection] = useState(1);
    const [formData, setFormData] = useState<FormData>({
        ...initialFormData,
        role: defaultRole ?? 'buyer',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [organizerId, setOrganizerId] = useState<string | null>(null);

    // Avatar upload state
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { refresh } = useAuth();

    const steps = formData.role === 'organizer' ? ORGANIZER_STEPS : BUYER_STEPS;
    const currentStepIndex = steps.findIndex(s => s.id === step);

    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAvatarSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
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
        if (targetIndex <= currentStepIndex) {
            setDirection(dir || (targetIndex > currentStepIndex ? 1 : -1));
            setStep(stepId);
        }
    };

    const handleNext = async () => {
        setError(null);
        setDirection(1);

        switch (step) {
            case 'intent':
                setStep('credentials');
                break;
            case 'credentials':
                if (!formData.email || !formData.password) {
                    setError('Email and password are required');
                    return;
                }
                if (formData.password.length < 8) {
                    setError('Password must be at least 8 characters');
                    return;
                }
                setStep('profile');
                break;
            case 'profile':
                await handleRegister();
                break;
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
            case 'credentials':
                setStep('intent');
                break;
            case 'profile':
                setStep('credentials');
                break;
            case 'stripe':
                setStep('profile');
                break;
        }
    };

    const handleRegister = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const payload: Record<string, unknown> = {
                email: formData.email,
                password: formData.password,
                name: formData.name || undefined,
                isOrganizer: formData.role === 'organizer',
            };

            if (formData.gender) payload.gender = formData.gender;
            if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
            if (formData.homeCountry) payload.homeCountry = formData.homeCountry;
            if (formData.homeCity) payload.homeCity = formData.homeCity;

            if (formData.role === 'organizer' && formData.organizerName) {
                payload.organizer = {
                    name: formData.organizerName,
                    type: formData.organizerType,
                    country: formData.organizerCountry || undefined,
                    city: formData.organizerCity || undefined,
                    currency: formData.organizerCurrency || undefined,
                    timezone: formData.organizerTimezone || undefined,
                };
            }

            const registerResponse = await api.post<RegisterResponse>('/api/v1/auth/register', payload);

            if (registerResponse.organizerId) {
                setOrganizerId(registerResponse.organizerId);
            }

            const loginResponse = await api.post<LoginResponse>('/api/v1/auth/login', {
                email: formData.email,
                password: formData.password,
            });

            setAuthToken(loginResponse.accessToken);
            await refresh();

            // Upload avatar if one was selected (optional, don't fail registration if upload fails)
            if (avatarFile) {
                try {
                    const formDataUpload = new FormData();
                    formDataUpload.append('file', avatarFile);

                    const uploadResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/uploads/avatar`,
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${loginResponse.accessToken}`,
                            },
                            body: formDataUpload,
                        }
                    );

                    if (!uploadResponse.ok) {
                        console.warn('Avatar upload failed, continuing without avatar');
                    }
                } catch (uploadError) {
                    console.warn('Avatar upload error:', uploadError);
                    // Don't fail registration for avatar upload issues
                }
            }

            setDirection(1);
            if (formData.role === 'organizer') {
                setStep('stripe');
            } else {
                setStep('complete');
            }
        } catch (err) {
            console.error('Registration error:', err);
            setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = () => {
        const redirectTo = redirectAfterComplete ?? (formData.role === 'organizer' ? '/dashboard' : '/events');
        if (onComplete) {
            onComplete(redirectTo);
        } else {
            router.push(redirectTo);
        }
        onOpenChange(false);
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

    const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl lg:max-w-4xl p-0 gap-0 overflow-hidden max-h-[90vh] border-0 shadow-2xl bg-gradient-to-br from-white via-slate-50/80 to-cyan-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 [&>[data-slot=dialog-close]]:z-50 [&>[data-slot=dialog-close]]:bg-white/80 [&>[data-slot=dialog-close]]:dark:bg-slate-800/80 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:backdrop-blur-sm [&>[data-slot=dialog-close]]:shadow-md">
                <VisuallyHidden>
                    <DialogTitle>Create your account</DialogTitle>
                    <DialogDescription>Multi-step signup form</DialogDescription>
                </VisuallyHidden>

                {/* Ambient background glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-teal-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-teal-400/15 to-emerald-400/15 rounded-full blur-3xl" />
                </div>

                {/* Progress bar */}
                {step !== 'complete' && (
                    <div className="h-1.5 bg-slate-200/50 dark:bg-slate-700/50 relative z-10 shrink-0">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[var(--brand-cyan)] via-[var(--brand-teal)] to-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        />
                    </div>
                )}

                {/* Mobile Step Indicator */}
                {step !== 'complete' && (
                    <div className="lg:hidden border-b border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shrink-0 relative z-10">
                        <div className="px-4 py-4">
                            <div className="flex items-center justify-between">
                                {steps.map((s, idx) => (
                                    <motion.button
                                        key={s.id}
                                        onClick={() => goToStep(s.id as Step)}
                                        className="flex flex-col items-center gap-1.5 relative"
                                        disabled={idx > currentStepIndex}
                                        whileHover={idx <= currentStepIndex ? { scale: 1.05 } : {}}
                                        whileTap={idx <= currentStepIndex ? { scale: 0.95 } : {}}
                                    >
                                        <motion.div
                                            className={cn(
                                                'flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold transition-all relative',
                                                step === s.id
                                                    ? 'bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-lg shadow-cyan-500/25'
                                                    : idx < currentStepIndex
                                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                            )}
                                            animate={step === s.id ? { scale: [1, 1.05, 1] } : {}}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {idx < currentStepIndex ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                        </motion.div>
                                        <span className={cn(
                                            'text-xs font-medium transition-colors',
                                            step === s.id ? 'text-[var(--brand-teal)]' : 'text-slate-500'
                                        )}>
                                            {s.title}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
                    {/* Desktop Sidebar */}
                    {step !== 'complete' && (
                        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-gradient-to-b from-slate-50/80 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border-r border-slate-200/50 dark:border-slate-700/50 p-5 backdrop-blur-sm">
                            <div className="space-y-2">
                                {steps.map((s, idx) => (
                                    <motion.button
                                        key={s.id}
                                        onClick={() => goToStep(s.id as Step)}
                                        disabled={idx > currentStepIndex}
                                        whileHover={idx <= currentStepIndex ? { x: 4 } : {}}
                                        whileTap={idx <= currentStepIndex ? { scale: 0.98 } : {}}
                                        className={cn(
                                            'w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all duration-300',
                                            step === s.id
                                                ? 'bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-xl shadow-cyan-500/20'
                                                : idx < currentStepIndex
                                                    ? 'bg-white/60 dark:bg-slate-700/40 hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer'
                                                    : 'bg-slate-100/50 dark:bg-slate-800/30 cursor-not-allowed opacity-50'
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
                                                step === s.id
                                                    ? 'bg-white/20'
                                                    : idx < currentStepIndex
                                                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                                                        : 'bg-slate-200/80 dark:bg-slate-700'
                                            )}
                                        >
                                            {idx < currentStepIndex ? (
                                                <Check className="h-5 w-5" />
                                            ) : (
                                                <s.icon className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold">{s.title}</p>
                                            <p className={cn(
                                                'text-sm truncate',
                                                step === s.id ? 'text-white/70' : 'text-slate-500'
                                            )}>
                                                {s.description}
                                            </p>
                                        </div>
                                    </motion.button>
                                ))}
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
                                        <motion.div variants={staggerItem} className="text-center lg:text-left">
                                            <h2 className="text-3xl lg:text-4xl font-display font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                                Welcome to Halal Ticketin&apos;
                                            </h2>
                                            <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg">
                                                How would you like to get started?
                                            </p>
                                        </motion.div>
                                    </motion.div>

                                    <RadioGroup
                                        value={formData.role}
                                        onValueChange={(value) => updateField('role', value as 'buyer' | 'organizer')}
                                        className="grid grid-cols-1 gap-4"
                                    >
                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Label
                                                htmlFor="role-buyer"
                                                className={cn(
                                                    'flex items-start gap-5 p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group',
                                                    formData.role === 'buyer'
                                                        ? 'border-[var(--brand-cyan)] bg-gradient-to-br from-cyan-50 to-teal-50/50 dark:from-cyan-950/30 dark:to-teal-950/20 shadow-lg shadow-cyan-500/10'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/50'
                                                )}
                                            >
                                                <RadioGroupItem value="buyer" id="role-buyer" className="mt-1 hidden" />
                                                <div className={cn(
                                                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                                                    formData.role === 'buyer'
                                                        ? 'bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] text-white shadow-lg'
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
                                                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-cyan)] to-[var(--brand-teal)] flex items-center justify-center"
                                                    >
                                                        <Check className="h-5 w-5 text-white" />
                                                    </motion.div>
                                                )}
                                            </Label>
                                        </motion.div>

                                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                            <Label
                                                htmlFor="role-organizer"
                                                className={cn(
                                                    'flex items-start gap-5 p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group',
                                                    formData.role === 'organizer'
                                                        ? 'border-[var(--brand-teal)] bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/20 shadow-lg shadow-teal-500/10'
                                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white/50 dark:bg-slate-800/50'
                                                )}
                                            >
                                                <RadioGroupItem value="organizer" id="role-organizer" className="mt-1 hidden" />
                                                <div className={cn(
                                                    'w-14 h-14 rounded-2xl flex items-center justify-center transition-all',
                                                    formData.role === 'organizer'
                                                        ? 'bg-gradient-to-br from-[var(--brand-teal)] to-emerald-500 text-white shadow-lg'
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
                                                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-teal)] to-emerald-500 flex items-center justify-center"
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
                                    >
                                        <Button
                                            onClick={handleNext}
                                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 transition-all duration-300 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5"
                                        >
                                            Continue
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
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
                                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                                            Enter your details to get started
                                        </p>
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
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all"
                                            />
                                        </motion.div>

                                        <motion.div variants={staggerItem} className="space-y-2">
                                            <Label htmlFor="email" className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                Email Address <span className="text-rose-500">*</span>
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={formData.email}
                                                onChange={(e) => updateField('email', e.target.value)}
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all"
                                                required
                                            />
                                        </motion.div>

                                        <motion.div variants={staggerItem} className="space-y-2">
                                            <Label htmlFor="password" className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Lock className="h-4 w-4 text-slate-400" />
                                                Password <span className="text-rose-500">*</span>
                                            </Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                placeholder="At least 8 characters"
                                                value={formData.password}
                                                onChange={(e) => updateField('password', e.target.value)}
                                                className="h-12 bg-white/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:border-[var(--brand-cyan)] focus:ring-[var(--brand-cyan)]/20 transition-all"
                                                required
                                            />
                                        </motion.div>
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

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            className="h-12 px-6 border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            className="flex-1 h-12 font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 shadow-lg shadow-cyan-500/20"
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
                                    <div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-slate-800 dark:text-white">
                                            {formData.role === 'organizer' ? 'Set up your organization' : 'Tell us about yourself'}
                                        </h2>
                                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                                            {formData.role === 'organizer'
                                                ? 'This helps attendees discover your events'
                                                : 'All fields are optional'}
                                        </p>
                                    </div>

                                    <motion.div variants={staggerContainer} initial="hidden" animate="show">
                                        {formData.role === 'buyer' ? (
                                            <div className="space-y-4">
                                                {/* Avatar Upload */}
                                                <motion.div variants={staggerItem} className="flex flex-col items-center gap-3">
                                                    <Label className="text-sm text-slate-600 dark:text-slate-400">
                                                        Profile Photo <span className="text-slate-400">(Optional)</span>
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
                                                                'flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-all overflow-hidden',
                                                                avatarPreview
                                                                    ? 'border-transparent'
                                                                    : 'border-slate-300 dark:border-slate-600 hover:border-[var(--brand-cyan)] bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                            )}
                                                        >
                                                            {avatarPreview ? (
                                                                <img
                                                                    src={avatarPreview}
                                                                    alt="Avatar preview"
                                                                    className="h-full w-full object-cover"
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

                                                <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Gender</Label>
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
                                                        <Input
                                                            type="date"
                                                            value={formData.dateOfBirth}
                                                            onChange={(e) => updateField('dateOfBirth', e.target.value)}
                                                            className="h-12 bg-white/70 dark:bg-slate-800/70"
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
                                        ) : (
                                            <div className="space-y-4">
                                                {/* Avatar Upload for Organizer */}
                                                <motion.div variants={staggerItem} className="flex flex-col items-center gap-3">
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
                                                            id="avatar-upload-org"
                                                        />
                                                        <label
                                                            htmlFor="avatar-upload-org"
                                                            className={cn(
                                                                'flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-all overflow-hidden',
                                                                avatarPreview
                                                                    ? 'border-transparent'
                                                                    : 'border-slate-300 dark:border-slate-600 hover:border-[var(--brand-cyan)] bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                            )}
                                                        >
                                                            {avatarPreview ? (
                                                                <img
                                                                    src={avatarPreview}
                                                                    alt="Avatar preview"
                                                                    className="h-full w-full object-cover"
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

                                                <motion.div variants={staggerItem} className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <Building2 className="h-4 w-4 text-slate-400" />
                                                        Organization / Brand Name
                                                    </Label>
                                                    <Input
                                                        placeholder="Your brand or organization name"
                                                        value={formData.organizerName}
                                                        onChange={(e) => updateField('organizerName', e.target.value)}
                                                        className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                    />
                                                </motion.div>

                                                <motion.div variants={staggerItem} className="space-y-2">
                                                    <Label>Organization Type</Label>
                                                    <RadioGroup
                                                        value={formData.organizerType}
                                                        onValueChange={(value) => updateField('organizerType', value as 'individual' | 'organization')}
                                                        className="flex gap-4"
                                                    >
                                                        <Label
                                                            htmlFor="type-individual"
                                                            className={cn(
                                                                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
                                                                formData.organizerType === 'individual'
                                                                    ? 'border-[var(--brand-cyan)] bg-cyan-50/50'
                                                                    : 'border-slate-200 hover:border-slate-300'
                                                            )}
                                                        >
                                                            <RadioGroupItem value="individual" id="type-individual" />
                                                            Individual
                                                        </Label>
                                                        <Label
                                                            htmlFor="type-org"
                                                            className={cn(
                                                                'flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
                                                                formData.organizerType === 'organization'
                                                                    ? 'border-[var(--brand-cyan)] bg-cyan-50/50'
                                                                    : 'border-slate-200 hover:border-slate-300'
                                                            )}
                                                        >
                                                            <RadioGroupItem value="organization" id="type-org" />
                                                            Organization
                                                        </Label>
                                                    </RadioGroup>
                                                </motion.div>

                                                <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Country</Label>
                                                        <Select
                                                            value={formData.organizerCountry}
                                                            onValueChange={(value) => updateField('organizerCountry', value)}
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
                                                            placeholder="City"
                                                            value={formData.organizerCity}
                                                            onChange={(e) => updateField('organizerCity', e.target.value)}
                                                            className="h-12 bg-white/70 dark:bg-slate-800/70"
                                                        />
                                                    </div>
                                                </motion.div>

                                                <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label>Currency</Label>
                                                        <Select
                                                            value={formData.organizerCurrency}
                                                            onValueChange={(value) => updateField('organizerCurrency', value)}
                                                        >
                                                            <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-800/70">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {CURRENCIES.map((currency) => (
                                                                    <SelectItem key={currency.code} value={currency.code}>
                                                                        {currency.code} - {currency.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Timezone</Label>
                                                        <Select
                                                            value={formData.organizerTimezone}
                                                            onValueChange={(value) => updateField('organizerTimezone', value)}
                                                        >
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
                                            </div>
                                        )}
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

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                            disabled={isLoading}
                                            className="h-12 px-6 border-2"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleNext}
                                            disabled={isLoading}
                                            className="flex-1 h-12 font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 shadow-lg shadow-cyan-500/20"
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
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                                        <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                                            <CheckCircle className="h-12 w-12 text-white" />
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-white">
                                            You&apos;re all set!
                                        </h2>
                                        <p className="text-slate-600 dark:text-slate-400 mt-3 text-lg">
                                            {formData.role === 'organizer'
                                                ? 'Your organizer account is ready. Let\'s create your first event!'
                                                : 'Welcome! Explore amazing events happening near you.'}
                                        </p>
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                    >
                                        <Button
                                            onClick={handleComplete}
                                            className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-[var(--brand-cyan)] to-[var(--brand-teal)] hover:from-[var(--brand-teal)] hover:to-emerald-500 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all"
                                        >
                                            {formData.role === 'organizer' ? 'Go to Dashboard' : 'Browse Events'}
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
