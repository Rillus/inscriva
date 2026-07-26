<script lang="ts">
  import type { MustIncludeCheck } from "@inscriva/indexer";

  interface Props {
    items: MustIncludeCheck[];
    checked: Record<string, boolean>;
    onToggle: (item: string, checked: boolean) => void;
  }

  let { items, checked, onToggle }: Props = $props();
</script>

{#if items.length}
  <section class="goal-checklist" aria-label="Goal checklist">
    <h3>Must include</h3>
    <ul>
      {#each items as m (m.item)}
        <li>
          <label>
            <input
              type="checkbox"
              checked={checked[m.item] ?? m.status === "hit"}
              onchange={(e) =>
                onToggle(m.item, (e.currentTarget as HTMLInputElement).checked)}
            />
            <span class:hit={m.status === "hit"} class:miss={m.status === "miss"}>
              {m.item}
            </span>
          </label>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .goal-checklist h3 {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  label {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.2rem 0;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .miss {
    color: #b45309;
  }
</style>
