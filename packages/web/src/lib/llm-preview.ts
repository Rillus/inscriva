import type { LlmRequest } from "@inscriva/bridge";
import type { AssembledContext } from "@inscriva/llm";

const DEV_BRIDGE_URL =
  import.meta.env.VITE_BRIDGE_URL ?? "http://127.0.0.1:3847";

export async function fetchLlmPreview(
  request: LlmRequest,
): Promise<AssembledContext | null> {
  try {
    const res = await fetch(`${DEV_BRIDGE_URL}/llm/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { context: AssembledContext };
    return data.context;
  } catch {
    return null;
  }
}
