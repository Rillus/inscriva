export interface TreeNode {
  name: string;
  path?: string;
  kind: "folder" | "file";
  children?: TreeNode[];
}

export function buildBookTree(paths: string[]): TreeNode {
  const mdPaths = paths.filter(
    (p) =>
      p.endsWith(".md") &&
      !p.startsWith(".inscriva/") &&
      !p.startsWith(".inscriva\\"),
  );

  const root: TreeNode = { name: ".", kind: "folder", children: [] };

  for (const filePath of mdPaths.sort()) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isFile = i === parts.length - 1;

      if (!current.children) current.children = [];

      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = {
          name: part,
          kind: isFile ? "file" : "folder",
          path: isFile ? filePath : undefined,
          children: isFile ? undefined : [],
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  return sortTree(root);
}

function sortTree(node: TreeNode): TreeNode {
  if (!node.children) return node;
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    if (child.kind === "folder") sortTree(child);
  }
  return node;
}
