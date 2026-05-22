<script lang="ts">
  import { fileDirectory, type TreeNode } from "@inscriva/indexer";
  import FileCreateField from "./FileCreateField.svelte";
  import FileRenameField from "./FileRenameField.svelte";

  interface Props {
    tree: TreeNode;
    activePath?: string;
    defaultCreateDir?: string;
    onSelect: (path: string) => void;
    onRename: (from: string, newBase: string) => void;
    onCreate: (dir: string, base: string) => void;
    onMove: (from: string, toDir: string) => void;
  }

  let {
    tree,
    activePath,
    defaultCreateDir = "",
    onSelect,
    onRename,
    onCreate,
    onMove,
  }: Props = $props();

  let contextMenu = $state<
    | { kind: "file"; path: string; x: number; y: number }
    | { kind: "folder"; dir: string; x: number; y: number }
    | null
  >(null);
  let renamingPath = $state<string | null>(null);
  let creatingInDir = $state<string | null>(null);
  let draggingPath = $state<string | null>(null);
  let dropTargetDir = $state<string | null>(null);
  let skipNextClick = $state(false);

  function openFileContextMenu(e: MouseEvent, filePath: string) {
    e.preventDefault();
    contextMenu = { kind: "file", path: filePath, x: e.clientX, y: e.clientY };
  }

  function openFolderContextMenu(e: MouseEvent, dir: string) {
    e.preventDefault();
    contextMenu = { kind: "folder", dir, x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenu = null;
  }

  function startRenameFromMenu() {
    if (contextMenu?.kind !== "file") return;
    renamingPath = contextMenu.path;
    closeContextMenu();
  }

  function startCreateFromMenu() {
    if (contextMenu?.kind !== "folder") return;
    creatingInDir = contextMenu.dir;
    closeContextMenu();
  }

  function startCreate(dir?: string) {
    creatingInDir = dir ?? defaultCreateDir;
    renamingPath = null;
  }

  function handleRenameSave(filePath: string, newBase: string) {
    renamingPath = null;
    onRename(filePath, newBase);
  }

  function handleCreateSave(base: string) {
    if (creatingInDir === null) return;
    const dir = creatingInDir;
    creatingInDir = null;
    onCreate(dir, base);
  }

  function cancelCreate() {
    creatingInDir = null;
  }

  function onFileDragStart(e: DragEvent, path: string) {
    if (renamingPath) return;
    draggingPath = path;
    skipNextClick = false;
    e.dataTransfer?.setData("text/plain", path);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  }

  function onFileDragEnd() {
    draggingPath = null;
    dropTargetDir = null;
  }

  function canDropOnFolder(dir: string): boolean {
    if (!draggingPath) return false;
    return fileDirectory(draggingPath) !== dir;
  }

  function onFolderDragOver(e: DragEvent, dir: string) {
    if (!canDropOnFolder(dir)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    dropTargetDir = dir;
  }

  function onFolderDrop(e: DragEvent, dir: string) {
    e.preventDefault();
    const from = e.dataTransfer?.getData("text/plain") || draggingPath;
    draggingPath = null;
    dropTargetDir = null;
    if (!from || fileDirectory(from) === dir) return;
    skipNextClick = true;
    onMove(from, dir);
  }

  function selectFile(path: string) {
    if (skipNextClick) {
      skipNextClick = false;
      return;
    }
    onSelect(path);
  }
</script>

<svelte:window onclick={closeContextMenu} />

<nav
  class="file-tree"
  class:is-dragging={Boolean(draggingPath)}
  aria-label="Book files"
>
  <div class="file-tree-toolbar">
    <button type="button" class="new-file" onclick={() => startCreate()}>
      New file
    </button>
  </div>

  {#if creatingInDir !== null}
    <FileCreateField
      directory={creatingInDir}
      onSave={handleCreateSave}
      onCancel={cancelCreate}
    />
  {/if}

  <ul
    class="tree-root"
    class:drop-target={dropTargetDir === "" && canDropOnFolder("")}
    ondragover={(e) => onFolderDragOver(e, "")}
    ondrop={(e) => onFolderDrop(e, "")}
  >
    {#each tree.children ?? [] as child}
      <li>{@render nodeItem(child, "")}</li>
    {/each}
  </ul>
</nav>

{#snippet nodeItem(n: TreeNode, parentPath: string)}
  {#if n.kind === "folder"}
    {@const folderPath = parentPath ? `${parentPath}/${n.name}` : n.name}
    <details open class="folder">
      <summary
        class:drop-target={dropTargetDir === folderPath && canDropOnFolder(folderPath)}
        oncontextmenu={(e) => openFolderContextMenu(e, folderPath)}
        ondragover={(e) => onFolderDragOver(e, folderPath)}
        ondrop={(e) => onFolderDrop(e, folderPath)}
      >
        {n.name}
      </summary>
      {#if n.children}
        <ul>
          {#each n.children as child}
            <li>
              {@render nodeItem(child, folderPath)}
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
        class:dragging={draggingPath === n.path}
        draggable={renamingPath !== n.path}
        onclick={() => selectFile(n.path!)}
        oncontextmenu={(e) => openFileContextMenu(e, n.path!)}
        ondragstart={(e) => onFileDragStart(e, n.path!)}
        ondragend={onFileDragEnd}
      >
        {n.name}
      </button>
    {/if}
  </div>
  {/if}
{/snippet}

{#if contextMenu}
  <div
    class="context-menu"
    role="menu"
    tabindex="-1"
    style:left="{contextMenu.x}px"
    style:top="{contextMenu.y}px"
    onmousedown={(e) => e.stopPropagation()}
  >
    {#if contextMenu.kind === "folder"}
      <button type="button" role="menuitem" onclick={startCreateFromMenu}>
        New file here
      </button>
    {:else}
      <button type="button" role="menuitem" onclick={startRenameFromMenu}>Rename</button>
    {/if}
  </div>
{/if}

<style>
  .file-tree {
    padding: 0.5rem 0;
    font-size: 0.85rem;
  }

  .file-tree.is-dragging .file:not(.dragging) {
    opacity: 0.65;
  }

  .file-tree-toolbar {
    padding: 0 0.5rem 0.35rem;
  }

  .new-file {
    width: 100%;
    border: 1px dashed var(--border);
    background: transparent;
    padding: 0.35rem 0.5rem;
    border-radius: 4px;
    font-size: 0.82rem;
    color: var(--text);
    cursor: pointer;
  }

  .new-file:hover {
    background: var(--bg-muted);
    border-style: solid;
  }

  .file-tree ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tree-root.drop-target {
    outline: 2px dashed var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }

  .folder summary {
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    color: var(--text-muted);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-radius: 4px;
  }

  .folder summary.drop-target {
    background: var(--accent-soft);
    color: var(--accent);
    outline: 2px dashed var(--accent);
    outline-offset: 1px;
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
    cursor: grab;
  }

  .file:active {
    cursor: grabbing;
  }

  .file.dragging {
    opacity: 0.45;
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
