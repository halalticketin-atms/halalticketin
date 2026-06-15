import { describe, expect, it, vi } from 'vitest';

import { ConsentAccountSync, type AccountConsentRecord } from './consent-account-sync';
import type { ConsentPreferences } from './consent';

const grantedPreferences: ConsentPreferences = {
  analytics: true,
  marketing: true,
  updatedAt: '2026-06-15T20:00:00.000Z',
  version: 2,
};

const rejectedPreferences: ConsentPreferences = {
  analytics: false,
  marketing: false,
  updatedAt: '2026-06-15T21:00:00.000Z',
  version: 2,
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('ConsentAccountSync', () => {
  it('does not apply a stale account read after a local rejection', async () => {
    const sync = new ConsentAccountSync();
    const accountRead = createDeferred<AccountConsentRecord>();
    const applyRemote = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);

    const hydration = sync.hydrate('user-1', {
      load: () => accountRead.promise,
      readLocal: () => grantedPreferences,
      applyRemote,
      write,
    });

    await sync.persist('user-1', rejectedPreferences, write);
    accountRead.resolve({
      ...grantedPreferences,
      updatedAt: '2026-06-15T20:00:00.000Z',
    });
    await hydration;

    expect(applyRemote).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(rejectedPreferences);
  });

  it('keeps a newer local opt-out instead of applying an older account opt-in', async () => {
    const sync = new ConsentAccountSync();
    const applyRemote = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);

    await sync.hydrate('user-1', {
      load: async () => ({
        ...grantedPreferences,
        updatedAt: '2026-06-15T20:00:00.000Z',
      }),
      readLocal: () => rejectedPreferences,
      applyRemote,
      write,
    });

    expect(applyRemote).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith(rejectedPreferences);
  });

  it('applies account consent when it is newer than the local cookie', async () => {
    const sync = new ConsentAccountSync();
    const applyRemote = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);

    await sync.hydrate('user-1', {
      load: async () => ({
        ...grantedPreferences,
        updatedAt: '2026-06-15T22:00:00.000Z',
      }),
      readLocal: () => rejectedPreferences,
      applyRemote,
      write,
    });

    expect(applyRemote).toHaveBeenCalledWith({
      ...grantedPreferences,
      updatedAt: '2026-06-15T22:00:00.000Z',
    });
    expect(write).not.toHaveBeenCalled();
  });

  it('queues a newer rejection after an in-flight cookie-to-account write', async () => {
    const sync = new ConsentAccountSync();
    const firstWrite = createDeferred<void>();
    const secondWrite = createDeferred<void>();
    const writes: ConsentPreferences[] = [];
    const write = vi.fn((preferences: ConsentPreferences) => {
      writes.push(preferences);
      return writes.length === 1 ? firstWrite.promise : secondWrite.promise;
    });

    const hydration = sync.hydrate('user-1', {
      load: async () => ({
        analytics: false,
        marketing: false,
        version: 2,
        updatedAt: null,
      }),
      readLocal: () => grantedPreferences,
      applyRemote: vi.fn(),
      write,
    });

    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    const rejection = sync.persist('user-1', rejectedPreferences, write);

    expect(writes).toEqual([grantedPreferences]);

    firstWrite.resolve();
    await vi.waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(writes).toEqual([grantedPreferences, rejectedPreferences]);

    secondWrite.resolve();
    await Promise.all([hydration, rejection]);
  });
});
