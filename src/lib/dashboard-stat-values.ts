export const DASHBOARD_EVENTS_IDLE_TIMEOUT_MS = 1000;

export const resolveActiveEventsStatValue = ({
  activeEvents,
  hasLoadedEvents,
  eventsPerformanceCount,
}: {
  activeEvents?: number;
  hasLoadedEvents: boolean;
  eventsPerformanceCount: number;
}) => activeEvents ?? (hasLoadedEvents ? eventsPerformanceCount : '—');

export const scheduleDashboardEventsLoad = (loadEvents: () => void) => {
  const idleCallback = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    }
  ).requestIdleCallback;
  const cancelIdleCallback = (
    globalThis as typeof globalThis & {
      cancelIdleCallback?: (id: number) => void;
    }
  ).cancelIdleCallback;

  if (typeof idleCallback === 'function') {
    const idleId = idleCallback(loadEvents, { timeout: DASHBOARD_EVENTS_IDLE_TIMEOUT_MS });
    return () => cancelIdleCallback?.(idleId);
  }

  const timeoutId = setTimeout(loadEvents, 0);
  return () => clearTimeout(timeoutId);
};
