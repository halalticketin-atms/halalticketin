import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SUPPORTED_CURRENCIES } from '@/lib/fees';

const state = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  refresh: null as null | (() => Promise<void>),
  fetch: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void) => state.effects.push(effect),
}));

import { ExchangeRatesProvider, useExchangeRates } from './useExchangeRates';

function Consumer() {
  const { refresh } = useExchangeRates();
  useEffect(() => { state.refresh = refresh; }, [refresh]);
  return null;
}

function RatesSummary() {
  const rates = useExchangeRates();
  return <output>{JSON.stringify({
    isLoading: rates.isLoading,
    currencies: rates.currencies,
    lastUpdated: rates.lastUpdated?.toISOString(),
    fromGBP: rates.convertFromGBP(10, 'eur'),
    toGBP: rates.convertToGBP(12, 'EUR'),
    crossRate: rates.getRate('EUR', 'GBP'),
  })}</output>;
}

const ratesData = {
  base: 'GBP',
  date: '2026-10-03',
  rates: { GBP: 1, EUR: 1.2 },
  currencies: SUPPORTED_CURRENCIES,
  lastUpdated: '2026-10-03T10:00:00Z',
};

beforeEach(() => {
  state.effects = [];
  state.refresh = null;
  state.fetch.mockReset().mockResolvedValue({ ok: true, json: async () => ratesData });
  state.getItem.mockReset().mockReturnValue(null);
  state.setItem.mockReset();
  vi.stubGlobal('fetch', state.fetch);
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { getItem: state.getItem, setItem: state.setItem, removeItem: vi.fn() });
});

afterEach(() => vi.unstubAllGlobals());

function mountConsumers(count: number, initialData?: typeof ratesData | null) {
  renderToStaticMarkup(<ExchangeRatesProvider initialData={initialData}>
    {Array.from({ length: count }, (_, key) => <Consumer key={key} />)}
  </ExchangeRatesProvider>);
  for (const effect of state.effects) effect();
}

describe('consumer-driven exchange rates', () => {
  it('does not fetch when the provider has no currency consumers', () => {
    mountConsumers(0);
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.getItem).not.toHaveBeenCalled();
  });

  it('coalesces the first load across multiple consumers', async () => {
    mountConsumers(2);
    expect(state.fetch).toHaveBeenCalledOnce();
    expect(state.fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/exchange-rates$/);
    await vi.waitFor(() => expect(state.setItem).toHaveBeenCalledOnce());
  });

  it('uses the existing fresh cache without a network request', () => {
    state.getItem.mockReturnValue(JSON.stringify({ data: ratesData, fetchedAt: Date.now() }));
    mountConsumers(2);
    expect(state.getItem).toHaveBeenCalledOnce();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('preserves manual refresh and bypasses the cached value', async () => {
    state.getItem.mockReturnValue(JSON.stringify({ data: ratesData, fetchedAt: Date.now() }));
    mountConsumers(1);
    await state.refresh!();
    expect(state.fetch).toHaveBeenCalledOnce();
    expect(state.setItem).toHaveBeenCalledOnce();
  });

  it('uses a server snapshot immediately and preserves currency conversions', () => {
    const html = renderToStaticMarkup(<ExchangeRatesProvider initialData={ratesData}>
      <RatesSummary />
    </ExchangeRatesProvider>);
    expect(html).toContain('&quot;isLoading&quot;:false');
    expect(html).toContain('&quot;lastUpdated&quot;:&quot;2026-10-03T10:00:00.000Z&quot;');
    expect(html).toContain('&quot;fromGBP&quot;:12');
    expect(html).toContain('&quot;toGBP&quot;:10');
    expect(html).toContain(`&quot;crossRate&quot;:${1 / 1.2}`);
    expect(html).toContain('&quot;EUR&quot;');
  });

  it('does not replace seeded data with browser cache or a redundant request', () => {
    mountConsumers(2, ratesData);
    expect(state.getItem).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('still refreshes a seeded provider and saves the fresh browser cache', async () => {
    mountConsumers(1, ratesData);
    await state.refresh!();
    expect(state.getItem).not.toHaveBeenCalled();
    expect(state.fetch).toHaveBeenCalledOnce();
    expect(state.setItem).toHaveBeenCalledWith('halal-ticketin:exchange-rates', expect.any(String));
  });

  it('keeps the existing cache fallback when the server snapshot is unavailable', () => {
    state.getItem.mockReturnValue(JSON.stringify({ data: ratesData, fetchedAt: Date.now() }));
    mountConsumers(1, null);
    expect(state.getItem).toHaveBeenCalledOnce();
    expect(state.fetch).not.toHaveBeenCalled();
  });
});
