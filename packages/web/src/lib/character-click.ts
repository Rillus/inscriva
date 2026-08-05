import { EditorView } from "@codemirror/view";
import type { CastIndex } from "@inscriva/indexer";

function findWordAt(
  text: string,
  offset: number,
): { word: string; start: number; end: number } | null {
  const re = /[A-Za-z][A-Za-z'-]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return { word: match[0], start, end };
    }
  }
  return null;
}

export function characterClickExtension(
  index: CastIndex | null,
  onCharacterClick: (name: string) => void,
) {
  return EditorView.domEventHandlers({
    click(event, view) {
      if (!index) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null) return false;

      const line = view.state.doc.lineAt(pos);
      const wordMatch = findWordAt(line.text, pos - line.from);
      if (!wordMatch) return false;

      const character = index.lookup(wordMatch.word);
      if (!character) return false;

      onCharacterClick(character.name);
      return true;
    },
  });
}
