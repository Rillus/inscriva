import { describe, expect, it } from "vitest";
import { nativeDialogSupported } from "./native-dialog.js";

describe("nativeDialogSupported", () => {
  it("is true on supported desktop platforms", () => {
    expect(
      ["darwin", "linux", "win32"].includes(process.platform)
        ? nativeDialogSupported()
        : !nativeDialogSupported(),
    ).toBe(true);
  });
});
