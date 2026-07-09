/**
 * Client-side "Add to calendar" helpers: a Google Calendar template URL and a
 * generated .ics file (Apple Calendar, Outlook). Pure functions, no network.
 */

export type CalendarEventInput = {
  title: string;
  description?: string | null;
  /** ISO datetime, e.g. from event.startDatetime. */
  start: string;
  /** ISO datetime; defaults to two hours after start when missing. */
  end?: string | null;
  /** IANA timezone the event is scheduled in, e.g. "Europe/London". */
  timezone?: string | null;
  /** Human-readable location or a URL for online events. */
  location?: string | null;
  /** Public event page URL, appended to the description. */
  url?: string | null;
};

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 500;

function resolveDates(input: CalendarEventInput): { start: Date; end: Date } | null {
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) return null;
  const end = input.end ? new Date(input.end) : null;
  return {
    start,
    end:
      end && !Number.isNaN(end.getTime()) && end.getTime() > start.getTime()
        ? end
        : new Date(start.getTime() + DEFAULT_DURATION_MS),
  };
}

/** UTC stamp in the compact calendar format: 20260709T183000Z */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function calendarDescription(input: CalendarEventInput): string {
  const description = (input.description || '').trim();
  const truncated =
    description.length > MAX_DESCRIPTION_LENGTH
      ? `${description.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd()}…`
      : description;
  return [truncated, input.url ? `Event page: ${input.url}` : '']
    .filter(Boolean)
    .join('\n\n');
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string | null {
  const dates = resolveDates(input);
  if (!dates) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${utcStamp(dates.start)}/${utcStamp(dates.end)}`,
  });
  const details = calendarDescription(input);
  if (details) params.set('details', details);
  if (input.location) params.set('location', input.location);
  if (input.timezone) params.set('ctz', input.timezone);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escapes text per RFC 5545 (commas, semicolons, backslashes, newlines). */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds lines longer than 75 octets per RFC 5545 section 3.1. */
function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    chunks.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

export function buildIcsFileContent(input: CalendarEventInput): string | null {
  const dates = resolveDates(input);
  if (!dates) return null;

  const description = calendarDescription(input);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HalalTicketin//Event//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${utcStamp(dates.start)}-${Math.random().toString(36).slice(2)}@halalticketin.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(dates.start)}`,
    `DTEND:${utcStamp(dates.end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    description ? `DESCRIPTION:${escapeIcsText(description)}` : '',
    input.location ? `LOCATION:${escapeIcsText(input.location)}` : '',
    input.url ? `URL:${escapeIcsText(input.url)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.map(foldIcsLine).join('\r\n');
}
