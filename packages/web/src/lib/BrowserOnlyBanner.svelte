<script lang="ts">
  import { macosDownloadHref } from "./download-links.js";

  interface Props {
    onDownload?: () => void;
    onDemo?: () => void;
  }

  let { onDownload, onDemo }: Props = $props();

  const macosHref = macosDownloadHref();
</script>

<div class="browser-banner" role="status">
  <p class="title">Write in the app — this site is a demo</p>
  <p class="body">
    Opening folders, Git clone, and saving to your book repo need the
    <strong>macOS app</strong> or a <strong>local dev bridge</strong>.
    Use the demo to explore the UI here.
  </p>
  <div class="actions">
    {#if onDownload}
      <button type="button" class="primary" onclick={() => onDownload?.()}>
        Download &amp; setup
      </button>
    {:else}
      <a class="primary" href="/download">Download &amp; setup</a>
    {/if}
    <a class="secondary" href={macosHref} target="_blank" rel="noreferrer">
      macOS release
    </a>
    {#if onDemo}
      <button type="button" class="ghost" onclick={() => onDemo?.()}>Try demo</button>
    {/if}
  </div>
</div>

<style>
  .browser-banner {
    margin: 0 0 1.25rem;
    padding: 0.85rem 1rem;
    border-radius: 8px;
    border: 1px solid #f59e0b;
    background: #fffbeb;
    color: #78350f;
  }

  .title {
    margin: 0 0 0.35rem;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .body {
    margin: 0 0 0.65rem;
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .primary,
  .secondary,
  .ghost {
    border-radius: 6px;
    padding: 0.4rem 0.65rem;
    font-size: 0.78rem;
    text-decoration: none;
    cursor: pointer;
  }

  .primary {
    border: 1px solid #b45309;
    background: #b45309;
    color: #fff;
  }

  .secondary {
    border: 1px solid #d97706;
    background: transparent;
    color: #92400e;
  }

  .ghost {
    border: 1px solid transparent;
    background: transparent;
    color: #92400e;
    text-decoration: underline;
  }
</style>
