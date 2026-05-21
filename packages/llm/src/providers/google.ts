import type { ChatMessage, ProviderStreamConfig } from "../types.js";
import {
  extractTextFromGoogleChunk,
  googleChunkBlockedReason,
  googleChunkFinishReason,
  parseGoogleStreamLine,
  type GoogleStreamChunk,
} from "./google-stream-parse.js";

export async function* streamGoogleChat(
  messages: ChatMessage[],
  config: ProviderStreamConfig,
): AsyncIterable<string> {
  const model = encodeURIComponent(config.model);
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;

  const system = messages.find((m) => m.role === "system")?.content;
  const turns = messages.filter((m) => m.role !== "system");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: turns.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      ...(config.maxOutputTokens
        ? { generationConfig: { maxOutputTokens: config.maxOutputTokens } }
        : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Google error ${res.status}`);
  }

  if (!res.body) throw new Error("Google response had no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastChunk: GoogleStreamChunk | null = null;
  let yieldedText = false;

  function* yieldParsedChunk(parsed: GoogleStreamChunk) {
    lastChunk = parsed;
    const text = extractTextFromGoogleChunk(parsed);
    if (text) {
      yieldedText = true;
      yield text;
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const parsed = parseGoogleStreamLine(line);
      if (!parsed) continue;
      yield* yieldParsedChunk(parsed);
    }
  }

  if (buffer.trim()) {
    const parsed = parseGoogleStreamLine(buffer);
    if (parsed) yield* yieldParsedChunk(parsed);
  }

  if (!yieldedText && lastChunk) {
    const blockReason = googleChunkBlockedReason(lastChunk);
    if (blockReason) {
      throw new Error(
        JSON.stringify({
          error: {
            message: `Content blocked (${blockReason}). Try rephrasing your prompt.`,
            status: "BLOCKED",
          },
        }),
      );
    }
    const finishReason = googleChunkFinishReason(lastChunk);
    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
      throw new Error(
        JSON.stringify({
          error: {
            message: `Generation ended: ${finishReason}. Try again or choose another model.`,
            status: finishReason,
          },
        }),
      );
    }
  }
}
