<script lang="ts">
  import type { GitHostStatus, GitRemoteRepo, InscrivaBridge } from "@inscriva/bridge";

  interface Props {
    bridge: InscrivaBridge;
    oauthConfigured: boolean;
    onOpen: (path: string) => void;
    pickFolder: (prompt: string) => Promise<string | null>;
  }

  let { bridge, oauthConfigured, onOpen, pickFolder }: Props = $props();

  let status = $state<GitHostStatus>({ connected: false, configured: false });

  $effect(() => {
    if (status.configured !== oauthConfigured) {
      status = { ...status, configured: oauthConfigured };
    }
  });
  let repos = $state<GitRemoteRepo[]>([]);
  let filter = $state("");
  let selected = $state<GitRemoteRepo | null>(null);
  let parentPath = $state("");
  let error = $state("");
  let busy = $state(false);
  let connecting = $state(false);

  const filteredRepos = $derived(
    repos.filter((r) => {
      const q = filter.trim().toLowerCase();
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false)
      );
    }),
  );

  $effect(() => {
    refreshStatus();
  });

  async function refreshStatus() {
    if (!bridge.gitOAuthStatus) return;
    status = await bridge.gitOAuthStatus("github");
    if (status.connected) {
      await loadRepos();
    } else {
      repos = [];
      selected = null;
    }
  }

  async function loadRepos() {
    if (!bridge.gitListRemoteRepos) return;
    busy = true;
    error = "";
    try {
      repos = await bridge.gitListRemoteRepos("github");
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not load repositories";
    } finally {
      busy = false;
    }
  }

  async function connectGithub() {
    if (!bridge.gitOAuthStart) return;
    error = "";
    connecting = true;
    try {
      const start = await bridge.gitOAuthStart("github");
      if (!start.configured || !start.url) {
        error =
          "GitHub OAuth is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (see apps/dev-bridge/.env.example).";
        return;
      }

      const popup = window.open(
        start.url,
        "inscriva-github-oauth",
        "width=520,height=720",
      );

      const deadline = Date.now() + 120_000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        await refreshStatus();
        if (status.connected) {
          popup?.close();
          return;
        }
        if (popup?.closed && !status.connected) {
          break;
        }
      }

      if (!status.connected) {
        error = "GitHub sign-in did not complete. Try again.";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not start GitHub sign-in";
    } finally {
      connecting = false;
    }
  }

  async function disconnect() {
    if (!bridge.gitOAuthDisconnect) return;
    await bridge.gitOAuthDisconnect("github");
    await refreshStatus();
  }

  async function cloneSelected() {
    if (!selected || !bridge.gitCloneRemote) return;

    let parent = parentPath.trim();
    if (!parent) {
      const chosen = await pickFolder("Choose where to clone the book");
      if (!chosen) return;
      parent = chosen;
      parentPath = chosen;
    }

    busy = true;
    error = "";
    try {
      const handle = await bridge.gitCloneRemote({
        provider: "github",
        fullName: selected.fullName,
        parentPath: parent,
      });
      onOpen(handle.path);
    } catch (e) {
      error = e instanceof Error ? e.message : "Could not clone repository";
    } finally {
      busy = false;
    }
  }
</script>

<section class="github-connect">
  {#if !oauthConfigured}
    <p class="hint setup">
      GitHub sign-in needs a one-time OAuth app setup on the dev bridge.
      Copy <code>apps/dev-bridge/.env.example</code> to <code>.env</code> and
      restart <code>pnpm dev:bridge</code>.
    </p>
  {:else if !status.connected}
    <p class="hint">Sign in with GitHub to browse and clone your repositories.</p>
    <button
      type="button"
      class="primary github"
      disabled={connecting}
      onclick={connectGithub}
    >
      {connecting ? "Waiting for GitHub…" : "Connect GitHub"}
    </button>
  {:else}
    <div class="connected-bar">
      <span>Connected as <strong>{status.username}</strong></span>
      <button type="button" class="link" onclick={disconnect}>Disconnect</button>
    </div>

    <label class="filter">
      <span>Your repositories</span>
      <input
        type="search"
        bind:value={filter}
        placeholder="Filter by name…"
        disabled={busy}
      />
    </label>

    <ul class="repo-list" role="listbox" aria-label="GitHub repositories">
      {#each filteredRepos as repo}
        <li>
          <button
            type="button"
            class:selected={selected?.id === repo.id}
            onclick={() => (selected = repo)}
          >
            <span class="name">{repo.fullName}</span>
            {#if repo.private}
              <span class="badge">private</span>
            {/if}
            {#if repo.description}
              <span class="desc">{repo.description}</span>
            {/if}
          </button>
        </li>
      {:else}
        <li class="empty">No repositories match.</li>
      {/each}
    </ul>

    {#if selected}
      <label>
        <span>Clone into folder</span>
        <input
          type="text"
          bind:value={parentPath}
          placeholder="/Users/you/Writing"
          disabled={busy}
        />
      </label>
      <button type="button" class="secondary" disabled={busy} onclick={async () => {
        const c = await pickFolder("Choose where to clone the book");
        if (c) parentPath = c;
      }}>
        Choose folder…
      </button>
      <button type="button" class="primary" disabled={busy} onclick={cloneSelected}>
        Clone {selected.name} and open
      </button>
    {/if}
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}
</section>

<style>
  .github-connect {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .hint {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
    line-height: 1.45;
  }

  .hint.setup code {
    font-size: 0.85em;
    background: var(--bg-muted);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
  }

  .primary.github {
    background: #24292f;
  }

  .connected-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .link {
    border: none;
    background: transparent;
    color: var(--accent);
    text-decoration: underline;
    font-size: 0.8rem;
  }

  .filter {
    margin: 0;
  }

  .repo-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 220px;
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-input);
  }

  .repo-list li button {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.55rem 0.65rem;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }

  .repo-list li:last-child button {
    border-bottom: none;
  }

  .repo-list li button.selected,
  .repo-list li button:hover {
    background: var(--accent-soft);
  }

  .name {
    display: block;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .badge {
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-left: 0.35rem;
  }

  .desc {
    display: block;
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.15rem;
  }

  .empty {
    padding: 0.75rem;
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  .error {
    margin: 0.5rem 0 0;
    color: #b91c1c;
    font-size: 0.85rem;
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
</style>
