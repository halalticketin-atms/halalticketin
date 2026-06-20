import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    clearEventEditRecovery,
    getEventEditRecoverySavedAt,
    readEventEditRecovery,
    reconcileRecoveredEventLocation,
    writeEventEditRecovery,
    type EventEditRecoverySnapshot,
} from './event-edit-recovery';
import {
    type EventLocationFields,
    validateEventLocation,
} from './event-location-validation';

class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
        return this.store.size;
    }

    clear() {
        this.store.clear();
    }

    getItem(key: string) {
        return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number) {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.store.delete(key);
    }

    setItem(key: string, value: string) {
        this.store.set(key, value);
    }
}

const makeSnapshot = (overrides: Partial<EventEditRecoverySnapshot> = {}): EventEditRecoverySnapshot => ({
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    savedAt: 1_000,
    currentStep: 2,
    currentSubStep: 'time',
    draft: {
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventStatus: 'draft',
        formData: {
            title: 'Recovered Event Title',
            description: 'Unsaved recovered description',
        },
        tickets: [
            {
                id: 'ticket-1',
                name: 'General Admission',
                price: '10',
                customFee: '',
                isFree: false,
                type: 'paid',
                quantity: 100,
                minPerOrder: 1,
                maxPerOrder: 4,
                description: '',
                salesStart: '',
                salesStartTime: '',
                salesEnd: '',
                salesEndTime: '',
                hasEarlyBird: false,
                earlyBirdPrice: '',
                earlyBirdEndDate: '',
                visibility: 'public',
                absorbFee: false,
            },
        ],
        promoCodes: [],
        currentStep: 2,
        currentSubStep: 'time',
    },
    ...overrides,
});

describe('event edit recovery storage', () => {
    beforeEach(() => {
        vi.stubGlobal('window', {
            sessionStorage: new MemoryStorage(),
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('saves and reads an event edit recovery snapshot by event id', () => {
        const snapshot = makeSnapshot();

        writeEventEditRecovery(snapshot.eventId, snapshot);

        expect(readEventEditRecovery(snapshot.eventId)).toEqual(snapshot);
    });

    it('ignores recovery snapshots for a different event id', () => {
        writeEventEditRecovery('550e8400-e29b-41d4-a716-446655440000', makeSnapshot());

        expect(readEventEditRecovery('550e8400-e29b-41d4-a716-446655440999')).toBeNull();
    });

    it('ignores stale recovery snapshots older than the backend event update time', () => {
        const snapshot = makeSnapshot({ savedAt: 1_000 });
        writeEventEditRecovery(snapshot.eventId, snapshot);

        expect(readEventEditRecovery(snapshot.eventId, { backendUpdatedAt: '1970-01-01T00:00:02.000Z' })).toBeNull();
    });

    it('clears recovery snapshots after a successful save', () => {
        const snapshot = makeSnapshot();
        writeEventEditRecovery(snapshot.eventId, snapshot);

        clearEventEditRecovery(snapshot.eventId);

        expect(readEventEditRecovery(snapshot.eventId)).toBeNull();
    });

    it('can create a recovery timestamp newer than a backend update', () => {
        vi.setSystemTime(new Date('1970-01-01T00:00:01.000Z'));

        expect(getEventEditRecoverySavedAt('1970-01-01T00:00:02.000Z')).toBe(2_001);
    });
});

describe('recovered event location reconciliation', () => {
    const draftWithLocation = (
        latitude: number | null | undefined,
        longitude: number | null | undefined,
        overrides: Record<string, unknown> = {},
    ) => ({
        eventId: '550e8400-e29b-41d4-a716-446655440000',
        eventStatus: 'published' as const,
        formData: {
            locationType: 'physical' as const,
            venue: 'Dublin Hall',
            address: '',
            city: 'Dublin',
            country: 'Ireland',
            onlineUrl: '',
            ...(latitude !== undefined ? { latitude } : {}),
            ...(longitude !== undefined ? { longitude } : {}),
            ...overrides,
        },
    });

    const serverDraft = draftWithLocation(53.3498, -6.2603);

    it.each([
        [null, null],
        [undefined, undefined],
    ])('restores server coordinates when unchanged recovery coordinates are %s/%s', (latitude, longitude) => {
        const reconciled = reconcileRecoveredEventLocation(
            draftWithLocation(latitude, longitude),
            serverDraft,
        );

        expect(reconciled.formData).toMatchObject({ latitude: 53.3498, longitude: -6.2603 });
    });

    it.each([
        { city: 'Manchester' },
        { address: 'Changed address' },
        { venue: 'Changed venue' },
        { locationType: 'online' },
    ])('does not restore coordinates after a material recovered location change: %j', (change) => {
        const reconciled = reconcileRecoveredEventLocation(
            draftWithLocation(null, null, change),
            serverDraft,
        );

        expect(reconciled.formData).toMatchObject({ latitude: null, longitude: null });
    });

    it('keeps a recovered replacement coordinate pair', () => {
        const reconciled = reconcileRecoveredEventLocation(
            draftWithLocation(53.4808, -2.2426, { city: 'Manchester' }),
            serverDraft,
        );

        expect(reconciled.formData).toMatchObject({ latitude: 53.4808, longitude: -2.2426 });
    });

    it('does not hide a malformed partial recovered coordinate pair', () => {
        const reconciled = reconcileRecoveredEventLocation(
            draftWithLocation(53.3498, null),
            serverDraft,
        );

        expect(reconciled.formData).toMatchObject({ latitude: 53.3498, longitude: null });
    });

    it('leaves changed recovery text with stale coordinates invalid against the server location', () => {
        const recovered = reconcileRecoveredEventLocation(
            draftWithLocation(53.3498, -6.2603, {
                venue: 'Manchester Hall',
                address: '10 Deansgate',
                city: 'Manchester',
                country: 'United Kingdom',
            }),
            serverDraft,
        );

        expect(validateEventLocation(recovered.formData as EventLocationFields, {
            persistedPublishedLocation: serverDraft.formData as EventLocationFields,
        })).toMatchObject({ venue: expect.any(String) });
    });
});
