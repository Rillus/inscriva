<script lang="ts">
  interface Props {
    title: string;
    detail?: string;
  }

  let { title, detail }: Props = $props();
</script>

<div class="app-load-overlay" role="status" aria-live="polite" aria-busy="true">
  <div class="app-load-card">
    <p class="app-load-title">{title}</p>
    {#if detail}
      <p class="app-load-detail">{detail}</p>
    {/if}
    <div class="app-load-progress" aria-hidden="true"></div>
  </div>
</div>

<style>
  .app-load-overlay {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--room-mahogany, #2a1810) 72%, transparent);
    backdrop-filter: blur(2px);
  }

  .app-load-card {
    min-width: min(22rem, 90vw);
    max-width: 28rem;
    padding: 1.35rem 1.5rem 1.2rem;
    border-radius: 10px;
    border: 1px solid var(--border, #c4b5a3);
    background: var(--surface-paper, #faf6ee);
    box-shadow:
      0 10px 28px rgba(42, 24, 16, 0.28),
      var(--shadow-panel-inset, inset 0 1px 0 rgba(255, 255, 255, 0.45));
    text-align: center;
  }

  .app-load-title {
    margin: 0;
    font-family: var(--font-display, var(--font-ui));
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text, #1a1510);
  }

  .app-load-detail {
    margin: 0.55rem 0 0;
    font-family: var(--font-ui);
    font-size: 0.86rem;
    line-height: 1.45;
    color: var(--text-muted, #5c5348);
  }

  .app-load-progress {
    margin: 1rem auto 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--accent, #6b3d26) 18%, transparent);
    border-top-color: var(--accent, #6b3d26);
    animation: app-load-spin 0.85s linear infinite;
  }

  @keyframes app-load-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
