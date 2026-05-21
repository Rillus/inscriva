import type { MockBook } from "@inscriva/bridge";

export const MOCK_BOOK_PATH = "/mock/monsterosso";

export const MOCK_CHAPTER_PATH =
  "02 Drafts/Chapters/Ch01 - The Eighth A.md";

export const MOCK_OUTLINE_PATH =
  "01 Outlines/Chapter Outlines/Ch01 - The Eighth A.md";

const chapterBody = `---
chapter: Ch01
title: The Eighth A
status: drafting
---

# The Eighth A

The breakfast table in Appledore was never large enough for all of them.

Mara set down her cup without looking at anyone. The silence had its own weight—older than the house, older than the quarrel they were pretending not to have.

Outside, the tide was already turning. She could hear it in the rope against the post, a slow complaint that matched the rhythm of her thoughts.

> Turn by chapter end: Mara names what she has been avoiding—not the lie itself, but the cost of keeping it.

She said, "We should tell them before the festival."

No one answered. That, too, was an answer.
`;

const outlineBody = `---
chapter: Ch01
mode: standard
---

# Ch01 — The Eighth A

## Story question
Will Mara break the family's silence before the festival?

## Turn
She names the cost of the lie—not the lie itself.

## Scenes
1. Breakfast table — tension, cup, silence
2. Tide / rope — interiority, decision forming
3. "We should tell them" — verbal turn, no reply

## Must include
- Appledore breakfast table
- Festival deadline
- [[Character Bible/Mara]]

## NOT
- Full backstory of the quarrel
- Resolution of the secret

## Word target
2,400

## Continuity
- P03 planted (rope on post)
- Links: [[Continuity Log#Festival timeline]]
`;

export function createMockBook(): MockBook {
  return {
    path: MOCK_BOOK_PATH,
    title: "Monsterosso",
    files: new Map([
      [MOCK_CHAPTER_PATH, chapterBody],
      [MOCK_OUTLINE_PATH, outlineBody],
      [
        "00 Canon/Character Bible/Mara.md",
        `# Mara\n\nAlso known as: Mara Voss\n\nProtagonist. Speaks rarely; when she does, the room listens.`,
      ],
    ]),
  };
}
