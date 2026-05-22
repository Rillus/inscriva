<script lang="ts">
  import type {
    BridgeCapabilities,
    GitRepoInfo,
    InscrivaBridge,
  } from "@inscriva/bridge";
  import { repoNameFromUrl } from "@inscriva/bridge";
  import { fixtureBookPath } from "./bridge-client.js";
  import GitHubConnect from "./GitHubConnect.svelte";

  interface Props {
    bridge: InscrivaBridge;
    capabilities: BridgeCapabilities;
    recents: string[];
    tab?: "open" | "git" | "new";
    onOpen: (path: string) => void;
    onDemo: () => void;
  }

  let {
    bridge,
    capabilities,
    recents,
    tab = $bindable("open"),
    onOpen,
    onDemo,
  }: Props = $props();

  let pathInput = $state(fixtureBookPath());
  let cloneUrl = $state("");
  let parentPath = $state("");
  let newTitle = $state("");
  let newPath = $state("");
  let gitMode = $state<"github" | "local" | "clone">("github");
  let repoPreview = $state<GitRepoInfo | null>(null);
  let error = $state("");
  let busy = $state(false);

  const showGitTab = $derived(
    capabilities.gitOAuth || capabilities.gitClone || capabilities.gitInspect,
  );
  const cloneFolderName = $derived(
    cloneUrl.trim() ? repoNameFromUrl(cloneUrl) : "",
  );

  async function openPath(path: string) {
    if (!path.trim()) return;
    busy = true;
    error = "";
    try {
      await bridge.openBook(path.trim());
      onOpen(path.trim());
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not open book";
    } finally {
      busy = false;
    }
  }

  async function pickFolder(
    target: "open" | "parent" | "new",
    prompt: string,
  ) {
    if (!bridge.pickBookFolder) {
      error = "Folder picker is not available on this platform.";
      return null;
    }
    return bridge.pickBookFolder({ prompt });
  }

  async function chooseBookFolder() {
    busy = true;
    error = "";
    try {
      const chosen = await pickFolder("open", "Select your book folder");
      if (!chosen) return;
      pathInput = chosen;
      await openPath(chosen);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not open folder";
    } finally {
      busy = false;
    }
  }

  async function chooseGitRepo() {
    if (!bridge.gitInspect) {
      error = "Git inspect is not available on this platform.";
      return;
    }
    busy = true;
    error = "";
    repoPreview = null;
    try {
      const chosen = await pickFolder(
        "open",
        "Select your Git book repository",
      );
      if (!chosen) return;
      pathInput = chosen;
      repoPreview = await bridge.gitInspect(chosen);
      if (!repoPreview.isRepo) {
        error = "That folder is not a Git repository. Choose the repo root, or clone from a remote.";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not inspect repository";
    } finally {
      busy = false;
    }
  }

  async function connectLocalRepo() {
    if (!repoPreview?.isRepo) return;
    await openPath(repoPreview.path);
  }

  async function chooseCloneParent() {
    busy = true;
    error = "";
    try {
      const chosen = await pickFolder(
        "parent",
        "Choose where to clone the repository",
      );
      if (chosen) parentPath = chosen;
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not open folder picker";
    } finally {
      busy = false;
    }
  }

  async function cloneFromRemote() {
    if (!cloneUrl.trim()) return;
    if (!bridge.gitClone) {
      error = "Git clone is not available on this platform.";
      return;
    }

    let parent = parentPath.trim();
    if (!parent) {
      const chosen = await pickFolder(
        "parent",
        "Choose where to clone the repository",
      );
      if (!chosen) return;
      parent = chosen;
      parentPath = chosen;
    }

    busy = true;
    error = "";
    try {
      const handle = await bridge.gitClone({
        url: cloneUrl.trim(),
        parentPath: parent,
      });
      onOpen(handle.path);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not clone repository";
    } finally {
      busy = false;
    }
  }

  async function createNew() {
    if (!newTitle.trim() || !newPath.trim()) return;
    const slug = newTitle.trim().replace(/\s+/g, "-").toLowerCase();
    const bookPath = `${newPath.replace(/\/$/, "")}/${slug}`;
    busy = true;
    error = "";
    try {
      await bridge.createBook({
        title: newTitle.trim(),
        path: bookPath,
        initGit: true,
      });
      onOpen(bookPath);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not create book";
    } finally {
      busy = false;
    }
  }
</script>

<div class="welcome">
  <div class="card">
    <img class="wordmark" src="/inscriva.svg" width="172" height="64" alt="Inscriva" />
    <p class="lede">Local-first writing for long-form fiction. One book, one Git repo.</p>

    <div class="tabs">
      <button type="button" class:active={tab === "open"} onclick={() => (tab = "open")}>
        Open
      </button>
      {#if showGitTab}
        <button type="button" class:active={tab === "git"} onclick={() => (tab = "git")}>
          Git
        </button>
      {/if}
      <button type="button" class:active={tab === "new"} onclick={() => (tab = "new")}>
        New
      </button>
    </div>

    {#if tab === "open"}
      {#if capabilities.folderPicker}
        <button
          type="button"
          class="primary"
          disabled={busy}
          onclick={chooseBookFolder}
        >
          Choose book folder…
        </button>
      {/if}

      <details class="manual" open={!capabilities.folderPicker}>
        <summary>Or enter path manually</summary>
        <label>
          <span>Book folder path</span>
          <input
            type="text"
            bind:value={pathInput}
            placeholder="/Users/you/Writing/my-novel"
            disabled={busy}
          />
        </label>
        <button
          type="button"
          class="secondary"
          disabled={busy}
          onclick={() => openPath(pathInput)}
        >
          Open
        </button>
      </details>

      {#if recents.length}
        <div class="recents">
          <p>Recent books</p>
          <ul>
            {#each recents as recent}
              <li>
                <button type="button" onclick={() => openPath(recent)}>{recent}</button>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {:else if tab === "git"}
      <div class="git-modes">
        {#if capabilities.gitOAuth}
          <button
            type="button"
            class:active={gitMode === "github"}
            onclick={() => {
              gitMode = "github";
              error = "";
            }}
          >
            GitHub
          </button>
        {/if}
        <button
          type="button"
          class:active={gitMode === "local"}
          onclick={() => {
            gitMode = "local";
            repoPreview = null;
            error = "";
          }}
        >
          Local folder
        </button>
        {#if capabilities.gitClone}
          <button
            type="button"
            class:active={gitMode === "clone"}
            onclick={() => {
              gitMode = "clone";
              repoPreview = null;
              error = "";
            }}
          >
            Paste URL
          </button>
        {/if}
      </div>

      {#if gitMode === "github"}
        <GitHubConnect
          {bridge}
          oauthConfigured={capabilities.gitOAuth}
          {onOpen}
          pickFolder={(prompt) => pickFolder("parent", prompt)}
        />
      {:else if gitMode === "local"}
        <p class="hint">Choose a folder that is already a Git clone of your book.</p>
        {#if capabilities.folderPicker}
          <button
            type="button"
            class="primary"
            disabled={busy}
            onclick={chooseGitRepo}
          >
            Choose repository…
          </button>
        {/if}

        {#if repoPreview?.isRepo}
          <div class="repo-card">
            <p class="repo-path">{repoPreview.path}</p>
            {#if repoPreview.branch}
              <p><strong>Branch</strong> {repoPreview.branch}</p>
            {/if}
            {#if repoPreview.remotes.length}
              <p><strong>Remote</strong></p>
              <ul>
                {#each repoPreview.remotes as remote}
                  <li><code>{remote.name}</code> {remote.url}</li>
                {/each}
              </ul>
            {:else}
              <p class="warn">No remote configured — you can still open, but Pull will not sync.</p>
            {/if}
            {#if repoPreview.behind}
              <p class="warn">{repoPreview.behind} commit(s) behind remote</p>
            {/if}
            <button
              type="button"
              class="primary"
              disabled={busy}
              onclick={connectLocalRepo}
            >
              Connect and open
            </button>
          </div>
        {/if}
      {:else if gitMode === "clone"}
        <label>
          <span>Git remote URL</span>
          <input
            type="url"
            bind:value={cloneUrl}
            placeholder="https://github.com/you/monsterosso.git"
            disabled={busy}
          />
        </label>

        {#if cloneFolderName}
          <p class="hint">Will clone into <code>{cloneFolderName}/</code></p>
        {/if}

        <label>
          <span>Parent folder</span>
          <input
            type="text"
            bind:value={parentPath}
            placeholder="/Users/you/Writing"
            disabled={busy}
          />
        </label>

        {#if capabilities.folderPicker}
          <button
            type="button"
            class="secondary"
            disabled={busy}
            onclick={chooseCloneParent}
          >
            Choose parent folder…
          </button>
        {/if}

        <button type="button" class="primary" disabled={busy} onclick={cloneFromRemote}>
          Clone and connect
        </button>
      {/if}
    {:else}
      <label>
        <span>Book title</span>
        <input type="text" bind:value={newTitle} placeholder="Monsterosso" disabled={busy} />
      </label>
      <label>
        <span>Parent folder</span>
        <input
          type="text"
          bind:value={newPath}
          placeholder="/Users/you/Writing"
          disabled={busy}
        />
      </label>
      {#if capabilities.folderPicker}
        <button
          type="button"
          class="secondary"
          disabled={busy}
          onclick={async () => {
            const c = await pickFolder("new", "Choose where to create the book");
            if (c) newPath = c;
          }}
        >
          Choose parent folder…
        </button>
      {/if}
      <button type="button" class="primary" disabled={busy} onclick={createNew}>
        Create &amp; open
      </button>
    {/if}

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <div class="demo">
      <button type="button" class="ghost" onclick={onDemo}>Try demo (in-memory)</button>
    </div>
  </div>
</div>

<style>
  .welcome {
    display: grid;
    place-items: center;
    min-height: 100%;
    padding: 2rem;
    background: var(--room-mahogany);
    background-attachment: fixed;
  }

  .card {
    width: min(480px, 100%);
    padding: 2rem;
    background: var(--surface-paper);
    background-size: cover;
    border: 2px solid var(--ornament-gold-dim);
    outline: 1px solid rgba(255, 255, 255, 0.35);
    outline-offset: -5px;
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), var(--shadow-panel-inset);
  }

  .wordmark {
    display: block;
    margin: 0 auto 0.5rem;
    height: 3.25rem;
    width: auto;
  }

  .lede {
    color: var(--text-muted);
    line-height: 1.5;
  }

  .tabs,
  .git-modes {
    display: flex;
    gap: 0.25rem;
    margin: 1.25rem 0;
    padding: 0.2rem;
    background: var(--bg-muted);
    border-radius: 8px;
  }

  .tabs button,
  .git-modes button {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.45rem;
    border-radius: 6px;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .tabs button.active,
  .git-modes button.active {
    background: var(--bg-elevated);
    color: var(--text);
  }

  label {
    display: block;
    margin-bottom: 0.75rem;
  }

  label span {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  input {
    width: 100%;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font: inherit;
    background: var(--surface-input);
  }

  .primary,
  .secondary {
    width: 100%;
    margin-top: 0.35rem;
    padding: 0.55rem;
    border: none;
    border-radius: 6px;
    font-weight: 500;
  }

  .primary {
    background: var(--accent);
    color: #fff;
  }

  .secondary {
    background: var(--bg-muted);
    color: var(--text);
  }

  .primary:disabled,
  .secondary:disabled {
    opacity: 0.6;
  }

  .hint {
    margin: 0 0 0.75rem;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .hint code {
    font-size: 0.85em;
    background: var(--bg-muted);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }

  .repo-card {
    margin-top: 1rem;
    padding: 0.85rem;
    background: var(--surface-input);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .repo-card p {
    margin: 0.35rem 0;
  }

  .repo-path {
    font-size: 0.75rem;
    color: var(--text-muted);
    word-break: break-all;
  }

  .repo-card ul {
    margin: 0.25rem 0 0.5rem;
    padding-left: 1rem;
  }

  .repo-card li {
    word-break: break-all;
    margin-bottom: 0.25rem;
  }

  .warn {
    color: #b45309;
    font-size: 0.8rem;
  }

  .manual {
    margin-top: 1rem;
  }

  .manual summary {
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .recents {
    margin-top: 1.25rem;
    font-size: 0.85rem;
  }

  .recents p {
    margin: 0 0 0.35rem;
    color: var(--text-muted);
  }

  .recents ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .recents button {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.35rem 0;
    color: var(--accent);
    font-size: 0.85rem;
    word-break: break-all;
  }

  .error {
    margin: 0.75rem 0 0;
    color: #b91c1c;
    font-size: 0.85rem;
  }

  .demo {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    text-align: center;
  }

  .ghost {
    border: none;
    background: transparent;
    color: var(--text-muted);
    text-decoration: underline;
  }
</style>
