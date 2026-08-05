import { describe, expect, it } from "vitest";
import {
  authInfoForProvider,
  LLM_PROVIDER_AUTH,
  providersWithOAuthPlanned,
} from "./provider-auth.js";

describe("provider-auth", () => {
  it("documents API key as the v1 auth method for all providers", () => {
    for (const entry of LLM_PROVIDER_AUTH) {
      expect(entry.authMethod).toBe("api_key");
    }
  });

  it("marks OAuth as planned only where documented", () => {
    expect(providersWithOAuthPlanned()).toEqual(["google"]);
    expect(authInfoForProvider("openai")?.oauthStatus).toBe("not_available");
    expect(authInfoForProvider("google")?.oauthStatus).toBe("planned");
  });
});
