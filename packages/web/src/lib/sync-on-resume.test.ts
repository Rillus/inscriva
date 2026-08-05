import { describe, expect, it, vi } from "vitest";
import { bindSyncOnResume, shouldSyncOnResume } from "./sync-on-resume.js";

describe("shouldSyncOnResume", () => {
  it("returns false when document is hidden", () => {
    expect(shouldSyncOnResume("hidden", null)).toBe(false);
  });

  it("returns true on first visible resume", () => {
    expect(shouldSyncOnResume("visible", null)).toBe(true);
  });

  it("respects cooldown between syncs", () => {
    const now = vi.fn(() => 60_000);
    expect(
      shouldSyncOnResume("visible", 40_000, { cooldownMs: 30_000, now }),
    ).toBe(false);
    expect(
      shouldSyncOnResume("visible", 20_000, { cooldownMs: 30_000, now }),
    ).toBe(true);
  });
});

describe("bindSyncOnResume", () => {
  it("calls handler when visibility becomes visible", () => {
    let visibility: DocumentVisibilityState = "hidden";
    const handler = vi.fn();
    const unbind = bindSyncOnResume(handler, {
      getVisibility: () => visibility,
      now: () => 0,
      cooldownMs: 0,
    });

    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    expect(handler).toHaveBeenCalledTimes(1);

    unbind();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls handler on persisted pageshow", () => {
    const handler = vi.fn();
    const unbind = bindSyncOnResume(handler, {
      getVisibility: () => "visible",
      now: () => 0,
      cooldownMs: 0,
    });

    const event = new Event("pageshow") as PageTransitionEvent;
    Object.defineProperty(event, "persisted", { value: true });
    window.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
    unbind();
  });
});
