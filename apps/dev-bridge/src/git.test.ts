import { describe, expect, it } from "vitest";
import { inspectBookRepo, pullBookRepo } from "./git.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import simpleGit from "simple-git";

describe("pullBookRepo", () => {
  it("skips when not a git repository", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const result = await pullBookRepo(dir);
    expect(result.pulled).toBe(false);
    expect(result.skipped).toBe("not a git repository");
  });

  it("skips when no remote is configured", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    await simpleGit(dir).init();
    const result = await pullBookRepo(dir);
    expect(result.pulled).toBe(false);
    expect(result.skipped).toBe("no remote configured");
  });
});

describe("inspectBookRepo", () => {
  it("reports non-repos", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const info = await inspectBookRepo(dir);
    expect(info.isRepo).toBe(false);
    expect(info.remotes).toEqual([]);
  });

  it("reports branch and remotes for a git repo", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const git = simpleGit(dir);
    await git.init();
    await git.addConfig("user.email", "test@example.com");
    await git.addConfig("user.name", "Test");
    await fs.writeFile(path.join(dir, "readme.md"), "# test\n");
    await git.add(".");
    await git.commit("init");
    await git.addRemote("origin", "https://github.com/example/book.git");

    const info = await inspectBookRepo(dir);
    expect(info.isRepo).toBe(true);
    expect(info.remotes[0]?.name).toBe("origin");
    expect(info.remotes[0]?.url).toContain("github.com");
  });
});
