export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export const PASSWORD_REQUIREMENTS = [
    { label: '8+ characters', regex: /.{8,}/ },
    { label: 'Uppercase & Lowercase', regex: /^(?=.*[a-z])(?=.*[A-Z]).+$/ },
    { label: 'Numbers', regex: /\d/ },
    { label: 'Symbols', regex: /[^A-Za-z0-9\s]/ },
];

export const PASSWORD_REQUIREMENTS_TEXT =
    'Must be at least 8 characters and include uppercase, lowercase, numbers, and symbols.';

export function getPasswordValidationError(password: string): string | null {
    if (!password) {
        return 'Password is required';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (!PASSWORD_STRENGTH_REGEX.test(password)) {
        return PASSWORD_REQUIREMENTS_TEXT;
    }

    return null;
}
