import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { GitHostStatus, GitOAuthStart, GitRemoteRepo } from "@inscriva/bridge";
import { cloneBookRepo } from "./git.js";

const TOKEN_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".inscriva",
  "oauth",
  "github.json",
);

const pendingStates = new Map<string, number>();

export type OAuthListener = (event: { type: "github-connected"; username: string }) => void;
const oauthListeners = new Set<OAuthListener>();

export function onOAuthEvent(listener: OAuthListener): () => void {
  oauthListeners.add(listener);
  return () => oauthListeners.delete(listener);
}

function emitOAuth(event: Parameters<OAuthListener>[0]): void {
  for (const listener of oauthListeners) {
    listener(event);
  }
}

function clientId(): string | undefined {
  return process.env.GITHUB_CLIENT_ID;
}

function clientSecret(): string | undefined {
  return process.env.GITHUB_CLIENT_SECRET;
}

function redirectUri(port: number): string {
  return (
    process.env.GITHUB_OAUTH_REDIRECT ??
    `http://127.0.0.1:${port}/git/oauth/github/callback`
  );
}

export function githubOAuthConfigured(): boolean {
  return Boolean(clientId() && clientSecret());
}

export async function startGithubOAuth(port: number): Promise<GitOAuthStart> {
  const id = clientId();
  const secret = clientSecret();
  if (!id || !secret) {
    return { url: null, configured: false };
  }

  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri(port),
    scope: "repo read:user",
    state,
  });

  return {
    configured: true,
    url: `https://github.com/login/oauth/authorize?${params}`,
  };
}

export async function completeGithubOAuth(
  code: string,
  state: string,
): Promise<{ username: string }> {
  if (!pendingStates.has(state)) {
    throw new Error("Invalid OAuth state — try connecting again");
  }
  pendingStates.delete(state);

  const id = clientId()!;
  const secret = clientSecret()!;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: id,
      client_secret: secret,
      code,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`GitHub token exchange failed (${tokenRes.status})`);
  }

  const tokenBody = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenBody.access_token) {
    throw new Error(tokenBody.error_description ?? tokenBody.error ?? "No access token");
  }

  const userRes = await githubApi(tokenBody.access_token, "/user");
  if (!userRes.ok) {
    throw new Error("Could not load GitHub profile");
  }
  const user = (await userRes.json()) as { login: string };

  await saveToken({
    accessToken: tokenBody.access_token,
    username: user.login,
    createdAt: new Date().toISOString(),
  });

  emitOAuth({ type: "github-connected", username: user.login });
  return { username: user.login };
}

export async function githubOAuthStatus(): Promise<GitHostStatus> {
  if (!githubOAuthConfigured()) {
    return { connected: false, configured: false };
  }
  const token = await loadToken();
  if (!token) {
    return { connected: false, configured: true };
  }
  return {
    connected: true,
    provider: "github",
    username: token.username,
  };
}

export async function disconnectGithub(): Promise<void> {
  try {
    await fs.unlink(TOKEN_PATH);
  } catch {
    /* already gone */
  }
}

export async function listGithubRepos(): Promise<GitRemoteRepo[]> {
  const token = await requireToken();
  const repos: GitRemoteRepo[] = [];
  let page = 1;

  while (page <= 5) {
    const res = await githubApi(
      token.accessToken,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,organization_member`,
    );
    if (!res.ok) {
      throw new Error(`GitHub API error (${res.status})`);
    }
    const batch = (await res.json()) as GithubApiRepo[];
    if (batch.length === 0) break;

    for (const repo of batch) {
      repos.push({
        provider: "github",
        id: repo.id,
        fullName: repo.full_name,
        name: repo.name,
        cloneUrl: repo.clone_url,
        private: repo.private,
        updatedAt: repo.updated_at,
        description: repo.description ?? undefined,
      });
    }

    if (batch.length < 100) break;
    page++;
  }

  return repos;
}

export async function cloneGithubRepo(
  fullName: string,
  parentPath: string,
): Promise<string> {
  const token = await requireToken();
  const folderName = fullName.split("/").pop() ?? "repo";
  const authedUrl = `https://x-access-token:${token.accessToken}@github.com/${fullName}.git`;
  return cloneBookRepo(authedUrl, parentPath, folderName);
}

interface StoredToken {
  accessToken: string;
  username: string;
  createdAt: string;
}

interface GithubApiRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  clone_url: string;
  updated_at: string;
  description: string | null;
}

async function loadToken(): Promise<StoredToken | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

async function requireToken(): Promise<StoredToken> {
  const token = await loadToken();
  if (!token) {
    throw new Error("Not connected to GitHub — connect first");
  }
  return token;
}

async function saveToken(token: StoredToken): Promise<void> {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), "utf-8");
  await fs.chmod(TOKEN_PATH, 0o600).catch(() => {
    /* windows */
  });
}

async function githubApi(token: string, path: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Inscriva-Dev-Bridge",
    },
  });
}

export function oauthSuccessHtml(username: string): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head><meta charset="utf-8"><title>GitHub connected</title>
<style>body{font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0;background:#f7f4ef;color:#1c1917}
.card{padding:2rem;background:#fff;border-radius:12px;text-align:center;max-width:360px}</style>
</head>
<body><div class="card"><h1>Connected</h1><p>Signed in as <strong>${username}</strong>.</p><p>You can close this window and return to Inscriva.</p></div></body></html>`;
}

export function oauthErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en-GB">
<head><meta charset="utf-8"><title>Connection failed</title></head>
<body><p>GitHub connection failed: ${message}</p><p>Close this window and try again in Inscriva.</p></body></html>`;
}
