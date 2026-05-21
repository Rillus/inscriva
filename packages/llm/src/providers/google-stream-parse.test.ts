import { describe, expect, it } from "vitest";
import {
  extractTextFromGoogleChunk,
  parseGoogleStreamLine,
} from "./google-stream-parse.js";

describe("extractTextFromGoogleChunk", () => {
  it("reads text from the first part on older models", () => {
    expect(
      extractTextFromGoogleChunk({
        candidates: [{ content: { parts: [{ text: "Hello" }] } }],
      }),
    ).toBe("Hello");
  });

  it("skips thought parts and reads the response part (Gemini 3+)", () => {
    expect(
      extractTextFromGoogleChunk({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: "Let me plan the scene…" },
                { text: "The rain eased." },
              ],
            },
          },
        ],
      }),
    ).toBe("The rain eased.");
  });

  it("concatenates multiple non-thought parts", () => {
    expect(
      extractTextFromGoogleChunk({
        candidates: [
          {
            content: {
              parts: [{ text: "One " }, { text: "two." }],
            },
          },
        ],
      }),
    ).toBe("One two.");
  });
});

describe("parseGoogleStreamLine", () => {
  it("parses JSON array stream lines", () => {
    const parsed = parseGoogleStreamLine(
      '{"candidates":[{"content":{"parts":[{"text":"Hi"}]}}]},',
    );
    expect(parsed?.candidates?.[0]?.content?.parts?.[0]?.text).toBe("Hi");
  });

  it("parses SSE data lines", () => {
    const parsed = parseGoogleStreamLine(
      'data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]}}]}',
    );
    expect(extractTextFromGoogleChunk(parsed!)).toBe("Hi");
  });
});
