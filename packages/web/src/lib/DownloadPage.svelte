<script lang="ts">
  import {
    downloadLinks,
    macosDownloadHref,
  } from "./download-links.js";
  import type { WritingMode } from "./writing-mode.js";
  import { writingModeLabel } from "./writing-mode.js";

  interface Props {
    writingMode?: WritingMode;
    onBack?: () => void;
    onDemo?: () => void;
  }

  let { writingMode = "static-web", onBack, onDemo }: Props = $props();

  const links = downloadLinks();
  const macosHref = macosDownloadHref(links);
</script>

<div class="download-page">
  <div class="card">
    <img class="wordmark" src="/inscriva.svg" width="172" height="64" alt="Inscriva" />

    <header>
      <h1>Download Inscriva</h1>
      <p class="lede">
        For real writing — open a book folder, Git sync, API keys, and saves —
        use the <strong>desktop app</strong> or run the project locally.
        The hosted website is for demo and read-only sharing only.
      </p>
      <p class="mode">Current session: {writingModeLabel(writingMode)}</p>
    </header>

    <section class="option">
      <h2>macOS app (recommended)</h2>
      <p>
        Full feature set: folder picker, Git, GitHub OAuth, Keychain API keys,
        and the same editor you see in the browser.
      </p>
      <div class="actions">
        <a class="primary" href={macosHref} target="_blank" rel="noreferrer">
          Download for macOS
        </a>
        <a class="secondary" href={links.githubReleasesUrl} target="_blank" rel="noreferrer">
          All releases
        </a>
      </div>
      <p class="hint">
        Builds are published via GitHub Releases when a version tag is pushed
        (e.g. <code>v0.0.1</code>). See
        <a href="{links.repositoryUrl}/blob/main/docs/release-macos.md" target="_blank" rel="noreferrer">building releases</a>.
      </p>
    </section>

    <section class="option">
      <h2>Developers — local bridge</h2>
      <p>
        Run the dev bridge on your machine and use the web UI at
        <code>localhost:5173</code> with full filesystem access.
      </p>
      <pre><code>pnpm install
pnpm dev:all</code></pre>
      <a class="secondary" href={links.localSetupUrl} target="_blank" rel="noreferrer">
        Setup guide in README
      </a>
    </section>

    <section class="option muted">
      <h2>Android</h2>
      <p>Companion app scaffold is in the repo; device builds are not published yet.</p>
    </section>

    <section class="option demo">
      <h2>Just browsing?</h2>
      <p>Try the in-memory demo — no install, no saves.</p>
      {#if onDemo}
        <button type="button" class="primary" onclick={() => onDemo?.()}>Try demo</button>
      {/if}
    </section>

    <footer class="footer">
      {#if onBack}
        <button type="button" class="ghost" onclick={() => onBack?.()}>← Back to welcome</button>
      {:else}
        <a class="ghost" href="/">← Back to welcome</a>
      {/if}
    </footer>
  </div>
</div>

<style>
  .download-page {
    display: grid;
    place-items: center;
    min-height: 100%;
    padding: 2rem;
    background: var(--room-mahogany);
    background-attachment: fixed;
  }

  .card {
    width: min(560px, 100%);
    padding: 2rem;
    background: var(--surface-paper);
    border: 2px solid var(--ornament-gold-dim);
    outline: 1px solid rgba(255, 255, 255, 0.35);
    outline-offset: -5px;
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), var(--shadow-panel-inset);
  }

  .wordmark {
    display: block;
    margin: 0 auto 0.75rem;
    height: 3.25rem;
    width: auto;
  }

  h1 {
    margin: 0 0 0.5rem;
    font-size: 1.35rem;
  }

  h2 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
  }

  .lede,
  section p,
  .hint {
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.88rem;
  }

  .mode {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .option {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .option.muted {
    opacity: 0.85;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.65rem 0;
  }

  .primary,
  .secondary,
  .ghost {
    display: inline-block;
    border-radius: 6px;
    padding: 0.45rem 0.75rem;
    font-size: 0.85rem;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--bg-muted);
    color: inherit;
  }

  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  pre {
    margin: 0.5rem 0;
    padding: 0.65rem 0.75rem;
    border-radius: 6px;
    background: var(--bg-muted);
    font-size: 0.78rem;
    overflow-x: auto;
  }

  .footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .ghost {
    border: none;
    background: transparent;
    color: var(--accent);
    text-decoration: underline;
    padding-left: 0;
  }

  code {
    font-size: 0.85em;
  }
</style>
