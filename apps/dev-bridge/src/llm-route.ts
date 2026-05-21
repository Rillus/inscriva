import type { LlmRequest } from "@inscriva/bridge";
import { formatSessionPack, previewContext, runLlmStream } from "@inscriva/llm";

export function formatSseChunk(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function* streamLlmResponse(
  request: LlmRequest,
  bookFiles: Map<string, string>,
  apiKey: string,
): AsyncIterable<string> {
  for await (const text of runLlmStream(request, bookFiles, apiKey)) {
    yield formatSseChunk({ text });
  }
  yield "data: [DONE]\n\n";
}

export function sessionPackMarkdown(
  request: LlmRequest,
  bookFiles: Map<string, string>,
  bookTitle?: string,
): string {
  const context = previewContext(request, bookFiles);
  return formatSessionPack(context, {
    taskId: request.taskId,
    bookTitle,
    chapterKey: request.chapterKey,
  });
}

export { previewContext };
