import { describe, expect, it } from "vitest";
import { readSseJson } from "./sse.js";

describe("readSseJson", () => {
  it("parses data lines until DONE", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"text":"a"}\n\ndata: {"text":"b"}\n\ndata: [DONE]\n\n',
          ),
        );
        controller.close();
      },
    });

    const events: unknown[] = [];
    for await (const event of readSseJson<{ text?: string }>(body)) {
      events.push(event);
    }

    expect(events).toEqual([{ text: "a" }, { text: "b" }, "[DONE]"]);
  });
});
