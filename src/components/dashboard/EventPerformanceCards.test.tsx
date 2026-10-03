import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void) | void>,
  load: vi.fn(),
  observe: vi.fn(),
  disconnect: vi.fn(),
  chart: vi.fn(),
  container: {} as HTMLDivElement,
  intersect: null as null | ((entries: Array<{ isIntersecting: boolean }>) => void),
  frame: null as null | (() => void),
  options: null as IntersectionObserverInit | null,
}));
vi.mock('react', async original => {
  const react = await original<typeof import('react')>();
  return {
    ...react,
    useEffect: (effect: () => (() => void) | void) => state.effects.push(effect),
    useRef: () => ({ current: state.container }),
    useState: (value: unknown) => [value, state.load],
  };
});
vi.mock('motion/react', () => ({
  motion: { div: ({ children, className }: React.PropsWithChildren<{ className?: string }>) => <div className={className}>{children}</div> },
}));
vi.mock('@/hooks/useOptimizedAnimation', () => ({
  useOptimizedAnimation: () => ({ initial: {}, animate: {}, transition: {}, springTransition: {}, staggerDelay: 0 }),
}));
vi.mock('next/dynamic', () => ({ default: () => state.chart }));

import { EventPerformanceCards } from './EventPerformanceCards';

const event = {
  id: 'fixture-event', title: 'Community Gathering', startDatetime: null,
  venue: null, city: null, bannerImageUrl: null, ticketsSold: 2, totalTickets: 10,
  revenue: 20, currency: 'EUR', status: 'published' as const,
  displayStatus: 'published' as const, salesTrend: [], trendPercentage: 0,
  weeklySales: [], ticketTypeBreakdown: [],
};

beforeEach(() => {
  state.effects = [];
  state.intersect = null;
  state.frame = null;
  state.options = null;
  state.load.mockReset();
  state.observe.mockReset();
  state.disconnect.mockReset();
  state.chart.mockReset().mockReturnValue(null);
  const Observer = class {
    constructor(callback: typeof state.intersect, options: IntersectionObserverInit) {
      state.intersect = callback;
      state.options = options;
    }
    observe = state.observe;
    disconnect = state.disconnect;
  };
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('window', {
    IntersectionObserver: Observer,
    requestAnimationFrame: (callback: () => void) => { state.frame = callback; return 1; },
    cancelAnimationFrame: vi.fn(),
  });
});
afterEach(() => vi.unstubAllGlobals());

function mountChartGate() {
  const markup = renderToStaticMarkup(<EventPerformanceCards events={[event]} organizerId="fixture-organiser" />);
  const cleanup = state.effects[0]();
  return { markup, cleanup };
}

describe('chart viewport loading', () => {
  it('reserves the chart geometry and waits for viewport proximity', () => {
    const { markup, cleanup } = mountChartGate();
    expect(markup).toContain('mt-2 h-[160px] w-full sm:h-[200px]');
    expect(state.chart).not.toHaveBeenCalled();
    expect(state.observe).toHaveBeenCalledWith(state.container);
    expect(state.options).toEqual({ rootMargin: '400px' });
    state.intersect!([{ isIntersecting: false }]);
    expect(state.load).not.toHaveBeenCalled();
    state.intersect!([{ isIntersecting: true }]);
    expect(state.load).toHaveBeenCalledWith(true);
    expect(state.disconnect).toHaveBeenCalledOnce();
    cleanup?.();
    expect(state.disconnect).toHaveBeenCalledTimes(2);
  });

  it('falls back to the next frame when IntersectionObserver is unsupported', () => {
    window.IntersectionObserver = undefined as unknown as typeof IntersectionObserver;
    const { cleanup } = mountChartGate();
    expect(state.load).not.toHaveBeenCalled();
    state.frame!();
    expect(state.load).toHaveBeenCalledWith(true);
    cleanup?.();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
