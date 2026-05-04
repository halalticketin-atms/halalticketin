import type { DraftEventInitial } from '@/hooks/useEventDraft';

const RECOVERY_VERSION = 1;
const STORAGE_PREFIX = 'halalticketin:event-edit-recovery';

export interface EventEditRecoverySnapshot {
    eventId: string;
    savedAt: number;
    currentStep: number;
    currentSubStep: string;
    draft: DraftEventInitial;
}

interface StoredEventEditRecoverySnapshot extends EventEditRecoverySnapshot {
    version: number;
}

const getStorage = () => {
    if (typeof window === 'undefined') {
        return null;
    }
    return window.sessionStorage;
};

const getStorageKey = (eventId: string) => `${STORAGE_PREFIX}:${eventId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

export const getEventEditRecoverySavedAt = (backendUpdatedAt?: string | null) => {
    const now = Date.now();
    if (!backendUpdatedAt) {
        return now;
    }

    const backendUpdatedAtMs = new Date(backendUpdatedAt).getTime();
    if (!Number.isFinite(backendUpdatedAtMs)) {
        return now;
    }

    return Math.max(now, backendUpdatedAtMs + 1);
};

const parseStoredSnapshot = (raw: string | null, eventId: string) => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isRecord(parsed)) {
            return null;
        }
        if (parsed.version !== RECOVERY_VERSION || parsed.eventId !== eventId) {
            return null;
        }
        if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) {
            return null;
        }
        if (typeof parsed.currentStep !== 'number' || typeof parsed.currentSubStep !== 'string') {
            return null;
        }
        if (!isRecord(parsed.draft)) {
            return null;
        }

        return {
            eventId,
            savedAt: parsed.savedAt,
            currentStep: parsed.currentStep,
            currentSubStep: parsed.currentSubStep,
            draft: parsed.draft as DraftEventInitial,
        };
    } catch {
        return null;
    }
};

export const readEventEditRecovery = (
    eventId: string,
    options?: { backendUpdatedAt?: string | null },
): EventEditRecoverySnapshot | null => {
    const storage = getStorage();
    if (!storage || !eventId) {
        return null;
    }

    const snapshot = parseStoredSnapshot(storage.getItem(getStorageKey(eventId)), eventId);
    if (!snapshot) {
        return null;
    }

    if (options?.backendUpdatedAt) {
        const backendUpdatedAtMs = new Date(options.backendUpdatedAt).getTime();
        if (Number.isFinite(backendUpdatedAtMs) && snapshot.savedAt <= backendUpdatedAtMs) {
            return null;
        }
    }

    return snapshot;
};

export const writeEventEditRecovery = (
    eventId: string,
    snapshot: EventEditRecoverySnapshot,
) => {
    const storage = getStorage();
    if (!storage || !eventId || snapshot.eventId !== eventId) {
        return;
    }

    const stored: StoredEventEditRecoverySnapshot = {
        ...snapshot,
        version: RECOVERY_VERSION,
    };

    try {
        storage.setItem(getStorageKey(eventId), JSON.stringify(stored));
    } catch {
        // Storage can be unavailable or full; losing recovery is preferable to blocking editing.
    }
};

export const clearEventEditRecovery = (eventId: string) => {
    const storage = getStorage();
    if (!storage || !eventId) {
        return;
    }

    storage.removeItem(getStorageKey(eventId));
};
