/** Parse `data:` lines from an SSE byte stream. */
export async function* parseSseLines(
  body: ReadableStream<Uint8Array>,
): AsyncIterable<string> {
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
        yield line.slice(5).trimStart();
      }
      newline = buffer.indexOf("\n");
    }
  }

  if (buffer.trim()) {
    const line = buffer.replace(/\r$/, "");
    if (line.startsWith("data:")) {
      yield line.slice(5).trimStart();
    }
  }
}
