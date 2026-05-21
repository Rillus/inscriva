export type ResponseLengthId = "short" | "medium" | "long";

export const RESPONSE_LENGTH_PRESETS: {
  id: ResponseLengthId;
  label: string;
  maxOutputTokens: number;
}[] = [
  { id: "short", label: "Short (~150 words)", maxOutputTokens: 384 },
  { id: "medium", label: "Medium (~400 words)", maxOutputTokens: 1024 },
  { id: "long", label: "Long (~800 words)", maxOutputTokens: 2048 },
];

const STORAGE_KEY = "inscriva.llm.responseLength";

export function loadResponseLengthId(): ResponseLengthId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "short" || raw === "medium" || raw === "long") return raw;
  } catch {
    /* ignore */
  }
  return "medium";
}

export function saveResponseLengthId(id: ResponseLengthId): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function maxOutputTokensForLength(id: ResponseLengthId): number {
  return (
    RESPONSE_LENGTH_PRESETS.find((p) => p.id === id)?.maxOutputTokens ?? 1024
  );
}
