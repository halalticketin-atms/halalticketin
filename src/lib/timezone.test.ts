import { describe, expect, it } from 'vitest';

import { formatDateInTimeZone, formatTimeInTimeZone, toUtcIsoString } from './timezone';

describe('timezone helpers', () => {
    it('converts local time to UTC using the provided timezone', () => {
        const iso = toUtcIsoString('2025-01-15', '10:30', 'America/New_York');
        expect(iso).toBe('2025-01-15T15:30:00.000Z');
    });

    it('formats date/time parts in the requested timezone', () => {
        const iso = '2025-01-15T15:30:00.000Z';
        expect(formatDateInTimeZone(iso, 'America/New_York')).toBe('2025-01-15');
        expect(formatTimeInTimeZone(iso, 'America/New_York')).toBe('10:30');
    });

    it('falls back to UTC for invalid timezones', () => {
        const iso = toUtcIsoString('2025-01-15', '10:30', 'Invalid/Zone');
        expect(iso).toBe('2025-01-15T10:30:00.000Z');
        expect(formatTimeInTimeZone('2025-01-15T10:30:00.000Z', 'Invalid/Zone')).toBe('10:30');
    });
});
