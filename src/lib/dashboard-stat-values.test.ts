import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DASHBOARD_EVENTS_IDLE_TIMEOUT_MS,
  resolveActiveEventsStatValue,
  scheduleDashboardEventsLoad,
} from './dashboard-stat-values';

describe('dashboard stat values', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (globalThis as typeof globalThis & { requestIdleCallback?: unknown })
      .requestIdleCallback;
    delete (globalThis as typeof globalThis & { cancelIdleCallback?: unknown }).cancelIdleCallback;
  });

  it('prefers the backend active event count over events-performance length', () => {
    expect(
      resolveActiveEventsStatValue({
        activeEvents: 3,
        hasLoadedEvents: true,
        eventsPerformanceCount: 7,
      })
    ).toBe(3);
  });

  it('keeps the fallback value loading until events-performance finishes', () => {
    expect(
      resolveActiveEventsStatValue({
        activeEvents: undefined,
        hasLoadedEvents: false,
        eventsPerformanceCount: 0,
      })
    ).toBe('—');

    expect(
      resolveActiveEventsStatValue({
        activeEvents: undefined,
        hasLoadedEvents: true,
        eventsPerformanceCount: 2,
      })
    ).toBe(2);
  });

  it('passes a timeout to requestIdleCallback', () => {
    const loadEvents = vi.fn();
    const cancelIdleCallback = vi.fn();
    const requestIdleCallback = vi.fn(() => 42);
    (
      globalThis as typeof globalThis & {
        requestIdleCallback?: typeof requestIdleCallback;
        cancelIdleCallback?: typeof cancelIdleCallback;
      }
    ).requestIdleCallback = requestIdleCallback;
    (
      globalThis as typeof globalThis & {
        requestIdleCallback?: typeof requestIdleCallback;
        cancelIdleCallback?: typeof cancelIdleCallback;
      }
    ).cancelIdleCallback = cancelIdleCallback;

    const cleanup = scheduleDashboardEventsLoad(loadEvents);

    expect(requestIdleCallback).toHaveBeenCalledWith(loadEvents, {
      timeout: DASHBOARD_EVENTS_IDLE_TIMEOUT_MS,
    });
    cleanup();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });

  it('falls back to setTimeout when idle callbacks are unavailable', () => {
    vi.useFakeTimers();
    const loadEvents = vi.fn();

    const cleanup = scheduleDashboardEventsLoad(loadEvents);
    expect(loadEvents).not.toHaveBeenCalled();

    vi.runOnlyPendingTimers();
    expect(loadEvents).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
