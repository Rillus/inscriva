import { describe, expect, it } from "vitest";
import { capabilitiesFromBridge } from "./capabilities.js";
import { createMockBridge } from "./mock-bridge.js";

describe("capabilitiesFromBridge", () => {
  it("reflects methods present on the bridge", () => {
    const bridge = createMockBridge({
      path: "/x",
      title: "X",
      files: new Map(),
    });
    expect(capabilitiesFromBridge(bridge)).toEqual({
      folderPicker: true,
      gitClone: true,
      gitPull: true,
      gitInspect: true,
      gitOAuth: true,
    });
  });

  it("reports missing optional methods", () => {
    const minimal = {
      openBook: async () => ({ id: "1", path: "/x", title: "X" }),
    };
    expect(capabilitiesFromBridge(minimal)).toEqual({
      folderPicker: false,
      gitClone: false,
      gitPull: false,
      gitInspect: false,
      gitOAuth: false,
    });
  });
});
