import { describe, it, expect } from "vitest";
import { validateLocationInput } from "./location-rules";

const base = {
  latitude: null as number | null,
  longitude: null as number | null,
  precision: "UNKNOWN" as const,
  radiusMeters: null as number | null,
  method: null,
  sourceNote: null as string | null,
  verification: "UNVERIFIED" as const,
};

describe("validateLocationInput", () => {
  it("accepts a location with no coordinates at all (awaiting field work)", () => {
    expect(validateLocationInput(base)).toEqual({});
  });
  it("requires both coordinates together", () => {
    expect(validateLocationInput({ ...base, latitude: 17 })).toHaveProperty("latitude");
  });
  it("requires a precision and a method when coordinates are entered", () => {
    const e = validateLocationInput({ ...base, latitude: 17, longitude: -15 });
    expect(e).toHaveProperty("precision");
    expect(e).toHaveProperty("method");
  });
  it("requires an uncertainty radius for approximate coordinates", () => {
    const e = validateLocationInput({ ...base, latitude: 17, longitude: -15, precision: "APPROXIMATE", method: "ESTIMATE" });
    expect(e).toHaveProperty("radiusMeters");
  });
  it("refuses a confirmed exact location without the source of the fix", () => {
    const e = validateLocationInput({ ...base, latitude: 17, longitude: -15, precision: "EXACT", method: "FIELD_GPS", verification: "DOCUMENTED" });
    expect(e).toHaveProperty("sourceNote");
  });
});
