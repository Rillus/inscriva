import { describe, expect, it } from "vitest";
import { parseApiErrorBody } from "./http-api.js";

describe("parseApiErrorBody", () => {
  it("reads the error field from JSON bodies", () => {
    expect(
      parseApiErrorBody('{"error":"No API key configured for openai"}'),
    ).toBe("No API key configured for openai");
  });

  it("returns plain text when JSON is not used", () => {
    expect(parseApiErrorBody("Something went wrong")).toBe("Something went wrong");
  });
});
