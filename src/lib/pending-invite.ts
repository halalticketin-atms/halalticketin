import { getSafeInternalPath } from './auth-onboarding-continuation';

const PENDING_INVITE_STORAGE_KEY = 'halal-ticketin:pending-invite';
const PENDING_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface PendingInviteContext {
    token: string;
    invitedEmail?: string;
    nextPath?: string;
    createdAt: number;
}

const normalizeEmail = (email?: string) => {
    const trimmed = email?.trim().toLowerCase();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const normalizeNextPath = (path?: string) => {
    return getSafeInternalPath(path) ?? undefined;
};

const isExpired = (createdAt: number) => Date.now() - createdAt > PENDING_INVITE_TTL_MS;

const getStorage = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.localStorage;
};

export const clearPendingInviteContext = () => {
    const storage = getStorage();
    storage?.removeItem(PENDING_INVITE_STORAGE_KEY);
};

export const savePendingInviteContext = (payload: {
    token: string;
    invitedEmail?: string;
    nextPath?: string;
}) => {
    const storage = getStorage();
    if (!storage) {
        return;
    }

    const token = payload.token.trim();
    if (token.length < 10) {
        return;
    }

    const value: PendingInviteContext = {
        token,
        invitedEmail: normalizeEmail(payload.invitedEmail),
        nextPath: normalizeNextPath(payload.nextPath),
        createdAt: Date.now(),
    };

    storage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(value));
};

export const getPendingInviteContext = (): PendingInviteContext | null => {
    const storage = getStorage();
    if (!storage) {
        return null;
    }

    const rawValue = storage.getItem(PENDING_INVITE_STORAGE_KEY);
    if (!rawValue) {
        return null;
    }

    try {
        const parsed = JSON.parse(rawValue) as Partial<PendingInviteContext>;
        const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
        const createdAt = typeof parsed.createdAt === 'number' ? parsed.createdAt : NaN;

        if (token.length < 10 || !Number.isFinite(createdAt) || isExpired(createdAt)) {
            clearPendingInviteContext();
            return null;
        }

        const context: PendingInviteContext = {
            token,
            createdAt,
            invitedEmail: normalizeEmail(parsed.invitedEmail),
            nextPath: normalizeNextPath(parsed.nextPath),
        };

        return context;
    } catch {
        clearPendingInviteContext();
        return null;
    }
};

export const getDefaultInviteNextPath = (token?: string | null) => {
    if (!token) {
        return undefined;
    }
    return `/invitations/accept?token=${encodeURIComponent(token)}`;
};

export const resolveContinuationPath = (explicitNextPath?: string | null, pending?: PendingInviteContext | null) => {
    const safeExplicitNextPath = getSafeInternalPath(explicitNextPath);
    if (safeExplicitNextPath) {
        return safeExplicitNextPath;
    }
    const safePendingNextPath = getSafeInternalPath(pending?.nextPath);
    if (safePendingNextPath) {
        return safePendingNextPath;
    }
    return getDefaultInviteNextPath(pending?.token);
};
