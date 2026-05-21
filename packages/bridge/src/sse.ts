/** Read `data:` lines from an SSE response body. */
export async function* readSseJson<T extends Record<string, unknown>>(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<T | "[DONE]"> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (line.startsWith("data:")) {
        const payload = line.slice(5).trimStart();
        if (payload === "[DONE]") {
          yield "[DONE]";
          return;
        }
        try {
          yield JSON.parse(payload) as T;
        } catch {
          /* ignore */
        }
      }
      newline = buffer.indexOf("\n");
    }
  }
}
