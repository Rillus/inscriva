import {
  interpretLlmError,
  tryInterpretStreamedLlmError,
  type InterpretedLlmError,
} from "./interpret-llm-error.js";
import type { WriteWithAiGenerate, WriteWithAiGenerateContext } from "./write-with-ai.js";
import type { WriteWithAiIntent } from "./write-with-ai-context.js";

export type WriteWithAiRunResult =
  | { ok: true; text: string }
  | { ok: false; error: InterpretedLlmError };

export async function runWriteWithAi(
  generate: WriteWithAiGenerate,
  context: WriteWithAiGenerateContext,
): Promise<WriteWithAiRunResult> {
  let generated = "";
  try {
    for await (const chunk of generate(context)) {
      generated += chunk;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI writing failed. Try again.";
    return { ok: false, error: interpretLlmError(message) };
  }

  const streamedError = tryInterpretStreamedLlmError(generated);
  if (streamedError) return { ok: false, error: streamedError };

  const text = generated.trim();
  if (!text) {
    return {
      ok: false,
      error: {
        title: "No text returned",
        summary: "The model did not return any prose.",
        hint: "Try again with a clearer instruction.",
      },
    };
  }

  return { ok: true, text };
}

export function applyWriteWithAiToContent(
  content: string,
  from: number,
  to: number,
  insert: string,
  kind: WriteWithAiGenerateContext["kind"],
): string {
  if (kind === "continue") {
    const prefix = content.slice(0, to);
    const needsSpace =
      prefix.length > 0 && !/\s$/.test(prefix) && !/^\s/.test(insert);
    return prefix + (needsSpace ? " " : "") + insert + content.slice(to);
  }
  return content.slice(0, from) + insert + content.slice(to);
}

/** Document range of inserted AI text (for pending highlight). */
export function pendingRangeAfterApply(
  content: string,
  from: number,
  to: number,
  insert: string,
  kind: WriteWithAiGenerateContext["kind"],
): { from: number; to: number } {
  if (kind === "continue") {
    const prefix = content.slice(0, to);
    const needsSpace =
      prefix.length > 0 && !/\s$/.test(prefix) && !/^\s/.test(insert);
    const start = to + (needsSpace ? 1 : 0);
    return { from: start, to: start + insert.length };
  }
  return { from, to: from + insert.length };
}

export function resolveGenerateKind(
  anchorKind: "continue" | "selection",
  intent: WriteWithAiIntent,
): WriteWithAiGenerateContext["kind"] {
  if (anchorKind === "continue") return "continue";
  return intent;
}
