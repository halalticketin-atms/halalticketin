const DEFAULT_TIMEZONE = 'UTC';

const getSafeTimeZone = (timeZone?: string) => {
    if (!timeZone) {
        return DEFAULT_TIMEZONE;
    }

    try {
        Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return timeZone;
    } catch {
        return DEFAULT_TIMEZONE;
    }
};

const getTimeZoneParts = (date: Date, timeZone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            values[part.type] = part.value;
        }
    }

    return values;
};

const getTimeZoneOffset = (date: Date, timeZone: string) => {
    const parts = getTimeZoneParts(date, timeZone);
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hour = Number(parts.hour);
    const minute = Number(parts.minute);
    const second = Number(parts.second);

    if ([year, month, day, hour, minute, second].some((value) => Number.isNaN(value))) {
        return 0;
    }

    const utcTime = Date.UTC(year, month - 1, day, hour, minute, second);
    return utcTime - date.getTime();
};

export const toUtcIsoString = (
    date?: string,
    time?: string | null,
    timeZone?: string,
) => {
    if (!date) {
        return null;
    }

    const safeTime = time && time.trim().length > 0 ? time : '00:00';
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = safeTime.split(':').map(Number);

    if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
        return null;
    }

    const safeTimeZone = getSafeTimeZone(timeZone);
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const offset = getTimeZoneOffset(utcDate, safeTimeZone);
    const zonedDate = new Date(utcDate.getTime() - offset);

    if (Number.isNaN(zonedDate.getTime())) {
        return null;
    }

    return zonedDate.toISOString();
};

export const formatDateInTimeZone = (
    iso?: string | null,
    timeZone?: string,
) => {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const safeTimeZone = getSafeTimeZone(timeZone);
    const parts = getTimeZoneParts(date, safeTimeZone);
    if (!parts.year || !parts.month || !parts.day) {
        return '';
    }

    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatTimeInTimeZone = (
    iso?: string | null,
    timeZone?: string,
) => {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const safeTimeZone = getSafeTimeZone(timeZone);
    const parts = getTimeZoneParts(date, safeTimeZone);
    if (!parts.hour || !parts.minute) {
        return '';
    }

    return `${parts.hour}:${parts.minute}`;
};
