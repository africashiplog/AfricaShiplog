import { describe, it, expect } from "vitest";
import { parseCsv, toCsv, rowsToObjects } from "./csv";

describe("csv", () => {
  it("round-trips Arabic text with commas, quotes and newlines", () => {
    const csv = toCsv(["a", "b"], [{ a: 'مدفن "الأول"، الشرقي', b: "سطر\nثانٍ" }]);
    const parsed = rowsToObjects(parseCsv(csv));
    expect(parsed).toEqual([{ a: 'مدفن "الأول"، الشرقي', b: "سطر\nثانٍ" }]);
  });
  it("detects semicolon-delimited files (Excel in some locales)", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("neutralizes formula injection on export", () => {
    expect(toCsv(["a"], [{ a: "=HYPERLINK(1)" }])).toContain("'=HYPERLINK");
  });
});
