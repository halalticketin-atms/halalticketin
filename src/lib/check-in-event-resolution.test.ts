import { describe, expect, it } from 'vitest';

import {
  resolveCheckInEventResolution,
  type CheckInEventOption,
} from './check-in-event-resolution';

const firstEvent: CheckInEventOption = {
  id: 'event-1',
  name: 'Community Dinner',
};

const secondEvent: CheckInEventOption = {
  id: 'event-2',
  name: 'Youth Circle',
};

describe('resolveCheckInEventResolution', () => {
  it('returns loading while active events are still resolving', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [],
        hasFreshEvents: true,
        isLoading: true,
        error: null,
        requestedEventId: null,
      }).status,
    ).toBe('loading');
  });

  it('returns access_error when the organizer event request fails', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [],
        hasFreshEvents: true,
        isLoading: false,
        error: 'Forbidden',
        requestedEventId: null,
      }),
    ).toMatchObject({
      status: 'access_error',
      errorMessage: 'Forbidden',
    });
  });

  it('normalizes to the only active event when event is missing', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: null,
      }),
    ).toMatchObject({
      status: 'ready',
      selectedEventId: 'event-1',
      shouldNormalizeUrl: true,
    });
  });

  it('normalizes to the only active event when event is invalid', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: 'stale-event',
      }),
    ).toMatchObject({
      status: 'ready',
      selectedEventId: 'event-1',
      shouldNormalizeUrl: true,
    });
  });

  it('requires explicit selection when multiple active events exist and event is missing', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent, secondEvent],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: null,
      }),
    ).toMatchObject({
      status: 'selection_required',
      invalidEventId: null,
    });
  });

  it('requires explicit selection when multiple active events exist and event is invalid', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent, secondEvent],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: 'stale-event',
      }),
    ).toMatchObject({
      status: 'selection_required',
      invalidEventId: 'stale-event',
    });
  });

  it('returns ready when the requested event is valid', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent, secondEvent],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: 'event-2',
      }),
    ).toMatchObject({
      status: 'ready',
      selectedEventId: 'event-2',
      shouldNormalizeUrl: false,
    });
  });

  it('returns no_active_events when nothing is live and there is no error', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [],
        hasFreshEvents: true,
        isLoading: false,
        error: null,
        requestedEventId: null,
      }).status,
    ).toBe('no_active_events');
  });

  it('returns loading while active events belong to a previous organizer', () => {
    expect(
      resolveCheckInEventResolution({
        activeEvents: [firstEvent],
        hasFreshEvents: false,
        isLoading: false,
        error: null,
        requestedEventId: null,
      }).status,
    ).toBe('loading');
  });
});
