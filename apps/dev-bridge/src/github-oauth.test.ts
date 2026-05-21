import { afterEach, describe, expect, it, vi } from "vitest";
import {
  githubOAuthConfigured,
  oauthErrorHtml,
  oauthSuccessHtml,
  onOAuthEvent,
  startGithubOAuth,
} from "./github-oauth.js";

describe("githubOAuthConfigured", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("is false without client credentials", () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(githubOAuthConfigured()).toBe(false);
  });

  it("is true when both env vars are set", () => {
    process.env.GITHUB_CLIENT_ID = "id";
    process.env.GITHUB_CLIENT_SECRET = "secret";
    expect(githubOAuthConfigured()).toBe(true);
  });
});

describe("startGithubOAuth", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("returns unconfigured when credentials are missing", async () => {
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    await expect(startGithubOAuth(3847)).resolves.toEqual({
      url: null,
      configured: false,
    });
  });

  it("returns an authorisation URL when configured", async () => {
    process.env.GITHUB_CLIENT_ID = "cid";
    process.env.GITHUB_CLIENT_SECRET = "sec";
    const start = await startGithubOAuth(3847);
    expect(start.configured).toBe(true);
    expect(start.url).toContain("github.com/login/oauth/authorize");
    expect(start.url).toContain("client_id=cid");
  });
});

describe("onOAuthEvent", () => {
  it("notifies listeners and supports unsubscribe", () => {
    const events: unknown[] = [];
    const stop = onOAuthEvent((e) => events.push(e));
    stop();
    expect(events).toEqual([]);
  });
});

describe("oauth html helpers", () => {
  it("renders success and error pages", () => {
    expect(oauthSuccessHtml("riley")).toContain("riley");
    expect(oauthErrorHtml("denied")).toContain("denied");
  });
});
