import { describe, expect, it } from 'vitest';

import type { EventLocationFields } from './event-location-validation';
import {
  hasCoordinatePair,
  isPersistedPhysicalLocationUnchanged,
  updateLocationTextField,
  validateEventLocation,
} from './event-location-validation';

const location = (overrides: Partial<EventLocationFields> = {}): EventLocationFields => ({
  locationType: 'physical',
  venue: 'Dublin Hall',
  address: '',
  city: '',
  country: 'Ireland',
  latitude: null,
  longitude: null,
  onlineUrl: '',
  ...overrides,
});

describe('event location validation', () => {
  it('accepts a finite coordinate pair without address or city', () => {
    expect(validateEventLocation(location({ latitude: 53.3498, longitude: -6.2603 }))).toEqual({});
    expect(hasCoordinatePair(location({ latitude: 0, longitude: 0 }))).toBe(true);
  });

  it.each([
    { latitude: 53.3498, longitude: null },
    { latitude: null, longitude: -6.2603 },
    { latitude: Number.NaN, longitude: -6.2603 },
  ])('rejects an incomplete or non-finite coordinate pair: %j', (coordinates) => {
    expect(validateEventLocation(location(coordinates))).toMatchObject({
      address: 'Address is required when entering a venue manually.',
      city: 'City is required when entering a venue manually.',
    });
  });

  it('accepts a complete manual location without coordinates', () => {
    expect(validateEventLocation(location({ address: '1 Main Street', city: 'Dublin' }))).toEqual({});
  });

  it('rejects a new incomplete manual location', () => {
    expect(validateEventLocation(location())).toMatchObject({ address: expect.any(String), city: expect.any(String) });
  });

  it('accepts an unchanged published legacy physical location', () => {
    const persisted = location({ city: 'Dublin' });
    expect(validateEventLocation(location({ city: 'Dublin' }), {
      persistedPublishedLocation: persisted,
    })).toEqual({});
  });

  it('does not grandfather clearing a persisted coordinate pair', () => {
    const persisted = location({ latitude: 53.3498, longitude: -6.2603 });

    expect(validateEventLocation(location(), {
      persistedPublishedLocation: persisted,
    })).toMatchObject({ address: expect.any(String), city: expect.any(String) });
  });

  it('rejects changed text that retains the exact persisted coordinate pair', () => {
    const persisted = location({ latitude: 53.3498, longitude: -6.2603 });

    expect(validateEventLocation(location({
      city: 'Manchester',
      latitude: 53.3498,
      longitude: -6.2603,
    }), {
      persistedPublishedLocation: persisted,
    })).toMatchObject({ address: expect.any(String) });
  });

  it('rejects stale persisted coordinates even when the changed manual location is complete', () => {
    const persisted = location({
      address: '1 Main Street',
      city: 'Dublin',
      latitude: 53.3498,
      longitude: -6.2603,
    });

    expect(validateEventLocation(location({
      venue: 'Manchester Hall',
      address: '10 Deansgate',
      city: 'Manchester',
      country: 'United Kingdom',
      latitude: 53.3498,
      longitude: -6.2603,
    }), {
      persistedPublishedLocation: persisted,
    })).toMatchObject({ venue: expect.any(String) });
  });

  it('ignores surrounding whitespace when comparing a published legacy location', () => {
    const persisted = location({ venue: ' Dublin Hall ', city: ' Dublin ', country: ' Ireland ' });
    expect(isPersistedPhysicalLocationUnchanged(
      location({ venue: 'Dublin Hall', city: 'Dublin', country: 'Ireland' }),
      persisted,
    )).toBe(true);
  });

  it.each(['venue', 'address', 'city', 'country'] as const)(
    'invalidates the legacy exception when %s changes',
    (field) => {
      const persisted = location({ city: 'Dublin' });
      const current = location({ city: 'Dublin', [field]: 'Changed' });
      expect(isPersistedPhysicalLocationUnchanged(current, persisted)).toBe(false);
    },
  );

  it('retains physical acceptance when changing physical to hybrid but requires an online URL', () => {
    const persisted = location({ city: 'Dublin' });
    expect(validateEventLocation(location({ locationType: 'hybrid', city: 'Dublin' }), {
      persistedPublishedLocation: persisted,
    })).toEqual({ onlineUrl: 'Online URL is required for online or hybrid events.' });
  });

  it('does not use an online snapshot as a physical baseline when switching to hybrid', () => {
    const persisted = location({
      locationType: 'online',
      venue: '',
      country: '',
      onlineUrl: 'https://example.com/live',
    });
    expect(validateEventLocation(location({ locationType: 'hybrid', onlineUrl: 'https://example.com/live' }), {
      persistedPublishedLocation: persisted,
    })).toMatchObject({ address: expect.any(String), city: expect.any(String) });
  });
});

describe('event location text transitions', () => {
  const selectedLocation = location({
    venue: 'London Hall',
    address: '1 London Road',
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
  });

  it.each(['address', 'city'] as const)(
    'turns an autocomplete location into a manual location when %s changes',
    (field) => {
      const updated = updateLocationTextField(selectedLocation, field, 'Changed value');

      expect(updated).toMatchObject({
        venue: 'London Hall',
        address: field === 'address' ? 'Changed value' : '1 London Road',
        city: field === 'city' ? 'Changed value' : 'London',
        country: 'United Kingdom',
        latitude: null,
        longitude: null,
      });
    },
  );

  it('clears fields derived from the previous autocomplete result when venue changes', () => {
    expect(updateLocationTextField(selectedLocation, 'venue', 'Manchester Hall')).toMatchObject({
      venue: 'Manchester Hall',
      address: '',
      city: '',
      country: '',
      latitude: null,
      longitude: null,
    });
  });

  it('preserves a confirmed location when the text value did not change', () => {
    expect(updateLocationTextField(selectedLocation, 'venue', 'London Hall')).toBe(selectedLocation);
  });
});
