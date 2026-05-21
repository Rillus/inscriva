<script lang="ts">
  import type { TreeNode } from "@inscriva/indexer";
  import FileRenameField from "./FileRenameField.svelte";

  interface Props {
    tree: TreeNode;
    activePath?: string;
    onSelect: (path: string) => void;
    onRename: (from: string, newBase: string) => void;
  }

  let { tree, activePath, onSelect, onRename }: Props = $props();

  let contextMenu = $state<{ path: string; x: number; y: number } | null>(null);
  let renamingPath = $state<string | null>(null);

  function openContextMenu(e: MouseEvent, filePath: string) {
    e.preventDefault();
    contextMenu = { path: filePath, x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function startRenameFromMenu() {
    if (!contextMenu) return;
    renamingPath = contextMenu.path;
    closeContextMenu();
  }

  function handleRenameSave(filePath: string, newBase: string) {
    renamingPath = null;
    onRename(filePath, newBase);
  }
</script>

<svelte:window onclick={closeContextMenu} />

{#snippet nodeItem(n: TreeNode)}
  {#if n.kind === "folder"}
    <details open class="folder">
      <summary>{n.name}</summary>
      {#if n.children}
        <ul>
          {#each n.children as child}
            <li>
              {@render nodeItem(child)}
            </li>
          {/each}
        </ul>
      {/if}
    </details>
  {:else if n.path}
  <div class="file-row" class:active={n.path === activePath}>
    {#if renamingPath === n.path}
      <FileRenameField
        path={n.path}
        alwaysEditing
        onSave={(base) => handleRenameSave(n.path!, base)}
        onCancel={() => (renamingPath = null)}
      />
    {:else}
      <button
        type="button"
        class="file"
        class:active={n.path === activePath}
        onclick={() => onSelect(n.path!)}
        oncontextmenu={(e) => openContextMenu(e, n.path!)}
      >
        {n.name}
      </button>
    {/if}
  </div>
  {/if}
{/snippet}

<nav class="file-tree" aria-label="Book files">
  <ul>
    {#each tree.children ?? [] as child}
      <li>{@render nodeItem(child)}</li>
    {/each}
  </ul>
</nav>

{#if contextMenu}
  <div
    class="context-menu"
    role="menu"
    tabindex="-1"
    style:left="{contextMenu.x}px"
    style:top="{contextMenu.y}px"
    onmousedown={(e) => e.stopPropagation()}
  >
    <button type="button" role="menuitem" onclick={startRenameFromMenu}>Rename</button>
  </div>
{/if}

<style>
  .file-tree {
    padding: 0.5rem 0;
    font-size: 0.85rem;
  }

  .file-tree ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .folder summary {
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    color: var(--text-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .folder ul {
    padding-left: 0.5rem;
  }

  .file-row {
    padding: 0.1rem 0.25rem;
  }

  .file-row.active {
    background: var(--accent-soft);
    border-radius: 4px;
  }

  .file {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    color: var(--text);
    font-size: 0.85rem;
  }

  .file.active {
    color: var(--accent);
  }

  .file:hover:not(.active) {
    background: var(--bg-muted);
  }

  .context-menu {
    position: fixed;
    z-index: 100;
    margin: 0;
    padding: 0.25rem 0;
    list-style: none;
    min-width: 7rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  .context-menu button {
    display: block;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    padding: 0.35rem 0.75rem;
    font-size: 0.85rem;
    color: var(--text);
    cursor: pointer;
  }

  .context-menu button:hover {
    background: var(--bg-muted);
  }
</style>
