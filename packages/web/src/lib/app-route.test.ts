import { describe, expect, it } from "vitest";
import { appRouteFromPathname } from "./app-route.js";

describe("app-route", () => {
  it("maps /download to the download route", () => {
    expect(appRouteFromPathname("/download")).toBe("download");
    expect(appRouteFromPathname("/download/")).toBe("download");
  });

  it("maps other paths to welcome", () => {
    expect(appRouteFromPathname("/")).toBe("welcome");
    expect(appRouteFromPathname("/?demo=1")).toBe("welcome");
  });
});
