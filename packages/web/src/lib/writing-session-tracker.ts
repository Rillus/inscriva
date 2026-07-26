/** Tracks active writing time and word deltas for the current draft session. */

export const DEFAULT_IDLE_MS = 120_000;

export interface WritingSessionTrackerState {
  chapterKey: string;
  draftPath: string;
  wordsAtStart: number;
  wordsAtEnd: number;
  targetWords?: number;
  startedAt: number;
  activeSeconds: number;
  lastActiveAt: number;
  paused: boolean;
}

export function createWritingSessionTracker(idleMs = DEFAULT_IDLE_MS) {
  let state: WritingSessionTrackerState | null = null;

  return {
    get state() {
      return state;
    },
    start(input: {
      chapterKey: string;
      draftPath: string;
      wordsAtStart: number;
      targetWords?: number;
    }) {
      const now = Date.now();
      state = {
        ...input,
        wordsAtEnd: input.wordsAtStart,
        startedAt: now,
        lastActiveAt: now,
        activeSeconds: 0,
        paused: false,
      };
    },
    onEdit(draftWords: number) {
      if (!state) return;
      const now = Date.now();
      state.lastActiveAt = now;
      state.paused = false;
      state.wordsAtEnd = draftWords;
    },
    tick(now = Date.now()) {
      if (!state || state.paused) return;
      if (now - state.lastActiveAt > idleMs) {
        state.paused = true;
        return;
      }
      const delta = Math.floor((now - state.lastActiveAt) / 1000);
      if (delta > 0) {
        state.activeSeconds += delta;
        state.lastActiveAt = now;
      }
    },
    wordsAdded() {
      if (!state) return 0;
      return Math.max(0, state.wordsAtEnd - state.wordsAtStart);
    },
    end() {
      const ended = state;
      state = null;
      return ended;
    },
  };
}

export function formatSessionClock(activeSeconds: number, paused: boolean): string {
  const h = Math.floor(activeSeconds / 3600);
  const m = Math.floor((activeSeconds % 3600) / 60);
  const s = activeSeconds % 60;
  const core =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  return paused ? `${core} (paused)` : core;
}
