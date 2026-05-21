import { describe, expect, it } from "vitest";
import {
  buildSidecar,
  fingerprint,
  parseParagraphs,
  reconcileAnchors,
  type AnchorSidecar,
} from "./index.js";

const CHAPTER = "02 Drafts/Chapters/Ch01 - The Eighth A.md";

function makeSidecar(
  content: string,
  ids: string[],
): AnchorSidecar {
  const paragraphs = parseParagraphs(content);
  return buildSidecar(CHAPTER, paragraphs, ids);
}

describe("anchor torture suite", () => {
  const p1 =
    "The breakfast table in Appledore was never large enough for all of them.";
  const p2 = "Mara set down her cup without looking at anyone.";
  const p3 = "Outside, the tide was already turning.";

  const original = [p1, p2, p3].join("\n\n");

  it("1. unchanged paragraph — reattaches by fingerprint", () => {
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);
    const result = reconcileAnchors(original, original, sidecar);

    expect(result.anchors.filter((a) => a.status === "attached")).toHaveLength(3);
    expect(result.anchors.every((a) => a.paragraphIndex !== undefined)).toBe(true);
  });

  it("2. paragraph moved — anchor follows content", () => {
    const reordered = [p2, p1, p3].join("\n\n");
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, reordered, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;

    expect(a1.status).toBe("attached");
    expect(parseParagraphs(reordered)[a1.paragraphIndex!]!.text).toBe(p1);
  });

  it("3. paragraph split — anchor attaches to first fragment", () => {
    const split = `${p1}\n\nShe hesitated.\n\n${p2}\n\n${p3}`;
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, split, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;

    expect(a1.status).toBe("attached");
    expect(parseParagraphs(split)[a1.paragraphIndex!]!.text).toContain(
      "breakfast table",
    );
  });

  it("4. paragraphs merged — anchor on surviving paragraph", () => {
    const merged = `${p1} ${p2}\n\n${p3}`;
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, merged, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;
    const a2 = result.anchors.find((a) => a.id === "a2")!;

    expect(a1.status).toBe("attached");
    expect(a2.status === "attached" || a2.status === "orphan").toBe(true);
    if (a2.status === "attached") {
      expect(a2.paragraphIndex).toBe(a1.paragraphIndex);
    }
  });

  it("5. paragraph deleted — anchor becomes orphan", () => {
    const withoutP2 = [p1, p3].join("\n\n");
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, withoutP2, sidecar);
    const a2 = result.anchors.find((a) => a.id === "a2")!;

    expect(a2.status).toBe("orphan");
    expect(a2.paragraphIndex).toBeUndefined();
  });

  it("6. minor edit — fuzzy match still attaches", () => {
    const typo = p1.replace("never", "nevr");
    const edited = [typo, p2, p3].join("\n\n");
    const sidecar = makeSidecar(original, ["a1"]);

    const result = reconcileAnchors(original, edited, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;

    expect(a1.status).toBe("attached");
    expect(a1.matchKind).toBe("fuzzy");
  });

  it("7. large rewrite — anchor orphans", () => {
    const rewritten = [
      "Completely different opening about storms and iron.",
      p2,
      p3,
    ].join("\n\n");
    const sidecar = makeSidecar(original, ["a1"]);

    const result = reconcileAnchors(original, rewritten, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;

    expect(a1.status).toBe("orphan");
  });

  it("8. new paragraph inserted — existing anchors unaffected", () => {
    const inserted = [p1, "A new paragraph appeared between them.", p2, p3].join(
      "\n\n",
    );
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, inserted, sidecar);

    expect(result.anchors.filter((a) => a.status === "attached")).toHaveLength(3);
    const a2 = result.anchors.find((a) => a.id === "a2")!;
    expect(parseParagraphs(inserted)[a2.paragraphIndex!]!.text).toBe(p2);
  });

  it("9. duplicate similar paragraphs — disambiguates by position hint", () => {
    const dup = [p1, p1, p2].join("\n\n");
    const sidecar = makeSidecar(original, ["a1", "a2"]);

    const result = reconcileAnchors(original, dup, sidecar);
    const a1 = result.anchors.find((a) => a.id === "a1")!;
    const a2 = result.anchors.find((a) => a.id === "a2")!;

    expect(a1.status).toBe("attached");
    expect(a2.status).toBe("attached");
    expect(a1.paragraphIndex).not.toBe(a2.paragraphIndex);
  });

  it("10. empty file — all anchors orphan", () => {
    const sidecar = makeSidecar(original, ["a1", "a2", "a3"]);

    const result = reconcileAnchors(original, "", sidecar);

    expect(result.anchors.every((a) => a.status === "orphan")).toBe(true);
  });
});

describe("fingerprint stability", () => {
  it("normalises whitespace before hashing", () => {
    const a = fingerprint("  hello   world  ");
    const b = fingerprint("hello world");
    expect(a).toBe(b);
  });
});
