export type WritingMode = "native" | "dev-bridge" | "static-web";

const DEV_BRIDGE_URL =
  import.meta.env.VITE_BRIDGE_URL ?? "http://127.0.0.1:3847";

function isTauriShell(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function detectWritingMode(
  devBridgeUrl: string = DEV_BRIDGE_URL,
): Promise<WritingMode> {
  if (isTauriShell()) return "native";

  try {
    const res = await fetch(`${devBridgeUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(800),
    });
    if (res.ok) return "dev-bridge";
  } catch {
    /* dev bridge offline or blocked */
  }

  return "static-web";
}

export function requiresLocalApp(mode: WritingMode): boolean {
  return mode === "static-web";
}

export function writingModeLabel(mode: WritingMode): string {
  switch (mode) {
    case "native":
      return "Desktop app";
    case "dev-bridge":
      return "Local dev bridge";
    case "static-web":
      return "Web demo";
  }
}
