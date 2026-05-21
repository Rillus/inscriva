import { describe, expect, it } from "vitest";
import {
  anchorSidecarPath,
  CHAPTER_MAP_PATH,
  CONFIG_PATH,
  NOTES_PATH,
} from "./sidecar-path.js";

describe("sidecar paths", () => {
  it("encodes file paths for anchor sidecars", () => {
    expect(anchorSidecarPath("01 Draft/foo.md")).toBe(
      ".inscriva/anchors/01 Draft__foo.md.json",
    );
    expect(anchorSidecarPath("01 Draft\\foo.md")).toBe(
      ".inscriva/anchors/01 Draft__foo.md.json",
    );
  });

  it("exports fixed inscriva paths", () => {
    expect(NOTES_PATH).toBe(".inscriva/notes/notes.jsonl");
    expect(CONFIG_PATH).toBe(".inscriva/config.json");
    expect(CHAPTER_MAP_PATH).toBe(".inscriva/chapter-map.json");
  });
});
