export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`/api/v1${path}`, { ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body?.error?.message;
      throw new ApiError(typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `Request failed (${response.status}). Check local services.`, response.status);
    }
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Cannot reach the local API. Check that Docker services are running, then try again.');
  } finally { window.clearTimeout(timeout); }
}

export const message = (error: unknown) => error instanceof Error ? error.message : 'The request could not be completed.';
