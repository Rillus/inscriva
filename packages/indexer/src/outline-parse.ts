export interface SceneCard {
  number: number;
  title: string;
  goal?: string;
  conflict?: string;
  outcome?: string;
  mustInclude: string[];
  mustNot: string[];
}

export interface ChapterFocus {
  storyQuestion?: string;
  turn?: string;
  turnByChapterEnd?: string;
  scenes: { title: string; label: string }[];
  sceneCards: SceneCard[];
  mustInclude: string[];
  notList: string[];
  wordTarget?: string;
  continuity: string[];
  status?: string;
}

const SCENE_HEADING_RE = /^##\s+Scene\s+(\d+)\s*[—–-]\s*(.+)$/i;
const SCENE_FIELD_RE =
  /^\*\*(Goal|Conflict|Outcome|Must include|Must NOT):\*\*\s*(.*)$/i;

export function parseChapterFocus(markdown: string): ChapterFocus {
  const focus: ChapterFocus = {
    scenes: [],
    sceneCards: [],
    mustInclude: [],
    notList: [],
    continuity: [],
  };

  const lines = markdown.split("\n");
  let section: string | null = null;
  let currentScene: SceneCard | null = null;

  function flushScene() {
    if (!currentScene) return;
    focus.sceneCards.push(currentScene);
    focus.scenes.push({
      title: currentScene.title,
      label: `Scene ${currentScene.number} — ${currentScene.title}`,
    });
    currentScene = null;
  }

  for (const line of lines) {
    const sceneHeading = line.match(SCENE_HEADING_RE);
    if (sceneHeading) {
      flushScene();
      currentScene = {
        number: Number(sceneHeading[1]),
        title: sceneHeading[2]!.trim(),
        mustInclude: [],
        mustNot: [],
      };
      section = "scene-card";
      continue;
    }

    const heading = line.match(/^##\s+(.+)$/i);
    if (heading) {
      flushScene();
      section = heading[1]!.toLowerCase();
      continue;
    }

    if (section === "scene-card" && currentScene) {
      const field = line.match(SCENE_FIELD_RE);
      if (field) {
        const key = field[1]!.toLowerCase();
        const value = field[2]!.trim();
        switch (key) {
          case "goal":
            currentScene.goal = value;
            break;
          case "conflict":
            currentScene.conflict = value;
            break;
          case "outcome":
            currentScene.outcome = value;
            break;
          case "must include":
            currentScene.mustInclude.push(value);
            break;
          case "must not":
            currentScene.mustNot.push(value);
            break;
        }
      }
      continue;
    }

    if (!section || !line.trim()) continue;

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    const value = bullet ? bullet[1]!.trim() : numbered ? numbered[1]!.trim() : line.trim();

    switch (section) {
      case "story question":
        focus.storyQuestion = value;
        section = null;
        break;
      case "turn":
        focus.turn = value;
        section = null;
        break;
      case "turn by chapter end":
        focus.turnByChapterEnd = value;
        section = null;
        break;
      case "scenes":
        if (bullet || numbered) {
          focus.scenes.push({ title: value, label: value });
        }
        break;
      case "status":
        focus.status = value;
        section = null;
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

  flushScene();

  const fmStatus = markdown.match(/^status:\s*(.+)$/m);
  if (fmStatus) focus.status = fmStatus[1]!.trim();

  return focus;
}

/** Extract `ChNN` from outline H1, e.g. `# Ch01: Title`. */
export function extractChapterKeyFromOutlineH1(markdown: string): string | null {
  const m = markdown.match(/^#\s+(Ch\d+)\b/i);
  return m ? normaliseChapterKey(m[1]!) : null;
}

export function normaliseChapterKey(raw: string): string {
  const m = raw.match(/ch(\d+)/i);
  if (!m) return raw;
  const num = Number(m[1]);
  return Number.isFinite(num) ? `Ch${String(num).padStart(2, "0")}` : raw;
}
