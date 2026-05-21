import { describe, expect, it } from "vitest";
import { buildWriteWithAiLlmRequest } from "./write-with-ai-request.js";

const writing = {
  draftExcerpt: "Mara ate.",
  chapterFocus: "**Current scene:** Kitchen",
  relevantCanon: "**Mara** — captain",
};

describe("buildWriteWithAiLlmRequest", () => {
  const base = {
    bookId: "/books/demo",
    chapterKey: "ch01",
    provider: "google" as const,
    model: "gemini-3.1-flash-lite",
    writing,
  };

  it("builds a prompt request from selection text", () => {
    expect(
      buildWriteWithAiLlmRequest({
        ...base,
        kind: "prompt",
        text: "She left.",
        prompt: "Make it tense.",
      }),
    ).toEqual({
      taskId: "draft-scene",
      provider: "google",
      model: "gemini-3.1-flash-lite",
      bookId: "/books/demo",
      chapterKey: "ch01",
      draftExcerpt: writing.draftExcerpt,
      chapterFocus: writing.chapterFocus,
      relevantCanon: writing.relevantCanon,
      userMessage: "She left.\n\nMake it tense.",
    });
  });

  it("builds an expand request with default instruction", () => {
    expect(
      buildWriteWithAiLlmRequest({
        ...base,
        kind: "expand",
        text: "She left.",
        prompt: "",
      }),
    ).toMatchObject({
      selectionText: "She left.",
      userMessage:
        "Expand this passage while preserving voice, POV, and facts.",
    });
  });

  it("builds a continue request with author instruction", () => {
    expect(
      buildWriteWithAiLlmRequest({
        ...base,
        kind: "continue",
        text: "The rain stopped.",
        prompt: "Introduce the harbour master.",
      }),
    ).toMatchObject({
      selectionText: "The rain stopped.",
      userMessage: "Introduce the harbour master.",
    });
  });

  it("passes maxOutputTokens when set", () => {
    expect(
      buildWriteWithAiLlmRequest({
        ...base,
        kind: "expand",
        text: "Hi",
        prompt: "",
        maxOutputTokens: 1024,
      }).maxOutputTokens,
    ).toBe(1024);
  });
});
