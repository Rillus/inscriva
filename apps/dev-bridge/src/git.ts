import path from "node:path";
import simpleGit, { type SimpleGit } from "simple-git";
import type { GitRepoInfo } from "@inscriva/bridge";

export interface PullResult {
  pulled: boolean;
  skipped?: string;
}

export async function inspectBookRepo(repoPath: string): Promise<GitRepoInfo> {
  const resolved = path.resolve(repoPath);
  const git = simpleGit(resolved);
  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    return { path: resolved, isRepo: false, remotes: [] };
  }

  const status = await git.status();
  const remotes = (await git.getRemotes(true)).map((r) => ({
    name: r.name,
    url: r.refs.fetch ?? r.refs.push ?? "",
  }));

  let ahead = 0;
  let behind = 0;
  try {
    await git.fetch();
    const summary = await git.raw([
      "rev-list",
      "--left-right",
      "--count",
      "HEAD...@{u}",
    ]);
    const parts = summary.trim().split(/\s+/);
    behind = Number(parts[0] ?? 0);
    ahead = Number(parts[1] ?? 0);
  } catch {
    /* no upstream */
  }

  return {
    path: resolved,
    isRepo: true,
    branch: status.current ?? undefined,
    remotes: remotes.filter((r) => r.url),
    dirty: !status.isClean(),
    ahead,
    behind,
  };
}

export async function pullBookRepo(root: string): Promise<PullResult> {
  const git = simpleGit(root);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    return { pulled: false, skipped: "not a git repository" };
  }

  const remotes = await git.getRemotes(true);
  if (remotes.length === 0) {
    return { pulled: false, skipped: "no remote configured" };
  }

  await git.fetch();

  const branch = await resolvePullBranch(git);
  if (!branch) {
    return { pulled: false, skipped: "could not determine branch" };
  }

  await git.pull("origin", branch, ["--rebase"]);
  return { pulled: true };
}

async function resolvePullBranch(git: SimpleGit): Promise<string | null> {
  try {
    const branch = (await git.revparse(["--abbrev-ref", "HEAD"])).trim();
    if (branch && branch !== "HEAD") return branch;
  } catch {
    /* detached or empty */
  }

  try {
    const remoteHead = (await git.raw([
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
    ])).trim();
    const match = remoteHead.match(/refs\/remotes\/origin\/(.+)$/);
    if (match) return match[1]!;
  } catch {
    /* no origin/HEAD */
  }

  return "main";
}

export async function cloneBookRepo(
  url: string,
  parentPath: string,
  folderName: string,
): Promise<string> {
  const target = path.join(parentPath, folderName);
  await simpleGit().clone(url, target);
  return target;
}
