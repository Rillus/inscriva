/** Shape of one streamed `GenerateContent` chunk from the Gemini API. */
export type GoogleStreamChunk = {
  candidates?: Array<{
    content?: { parts?: GoogleStreamPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

export type GoogleStreamPart = {
  text?: string;
  thought?: boolean;
};

/** Collect visible text from a chunk, skipping model "thought" parts (Gemini 3+). */
export function extractTextFromGoogleChunk(parsed: GoogleStreamChunk): string {
  const parts = parsed.candidates?.[0]?.content?.parts;
  if (!parts?.length) return "";

  let text = "";
  for (const part of parts) {
    if (!part || part.thought) continue;
    if (typeof part.text === "string") text += part.text;
  }
  return text;
}

export function googleChunkBlockedReason(
  parsed: GoogleStreamChunk,
): string | undefined {
  return parsed.promptFeedback?.blockReason;
}

export function googleChunkFinishReason(
  parsed: GoogleStreamChunk,
): string | undefined {
  return parsed.candidates?.[0]?.finishReason;
}

/** Parse one line from a Gemini stream (JSON array or `alt=sse` format). */
export function parseGoogleStreamLine(line: string): GoogleStreamChunk | null {
  let trimmed = line.trim();
  if (!trimmed || trimmed === "," || trimmed === "[" || trimmed === "]") {
    return null;
  }

  if (trimmed.startsWith("data:")) {
    trimmed = trimmed.slice(5).trim();
    if (!trimmed || trimmed === "[DONE]") return null;
  }

  const jsonText = trimmed.replace(/,$/, "");
  try {
    return JSON.parse(jsonText) as GoogleStreamChunk;
  } catch {
    return null;
  }
}
