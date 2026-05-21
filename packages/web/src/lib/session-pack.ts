import type { LlmRequest } from "@inscriva/bridge";

const DEV_BRIDGE_URL =
  import.meta.env.VITE_BRIDGE_URL ?? "http://127.0.0.1:3847";

export async function fetchSessionPack(
  request: LlmRequest,
): Promise<string | null> {
  try {
    const res = await fetch(`${DEV_BRIDGE_URL}/llm/session-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { markdown: string };
    return data.markdown;
  } catch {
    return null;
  }
}
