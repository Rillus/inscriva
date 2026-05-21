import { describe, expect, it } from "vitest";
import { BROWSER_CORS_METHODS, corsHeadersForOrigin } from "./cors-config.js";

describe("BROWSER_CORS_METHODS", () => {
  it("includes PUT so the web app can save files", () => {
    expect(BROWSER_CORS_METHODS).toContain("PUT");
  });

  it("includes DELETE for key management", () => {
    expect(BROWSER_CORS_METHODS).toContain("DELETE");
  });
});

describe("corsHeadersForOrigin", () => {
  it("reflects the request origin for hijacked SSE responses", () => {
    expect(corsHeadersForOrigin("http://localhost:5173")).toEqual({
      "Access-Control-Allow-Origin": "http://localhost:5173",
      Vary: "Origin",
    });
  });

  it("returns no headers when origin is missing", () => {
    expect(corsHeadersForOrigin(undefined)).toEqual({});
  });
});
