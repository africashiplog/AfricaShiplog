import { describe, it, expect } from "vitest";
import { diffSnapshots } from "./revisions";

describe("diffSnapshots", () => {
  it("reports only changed fields and ignores bookkeeping columns", () => {
    const d = diffSnapshots(
      { a: 1, b: "x", updatedAt: "t1", searchText: "s" },
      { a: 1, b: "y", updatedAt: "t2", searchText: "z" }
    );
    expect(d).toEqual({ b: { from: "x", to: "y" } });
  });
  it("treats missing and null as equal", () => {
    expect(diffSnapshots({ a: null }, {})).toEqual({});
  });
});
