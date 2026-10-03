import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  effects: [] as Array<() => (() => void) | void>,
  onChange: null as null | ((event: string, session: { access_token: string; refresh_token: string; user?: { id: string } } | null) => Promise<void>),
  token: null as string | null,
  revision: 0, identity: 0,
  authListeners: new Set<() => void>(),
  profileClears: 0, stateIndex: 0,
  session: { access_token: 'test-access-token', refresh_token: 'test-refresh-token' } as { access_token: string; refresh_token: string; user?: { id: string } } | null,
  startupEvent: null as string | null,
  sessionError: false,
  clientError: false,
  sessionGate: null as Promise<void> | null,
  signOut: null as null | (() => void),
  refresh: null as null | (() => Promise<void>),
  profileSets: [] as unknown[],
  loadingSets: [] as boolean[],
  storage: new Map<string, string>(),
  storageListeners: new Set<(event: StorageEvent) => void>(),
  ready: null as ReturnType<typeof import('../lib/supabase').getSupabase> | null,
  readyListeners: new Set<(client: ReturnType<typeof import('../lib/supabase').getSupabase>) => void>(),
  getClient: vi.fn(),
  tokenReadError: false,
  sdkSignOut: vi.fn(),
  sdkGetSession: vi.fn(),
  get: vi.fn(),
  unsubscribe: vi.fn(),
  clear: vi.fn(),
}));

vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useEffect: (effect: () => (() => void) | void) => state.effects.push(effect),
    useState: (value: unknown) => {
      const index = state.stateIndex++;
      const [current, set] = react.useState(value);
      return [current, (next: unknown) => {
        if (next && typeof next === 'object' && 'user' in next) state.profileSets.push(next);
        if (index === 1 && next === null) state.profileClears += 1;
        if (typeof next === 'boolean') state.loadingSets.push(next);
        set(next);
      }];
    },
  };
});
vi.mock('@/lib/api', () => ({
  default: { get: state.get },
  ApiError: class extends Error {},
  getAuthSessionRevision: () => state.revision,
  getAuthIdentityRevision: () => state.identity,
  subscribeAuthSession: (listener: () => void) => { state.authListeners.add(listener); return () => { state.authListeners.delete(listener); }; },
  clearAuthSession: () => { state.token = null; state.revision += 1; state.identity += 1; state.clear(); state.authListeners.forEach(listener => listener()); return true; },
  getAuthToken: () => { if (state.tokenReadError) throw new Error('Session storage blocked'); return state.token; },
  getAuthSessionOwner: () => {
    if (state.tokenReadError) throw new Error('Session storage blocked');
    return { token: state.token, revision: state.revision, identity: state.identity,
      refreshToken: state.storage.get('halal-ticketin-refresh-token') ?? null,
      retired: state.storage.get('halal-ticketin:session-retired') === '1' };
  },
  setAuthToken: (token: string | null, options?: { preserveIdentity?: boolean; refreshToken?: string | null }) => {
    if (token) state.storage.delete('halal-ticketin:session-retired');
    if (options?.refreshToken) state.storage.set('halal-ticketin-refresh-token', options.refreshToken);
    else if (options?.refreshToken === null) state.storage.delete('halal-ticketin-refresh-token');
    if (state.token === token) return true;
    state.token = token; state.revision += 1;
    if (!options?.preserveIdentity) state.identity += 1;
    state.authListeners.forEach(listener => listener());
    return true;
  },
  setRefreshToken: vi.fn(),
}));
vi.mock('@/lib/web-session-client', () => ({ ensureWebSession: vi.fn().mockResolvedValue(false), isWebSessionSeedCurrent: vi.fn().mockReturnValue(false) }));
vi.mock('@/lib/upload-api', () => ({ dataUrlToFile: vi.fn(), uploadOrganizerAvatar: vi.fn() }));
vi.mock('@/lib/supabase-readiness', async original => ({
  ...await original<typeof import('../lib/supabase-readiness')>(),
  subscribeSupabaseClient: (listener: (client: NonNullable<typeof state.ready>) => void) => {
    state.readyListeners.add(listener);
    if (state.ready) listener(state.ready);
    return () => { state.readyListeners.delete(listener); };
  },
}));
vi.mock('@/lib/supabase', () => ({
  getSupabase: () => {
    state.getClient();
    if (state.clientError) throw new Error('SDK unavailable');
    if (state.ready) return state.ready;
    const client = { auth: {
    signOut: state.sdkSignOut,
    admin: { signOut: state.sdkSignOut },
    getSession: state.sdkGetSession,
    onAuthStateChange: (callback: typeof state.onChange) => {
      state.onChange = callback;
      return { data: { subscription: { unsubscribe: state.unsubscribe } } };
    },
    } } as NonNullable<typeof state.ready>;
    state.ready = client;
    state.readyListeners.forEach(listener => listener(client));
    return client;
  },
}));

import { isWebSessionSeedCurrent } from '@/lib/web-session-client';
import { AuthProvider, useAuth } from './auth-context';

function ReadAuth() {
  const { signOut, refresh } = useAuth();
  useEffect(() => { state.signOut = signOut; state.refresh = refresh; }, [signOut, refresh]);
  return null;
}

beforeEach(() => {
  vi.mocked(isWebSessionSeedCurrent).mockReturnValue(false);
  state.effects = [];
  state.onChange = null;
  state.token = null; state.revision = 0; state.identity = 0; state.profileClears = 0; state.stateIndex = 0; state.authListeners.clear();
  state.session = { access_token: 'test-access-token', refresh_token: 'test-refresh-token' };
  state.startupEvent = null;
  state.sessionError = false;
  state.clientError = false;
  state.sessionGate = null;
  state.signOut = null;
  state.refresh = null;
  state.profileSets = [];
  state.loadingSets = [];
  state.storage.clear();
  state.storage.set('sb-synthetic-auth-token', '{}');
  state.storageListeners.clear();
  state.ready = null;
  state.readyListeners.clear();
  state.getClient.mockReset();
  state.tokenReadError = false;
  state.sdkSignOut.mockReset().mockResolvedValue({ error: null });
  state.sdkGetSession.mockReset().mockImplementation(async () => {
    await Promise.resolve();
    if (state.sessionGate) await state.sessionGate;
    if (state.startupEvent) await state.onChange!(state.startupEvent, state.session);
    if (state.sessionError) throw new Error('Session unavailable');
    return { data: { session: state.session } };
  });
  state.get.mockReset().mockResolvedValue({ user: { id: 'user-1' }, memberships: [], isOrganizer: true });
  state.unsubscribe.mockReset();
  state.clear.mockReset();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.example.test');
  vi.stubGlobal('window', {
    location: new URL('https://frontend.example.test/'),
    localStorage: { getItem: (key: string) => state.storage.get(key) ?? null, setItem: (key: string, value: string) => state.storage.set(key, value), removeItem: (key: string) => state.storage.delete(key) },
    addEventListener: (_name: string, listener: (event: StorageEvent) => void) => state.storageListeners.add(listener),
    removeEventListener: (_name: string, listener: (event: StorageEvent) => void) => state.storageListeners.delete(listener),
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

async function initialiseProvider() {
  renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(ReadAuth)));
  const cleanup = state.effects[0]();
  state.effects[1]?.();
  await vi.waitFor(() => expect(state.onChange).not.toBeNull());
  await state.onChange!('INITIAL_SESSION', state.session);
  await vi.waitFor(() => expect(state.get).toHaveBeenCalled());
  await new Promise<void>(resolve => setImmediate(resolve));
  return cleanup;
}

describe('profile loading ownership', () => {
  it.each(['child-first', 'parent-first'])('adopts an API-only private seed with %s effects without SDK or another profile GET', async order => {
    vi.mocked(isWebSessionSeedCurrent).mockReturnValue(true);
    state.storage.clear();
    state.session = null;
    state.token = 'returning-backend-password-token';
    state.storage.set('halal-ticketin-access-token', state.token);
    const profile: import('./auth-context').ProfileResponse = {
      user: { id: 'user-1', email: 'fixture@example.test', name: null, avatarUrl: null, gender: null, dateOfBirth: null, homeCountry: null, homeCity: null },
      memberships: [], isOrganizer: true, needsOnboarding: false,
    };
    function AdoptSeed() {
      const auth = useAuth();
      useEffect(() => { auth.adoptSessionSeed({ nonce: 'matching-nonce-1234567890', profile, organizers: [] }); state.refresh = auth.refresh; }, [auth]);
      return null;
    }
    renderToStaticMarkup(<AuthProvider><AdoptSeed /></AuthProvider>);
    state.effects[order === 'child-first' ? 1 : 0]();
    state.effects[order === 'child-first' ? 0 : 1]();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.get).not.toHaveBeenCalled();
    expect(state.profileSets.at(-1)).toBe(profile);
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.sdkGetSession).not.toHaveBeenCalled();
    state.session = { access_token: state.token, refresh_token: 'backend-refresh' };
    (await import('@/lib/supabase')).getSupabase();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.get).not.toHaveBeenCalled();
    await state.refresh!();
    expect(state.get).toHaveBeenCalledOnce();
  });

  it('bootstraps an API-only profile without SDK and preserves explicit refresh', async () => {
    state.storage.clear(); state.token = 'backend-only-token'; state.session = null;
    state.storage.set('halal-ticketin-access-token', state.token);
    renderToStaticMarkup(<AuthProvider><ReadAuth /></AuthProvider>);
    state.effects[0](); state.effects[1]();
    await vi.waitFor(() => expect(state.profileSets).toHaveLength(1));
    expect(state.get).toHaveBeenCalledOnce();
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.sdkGetSession).not.toHaveBeenCalled();
    expect(state.token).toBe('backend-only-token');
    await state.refresh!();
    expect(state.get).toHaveBeenCalledTimes(2);
  });

  it('keeps refresh-only storage anonymous without SDK or profile recovery', () => {
    state.storage.clear(); state.token = null; state.session = null;
    state.storage.set('halal-ticketin-refresh-token', 'leftover-refresh');
    renderToStaticMarkup(<AuthProvider>Public</AuthProvider>);
    state.effects[0]();
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.get).not.toHaveBeenCalled();
    expect(state.loadingSets).toEqual([false]);
  });

  it.each(['completed', 'pending'])('deduplicates a %s API-only profile when a matching SDK arrives later', async mode => {
    state.storage.clear(); state.token = 'backend-only-token';
    state.storage.set('halal-ticketin-access-token', state.token);
    state.session = { access_token: state.token, refresh_token: 'backend-refresh' };
    let release!: () => void;
    if (mode === 'pending') state.get.mockImplementationOnce(() => new Promise(resolve => { release = () => resolve({ user: { id: 'user-1' }, memberships: [], isOrganizer: true }); }));
    renderToStaticMarkup(<AuthProvider>Private</AuthProvider>);
    state.effects[0]();
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.getClient).not.toHaveBeenCalled();
    (await import('@/lib/supabase')).getSupabase();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    if (mode === 'pending') release();
    await vi.waitFor(() => expect(state.profileSets).toHaveLength(1));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.get).toHaveBeenCalledOnce();
    const revision = state.revision;
    const identity = state.identity;
    await state.onChange!('TOKEN_REFRESHED', { access_token: 'rotated-backend', refresh_token: 'rotated-refresh', user: { id: 'user-1' } });
    expect(state.revision).toBeGreaterThan(revision);
    expect(state.identity).toBe(identity);
    expect(state.get).toHaveBeenCalledTimes(2);
  });

  it('settles anonymous state without constructing the SDK or reading a private profile', async () => {
    state.storage.clear();
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    const cleanup = state.effects[0]();
    expect(state.loadingSets).toEqual([false]);
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.get).not.toHaveBeenCalled();
    expect(state.readyListeners).toHaveLength(1);
    cleanup?.();
    expect(state.readyListeners.size).toBe(0);
    expect(state.storageListeners.size).toBe(0);
  });

  it.each(['before', 'after'])('subscribes once when a child creates the SDK %s the provider effect', async order => {
    state.storage.clear();
    const { getSupabase } = await import('@/lib/supabase');
    if (order === 'before') getSupabase();
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    if (order === 'after') getSupabase();
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.sdkGetSession).toHaveBeenCalledOnce();
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.get).toHaveBeenCalledTimes(2);
  });

  it.each(['sb-synthetic-auth-token', 'halal-ticketin-access-token'])('wakes an anonymous tab for a cross-tab %s session', async key => {
    state.storage.clear();
    if (key === 'halal-ticketin-access-token') state.session = null;
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    state.storage.set(key, 'cross-tab-session');
    if (key === 'halal-ticketin-access-token') state.token = 'cross-tab-api-token';
    const event = { key, newValue: 'cross-tab-session' } as StorageEvent;
    state.storageListeners.forEach(listener => listener(event));
    state.storageListeners.forEach(listener => listener(event));
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    if (key === 'halal-ticketin-access-token') {
      expect(state.sdkGetSession).not.toHaveBeenCalled();
      expect(state.getClient).not.toHaveBeenCalled();
    } else {
      expect(state.sdkGetSession).toHaveBeenCalledOnce();
      expect(state.getClient).toHaveBeenCalledOnce();
    }
  });

  it('does not wake an anonymous tab for unrelated storage or a removed session', () => {
    state.storage.clear();
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    state.storageListeners.forEach(listener => listener({ key: 'unrelated', newValue: 'value' } as StorageEvent));
    state.storageListeners.forEach(listener => listener({ key: 'sb-synthetic-auth-token', newValue: null } as StorageEvent));
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.get).not.toHaveBeenCalled();
  });

  it.each(['access-present', 'access-absent'])('handles API refresh-key arrival with %s without SDK', async mode => {
    state.storage.clear(); state.token = null; state.session = null;
    renderToStaticMarkup(<AuthProvider>Public</AuthProvider>);
    state.effects[0]();
    if (mode === 'access-present') state.token = 'arriving-backend-token';
    state.storage.set('halal-ticketin-refresh-token', 'arriving-refresh');
    state.storageListeners.forEach(listener => listener({ key: 'halal-ticketin-refresh-token', newValue: 'arriving-refresh' } as StorageEvent));
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.sdkGetSession).not.toHaveBeenCalled();
    expect(state.get).toHaveBeenCalledTimes(mode === 'access-present' ? 1 : 0);
  });

  it.each(['halal-ticketin-access-token', null])('clears a backend password session after cross-tab removal of %s', async key => {
    state.storage.clear();
    state.session = null;
    let refresh!: () => Promise<void>;
    function PublicPasswordLogin() {
      const auth = useAuth();
      useEffect(() => { refresh = auth.refresh; }, [auth.refresh]);
      return null;
    }
    renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(PublicPasswordLogin)));
    state.effects[0]();
    state.effects[1]();
    state.token = 'backend-login-token';
    await refresh();
    expect(state.profileSets).toHaveLength(1);
    state.token = null;
    state.storageListeners.forEach(listener => listener({ key, newValue: null } as StorageEvent));
    expect(state.token).toBeNull();
    expect(state.clear).toHaveBeenCalledOnce();
    expect(state.loadingSets.at(-1)).toBe(false);
    expect(state.getClient).not.toHaveBeenCalled();
  });

  it('does not clear a signed-in API session for refresh-token removal alone', () => {
    state.storage.clear();
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    state.token = 'backend-login-token';
    state.storageListeners.forEach(listener => listener({ key: 'halal-ticketin-refresh-token', newValue: null } as StorageEvent));
    expect(state.token).toBe('backend-login-token');
    expect(state.clear).not.toHaveBeenCalled();
  });

  it('restores a legitimate later cross-tab session after local session clearing', async () => {
    state.storage.clear();
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    state.storageListeners.forEach(listener => listener({ key: null, newValue: null } as StorageEvent));
    (await import('@/lib/api')).setAuthToken(state.session!.access_token);
    state.storage.set('sb-synthetic-auth-token', JSON.stringify(state.session));
    state.storageListeners.forEach(listener => listener({ key: 'sb-synthetic-auth-token', newValue: 'new-session' } as StorageEvent));
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.token).toBe('test-access-token');
    expect(state.sdkGetSession).toHaveBeenCalledOnce();
  });

  it('does not restore an already-pending initial session after cross-tab access-token removal', async () => {
    let releaseSession!: () => void;
    state.sessionGate = new Promise<void>(resolve => { releaseSession = resolve; });
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    state.storageListeners.forEach(listener => listener({ key: 'halal-ticketin-access-token', newValue: null } as StorageEvent));
    releaseSession();
    await state.sdkGetSession.mock.results[0].value;
    expect(state.token).toBeNull();
    expect(state.profileSets).toHaveLength(0);
    expect(state.get).not.toHaveBeenCalled();
    (await import('@/lib/api')).setAuthToken(state.session!.access_token);
    state.storage.set('sb-synthetic-auth-token', JSON.stringify(state.session));
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.get).toHaveBeenCalledOnce();
  });

  it('initialises conservatively when browser storage is unreadable', async () => {
    state.storage.clear();
    state.session = null;
    state.tokenReadError = true;
    window.localStorage.getItem = () => { throw new Error('Storage blocked'); };
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    await state.sdkGetSession.mock.results[0].value;
    expect(state.loadingSets).toContain(false);
    expect(state.get).not.toHaveBeenCalled();
  });

  it('preserves an in-memory API token even when persistent session keys are absent', async () => {
    state.storage.clear();
    state.token = 'memory-api-token';
    state.session = null;
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.token).toBe('memory-api-token');
    expect(state.getClient).not.toHaveBeenCalled();
  });

  it('keeps backend-token login refresh available after anonymous SDK deferral', async () => {
    state.storage.clear();
    let refresh!: () => Promise<void>;
    function BackendLogin() {
      const auth = useAuth();
      useEffect(() => { refresh = auth.refresh; }, [auth.refresh]);
      return null;
    }
    renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(BackendLogin)));
    state.effects[0]();
    state.effects[1]();
    state.token = 'backend-login-token';
    await refresh();
    expect(state.get).toHaveBeenCalledExactlyOnceWith('/api/v1/auth/me');
    expect(state.profileSets).toHaveLength(1);
    expect(state.getClient).not.toHaveBeenCalled();
  });

  it('retires an anonymous session without constructing the SDK, then rejects a later-created stale client', async () => {
    state.storage.clear();
    renderToStaticMarkup(<AuthProvider><ReadAuth /></AuthProvider>);
    state.effects[0](); state.effects[1]();
    state.signOut!();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.getClient).not.toHaveBeenCalled();
    expect(state.sdkSignOut).not.toHaveBeenCalled();
    (await import('@/lib/supabase')).getSupabase();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    await state.sdkGetSession.mock.results[0].value;
    expect(state.token).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
    (await import('@/lib/api')).setAuthToken(state.session!.access_token);
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.get).toHaveBeenCalledOnce();
  });

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'])('keeps the accepted profile during verified SDK %s recovery while invalidating delayed reads', async event => {
    await initialiseProvider();
    const clears = state.profileClears;
    const identity = state.identity;
    const revision = state.revision;
    const refreshed = { access_token: 'rotated-access', refresh_token: 'rotated-refresh', user: { id: 'user-1' } };
    await state.onChange!(event, refreshed);
    expect(state.profileClears).toBe(clears);
    expect(state.identity).toBe(identity);
    expect(state.revision).toBeGreaterThan(revision);
    expect(state.token).toBe('rotated-access');
  });

  it('ignores a stale SDK sign-out after shared credentials have changed to account B', async () => {
    await initialiseProvider();
    state.token = 'account-b';
    await state.onChange!('SIGNED_OUT', null);
    expect(state.token).toBe('account-b');
    expect(state.clear).not.toHaveBeenCalled();
  });

  it.each(['success', 'failure'])('ignores a delayed profile %s after the shared session revision changes', async result => {
    let resolve!: (profile: unknown) => void;
    let reject!: (error: Error) => void;
    state.get.mockImplementationOnce(() => new Promise((ok, fail) => { resolve = ok; reject = fail; }));
    await initialiseProvider();
    state.revision += 1; state.identity += 1; state.token = 'account-b';
    const completed = state.loadingSets.filter(value => !value).length;
    if (result === 'success') resolve({ user: { id: 'account-a' }, memberships: [], isOrganizer: true });
    else reject(new Error('Old account-A failure'));
    await new Promise<void>(done => setImmediate(done));
    expect(state.profileSets).toHaveLength(0);
    expect(state.loadingSets.filter(value => !value)).toHaveLength(completed);
    expect(state.clear).not.toHaveBeenCalled();
  });

  it('loads the initial profile once when Supabase also announces the session', async () => {
    const cleanup = await initialiseProvider();
    expect(state.get).toHaveBeenCalledTimes(1);
    expect(state.get).toHaveBeenCalledWith('/api/v1/auth/me');
    cleanup?.();
    expect(state.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED'])('loads once when session recovery emits %s before getSession resolves', async event => {
    state.startupEvent = event;
    await initialiseProvider();
    expect(state.get).toHaveBeenCalledTimes(1);
  });

  it.each(['missing', 'failed'])('recovers a %s initial session through a later sign-in', async condition => {
    state.session = null;
    state.sessionError = condition === 'failed';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.onChange).not.toBeNull());
    await state.onChange!('INITIAL_SESSION', null);
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.get).not.toHaveBeenCalled();
    await state.onChange!('SIGNED_IN', { access_token: 'signed-in-token', refresh_token: 'signed-in-refresh' });
    expect(state.get).toHaveBeenCalledTimes(1);
  });

  it.each(['SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'])('still reloads the profile on %s', async event => {
    await initialiseProvider();
    await state.onChange!(event, state.session);
    expect(state.get).toHaveBeenCalledTimes(2);
  });

  it('clears the session on sign-out without loading another profile', async () => {
    await initialiseProvider();
    await state.onChange!('SIGNED_OUT', null);
    expect(state.clear).toHaveBeenCalledOnce();
    expect(state.token).toBeNull();
    expect(state.get).toHaveBeenCalledTimes(1);
  });

  it('signs out through the loaded SDK and clears the API token immediately', async () => {
    await initialiseProvider();
    state.signOut!();
    expect(state.clear).toHaveBeenCalledOnce();
    expect(state.sdkSignOut).toHaveBeenCalledOnce();
    expect(state.token).toBeNull();
  });

  it('does not recover a pending initial session after explicit sign-out', async () => {
    state.token = 'pending-api-token';
    let releaseSession!: () => void;
    let completeSignOut!: (result: { error: null }) => void;
    const signOutResult = new Promise<{ error: null }>(resolve => { completeSignOut = resolve; });
    state.sdkSignOut.mockReturnValue(signOutResult);
    state.sessionGate = new Promise<void>(resolve => { releaseSession = resolve; });
    state.startupEvent = 'SIGNED_IN';
    renderToStaticMarkup(React.createElement(AuthProvider, null, React.createElement(ReadAuth)));
    state.effects[0]();
    state.effects[1]();
    await vi.waitFor(() => expect(state.sdkGetSession).toHaveBeenCalledOnce());
    state.signOut!();
    expect(state.sdkSignOut).toHaveBeenCalledOnce();
    expect(state.clear).toHaveBeenCalledOnce();
    releaseSession();
    await state.sdkGetSession.mock.results[0].value;
    expect(state.token).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
    expect(state.profileSets).toHaveLength(0);
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.get).not.toHaveBeenCalled();
    completeSignOut({ error: null });
    await signOutResult;
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.token).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
    (await import('@/lib/api')).setAuthToken(state.session!.access_token);
    state.storage.set('sb-synthetic-auth-token', JSON.stringify(state.session));
    await state.onChange!('SIGNED_IN', state.session);
    expect(state.get).toHaveBeenCalledOnce();
  });

  it.each(['explicit', 'SIGNED_OUT'])('ignores a profile response after %s sign-out', async event => {
    let releaseProfile!: () => void;
    const profileGate = new Promise<void>(resolve => { releaseProfile = resolve; });
    state.get.mockImplementation(async () => {
      await profileGate;
      return { user: { id: 'user-1' }, memberships: [], isOrganizer: true };
    });
    await initialiseProvider();
    if (event === 'explicit') state.signOut!();
    else await state.onChange!('SIGNED_OUT', null);
    releaseProfile();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.token).toBeNull();
    expect(state.profileSets).toHaveLength(0);
  });

  it('does not subscribe or load a profile after unmounting during the SDK import', async () => {
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    const cleanup = state.effects[0]();
    cleanup?.();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.onChange).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
  });

  it('unsubscribes and ignores a session read that completes after unmounting', async () => {
    let releaseSession!: () => void;
    state.sessionGate = new Promise<void>(resolve => { releaseSession = resolve; });
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    const cleanup = state.effects[0]();
    await vi.waitFor(() => expect(state.onChange).not.toBeNull());
    cleanup?.();
    releaseSession();
    await new Promise<void>(resolve => setImmediate(resolve));
    expect(state.unsubscribe).toHaveBeenCalledOnce();
    expect(state.token).toBeNull();
    expect(state.get).not.toHaveBeenCalled();
  });

  it('still loads a stored API-token profile if SDK initialisation fails', async () => {
    state.clientError = true;
    state.token = 'stored-api-token';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Dashboard'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.onChange).toBeNull();
  });

  it('subscribes to a later-created client after an initial construction failure', async () => {
    state.clientError = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderToStaticMarkup(React.createElement(AuthProvider, null, 'Home'));
    state.effects[0]();
    await vi.waitFor(() => expect(state.getClient).toHaveBeenCalledOnce());
    await new Promise<void>(resolve => setImmediate(resolve));
    state.clientError = false;
    (await import('@/lib/supabase')).getSupabase();
    await vi.waitFor(() => expect(state.get).toHaveBeenCalledOnce());
    expect(state.sdkGetSession).toHaveBeenCalledOnce();
  });
});
