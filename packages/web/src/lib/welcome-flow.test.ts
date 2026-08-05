import { describe, expect, it, vi } from "vitest";
import type { BridgeCapabilities, InscrivaBridge } from "@inscriva/bridge";
import {
  preferredWelcomeTab,
  resolveCloneParentPath,
} from "./welcome-flow.js";

describe("welcome-flow", () => {
  it("prefers Git tab on Android without folder picker", () => {
    const caps: BridgeCapabilities = {
      folderPicker: false,
      gitClone: true,
      gitPull: true,
      gitInspect: true,
      gitOAuth: true,
      platform: "android",
    };
    expect(preferredWelcomeTab(caps)).toBe("git");
  });

  it("prefers Open tab on desktop", () => {
    const caps: BridgeCapabilities = {
      folderPicker: true,
      gitClone: true,
      gitPull: true,
      gitInspect: true,
      gitOAuth: false,
      platform: "macos",
    };
    expect(preferredWelcomeTab(caps)).toBe("open");
  });

  it("uses existing parent path when set", async () => {
    const bridge = {} as InscrivaBridge;
    await expect(resolveCloneParentPath(bridge, "/books")).resolves.toBe("/books");
  });

  it("falls back to bridge books library path", async () => {
    const bridge = {
      getBooksLibraryPath: vi.fn(async () => "/data/inscriva/books"),
    } as unknown as InscrivaBridge;
    await expect(resolveCloneParentPath(bridge, "")).resolves.toBe(
      "/data/inscriva/books",
    );
  });
});
