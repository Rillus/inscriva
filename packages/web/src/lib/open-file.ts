/** Clears a debounced save scheduled before switching files. */
export function cancelPendingFileSave(
  timer: ReturnType<typeof setTimeout> | undefined,
): void {
  if (timer !== undefined) {
    clearTimeout(timer);
  }
}
