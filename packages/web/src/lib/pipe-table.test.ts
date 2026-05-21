import { describe, expect, it } from "vitest";
import { parsePipeTable, serializePipeTable } from "./pipe-table.js";

const sample = `| Name | Qty |
| :--- | --: |
| Tea | 2 |
| Milk | 1 |
`;

describe("parsePipeTable", () => {
  it("parses header, alignment, and body rows", () => {
    const t = parsePipeTable(sample);
    expect(t).not.toBeNull();
    expect(t!.header).toEqual(["Name", "Qty"]);
    expect(t!.aligns).toEqual(["left", "right"]);
    expect(t!.rows).toEqual([
      ["Tea", "2"],
      ["Milk", "1"],
    ]);
  });

  it("returns null for non-table text", () => {
    expect(parsePipeTable("just prose")).toBeNull();
  });
});

describe("serializePipeTable", () => {
  it("round-trips with parsePipeTable", () => {
    const t = parsePipeTable(sample)!;
    const out = serializePipeTable(t);
    const again = parsePipeTable(out);
    expect(again).not.toBeNull();
    expect(again!.header).toEqual(t.header);
    expect(again!.rows).toEqual(t.rows);
    expect(again!.aligns).toEqual(t.aligns);
  });
});
