<script lang="ts">
  import type { SceneCard } from "@inscriva/indexer";

  interface Props {
    scenes: SceneCard[];
    matchedLabels: string[];
    onJump?: (label: string) => void;
  }

  let { scenes, matchedLabels, onJump }: Props = $props();

  const matchedSet = $derived(new Set(matchedLabels));

  function sceneLabel(scene: SceneCard): string {
    return `Scene ${scene.number} — ${scene.title}`;
  }
</script>

{#if scenes.length}
  <nav class="scene-nav" aria-label="Scenes">
    <p class="eyebrow">Scenes</p>
    <ol>
      {#each scenes as scene (scene.number)}
        {@const label = sceneLabel(scene)}
        <li>
          <button
            type="button"
            class:missing={!matchedSet.has(label)}
            onclick={() => onJump?.(label)}
          >
            {label}
          </button>
        </li>
      {/each}
    </ol>
  </nav>
{/if}

<style>
  .scene-nav {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text);
    font-size: 0.78rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  button {
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    border-radius: 4px;
    padding: 0.2rem 0.45rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--text);
  }

  button.missing {
    color: var(--text-muted);
    border-style: dashed;
  }
</style>
