import type { LlmRequest } from "@inscriva/bridge";
import { buildContext } from "./context.js";
import { streamProviderChat } from "./providers/index.js";
import type { AssembledContext, ContextInput, LlmProviderId } from "./types.js";

export function previewContext(
  request: LlmRequest,
  bookFiles: Map<string, string>,
): AssembledContext {
  return buildContext(contextInputFromRequest(request, bookFiles));
}

export async function* runLlmStream(
  request: LlmRequest,
  bookFiles: Map<string, string>,
  apiKey: string,
): AsyncIterable<string> {
  const assembled = buildContext(contextInputFromRequest(request, bookFiles));
  const messages = [
    { role: "system" as const, content: assembled.system },
    { role: "user" as const, content: assembled.user },
  ];

  yield* streamProviderChat(request.provider as LlmProviderId, messages, {
    apiKey,
    model: request.model,
    maxOutputTokens: request.maxOutputTokens,
  });
}

function contextInputFromRequest(
  request: LlmRequest,
  bookFiles: Map<string, string>,
): ContextInput {
  return {
    taskId: request.taskId,
    bookFiles,
    chapterKey: request.chapterKey,
    selectionText: request.selectionText,
    draftExcerpt: request.draftExcerpt,
    chapterFocus: request.chapterFocus,
    relevantCanon: request.relevantCanon,
    userMessage: request.userMessage,
  };
}
