import { acceptSupabaseSession, isSupabaseSessionRetired, retireSupabaseSession } from './supabase-readiness';
import { hasWebSessionCredentialBinding, invalidateWebSessionActivation } from './web-session-activation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'halal-ticketin-access-token';
const REFRESH_TOKEN_STORAGE_KEY = 'halal-ticketin-refresh-token';

interface RequestConfig extends RequestInit {
    params?: Record<string, string>;
    skipAuthRefresh?: boolean;
    authOwner?: { token: string; identity: number };
}

interface AuthSessionOwner {
    token: string | null;
    revision: number;
    identity: number;
    refreshToken: string | null;
    retired: boolean;
}

const isBrowser = typeof window !== 'undefined';
let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;
let sessionGeneration = 0;
let identityGeneration = 0;

let tokenLoaded = false;
const sessionListeners = new Set<() => void>();
export const subscribeAuthSession = (listener: () => void) => {
    sessionListeners.add(listener);
    return () => { sessionListeners.delete(listener); };
};
const advanceSession = (preserveIdentity = false) => {
    sessionGeneration += 1;
    if (!preserveIdentity) identityGeneration += 1;
    sessionListeners.forEach(listener => listener());
};

export const getAuthToken = () => {
    if (!isBrowser) return inMemoryToken;
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (tokenLoaded && stored !== inMemoryToken) {
        // Subscribers may read the token synchronously while activation is cleared.
        inMemoryToken = stored;
        tokenLoaded = true;
        if (!stored) retireSupabaseSession();
        if (!hasWebSessionCredentialBinding(stored)) invalidateWebSessionActivation();
        advanceSession();
    } else {
        inMemoryToken = stored;
    }
    tokenLoaded = true;
    return stored;
};

export const getAuthSessionRevision = () => {
    try { getAuthToken(); } catch { /* A blocked browser store does not change identity. */ }
    return sessionGeneration;
};

export const getAuthIdentityRevision = () => {
    try { getAuthToken(); } catch { /* A blocked browser store does not change identity. */ }
    return identityGeneration;
};

export const setAuthToken = (token: string | null, options?: {
    preserveIdentity?: boolean;
    expectedSession?: AuthSessionOwner;
    refreshToken?: string | null;
}) => {
    const previous = getAuthToken();
    const expected = options?.expectedSession;
    const ownsExpectedSession = () => !expected || ownsAuthSession(expected);
    if (!ownsExpectedSession()) return false;
    if (previous !== token) invalidateWebSessionActivation();
    // Activation subscribers may replace the owner synchronously.
    if (!ownsExpectedSession()) return false;
    if (!token) retireSupabaseSession();
    inMemoryToken = token;
    tokenLoaded = true;
    if (isBrowser) {
        if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    if (options?.refreshToken !== undefined) setRefreshToken(options.refreshToken);
    if (token) acceptSupabaseSession(token);
    if (previous !== token) advanceSession(options?.preserveIdentity === true);
    return !expected || ownsAuthSession({
        token,
        refreshToken: options?.refreshToken === undefined ? expected.refreshToken : options.refreshToken,
        revision: expected.revision + (previous !== token ? 1 : 0),
        identity: expected.identity + (previous !== token && !options?.preserveIdentity ? 1 : 0),
        retired: !token,
    });
};

export const setRefreshToken = (token: string | null) => {
    inMemoryRefreshToken = token;
    if (!isBrowser) return;
    if (token) window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};

export const getRefreshToken = () => {
    if (isBrowser) inMemoryRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    return inMemoryRefreshToken;
};

export const getAuthSessionOwner = (): AuthSessionOwner => ({
    token: getAuthToken(),
    refreshToken: getRefreshToken(),
    revision: getAuthSessionRevision(),
    identity: getAuthIdentityRevision(),
    retired: isSupabaseSessionRetired(),
});

function ownsAuthSession(expected: AuthSessionOwner) {
    return getRefreshToken() === expected.refreshToken
        && getAuthToken() === expected.token
        && sessionGeneration === expected.revision
        && identityGeneration === expected.identity
        && isSupabaseSessionRetired() === expected.retired
        && getAuthToken() === expected.token;
}

export const clearAuthToken = () => setAuthToken(null);
export const clearAuthSession = (expectedSession?: AuthSessionOwner) => {
    getAuthToken();
    if (expectedSession && !ownsAuthSession(expectedSession)) return false;
    invalidateWebSessionActivation();
    if (expectedSession && !ownsAuthSession(expectedSession)) return false;
    retireSupabaseSession();
    inMemoryToken = null;
    inMemoryRefreshToken = null;
    tokenLoaded = true;
    if (isBrowser) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
    advanceSession();
    return !expectedSession || ownsAuthSession({
        token: null, refreshToken: null, retired: true,
        revision: expectedSession.revision + 1,
        identity: expectedSession.identity + 1,
    });
};

export class ApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private refreshPromise: {
        revision: number;
        refreshToken: string;
        promise: Promise<string | null>;
    } | null = null;

    private async refreshAccessToken(requestOwner: { token: string; revision: number; identity: number }): Promise<string | null> {
        if (!isBrowser || isSupabaseSessionRetired()) {
            return null;
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            return null;
        }

        const refreshGeneration = requestOwner.revision;
        const ownsRefresh = () => getRefreshToken() === refreshToken
            && getAuthToken() === requestOwner.token
            && getAuthSessionRevision() === refreshGeneration
            && getAuthIdentityRevision() === requestOwner.identity
            && getAuthToken() === requestOwner.token
            && !isSupabaseSessionRetired();
        // Credential reads can observe another tab removing or replacing the session.
        if (!ownsRefresh()) return null;
        if (this.refreshPromise?.revision === refreshGeneration && this.refreshPromise.refreshToken === refreshToken) {
            return this.refreshPromise.promise;
        }

        const owner = { revision: refreshGeneration, refreshToken, promise: Promise.resolve<string | null>(null) };
        this.refreshPromise = owner;
        owner.promise = (async () => {
            try {
                const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!response.ok) {
                    throw new Error('Failed to refresh session');
                }

                const data = await response.json();
                if (!data?.accessToken) {
                    throw new Error('Refresh response missing access token');
                }

                // A pending refresh must not restore a session after sign-out.
                if (!ownsRefresh()) {
                    return null;
                }
                if (!setAuthToken(data.accessToken, {
                    preserveIdentity: true,
                    expectedSession: { ...requestOwner, refreshToken, retired: false },
                    refreshToken: data.refreshToken || refreshToken,
                })) return null;
                return data.accessToken as string;
            } catch {
                if (ownsRefresh()) {
                    clearAuthSession({ ...requestOwner, refreshToken, retired: false });
                }
                return null;
            } finally {
                if (this.refreshPromise === owner) this.refreshPromise = null;
            }
        })();

        return owner.promise;
    }

    private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { params, skipAuthRefresh, authOwner, ...fetchConfig } = config;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const token = getAuthToken();
        const requestGeneration = getAuthSessionRevision();
        const requestIdentity = getAuthIdentityRevision();
        if (token !== getAuthToken() || requestIdentity !== getAuthIdentityRevision() || (authOwner && (token !== authOwner.token || requestIdentity !== authOwner.identity))) {
            throw new ApiError('Session changed before the request could be sent', 401, null);
        }

        const headers = new Headers(fetchConfig.headers);
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        // Only set JSON content-type when we're actually sending a JSON body.
        // (Fastify rejects requests that claim JSON but send an empty body.)
        if (typeof fetchConfig.body === 'string' && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(url, {
            ...fetchConfig,
            headers,
        });

        if (response.status === 401 && token && !skipAuthRefresh && requestGeneration === getAuthSessionRevision() && token === getAuthToken() && requestIdentity === getAuthIdentityRevision()) {
            const refreshedToken = await this.refreshAccessToken({ token, revision: requestGeneration, identity: requestIdentity });
            if (refreshedToken && getAuthToken() === refreshedToken && getAuthIdentityRevision() === requestIdentity) {
                return this.request<T>(endpoint, {
                    ...config,
                    skipAuthRefresh: true,
                    authOwner: { token: refreshedToken, identity: requestIdentity },
                });
            }
        }

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorPayload: unknown = null;

            try {
                if (contentType?.includes('application/json')) {
                    errorPayload = await response.json();
                } else {
                    const rawText = await response.text();
                    const trimmed = rawText.trim();
                    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                        try {
                            errorPayload = JSON.parse(trimmed);
                        } catch {
                            errorPayload = trimmed;
                        }
                    } else {
                        errorPayload = trimmed;
                    }
                }
            } catch {
                errorPayload = null;
            }

            let message = `API Error: ${response.status} ${response.statusText}`;

            if (typeof errorPayload === 'object' && errorPayload !== null) {
                // Check for standardized { error: { message } } format
                const standardError = (errorPayload as { error?: { message?: string } }).error;
                if (typeof standardError === 'object' && standardError?.message) {
                    message = standardError.message;
                }
                // Fallback to { message } format
                else if ('message' in errorPayload && typeof (errorPayload as { message: string }).message === 'string') {
                    message = (errorPayload as { message: string }).message;
                }
            } else if (typeof errorPayload === 'string' && errorPayload.trim()) {
                message = errorPayload.trim();
            }

            throw new ApiError(message, response.status, errorPayload);
        }

        if (response.status === 204) {
            return {} as T;
        }

        return response.json();
    }

    async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: data === undefined ? undefined : JSON.stringify(data),
        });
    }

    async postForm<T>(endpoint: string, data: FormData, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'POST',
            body: data,
        });
    }

    async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: data === undefined ? undefined : JSON.stringify(data),
        });
    }

    async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PATCH',
            body: data === undefined ? undefined : JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
