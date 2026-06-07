import { getOrganizerContactEmailError, normalizeOrganizerContactEmail } from '@/lib/organizer-contact-email';
import { getPasswordValidationError } from '@/lib/password';

export const ORGANIZER_SIGNUP_TERMS_VERSION = '2024-12-20';
export const PENDING_ORGANIZER_AVATAR_KEY = 'halal-ticketin:pending-organizer-avatar';

export type OrganizerSignupStep =
    | 'credentials'
    | 'organization'
    | 'location'
    | 'currency';

export interface OrganizerSignupForm {
    email: string;
    password: string;
    name: string;
    organizerName: string;
    organizerType: 'individual' | 'organization' | 'charity';
    organizerCharityNumber: string;
    organizerContactEmail: string;
    organizerCountry: string;
    organizerCity: string;
    organizerCurrency: string;
    organizerTimezone: string;
}

export interface OrganizerSignupPayload {
    email: string;
    password?: string;
    name?: string;
    isOrganizer: true;
    termsAccepted: boolean;
    termsVersion: string;
    heightsprReferral?: true;
    homeCountry?: string;
    homeCity?: string;
    organizer: {
        name?: string;
        type: OrganizerSignupForm['organizerType'];
        charityNumber?: string;
        replyToEmail: string;
        country?: string;
        city?: string;
        currency?: string;
        timezone?: string;
    };
}

const INITIAL_ORGANIZER_SIGNUP_FORM: OrganizerSignupForm = {
    email: '',
    password: '',
    name: '',
    organizerName: '',
    organizerType: 'individual',
    organizerCharityNumber: '',
    organizerContactEmail: '',
    organizerCountry: '',
    organizerCity: '',
    organizerCurrency: 'GBP',
    organizerTimezone: 'Europe/London',
};

export function createOrganizerSignupForm(
    prefill?: Partial<Pick<OrganizerSignupForm, 'email' | 'name'>>,
): OrganizerSignupForm {
    return {
        ...INITIAL_ORGANIZER_SIGNUP_FORM,
        ...(prefill?.email !== undefined ? { email: prefill.email } : {}),
        ...(prefill?.name !== undefined ? { name: prefill.name } : {}),
    };
}

type ValidationContext = {
    authenticated: boolean;
    acceptedTerms: boolean;
};

type ValidationResult =
    | { form: OrganizerSignupForm }
    | { error: string };

export function validateOrganizerSignupStep(
    step: OrganizerSignupStep,
    form: OrganizerSignupForm,
    context: ValidationContext,
): ValidationResult {
    const normalizedForm = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        organizerName: form.organizerName.trim(),
        organizerCharityNumber: form.organizerCharityNumber.trim(),
        organizerContactEmail: normalizeOrganizerContactEmail(form.organizerContactEmail),
        organizerCity: form.organizerCity.trim(),
    };

    switch (step) {
        case 'credentials': {
            if (!normalizedForm.name) {
                return { error: 'Full name is required' };
            }
            if (normalizedForm.name.length < 2) {
                return { error: 'Full name must be at least 2 characters' };
            }
            if (!normalizedForm.email) {
                return { error: 'Email is required' };
            }
            if (!context.authenticated) {
                const passwordError = getPasswordValidationError(form.password);
                if (passwordError) {
                    return { error: passwordError };
                }
            }
            return { form: normalizedForm };
        }
        case 'organization': {
            if (form.organizerType === 'charity' && !normalizedForm.organizerCharityNumber) {
                return { error: 'Charity number is required' };
            }
            if (!normalizedForm.organizerName) {
                return { error: 'Organization name is required' };
            }
            const contactEmailError = getOrganizerContactEmailError(
                normalizedForm.organizerContactEmail,
                {
                    requiredMessage: 'Organizer contact email is required',
                    invalidMessage: 'Please enter a valid organizer contact email',
                },
            );
            if (contactEmailError) {
                return { error: contactEmailError };
            }
            return { form: normalizedForm };
        }
        case 'location':
            if (
                !form.organizerCountry
                || !normalizedForm.organizerCity
                || !form.organizerTimezone
            ) {
                return { error: 'All fields are required' };
            }
            return { form: normalizedForm };
        case 'currency':
            if (!form.organizerCurrency) {
                return { error: 'Please select a currency' };
            }
            if (!context.acceptedTerms) {
                return { error: 'You must accept the Terms of Use to create an account' };
            }
            return { form: normalizedForm };
    }
}

export function buildOrganizerSignupPayload(
    form: OrganizerSignupForm,
    options: {
        acceptedTerms: boolean;
        authenticated: boolean;
        heightsprReferral: boolean;
    },
): OrganizerSignupPayload {
    const organizerName = form.organizerName.trim();
    const organizerCharityNumber = form.organizerCharityNumber.trim();
    const organizerContactEmail = normalizeOrganizerContactEmail(form.organizerContactEmail);
    const organizerCity = form.organizerCity.trim();

    return {
        email: form.email.trim(),
        ...(!options.authenticated ? { password: form.password } : {}),
        ...(form.name.trim() ? { name: form.name.trim() } : {}),
        isOrganizer: true,
        termsAccepted: options.acceptedTerms,
        termsVersion: ORGANIZER_SIGNUP_TERMS_VERSION,
        ...(options.heightsprReferral ? { heightsprReferral: true as const } : {}),
        ...(form.organizerCountry ? { homeCountry: form.organizerCountry } : {}),
        ...(organizerCity ? { homeCity: organizerCity } : {}),
        organizer: {
            ...(organizerName ? { name: organizerName } : {}),
            type: form.organizerType,
            ...(form.organizerType === 'charity' && organizerCharityNumber
                ? { charityNumber: organizerCharityNumber }
                : {}),
            replyToEmail: organizerContactEmail,
            ...(form.organizerCountry ? { country: form.organizerCountry } : {}),
            ...(organizerCity ? { city: organizerCity } : {}),
            ...(form.organizerCurrency ? { currency: form.organizerCurrency } : {}),
            ...(form.organizerTimezone ? { timezone: form.organizerTimezone } : {}),
        },
    };
}
