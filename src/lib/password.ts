export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;
export const PASSWORD_REQUIREMENTS_TEXT =
    'Must be 8-128 characters and include at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.';

export function getPasswordValidationError(password: string): string | null {
    if (!password) {
        return 'Password is required';
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
        return `Password must be ${PASSWORD_MAX_LENGTH} characters or less`;
    }

    if (!PASSWORD_STRENGTH_REGEX.test(password)) {
        return PASSWORD_REQUIREMENTS_TEXT;
    }

    return null;
}
