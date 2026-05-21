import { describe, expect, it } from "vitest";
import { buildBookTree } from "./book-tree.js";

describe("buildBookTree", () => {
  const paths = [
    "BookName.md",
    "00 Canon/Character Bible/Mara.md",
    "01 Outlines/Master Outline.md",
    "01 Outlines/Chapter Outlines/Ch01.md",
    "02 Drafts/Chapters/Ch01.md",
    ".inscriva/config.json",
  ];

  it("builds a folder tree of markdown files", () => {
    const tree = buildBookTree(paths);

    expect(tree.name).toBe(".");
    expect(tree.children?.some((c) => c.name === "00 Canon")).toBe(true);
    const canon = tree.children!.find((c) => c.name === "00 Canon")!;
    expect(canon.children?.[0]?.name).toBe("Character Bible");
  });

  it("excludes dot folders except listing inscriva config at root", () => {
    const tree = buildBookTree(paths);
    const flat = flattenPaths(tree);

    expect(flat).not.toContain(".inscriva/config.json");
    expect(flat).toContain("02 Drafts/Chapters/Ch01.md");
  });
});

function flattenPaths(node: { path?: string; children?: { path?: string; children?: unknown[] }[] }): string[] {
  const paths: string[] = [];
  if (node.path) paths.push(node.path);
  for (const child of node.children ?? []) {
    paths.push(...flattenPaths(child as typeof node));
  }
  return paths;
}
