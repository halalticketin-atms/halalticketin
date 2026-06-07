interface HeightsPrAccessInput {
    authLoading: boolean;
    user: { id: string } | null;
    memberships: Array<{ status: string }>;
}

export type HeightsPrAccess = 'loading' | 'allowed' | 'blocked';

export function getHeightsPrAccess({
    authLoading,
    user,
    memberships,
}: HeightsPrAccessInput): HeightsPrAccess {
    if (authLoading) {
        return 'loading';
    }
    if (user && memberships.some((membership) => membership.status !== 'removed')) {
        return 'blocked';
    }
    return 'allowed';
}
