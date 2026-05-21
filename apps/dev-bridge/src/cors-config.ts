/** HTTP methods allowed for browser clients (Vite dev server → dev bridge). */
export const BROWSER_CORS_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
] as const;

/**
 * CORS headers for raw Node responses (e.g. after `reply.hijack()`), matching
 * `@fastify/cors` with `{ origin: true }`.
 */
export function corsHeadersForOrigin(
  origin: string | undefined,
): Record<string, string> {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}
