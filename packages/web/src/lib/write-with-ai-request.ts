import type { LlmRequest } from "@inscriva/bridge";
import type { LlmProviderId } from "@inscriva/llm";
import type { WriteWithAiGenerateContext } from "./write-with-ai.js";
import type { WritingContext } from "./writing-context.js";

export function buildWriteWithAiLlmRequest(opts: {
  bookId: string;
  chapterKey?: string;
  provider: LlmProviderId;
  model: string;
  kind: WriteWithAiGenerateContext["kind"];
  text: string;
  prompt: string;
  writing: WritingContext;
  maxOutputTokens?: number;
}): LlmRequest {
  const base: LlmRequest = {
    taskId: "draft-scene",
    provider: opts.provider,
    model: opts.model,
    bookId: opts.bookId,
    chapterKey: opts.chapterKey,
    draftExcerpt: opts.writing.draftExcerpt,
    chapterFocus: opts.writing.chapterFocus,
    relevantCanon: opts.writing.relevantCanon,
    maxOutputTokens: opts.maxOutputTokens,
  };

  const { kind, text, prompt } = opts;

  if (kind === "prompt") {
    return {
      ...base,
      userMessage: prompt ? `${text}\n\n${prompt}` : text,
    };
  }

  if (kind === "expand") {
    return {
      ...base,
      selectionText: text,
      userMessage:
        prompt ||
        "Expand this passage while preserving voice, POV, and facts.",
    };
  }

  if (kind === "rewrite") {
    return {
      ...base,
      selectionText: text,
      userMessage: `Rewrite the Selection passage per the author note. Return only the revised passage—no commentary.\n\nAuthor note: ${prompt}`,
    };
  }

  return {
    ...base,
    selectionText: text,
    userMessage: prompt,
  };
}
