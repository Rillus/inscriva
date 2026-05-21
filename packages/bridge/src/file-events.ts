import type { FileEvent } from "./types.js";

export function parseBookFilePayload(payload: unknown): FileEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const path = record.path;
  const kind = record.kind;
  if (typeof path !== "string" || typeof kind !== "string") return null;
  if (kind !== "created" && kind !== "modified" && kind !== "deleted") {
    return null;
  }
  return { path, kind };
}
