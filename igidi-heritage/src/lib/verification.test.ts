import { describe, it, expect } from "vitest";
import { fieldStatus, linkStatus, isLocationConfirmed } from "./verification";

const book = (id: string, field = "death") => ({ field, sourceId: id, source: { type: "BOOK" as const } });
const oral = (id: string, field = "death") => ({ field, sourceId: id, source: { type: "ORAL_INTERVIEW" as const } });

describe("fieldStatus", () => {
  it("is UNVERIFIED when no citation supports the field", () => {
    expect(fieldStatus("death", [book("s1", "birth")], {})).toBe("UNVERIFIED");
  });
  it("is DOCUMENTED with one written source", () => {
    expect(fieldStatus("death", [book("s1")], {})).toBe("DOCUMENTED");
  });
  it("is MULTI_SOURCE with two distinct sources", () => {
    expect(fieldStatus("death", [book("s1"), book("s2")], {})).toBe("MULTI_SOURCE");
  });
  it("two pages of the same source are still one source", () => {
    expect(fieldStatus("death", [book("s1"), book("s1")], {})).toBe("DOCUMENTED");
  });
  it("is ORAL when only oral sources support it", () => {
    expect(fieldStatus("death", [oral("o1")], {})).toBe("ORAL");
  });
  it("respects an explicit editor override (e.g. DISPUTED)", () => {
    expect(fieldStatus("death", [book("s1"), book("s2")], { death: "DISPUTED" })).toBe("DISPUTED");
  });
  it("ignores invalid override values", () => {
    expect(fieldStatus("death", [], { death: "TRUE" })).toBe("UNVERIFIED");
  });
});

describe("linkStatus", () => {
  it("keeps an explicit status", () => {
    expect(linkStatus("DISPUTED", [book("s1")])).toBe("DISPUTED");
  });
  it("derives from citations when unverified", () => {
    expect(linkStatus("UNVERIFIED", [book("s1")])).toBe("DOCUMENTED");
    expect(linkStatus("UNVERIFIED", [])).toBe("UNVERIFIED");
  });
});

describe("isLocationConfirmed", () => {
  it("never confirms approximate or unverified coordinates", () => {
    expect(isLocationConfirmed({ latitude: 1, precision: "APPROXIMATE", verification: "DOCUMENTED" })).toBe(false);
    expect(isLocationConfirmed({ latitude: 1, precision: "EXACT", verification: "UNVERIFIED" })).toBe(false);
    expect(isLocationConfirmed({ latitude: null, precision: "EXACT", verification: "DOCUMENTED" })).toBe(false);
  });
  it("confirms exact + documented coordinates", () => {
    expect(isLocationConfirmed({ latitude: 1, precision: "EXACT", verification: "MULTI_SOURCE" })).toBe(true);
  });
});
