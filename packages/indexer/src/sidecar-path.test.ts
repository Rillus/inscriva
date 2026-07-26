import { describe, expect, it } from "vitest";
import {
  alignmentReportCachePath,
  alignmentReportExportPath,
  anchorSidecarPath,
  CHAPTER_MAP_PATH,
  CONFIG_PATH,
  NOTES_PATH,
  WRITING_LOG_PATH,
  WRITING_SESSIONS_PATH,
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
    expect(WRITING_SESSIONS_PATH).toBe(".inscriva/writing-sessions.jsonl");
    expect(WRITING_LOG_PATH).toBe("03 Revision/Writing log.md");
  });

  it("maps alignment cache vs public export paths", () => {
    expect(alignmentReportCachePath("Ch01")).toBe(
      ".inscriva/reports/Ch01-alignment.json",
    );
    expect(alignmentReportExportPath("Ch01")).toBe(
      "03 Revision/Alignment/Ch01.md",
    );
  });
});
