import { describe, expect, it } from "vitest";
import {
  isAtSentenceEnd,
  sentenceBoundsAt,
  sentenceStartBefore,
  sentenceTextAt,
} from "./sentence-bounds.js";

describe("sentenceStartBefore", () => {
  it("returns 0 when there is no prior sentence boundary", () => {
    expect(sentenceStartBefore("Hello world", 5)).toBe(0);
  });

  it("returns the index after the previous sentence terminator", () => {
    expect(sentenceStartBefore("First. Second", 12)).toBe(7);
  });
});

describe("sentenceBoundsAt", () => {
  it("returns bounds for a sentence ending at the caret", () => {
    const doc = "She walked home.";
    expect(sentenceBoundsAt(doc, doc.length)).toEqual({
      from: 0,
      to: doc.length,
    });
  });

  it("returns null when the caret is mid-sentence", () => {
    expect(sentenceBoundsAt("Hello world", 5)).toBeNull();
  });

  it("returns null when more text follows on the same line", () => {
    expect(sentenceBoundsAt("First. Second", 7)).toBeNull();
  });
});

describe("sentenceTextAt", () => {
  it("returns the trimmed sentence before the caret", () => {
    expect(sentenceTextAt("One. Two here.", 14)).toBe("Two here.");
  });
});

describe("isAtSentenceEnd", () => {
  it("is true immediately after sentence-ending punctuation", () => {
    const doc = "The door closed.";
    expect(isAtSentenceEnd(doc, doc.length)).toBe(true);
  });

  it("is true after punctuation and trailing spaces before the caret", () => {
    const doc = "Wait!  ";
    expect(isAtSentenceEnd(doc, doc.length)).toBe(true);
  });

  it("is false in the middle of a sentence", () => {
    expect(isAtSentenceEnd("Still typing", 5)).toBe(false);
  });

  it("is false between sentences", () => {
    expect(isAtSentenceEnd("Done. Next", 6)).toBe(false);
  });

  it("is false without terminal punctuation", () => {
    expect(isAtSentenceEnd("No period yet", 13)).toBe(false);
  });

  it("accepts closing quotes after the terminator", () => {
    const doc = 'She whispered "Go."';
    expect(isAtSentenceEnd(doc, doc.length)).toBe(true);
  });

  it("is true on the second sentence when the caret is at its end", () => {
    const doc = "Alpha. Beta ends.";
    expect(isAtSentenceEnd(doc, doc.length)).toBe(true);
    expect(sentenceTextAt(doc, doc.length)).toBe("Beta ends.");
  });
});
