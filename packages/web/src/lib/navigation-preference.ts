export type NavigationView = "chapter" | "files" | "board";

const KEY = "inscriva.navigation.default";

export function loadNavigationView(): NavigationView {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "files" || v === "chapter" || v === "board") return v;
  } catch {
    /* ignore */
  }
  return "chapter";
}

export function saveNavigationView(view: NavigationView): void {
  localStorage.setItem(KEY, view);
}
