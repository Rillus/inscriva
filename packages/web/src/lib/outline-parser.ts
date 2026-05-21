export interface ChapterFocus {
  storyQuestion?: string;
  turn?: string;
  scenes: string[];
  mustInclude: string[];
  notList: string[];
  wordTarget?: string;
  continuity: string[];
  status?: string;
}

export function parseChapterFocus(markdown: string): ChapterFocus {
  const focus: ChapterFocus = {
    scenes: [],
    mustInclude: [],
    notList: [],
    continuity: [],
  };

  const lines = markdown.split("\n");
  let section: string | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/i);
    if (heading) {
      section = heading[1]!.toLowerCase();
      continue;
    }

    if (!section || !line.trim()) continue;

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const value = bullet ? bullet[1]!.trim() : line.trim();

    switch (section) {
      case "story question":
        focus.storyQuestion = value;
        section = null;
        break;
      case "turn":
        focus.turn = value;
        section = null;
        break;
      case "scenes":
        if (bullet) focus.scenes.push(value);
        break;
      case "must include":
        if (bullet) focus.mustInclude.push(value);
        break;
      case "not":
        if (bullet) focus.notList.push(value);
        break;
      case "word target":
        focus.wordTarget = value;
        section = null;
        break;
      case "continuity":
        if (bullet) focus.continuity.push(value);
        break;
    }
  }

  const fmStatus = markdown.match(/^status:\s*(.+)$/m);
  if (fmStatus) focus.status = fmStatus[1]!.trim();

  return focus;
}
