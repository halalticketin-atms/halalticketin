interface AuthOnboardingPathInput {
    role: 'organizer' | 'buyer' | null;
    continuationPath: string | null | undefined;
    inviteToken: string | null | undefined;
}

const INTERNAL_PATH_BASE_URL = 'https://halalticketin.local';
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

export function getSafeInternalPath(value?: string | null) {
    if (typeof value !== 'string') {
        return null;
    }

    if (!value.trim() || value !== value.trim()) {
        return null;
    }

    if (
        !value.startsWith('/')
        || value.startsWith('//')
        || value.startsWith('/\\')
        || CONTROL_CHARACTER_PATTERN.test(value)
    ) {
        return null;
    }

    try {
        const parsed = new URL(value, INTERNAL_PATH_BASE_URL);
        return parsed.origin === INTERNAL_PATH_BASE_URL ? value : null;
    } catch {
        return null;
    }
}

export function getOrganizerPaymentSetupPath(organizerId?: string | null) {
    const params = new URLSearchParams({ tab: 'payments' });
    const trimmedOrganizerId = organizerId?.trim();
    if (trimmedOrganizerId) {
        params.set('organizerId', trimmedOrganizerId);
    }
    return `/settings?${params.toString()}`;
}

export function resolveOrganizerEmailVerificationContinuation({
    role,
    isInviteFlow,
    organizerId,
    fallbackPath,
}: {
    role: 'organizer' | 'buyer';
    isInviteFlow: boolean;
    organizerId?: string | null;
    fallbackPath?: string | null;
}) {
    if (role === 'organizer' && !isInviteFlow) {
        return getOrganizerPaymentSetupPath(organizerId);
    }
    return getSafeInternalPath(fallbackPath) ?? undefined;
}

export function getAuthCallbackUrl(origin: string, continuationPath?: string | null) {
    const safeContinuationPath = getSafeInternalPath(continuationPath);
    const suffix = safeContinuationPath
        ? `?next=${encodeURIComponent(safeContinuationPath)}`
        : '';
    return `${origin}/auth/callback${suffix}`;
}

export function resolveSingleOrganizerPaymentSetupSelection({
    requestedTab,
    requestedOrganizerId,
    activeOrganizerId,
    activeOrganizerIds,
}: {
    requestedTab?: string | null;
    requestedOrganizerId?: string | null;
    activeOrganizerId?: string | null;
    activeOrganizerIds: string[];
}) {
    if (
        requestedTab !== 'payments'
        || requestedOrganizerId
        || activeOrganizerIds.length !== 1
    ) {
        return null;
    }

    const [onlyOrganizerId] = activeOrganizerIds;
    return onlyOrganizerId && activeOrganizerId !== onlyOrganizerId ? onlyOrganizerId : null;
}

export function resolveAuthOnboardingPath({
    role,
    continuationPath,
    inviteToken,
}: AuthOnboardingPathInput) {
    if (role === 'organizer' && continuationPath === '/heightspr' && !inviteToken) {
        return '/heightspr';
    }

    const safeContinuationPath = getSafeInternalPath(continuationPath);
    const params = new URLSearchParams();
    if (role) {
        params.set('role', role);
    }
    if (safeContinuationPath) {
        params.set('next', safeContinuationPath);
    }
    if (inviteToken) {
        params.set('inviteToken', inviteToken);
    }
    return params.size > 0 ? `/register?${params.toString()}` : '/register';
}
