type FetchWithTimeoutOptions = RequestInit & {
  timeoutMs?: number;
  retries?: number;
};

export async function fetchWithTimeout(
  url: string,
  { timeoutMs = 10000, retries = 0, ...options }: FetchWithTimeoutOptions = {}
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      if (attempt === retries || !isAbort) {
        throw error;
      }
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Fetch failed');
}
