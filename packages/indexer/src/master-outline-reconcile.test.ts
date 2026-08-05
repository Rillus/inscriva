import { describe, expect, it } from "vitest";
import { reconcileMasterOutlineStatuses } from "./master-outline-reconcile.js";

const SAMPLE = `# Master Outline

## Ch01 — The Eighth A
**Story question:** Will Mara break the silence?

## Scenes
- Breakfast

## Ch02 — Italy
**Story question:** Can Cole survive Nanna?
`;

describe("reconcileMasterOutlineStatuses", () => {
  it("inserts Status fields from chapter outline statuses", () => {
    const next = reconcileMasterOutlineStatuses(SAMPLE, {
      Ch01: "Approved",
      Ch02: "Drafting",
    });
    expect(next).toContain("**Status:** Approved");
    expect(next).toContain("**Status:** Drafting");
  });

  it("updates an existing Status field", () => {
    const withStatus = SAMPLE.replace(
      "## Ch01 — The Eighth A",
      "## Ch01 — The Eighth A\n**Status:** Drafting",
    );
    const next = reconcileMasterOutlineStatuses(withStatus, {
      Ch01: "Completed",
    });
    expect(next).toContain("**Status:** Completed");
    expect(next).not.toContain("**Status:** Drafting");
  });
});
