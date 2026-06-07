'use client';

import { useCallback, useRef, useState, type ChangeEvent } from 'react';

import api, { setAuthToken } from '@/lib/api';
import { getAuthUiError, type AuthUiError } from '@/lib/auth-error-messages';
import { setLastAuthMethod } from '@/lib/last-auth-method';
import { toast } from '@/lib/notifications';
import { getSupabase } from '@/lib/supabase';
import { fileToDataUrl, uploadOrganizerAvatar } from '@/lib/upload-api';

import {
    buildOrganizerSignupPayload,
    createOrganizerSignupForm,
    PENDING_ORGANIZER_AVATAR_KEY,
    validateOrganizerSignupStep,
    type OrganizerSignupForm,
    type OrganizerSignupStep,
} from './organizer-signup-rules';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

export function getOrganizerAvatarError(file: File): string | null {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
        return 'Please upload a JPG, PNG, GIF, or WebP image';
    }
    if (file.size > 5 * 1024 * 1024) {
        return 'Image must be 5MB or less';
    }
    return null;
}

export async function requestOrganizerStripeConnect(
    organizerId: string,
    post: <T>(path: string, payload?: unknown) => Promise<T>,
): Promise<string> {
    const response = await post<{ connectUrl?: string }>(
        `/api/v1/organizers/${organizerId}/stripe/connect-link`,
        undefined,
    );
    if (!response.connectUrl) {
        throw new Error('Unable to get Stripe connect URL');
    }
    return response.connectUrl;
}

type ResendSignup = (input: {
    type: 'signup';
    email: string;
    options: { emailRedirectTo: string };
}) => Promise<{ error: unknown | null }>;

export async function resendOrganizerVerificationEmail(
    input: {
        email: string;
        redirectAfterComplete?: string;
        origin: string;
    },
    resend: ResendSignup,
) {
    const suffix = input.redirectAfterComplete
        ? `?next=${encodeURIComponent(input.redirectAfterComplete)}`
        : '';
    const { error } = await resend({
        type: 'signup',
        email: input.email,
        options: {
            emailRedirectTo: `${input.origin}/auth/callback${suffix}`,
        },
    });
    if (error) {
        throw error;
    }
}

interface RegisterResponse {
    organizerId?: string;
    requiresEmailConfirmation?: boolean;
}

interface LoginResponse {
    accessToken: string;
}

interface SubmissionDependencies {
    post: <T>(path: string, payload: unknown) => Promise<T>;
    refresh: () => Promise<void>;
    setAuthToken: (token: string) => void;
    setLastAuthMethod: (method: 'password') => void;
    uploadOrganizerAvatar: (organizerId: string, file: File) => Promise<unknown>;
    fileToDataUrl: (file: File) => Promise<string>;
    storePendingAvatar: (payload: { organizerId: string; dataUrl: string }) => void;
}

interface SubmitOrganizerSignupInput {
    form: OrganizerSignupForm;
    acceptedTerms: boolean;
    authenticated: boolean;
    heightsprReferral: boolean;
    avatarFile: File | null;
    avatarPreview: string;
}

export async function submitOrganizerSignup(
    input: SubmitOrganizerSignupInput,
    dependencies: SubmissionDependencies,
): Promise<{ organizerId: string | null; requiresEmailConfirmation: boolean }> {
    const payload = buildOrganizerSignupPayload(input.form, {
        acceptedTerms: input.acceptedTerms,
        authenticated: input.authenticated,
        heightsprReferral: input.heightsprReferral,
    });
    const endpoint = input.authenticated
        ? '/api/v1/auth/onboarding'
        : '/api/v1/auth/register';
    const response = await dependencies.post<RegisterResponse>(endpoint, payload);
    const organizerId = response.organizerId ?? null;
    const requiresEmailConfirmation = Boolean(response.requiresEmailConfirmation);

    if (requiresEmailConfirmation) {
        if (input.avatarFile && organizerId) {
            try {
                const dataUrl = input.avatarPreview || await dependencies.fileToDataUrl(input.avatarFile);
                dependencies.storePendingAvatar({ organizerId, dataUrl });
            } catch (error) {
                console.warn('Failed to store organizer logo for later upload:', error);
            }
        }
        return { organizerId, requiresEmailConfirmation };
    }

    if (input.authenticated) {
        await dependencies.refresh();
    } else {
        const login = await dependencies.post<LoginResponse>('/api/v1/auth/login', {
            email: input.form.email.trim(),
            password: input.form.password,
        });
        dependencies.setAuthToken(login.accessToken);
        dependencies.setLastAuthMethod('password');
        await dependencies.refresh();
    }

    if (input.avatarFile && organizerId) {
        try {
            await dependencies.uploadOrganizerAvatar(organizerId, input.avatarFile);
            await dependencies.refresh();
        } catch (error) {
            console.warn('Organizer logo upload error:', error);
        }
    }

    return { organizerId, requiresEmailConfirmation };
}

const defaultSubmissionDependencies = (refresh: () => Promise<void>): SubmissionDependencies => ({
    post: <T,>(path: string, payload: unknown) => api.post<T>(path, payload),
    refresh,
    setAuthToken,
    setLastAuthMethod,
    uploadOrganizerAvatar,
    fileToDataUrl,
    storePendingAvatar: (payload) => {
        window.localStorage.setItem(PENDING_ORGANIZER_AVATAR_KEY, JSON.stringify(payload));
    },
});

export const ORGANIZER_SIGNUP_STEPS: OrganizerSignupStep[] = [
    'credentials',
    'organization',
    'location',
    'currency',
];

interface UseOrganizerSignupControllerOptions {
    authenticated: boolean;
    heightsprReferral?: boolean;
    prefill?: {
        email?: string;
        name?: string;
    };
    redirectAfterComplete?: string;
    refresh: () => Promise<void>;
    refreshAfterAuthenticatedSubmit?: boolean;
}

export function useOrganizerSignupController({
    authenticated,
    heightsprReferral = false,
    prefill,
    redirectAfterComplete,
    refresh,
    refreshAfterAuthenticatedSubmit = true,
}: UseOrganizerSignupControllerOptions) {
    const [form, setForm] = useState(() => createOrganizerSignupForm(prefill));
    const [step, setStep] = useState<OrganizerSignupStep | 'stripe' | 'complete'>('credentials');
    const [highestStepIndex, setHighestStepIndex] = useState(0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<AuthUiError | null>(null);
    const [organizerId, setOrganizerId] = useState<string | null>(null);
    const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const submissionInFlightRef = useRef(false);

    const updateField = useCallback(<K extends keyof OrganizerSignupForm>(
        field: K,
        value: OrganizerSignupForm[K],
    ) => {
        setForm((current) => ({ ...current, [field]: value }));
    }, []);

    const setErrorMessage = useCallback((message: string) => {
        setError({ message, showSupportLink: false });
    }, []);

    const selectAvatar = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const avatarError = getOrganizerAvatarError(file);
        if (avatarError) {
            setErrorMessage(avatarError);
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
    }, [setErrorMessage]);

    const removeAvatar = useCallback(() => {
        setAvatarFile(null);
        setAvatarPreview('');
    }, []);

    const submit = useCallback(async () => {
        if (submissionInFlightRef.current) {
            return null;
        }
        submissionInFlightRef.current = true;
        setIsLoading(true);
        setError(null);
        try {
            const result = await submitOrganizerSignup({
                form,
                acceptedTerms,
                authenticated,
                heightsprReferral,
                avatarFile,
                avatarPreview,
            }, defaultSubmissionDependencies(
                authenticated && !refreshAfterAuthenticatedSubmit
                    ? async () => undefined
                    : refresh,
            ));
            setOrganizerId(result.organizerId);
            setPendingEmailConfirmation(result.requiresEmailConfirmation);
            setStep(result.requiresEmailConfirmation ? 'complete' : 'stripe');
            return result;
        } catch (caughtError) {
            const uiError = getAuthUiError(caughtError, {
                fallbackMessage: "We couldn't create your account. Please try again.",
                nameLabel: 'Organization name',
            });
            setError(uiError);
            if (uiError.field === 'email') {
                setStep('credentials');
            } else if (uiError.field === 'organizerName') {
                setStep('organization');
            }
            return null;
        } finally {
            submissionInFlightRef.current = false;
            setIsLoading(false);
        }
    }, [
        acceptedTerms,
        authenticated,
        avatarFile,
        avatarPreview,
        form,
        heightsprReferral,
        refresh,
        refreshAfterAuthenticatedSubmit,
    ]);

    const advance = useCallback(async () => {
        if (step === 'stripe' || step === 'complete') {
            return true;
        }
        setError(null);
        const result = validateOrganizerSignupStep(step, form, {
            authenticated,
            acceptedTerms,
        });
        if ('error' in result) {
            setErrorMessage(result.error);
            return false;
        }
        setForm(result.form);

        try {
            if (step === 'credentials' && !authenticated) {
                setIsLoading(true);
                await api.post('/api/v1/auth/check-email', { email: result.form.email });
            }
            if (step === 'organization') {
                setIsLoading(true);
                await api.post('/api/v1/auth/check-organizer-name', {
                    name: result.form.organizerName,
                });
            }
        } catch (caughtError) {
            const uiError = getAuthUiError(caughtError, {
                fallbackMessage: step === 'credentials'
                    ? 'Email is already linked to an account. Sign in instead or use a different email.'
                    : 'Organization name is already taken. Please choose a different name.',
                nameLabel: step === 'credentials' ? 'Email' : 'Organization name',
            });
            if (uiError.field === 'email' || uiError.field === 'organizerName') {
                uiError.showSupportLink = false;
            }
            setError(uiError);
            return false;
        } finally {
            setIsLoading(false);
        }

        if (step === 'currency') {
            return Boolean(await submit());
        }
        const index = ORGANIZER_SIGNUP_STEPS.indexOf(step);
        const next = ORGANIZER_SIGNUP_STEPS[index + 1];
        if (next) {
            setStep(next);
            setHighestStepIndex((current) => Math.max(current, index + 1));
        }
        return true;
    }, [acceptedTerms, authenticated, form, setErrorMessage, step, submit]);

    const back = useCallback(() => {
        const index = ORGANIZER_SIGNUP_STEPS.indexOf(step as OrganizerSignupStep);
        if (index > 0) {
            setStep(ORGANIZER_SIGNUP_STEPS[index - 1]);
        }
    }, [step]);

    const goToStep = useCallback((target: OrganizerSignupStep) => {
        const index = ORGANIZER_SIGNUP_STEPS.indexOf(target);
        if (index <= highestStepIndex) {
            setStep(target);
        }
    }, [highestStepIndex]);

    const connectStripe = useCallback(async () => {
        if (!organizerId) {
            setErrorMessage('No organiser found. Please try again.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const connectUrl = await requestOrganizerStripeConnect(
                organizerId,
                <T,>(path: string, payload?: unknown) => api.post<T>(path, payload),
            );
            window.location.href = connectUrl;
        } catch (caughtError) {
            setError(getAuthUiError(caughtError, {
                fallbackMessage: 'Unable to connect Stripe. You can set this up later.',
            }));
        } finally {
            setIsLoading(false);
        }
    }, [organizerId, setErrorMessage]);

    const resendVerificationEmail = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await resendOrganizerVerificationEmail({
                email: form.email,
                redirectAfterComplete,
                origin: window.location.origin,
            }, (request) => getSupabase().auth.resend(request));
            toast.success('Verification email sent', {
                description: 'Check your inbox and spam folder.',
            });
        } catch (caughtError) {
            toast.error(caughtError, 'Unable to resend verification email');
            setError(getAuthUiError(caughtError, {
                fallbackMessage: 'Unable to resend verification email.',
            }));
        } finally {
            setIsLoading(false);
        }
    }, [form.email, redirectAfterComplete]);

    return {
        form,
        setForm,
        updateField,
        step,
        setStep,
        highestStepIndex,
        acceptedTerms,
        setAcceptedTerms,
        isLoading,
        error,
        setError,
        setErrorMessage,
        organizerId,
        pendingEmailConfirmation,
        avatarFile,
        avatarPreview,
        selectAvatar,
        removeAvatar,
        advance,
        back,
        goToStep,
        submit,
        connectStripe,
        resendVerificationEmail,
    };
}
