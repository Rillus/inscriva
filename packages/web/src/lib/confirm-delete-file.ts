export function confirmDeleteFileMessage(filePath: string): string {
  const name = filePath.split("/").pop() ?? filePath;
  return `Delete “${name}”?\n\nThis removes the file from your book folder. You cannot undo this from Inscriva (recover via Git if the book is versioned).`;
}

export function confirmDeleteFile(filePath: string): boolean {
  return window.confirm(confirmDeleteFileMessage(filePath));
}
