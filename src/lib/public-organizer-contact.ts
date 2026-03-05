import { isValidOrganizerContactEmail } from './organizer-contact-email';

export const PUBLIC_ORGANIZER_CONTACT_LIMITS = {
    minName: 2,
    maxName: 80,
    minMessage: 20,
    maxMessage: 2000,
};

export interface PublicOrganizerContactFormValues {
    name: string;
    email: string;
    message: string;
}

export const normalizePublicOrganizerContactForm = (
    values: PublicOrganizerContactFormValues
): PublicOrganizerContactFormValues => ({
    name: values.name.trim(),
    email: values.email.trim(),
    message: values.message.trim(),
});

export const getPublicOrganizerContactFormError = (
    values: PublicOrganizerContactFormValues
): string | null => {
    const normalized = normalizePublicOrganizerContactForm(values);

    if (normalized.name.length < PUBLIC_ORGANIZER_CONTACT_LIMITS.minName) {
        return 'Please enter your name.';
    }
    if (normalized.name.length > PUBLIC_ORGANIZER_CONTACT_LIMITS.maxName) {
        return `Name must be ${PUBLIC_ORGANIZER_CONTACT_LIMITS.maxName} characters or fewer.`;
    }

    if (!normalized.email) {
        return 'Please enter your email address.';
    }
    if (!isValidOrganizerContactEmail(normalized.email)) {
        return 'Please enter a valid email address.';
    }

    if (normalized.message.length < PUBLIC_ORGANIZER_CONTACT_LIMITS.minMessage) {
        return `Message must be at least ${PUBLIC_ORGANIZER_CONTACT_LIMITS.minMessage} characters.`;
    }
    if (normalized.message.length > PUBLIC_ORGANIZER_CONTACT_LIMITS.maxMessage) {
        return `Message must be ${PUBLIC_ORGANIZER_CONTACT_LIMITS.maxMessage} characters or fewer.`;
    }

    return null;
};

export const isPublicOrganizerContactFormValid = (
    values: PublicOrganizerContactFormValues
) => getPublicOrganizerContactFormError(values) === null;
