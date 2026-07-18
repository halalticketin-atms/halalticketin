import { describe, expect, it } from 'vitest';

import { isNewerServerTimestamp, shouldApplyForegroundRefresh } from './foreground-refresh';

describe('shouldApplyForegroundRefresh', () => {
    it('accepts the latest response from the current save generation', () => {
        expect(shouldApplyForegroundRefresh({
            requestVersion: 4,
            currentRequestVersion: 4,
            saveGenerationAtStart: 2,
            currentSaveGeneration: 2,
            saveInProgress: false,
        })).toBe(true);
    });

    it('rejects an earlier foreground response after a newer refresh begins', () => {
        expect(shouldApplyForegroundRefresh({
            requestVersion: 3,
            currentRequestVersion: 4,
            saveGenerationAtStart: 2,
            currentSaveGeneration: 2,
            saveInProgress: false,
        })).toBe(false);
    });

    it('rejects a focus response that began before a save completed', () => {
        expect(shouldApplyForegroundRefresh({
            requestVersion: 4,
            currentRequestVersion: 4,
            saveGenerationAtStart: 2,
            currentSaveGeneration: 3,
            saveInProgress: false,
        })).toBe(false);
    });

    it('rejects a response while a save is in progress', () => {
        expect(shouldApplyForegroundRefresh({
            requestVersion: 4,
            currentRequestVersion: 4,
            saveGenerationAtStart: 2,
            currentSaveGeneration: 2,
            saveInProgress: true,
        })).toBe(false);
    });
});

describe('isNewerServerTimestamp', () => {
    it('accepts only a strictly newer valid server timestamp', () => {
        expect(isNewerServerTimestamp('2026-07-18T10:00:00.000Z', '2026-07-18T10:01:00.000Z')).toBe(true);
        expect(isNewerServerTimestamp('2026-07-18T10:00:00.000Z', '2026-07-18T10:00:00.000Z')).toBe(false);
        expect(isNewerServerTimestamp('2026-07-18T10:00:00.000Z', '2026-07-18T09:59:00.000Z')).toBe(false);
        expect(isNewerServerTimestamp('invalid', '2026-07-18T10:01:00.000Z')).toBe(false);
    });
});
