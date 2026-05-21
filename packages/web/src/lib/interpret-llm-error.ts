export type InterpretedLlmError = {
  title: string;
  summary: string;
  hint?: string;
  /** Original payload for “Technical details”. */
  detail?: string;
  retryAfterSeconds?: number;
};

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function pickMessage(obj: Record<string, unknown>): string | undefined {
  const msg = obj.message;
  return typeof msg === "string" ? msg : undefined;
}

function extractGoogleError(parsed: unknown): Record<string, unknown> | null {
  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (first && typeof first === "object" && "error" in first) {
      const err = (first as { error?: unknown }).error;
      if (err && typeof err === "object") return err as Record<string, unknown>;
    }
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    const err = (parsed as { error?: unknown }).error;
    if (err && typeof err === "object") return err as Record<string, unknown>;
  }
  return null;
}

function extractOpenAiError(parsed: unknown): Record<string, unknown> | null {
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    const err = (parsed as { error?: unknown }).error;
    if (err && typeof err === "object") return err as Record<string, unknown>;
  }
  return null;
}

function parseRetrySeconds(message: string): number | undefined {
  const retryIn = message.match(/retry in ([\d.]+)s/i);
  if (retryIn) return Math.ceil(Number(retryIn[1]));
  const retryDelay = message.match(/"retryDelay":\s*"(\d+)s"/i);
  if (retryDelay) return Number(retryDelay[1]);
  return undefined;
}

function interpretGoogleError(
  err: Record<string, unknown>,
  raw: string,
): InterpretedLlmError {
  const code = typeof err.code === "number" ? err.code : undefined;
  const status = typeof err.status === "string" ? err.status : "";
  const message = pickMessage(err) ?? "The Gemini API returned an error.";

  if (code === 429 || status === "RESOURCE_EXHAUSTED" || /quota/i.test(message)) {
    const retryAfterSeconds = parseRetrySeconds(message) ?? parseRetrySeconds(raw);
    const modelMatch = message.match(/model:\s*([^\n]+)/i);
    const model = modelMatch?.[1]?.trim();

    return {
      title: "Google Gemini quota exceeded",
      summary: model
        ? `Your quota for ${model} is exhausted on the current plan.`
        : "Your Google Gemini API quota is exhausted on the current plan.",
      hint: retryAfterSeconds
        ? `Wait about ${retryAfterSeconds} seconds, then try again. You can also switch to another provider in Settings or the Assist panel.`
        : "Check billing and usage at Google AI Studio, or switch to another provider in Settings.",
      detail: raw,
      retryAfterSeconds,
    };
  }

  if (code === 401 || code === 403 || /api key/i.test(message)) {
    return {
      title: "Google API key rejected",
      summary: "Gemini did not accept the API key for this project.",
      hint: "Check the key in Settings → API keys, or create a new key in Google AI Studio.",
      detail: raw,
    };
  }

  return {
    title: "Google Gemini error",
    summary: message.split("\n")[0] ?? message,
    hint: "Try again in a moment, or switch provider in Settings.",
    detail: raw,
  };
}

function interpretOpenAiError(
  err: Record<string, unknown>,
  raw: string,
): InterpretedLlmError {
  const message = pickMessage(err) ?? "The OpenAI API returned an error.";
  const type = typeof err.type === "string" ? err.type : "";
  const code = typeof err.code === "string" ? err.code : "";

  if (type === "insufficient_quota" || code === "insufficient_quota" || /quota/i.test(message)) {
    return {
      title: "OpenAI quota exceeded",
      summary: "Your OpenAI account has no remaining quota for this request.",
      hint: "Check plan and billing at platform.openai.com, or switch provider in Settings.",
      detail: raw,
    };
  }

  if (/rate limit/i.test(message) || code === "rate_limit_exceeded") {
    const retryAfterSeconds = parseRetrySeconds(message);
    return {
      title: "OpenAI rate limit",
      summary: "Too many requests in a short period.",
      hint: retryAfterSeconds
        ? `Wait about ${retryAfterSeconds} seconds and try again.`
        : "Wait a moment and try again.",
      detail: raw,
      retryAfterSeconds,
    };
  }

  return {
    title: "OpenAI error",
    summary: message,
    detail: raw,
  };
}

function interpretAnthropicError(
  err: Record<string, unknown>,
  raw: string,
): InterpretedLlmError {
  const message = pickMessage(err) ?? "The Anthropic API returned an error.";
  if (/rate limit/i.test(message) || /overloaded/i.test(message)) {
    return {
      title: "Anthropic rate limit",
      summary: "Claude is temporarily throttling requests.",
      hint: "Wait a moment and try again, or switch provider in Settings.",
      detail: raw,
      retryAfterSeconds: parseRetrySeconds(message),
    };
  }
  return {
    title: "Anthropic error",
    summary: message,
    detail: raw,
  };
}

/** Turn provider error payloads into copy suitable for authors. */
export function interpretLlmError(raw: string): InterpretedLlmError {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      title: "AI request failed",
      summary: "Something went wrong. Try again.",
    };
  }

  if (/no api key configured/i.test(trimmed)) {
    return {
      title: "API key missing",
      summary: trimmed.replace(/\.\s*Open Settings.*/i, "."),
      hint: "Open Settings → API keys to add a key, or set one in apps/dev-bridge/.env and restart the bridge.",
      detail: trimmed,
    };
  }

  if (/no llm api key configured/i.test(trimmed)) {
    return {
      title: "No provider configured",
      summary: trimmed,
      hint: "Add an API key for OpenAI, Anthropic, or Google in Settings.",
      detail: trimmed,
    };
  }

  const parsed = tryParseJson(trimmed);
  if (parsed) {
    const google = extractGoogleError(parsed);
    if (google) return interpretGoogleError(google, trimmed);

    const openai = extractOpenAiError(parsed);
    if (openai?.type !== undefined || openai?.code !== undefined) {
      return interpretOpenAiError(openai, trimmed);
    }

    if (openai) return interpretAnthropicError(openai, trimmed);
  }

  if (/generativelanguage\.googleapis\.com/i.test(trimmed) || /RESOURCE_EXHAUSTED/i.test(trimmed)) {
    const google = extractGoogleError(tryParseJson(trimmed) ?? { error: { message: trimmed, code: 429, status: "RESOURCE_EXHAUSTED" } });
    if (google) return interpretGoogleError(google, trimmed);
  }

  return {
    title: "AI request failed",
    summary:
      trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed,
    hint: "Open technical details below for the full provider response.",
    detail: trimmed.length > 280 ? trimmed : undefined,
  };
}

/** If streamed text is actually a provider error payload, interpret it. */
export function tryInterpretStreamedLlmError(
  text: string,
): InterpretedLlmError | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
  if (!/"error"\s*:/.test(trimmed)) return null;
  const interpreted = interpretLlmError(trimmed);
  if (interpreted.title === "AI request failed" && !interpreted.detail?.includes('"error"')) {
    return null;
  }
  return interpreted;
}
