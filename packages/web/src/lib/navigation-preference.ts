export type NavigationView = "chapter" | "files";

const KEY = "inscriva.navigation.default";

export function loadNavigationView(): NavigationView {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "files" || v === "chapter") return v;
  } catch {
    /* ignore */
  }
  return "chapter";
}

export function saveNavigationView(view: NavigationView): void {
  localStorage.setItem(KEY, view);
}
