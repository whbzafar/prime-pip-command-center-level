/**
 * HTTP helper with configurable timeout using standard fetch and AbortController.
 */
export async function fetchWithTimeout(
  url: string | URL,
  init: RequestInit = {},
  timeoutMs = 15000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`HTTP request timed out after ${timeoutMs}ms: ${url.toString()}`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}
