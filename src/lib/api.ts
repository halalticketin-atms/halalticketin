const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'halal-ticketin-access-token';
const REFRESH_TOKEN_STORAGE_KEY = 'halal-ticketin-refresh-token';

interface RequestConfig extends RequestInit {
    params?: Record<string, string>;
    skipAuthRefresh?: boolean;
}

const isBrowser = typeof window !== 'undefined';
let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

const loadToken = () => {
    if (isBrowser) {
        const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        inMemoryToken = stored;
        return stored;
    }

    return inMemoryToken;
};

const loadRefreshToken = () => {
    if (isBrowser) {
        const stored = window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        inMemoryRefreshToken = stored;
        return stored;
    }

    return inMemoryRefreshToken;
};

export const setAuthToken = (token: string | null) => {
    inMemoryToken = token;
    if (!isBrowser) {
        return;
    }

    if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
};

export const setRefreshToken = (token: string | null) => {
    inMemoryRefreshToken = token;
    if (!isBrowser) {
        return;
    }

    if (token) {
        window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
    } else {
        window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
};

export const getAuthToken = () => {
    if (inMemoryToken) {
        return inMemoryToken;
    }

    return loadToken();
};

export const getRefreshToken = () => {
    if (inMemoryRefreshToken) {
        return inMemoryRefreshToken;
    }

    return loadRefreshToken();
};

export const clearAuthToken = () => {
    setAuthToken(null);
};

export const clearAuthSession = () => {
    setAuthToken(null);
    setRefreshToken(null);
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

    private refreshPromise: Promise<string | null> | null = null;

    private async refreshAccessToken(): Promise<string | null> {
        if (!isBrowser) {
            return null;
        }

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            return null;
        }

        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = (async () => {
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

                setAuthToken(data.accessToken);
                if (data.refreshToken) {
                    setRefreshToken(data.refreshToken);
                }
                return data.accessToken as string;
            } catch {
                clearAuthSession();
                return null;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { params, skipAuthRefresh, ...fetchConfig } = config;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const token = getAuthToken();

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

        if (response.status === 401 && !skipAuthRefresh) {
            const refreshedToken = await this.refreshAccessToken();
            if (refreshedToken) {
                return this.request<T>(endpoint, { ...config, skipAuthRefresh: true });
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
