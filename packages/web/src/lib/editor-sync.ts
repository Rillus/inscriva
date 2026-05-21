/** Whether CodeMirror should replace its document from an external content prop. */
export function shouldReplaceEditorDocument(
  currentDoc: string,
  incomingContent: string,
): boolean {
  return currentDoc !== incomingContent;
}
