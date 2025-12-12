const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'halal-ticketin-access-token';

interface RequestConfig extends RequestInit {
    params?: Record<string, string>;
}

const isBrowser = typeof window !== 'undefined';
let inMemoryToken: string | null = null;

const loadToken = () => {
    if (isBrowser) {
        const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        inMemoryToken = stored;
        return stored;
    }

    return inMemoryToken;
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

export const getAuthToken = () => {
    if (inMemoryToken) {
        return inMemoryToken;
    }

    return loadToken();
};

export const clearAuthToken = () => {
    setAuthToken(null);
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

    private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
        const { params, ...fetchConfig } = config;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        const token = getAuthToken();

        const response = await fetch(url, {
            ...fetchConfig,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...fetchConfig.headers,
            },
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            let errorPayload: unknown = null;

            try {
                if (contentType?.includes('application/json')) {
                    errorPayload = await response.json();
                } else {
                    errorPayload = await response.text();
                }
            } catch {
                errorPayload = null;
            }

            const message =
                (typeof errorPayload === 'string' && errorPayload.trim()) ||
                (typeof errorPayload === 'object' && errorPayload !== null && 'message' in errorPayload
                    ? String((errorPayload as { message?: string }).message)
                    : undefined) ||
                `API Error: ${response.status} ${response.statusText}`;

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
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, {
            ...config,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>(endpoint, { ...config, method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
