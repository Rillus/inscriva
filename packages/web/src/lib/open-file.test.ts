import { describe, expect, it } from "vitest";
import { cancelPendingFileSave } from "./open-file.js";

describe("cancelPendingFileSave", () => {
  it("clears a pending debounced save timer", () => {
    let fired = false;
    const timer = setTimeout(() => {
      fired = true;
    }, 50);

    cancelPendingFileSave(timer);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(fired).toBe(false);
        resolve();
      }, 80);
    });
  });

  it("accepts undefined without throwing", () => {
    expect(() => cancelPendingFileSave(undefined)).not.toThrow();
  });
});
