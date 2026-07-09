import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl, buildIcsFileContent } from './calendar-links';
import { FAQ_SECTIONS, faqPlainAnswer } from './faq-data';

const baseEvent = {
  title: 'Eid Gala Dinner',
  description: 'An evening of food and community.',
  start: '2026-08-01T18:00:00.000Z',
  end: '2026-08-01T22:00:00.000Z',
  timezone: 'Europe/London',
  location: 'Grand Hall, 1 Main St, Dublin, Ireland',
  url: 'https://www.halalticketin.com/events/eid-gala',
};

describe('buildGoogleCalendarUrl', () => {
  it('builds a template URL with UTC dates, location, and timezone', () => {
    const url = buildGoogleCalendarUrl(baseEvent);
    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Eid Gala Dinner');
    expect(parsed.searchParams.get('dates')).toBe('20260801T180000Z/20260801T220000Z');
    expect(parsed.searchParams.get('location')).toBe(baseEvent.location);
    expect(parsed.searchParams.get('ctz')).toBe('Europe/London');
    expect(parsed.searchParams.get('details')).toContain('Event page: https://www.halalticketin.com/events/eid-gala');
  });

  it('defaults to a two-hour duration when end is missing', () => {
    const url = buildGoogleCalendarUrl({ ...baseEvent, end: null });
    expect(new URL(url!).searchParams.get('dates')).toBe('20260801T180000Z/20260801T200000Z');
  });

  it('returns null for an invalid start date', () => {
    expect(buildGoogleCalendarUrl({ ...baseEvent, start: 'not-a-date' })).toBeNull();
  });
});

describe('buildIcsFileContent', () => {
  it('produces a valid VCALENDAR with escaped text', () => {
    const ics = buildIcsFileContent({ ...baseEvent, title: 'Dinner; food, fun' });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20260801T180000Z');
    expect(ics).toContain('DTEND:20260801T220000Z');
    expect(ics).toContain('SUMMARY:Dinner\\; food\\, fun');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('folds long lines to 75 octets or fewer', () => {
    const ics = buildIcsFileContent({
      ...baseEvent,
      description: 'x'.repeat(300),
    });
    for (const line of ics!.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(75);
    }
  });
});

describe('faqPlainAnswer', () => {
  it('strips markdown links and bold from every answer', () => {
    for (const section of FAQ_SECTIONS) {
      for (const item of section.items) {
        const plain = faqPlainAnswer(item.answer);
        expect(plain).not.toMatch(/\[|\]\(|\*\*/);
        expect(plain.length).toBeGreaterThan(0);
      }
    }
  });
});
