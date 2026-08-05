export function isShareMode(search: string): boolean {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  return params.get("share") === "1" || params.get("readOnly") === "1";
}

export function shareModeSearch(): string {
  return "?share=1";
}

export function withShareMode(search: string): string {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  params.set("share", "1");
  const built = params.toString();
  return built ? `?${built}` : shareModeSearch();
}
