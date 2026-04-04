export interface CheckInEventOption {
  id: string;
  name: string;
}

type CheckInResolutionBase = {
  activeEvents: CheckInEventOption[];
  requestedEventId: string | null;
};

export type CheckInEventResolution =
  | ({ status: 'loading' } & CheckInResolutionBase)
  | ({
      status: 'access_error';
      errorMessage: string;
    } & CheckInResolutionBase)
  | ({ status: 'no_active_events' } & CheckInResolutionBase)
  | ({
      status: 'selection_required';
      invalidEventId: string | null;
    } & CheckInResolutionBase)
  | ({
      status: 'ready';
      selectedEventId: string;
      shouldNormalizeUrl: boolean;
    } & CheckInResolutionBase);

interface ResolveCheckInEventResolutionOptions {
  activeEvents: CheckInEventOption[];
  hasFreshEvents: boolean;
  isLoading: boolean;
  error: string | null;
  requestedEventId: string | null;
}

export function resolveCheckInEventResolution({
  activeEvents,
  hasFreshEvents,
  isLoading,
  error,
  requestedEventId,
}: ResolveCheckInEventResolutionOptions): CheckInEventResolution {
  if (!hasFreshEvents) {
    return {
      status: 'loading',
      activeEvents: [],
      requestedEventId,
    };
  }

  if (isLoading && activeEvents.length === 0) {
    return {
      status: 'loading',
      activeEvents,
      requestedEventId,
    };
  }

  if (error) {
    return {
      status: 'access_error',
      activeEvents,
      requestedEventId,
      errorMessage: error,
    };
  }

  if (activeEvents.length === 0) {
    return {
      status: 'no_active_events',
      activeEvents,
      requestedEventId,
    };
  }

  const hasRequestedEvent =
    requestedEventId !== null &&
    activeEvents.some((event) => event.id === requestedEventId);

  if (activeEvents.length === 1) {
    const selectedEventId = activeEvents[0]!.id;
    return {
      status: 'ready',
      activeEvents,
      requestedEventId,
      selectedEventId,
      shouldNormalizeUrl: !hasRequestedEvent,
    };
  }

  if (!hasRequestedEvent) {
    return {
      status: 'selection_required',
      activeEvents,
      requestedEventId,
      invalidEventId: requestedEventId,
    };
  }

  return {
    status: 'ready',
    activeEvents,
    requestedEventId,
    selectedEventId: requestedEventId!,
    shouldNormalizeUrl: false,
  };
}
