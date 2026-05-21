/** Extract a human-readable message from a dev-bridge error response body. */
export function parseApiErrorBody(body: string, fallback = "Request failed"): string {
  const trimmed = body.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    if (parsed.error) return parsed.error;
    if (parsed.message) return parsed.message;
  } catch {
    /* plain text */
  }
  return trimmed;
}

/** Build fetch headers for dev-bridge API calls. */
export function mergeApiHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body !== undefined && init.body !== null && init.body !== "";
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}
