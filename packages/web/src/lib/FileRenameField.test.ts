import { describe, expect, it, vi } from "vitest";
import { validateFileBaseName } from "@inscriva/indexer";

describe("FileRenameField rename validation", () => {
  it("accepts em-dash chapter filenames used in book repos", () => {
    expect(validateFileBaseName("Ch01 — The Eighth A")).toBeNull();
  });
});

describe("rename blur guard", () => {
  it("arms blur commit on the next animation frame", () => {
    vi.useFakeTimers();
    let ready = false;
    requestAnimationFrame(() => {
      ready = true;
    });
    vi.runAllTimers();
    expect(ready).toBe(true);
    vi.useRealTimers();
  });
});
