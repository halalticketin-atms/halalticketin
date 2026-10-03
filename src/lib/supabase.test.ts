import type { AuthClient, GoTrueClientOptions, Session, User } from '@supabase/auth-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  options: [] as GoTrueClientOptions[],
  clients: [] as InstanceType<typeof AuthClient>[],
  storage: new Map<string, string>(),
  storageGate: null as Promise<void> | null,
  browserDefaults: false,
  fetch: vi.fn(),
}));

vi.mock('@supabase/auth-js', async original => {
  const sdk = await original<typeof import('@supabase/auth-js')>();
  return {
    ...sdk,
    AuthClient: class extends sdk.AuthClient {
      constructor(options: GoTrueClientOptions) {
        state.options.push(options);
        super({
          ...options,
          fetch: state.fetch,
          ...(state.browserDefaults ? {} : { autoRefreshToken: false, storage: {
            getItem: async key => {
              if (state.storageGate) await state.storageGate;
              return state.storage.get(key) ?? null;
            },
            setItem: async (key, value) => { state.storage.set(key, value); },
            removeItem: async key => { state.storage.delete(key); },
          }, lock: async <R>(_name: string, _timeout: number, run: () => Promise<R>) => run() }),
        });
        state.clients.push(this);
      }
    },
  };
});

const storageKey = 'sb-synthetic-auth-token';
const user: User = {
  id: 'fixture-user', email: 'fixture@example.test', aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {},
};
function session(expiresAt = Math.floor(Date.now() / 1000) + 3600): Session {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: expiresAt })).toString('base64url');
  return {
    access_token: `${header}.${payload}.synthetic`, refresh_token: 'fixture-refresh',
    expires_at: expiresAt, expires_in: 3600, token_type: 'bearer', user,
  };
}

beforeEach(() => {
  vi.resetModules();
  state.options = [];
  state.clients = [];
  state.storage.clear();
  state.storageGate = null;
  state.browserDefaults = false;
  state.fetch.mockReset().mockRejectedValue(new Error('Unexpected synthetic auth request'));
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.example.test');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-key');
  vi.stubGlobal('BroadcastChannel', undefined);
});
afterEach(async () => {
  await Promise.all(state.clients.map(client => client.stopAutoRefresh()));
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function observeStartup() {
  const { getSupabase } = await import('./supabase');
  const auth = getSupabase().auth;
  const events: string[] = [];
  let announceInitial!: () => void;
  const initial = new Promise<void>(resolve => { announceInitial = resolve; });
  const { data: { subscription } } = auth.onAuthStateChange(event => {
    events.push(event);
    if (event === 'INITIAL_SESSION') announceInitial();
  });
  return { auth, events, initial, subscription };
}

describe('auth-only Supabase client', () => {
  it('preserves the singleton and existing project auth configuration', async () => {
    const { subscribeSupabaseClient } = await import('./supabase-readiness');
    const early = vi.fn();
    const removeEarly = subscribeSupabaseClient(early);
    const { getSupabase } = await import('./supabase');
    const client = getSupabase();
    expect(getSupabase()).toBe(client);
    const late = vi.fn();
    const removeLate = subscribeSupabaseClient(late);
    expect(early).toHaveBeenCalledExactlyOnceWith(client);
    expect(late).toHaveBeenCalledExactlyOnceWith(client);
    removeEarly();
    removeLate();
    await client.auth.getSession();
    expect(state.clients).toHaveLength(1);
    expect(state.options[0]).toEqual({
      url: 'https://synthetic.example.test/auth/v1',
      headers: { Authorization: 'Bearer synthetic-key', apikey: 'synthetic-key', 'X-Client-Info': 'supabase-js-node/2.87.1' },
      storageKey, autoRefreshToken: true, persistSession: true, detectSessionInUrl: true,
      flowType: 'implicit', hasCustomAuthorizationHeader: false,
    });
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('retains URL normalisation and project-based storage for a custom base path', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', ' https://synthetic.example.test/custom ');
    const { getSupabase } = await import('./supabase');
    await getSupabase().auth.getSession();
    expect(state.options[0].url).toBe('https://synthetic.example.test/custom/auth/v1');
    expect(state.options[0].storageKey).toBe(storageKey);
  });

  it('restores an existing persisted session and announces recovery before initial session', async () => {
    const saved = session();
    state.storage.set(storageKey, JSON.stringify(saved));
    let releaseStorage!: () => void;
    state.storageGate = new Promise<void>(resolve => { releaseStorage = resolve; });
    const { auth, events, initial, subscription } = await observeStartup();
    releaseStorage();
    const [{ data }] = await Promise.all([auth.getSession(), initial]);
    expect(data.session?.access_token).toBe(saved.access_token);
    expect(events).toEqual(['SIGNED_IN', 'INITIAL_SESSION']);
    expect(state.fetch).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('recovers the existing project session through the default browser storage adapter', async () => {
    const saved = session();
    state.storage.set(storageKey, JSON.stringify(saved));
    state.browserDefaults = true;
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('window', { location: new URL('https://frontend.example.test/'), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => state.storage.get(key) ?? null,
      setItem: (key: string, value: string) => { state.storage.set(key, value); },
      removeItem: (key: string) => { state.storage.delete(key); },
    });
    const { getSupabase } = await import('./supabase');
    const { data, error } = await getSupabase().auth.getSession();
    expect(error).toBeNull();
    expect(data.session?.access_token).toBe(saved.access_token);
    expect(JSON.parse(state.storage.get(storageKey)!).refresh_token).toBe(saved.refresh_token);
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('refreshes an expired stored session, persists the result and announces TOKEN_REFRESHED', async () => {
    const renewed = session();
    state.storage.set(storageKey, JSON.stringify(session(Math.floor(Date.now() / 1000) - 60)));
    state.fetch.mockImplementation(async () => new Response(JSON.stringify(renewed), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    let releaseStorage!: () => void;
    state.storageGate = new Promise<void>(resolve => { releaseStorage = resolve; });
    const { auth, events, initial, subscription } = await observeStartup();
    releaseStorage();
    const [{ data }] = await Promise.all([auth.getSession(), initial]);
    expect(data.session?.access_token).toBe(renewed.access_token);
    expect(JSON.parse(state.storage.get(storageKey)!).access_token).toBe(renewed.access_token);
    expect(events).toEqual(['TOKEN_REFRESHED', 'INITIAL_SESSION']);
    expect(state.fetch).toHaveBeenCalledOnce();
    const [url, request] = state.fetch.mock.calls[0];
    expect(url).toBe('https://synthetic.example.test/auth/v1/token?grant_type=refresh_token');
    expect(JSON.parse(request.body)).toEqual({ refresh_token: 'fixture-refresh' });
    expect(new Headers(request.headers).get('apikey')).toBe('synthetic-key');
    subscription.unsubscribe();
  });

  it('clears a stored session when refresh is rejected without restoring it', async () => {
    state.storage.set(storageKey, JSON.stringify(session(Math.floor(Date.now() / 1000) - 60)));
    state.fetch.mockImplementation(async () => new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid Refresh Token' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let releaseStorage!: () => void;
    state.storageGate = new Promise<void>(resolve => { releaseStorage = resolve; });
    const { auth, events, initial, subscription } = await observeStartup();
    releaseStorage();
    const [{ data }] = await Promise.all([auth.getSession(), initial]);
    expect(data.session).toBeNull();
    expect(state.storage.has(storageKey)).toBe(false);
    expect(events).toEqual(['SIGNED_OUT', 'INITIAL_SESSION']);
    expect(state.fetch).toHaveBeenCalledOnce();
    subscription.unsubscribe();
  });

  it('signs out using the existing endpoint and clears persisted credentials', async () => {
    state.storage.set(storageKey, JSON.stringify(session()));
    state.fetch.mockImplementation(async () => new Response('{}', { status: 200 }));
    const { auth, events, initial, subscription } = await observeStartup();
    await initial;
    const { error } = await auth.signOut();
    expect(error).toBeNull();
    expect(state.storage.has(storageKey)).toBe(false);
    expect((await auth.getSession()).data.session).toBeNull();
    expect(events).toContain('SIGNED_OUT');
    const [url, request] = state.fetch.mock.calls[0];
    expect(url).toBe('https://synthetic.example.test/auth/v1/logout?scope=global');
    expect(request.method).toBe('POST');
    subscription.unsubscribe();
  });

  it('preserves implicit OAuth redirect options without introducing a PKCE verifier', async () => {
    const { getSupabase } = await import('./supabase');
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: 'https://frontend.example.test/auth/callback', skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    expect(error).toBeNull();
    const url = new URL(data.url!);
    expect(url.origin + url.pathname).toBe('https://synthetic.example.test/auth/v1/authorize');
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('redirect_to')).toBe('https://frontend.example.test/auth/callback');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.has('code_challenge')).toBe(false);
    expect(state.storage.size).toBe(0);
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it('detects a password recovery URL, restores its session and uses browser client headers', async () => {
    const saved = session();
    const hash = new URLSearchParams({ access_token: saved.access_token, refresh_token: saved.refresh_token, expires_in: '3600', token_type: 'bearer', type: 'recovery' });
    const location = new URL(`https://frontend.example.test/reset-password#${hash}`);
    vi.stubGlobal('document', { visibilityState: 'visible' });
    vi.stubGlobal('window', { location, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    state.fetch.mockImplementation(async () => new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const { auth, initial, subscription } = await observeStartup();
    let announceRecovery!: () => void;
    const recovery = new Promise<void>(resolve => { announceRecovery = resolve; });
    const recovered = auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') announceRecovery(); });
    await Promise.all([initial, recovery]);
    expect((await auth.getSession()).data.session?.access_token).toBe(saved.access_token);
    expect(JSON.parse(state.storage.get(storageKey)!).refresh_token).toBe(saved.refresh_token);
    expect(location.hash).toBe('');
    expect(state.options[0].headers?.['X-Client-Info']).toBe('supabase-js-web/2.87.1');
    expect(state.fetch.mock.calls[0][0]).toBe('https://synthetic.example.test/auth/v1/user');
    subscription.unsubscribe();
    recovered.data.subscription.unsubscribe();
  });
});

it('confirms installed SDK global sign-out retains stored credentials on an offline response', async () => {
  const old = session();
  state.storage.set(storageKey, JSON.stringify(old));
  const { auth } = await observeStartup();
  await auth.getSession();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  state.fetch.mockRejectedValue(new Error('Offline synthetic logout'));
  const result = await auth.signOut();
  expect(result.error).not.toBeNull();
  expect(state.storage.get(storageKey)).toBe(JSON.stringify(old));
});

it('uses installed SDK captured-token revocation without deleting a newer local session', async () => {
  const old = session();
  state.storage.set(storageKey, JSON.stringify(old));
  const { auth } = await observeStartup();
  await auth.getSession();
  let release!: (response: Response) => void;
  state.fetch.mockImplementation(() => new Promise<Response>(resolve => { release = resolve; }));
  const revocation = auth.admin.signOut(old.access_token, 'global');
  await vi.waitFor(() => expect(state.fetch).toHaveBeenCalledOnce());
  const newer = { ...session(), access_token: 'new-owner-token', refresh_token: 'new-owner-refresh' };
  state.storage.set(storageKey, JSON.stringify(newer));
  release(new Response(null, { status: 204 }));
  expect((await revocation).error).toBeNull();
  expect(state.storage.get(storageKey)).toBe(JSON.stringify(newer));
  expect(state.fetch.mock.calls[0][0]).toContain('/logout?scope=global');
  expect(new Headers(state.fetch.mock.calls[0][1].headers).get('Authorization')).toBe(`Bearer ${old.access_token}`);
});
