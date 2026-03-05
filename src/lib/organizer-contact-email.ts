const ORGANIZER_CONTACT_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeOrganizerContactEmail = (value: string) => value.trim();

export const isValidOrganizerContactEmail = (value: string) =>
    ORGANIZER_CONTACT_EMAIL_REGEX.test(normalizeOrganizerContactEmail(value));

export const getOrganizerContactEmailError = (
    value: string,
    options?: {
        requiredMessage?: string;
        invalidMessage?: string;
    }
) => {
    const normalized = normalizeOrganizerContactEmail(value);
    if (!normalized) {
        return options?.requiredMessage ?? 'Organizer contact email is required.';
    }

    if (!isValidOrganizerContactEmail(normalized)) {
        return options?.invalidMessage ?? 'Please enter a valid organizer contact email.';
    }

    return null;
};
