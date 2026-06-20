import type { DraftFormData } from '@/hooks/useEventDraft';

export type CoordinateFields = Pick<DraftFormData, 'latitude' | 'longitude'>;

export type EventLocationFields = Pick<
  DraftFormData,
  | 'locationType'
  | 'venue'
  | 'address'
  | 'city'
  | 'country'
  | 'latitude'
  | 'longitude'
  | 'onlineUrl'
>;

const isPhysical = (locationType: DraftFormData['locationType']) =>
  locationType === 'physical' || locationType === 'hybrid';

const normalize = (value: string) => value.trim();

export const hasCoordinatePair = (
  location: CoordinateFields,
): location is CoordinateFields & { latitude: number; longitude: number } =>
  typeof location.latitude === 'number' &&
  Number.isFinite(location.latitude) &&
  typeof location.longitude === 'number' &&
  Number.isFinite(location.longitude);

export const isPersistedPhysicalLocationUnchanged = (
  current: EventLocationFields,
  persisted?: EventLocationFields,
): boolean => {
  if (!persisted || !isPhysical(current.locationType) || !isPhysical(persisted.locationType)) {
    return false;
  }

  if (!normalize(persisted.venue)) {
    return false;
  }

  return (['venue', 'address', 'city', 'country'] as const).every(
    (field) => normalize(current[field]) === normalize(persisted[field]),
  );
};

export const validateEventLocation = (
  current: EventLocationFields,
  options?: { persistedPublishedLocation?: EventLocationFields },
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const physical = isPhysical(current.locationType);
  const online = current.locationType === 'online' || current.locationType === 'hybrid';

  if (physical && !normalize(current.venue)) {
    errors.venue = 'Venue is required for in-person or hybrid events.';
  }

  const hasManualLocation = Boolean(normalize(current.address) && normalize(current.city));
  const acceptsPersistedLocation = isPersistedPhysicalLocationUnchanged(
    current,
    options?.persistedPublishedLocation,
  );
  if (physical && !hasCoordinatePair(current) && !hasManualLocation && !acceptsPersistedLocation) {
    if (!normalize(current.address)) {
      errors.address = 'Address is required when entering a venue manually.';
    }
    if (!normalize(current.city)) {
      errors.city = 'City is required when entering a venue manually.';
    }
  }

  if (online && !normalize(current.onlineUrl)) {
    errors.onlineUrl = 'Online URL is required for online or hybrid events.';
  }

  return errors;
};
