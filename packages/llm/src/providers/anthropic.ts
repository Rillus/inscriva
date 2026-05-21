import type { ChatMessage, ProviderStreamConfig } from "../types.js";
import { parseSseLines } from "./sse.js";

export async function* streamAnthropicChat(
  messages: ChatMessage[],
  config: ProviderStreamConfig,
): AsyncIterable<string> {
  const system = messages.find((m) => m.role === "system")?.content;
  const turns = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxOutputTokens ?? 4096,
      stream: true,
      system,
      messages: turns.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Anthropic error ${res.status}`);
  }

  if (!res.body) throw new Error("Anthropic response had no body");

  for await (const data of parseSseLines(res.body)) {
    if (data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      if (parsed.type === "content_block_delta" && parsed.delta?.text) {
        yield parsed.delta.text;
      }
    } catch {
      /* ignore */
    }
  }
}
