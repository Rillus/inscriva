import { describe, expect, it } from "vitest";
import { shouldNotifyPresentationLifecycle } from "./editor-presentation.js";

describe("shouldNotifyPresentationLifecycle", () => {
  it("notifies only for the full presentation pass while awaiting", () => {
    expect(shouldNotifyPresentationLifecycle(true, true, false)).toBe(true);
    expect(shouldNotifyPresentationLifecycle(false, true, false)).toBe(false);
    expect(shouldNotifyPresentationLifecycle(true, false, false)).toBe(false);
    expect(shouldNotifyPresentationLifecycle(true, true, true)).toBe(false);
  });
});
