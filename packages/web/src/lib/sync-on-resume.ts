export interface SyncOnResumeOptions {
  cooldownMs?: number;
  now?: () => number;
  getVisibility?: () => DocumentVisibilityState;
}

export function shouldSyncOnResume(
  visibilityState: DocumentVisibilityState,
  lastSyncAt: number | null,
  options?: SyncOnResumeOptions,
): boolean {
  const cooldownMs = options?.cooldownMs ?? 30_000;
  const now = options?.now?.() ?? Date.now();
  if (visibilityState !== "visible") return false;
  if (lastSyncAt === null) return true;
  return now - lastSyncAt >= cooldownMs;
}

export function bindSyncOnResume(
  handler: () => void | Promise<void>,
  options?: SyncOnResumeOptions,
): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }

  let lastSyncAt: number | null = null;
  const getVisibility =
    options?.getVisibility ?? (() => document.visibilityState);
  const now = options?.now ?? (() => Date.now());

  const maybeSync = () => {
    if (!shouldSyncOnResume(getVisibility(), lastSyncAt, { ...options, now })) {
      return;
    }
    lastSyncAt = now();
    void handler();
  };

  const onVisibility = () => {
    if (getVisibility() === "visible") maybeSync();
  };

  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) maybeSync();
  };

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
  };
}
