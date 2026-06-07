interface AuthOnboardingPathInput {
    role: 'organizer' | 'buyer' | null;
    continuationPath: string | null | undefined;
    inviteToken: string | null | undefined;
}

export function resolveAuthOnboardingPath({
    role,
    continuationPath,
    inviteToken,
}: AuthOnboardingPathInput) {
    if (role === 'organizer' && continuationPath === '/heightspr' && !inviteToken) {
        return '/heightspr';
    }

    const params = new URLSearchParams();
    if (role) {
        params.set('role', role);
    }
    if (continuationPath) {
        params.set('next', continuationPath);
    }
    if (inviteToken) {
        params.set('inviteToken', inviteToken);
    }
    return params.size > 0 ? `/register?${params.toString()}` : '/register';
}
