import type { ChatMessage, ProviderStreamConfig } from "../types.js";
import { parseSseLines } from "./sse.js";

export async function* streamOpenAiChat(
  messages: ChatMessage[],
  config: ProviderStreamConfig,
): AsyncIterable<string> {
  const base = config.baseUrl?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: true,
      ...(config.maxOutputTokens
        ? { max_tokens: config.maxOutputTokens }
        : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `OpenAI error ${res.status}`);
  }

  if (!res.body) throw new Error("OpenAI response had no body");

  for await (const data of parseSseLines(res.body)) {
    if (data === "[DONE]") return;
    try {
      const parsed = JSON.parse(data) as {
        choices?: { delta?: { content?: string } }[];
      };
      const text = parsed.choices?.[0]?.delta?.content;
      if (text) yield text;
    } catch {
      /* ignore malformed chunks */
    }
  }
}
