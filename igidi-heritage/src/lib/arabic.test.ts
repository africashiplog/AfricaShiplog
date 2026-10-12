import { describe, it, expect } from "vitest";
import { normalizeArabic, queryTokens, buildSearchText, slugify } from "./arabic";

describe("normalizeArabic", () => {
  it("folds hamza forms of alef, ta marbuta and alef maqsura", () => {
    expect(normalizeArabic("أحمد")).toBe(normalizeArabic("احمد"));
    expect(normalizeArabic("إبراهيم")).toBe(normalizeArabic("ابراهيم"));
    expect(normalizeArabic("مصطفى")).toBe(normalizeArabic("مصطفي"));
    expect(normalizeArabic("فاطمة")).toBe(normalizeArabic("فاطمه"));
  });

  it("strips tashkeel and tatweel", () => {
    expect(normalizeArabic("مُحَمَّدٌ")).toBe("محمد");
    expect(normalizeArabic("مـــحمد")).toBe("محمد");
  });

  it("treats the Hassaniya letter گ like ك (إيگيدي == إيكيدي)", () => {
    expect(normalizeArabic("إيگيدي")).toBe(normalizeArabic("إيكيدي"));
  });

  it("lower-cases and de-accents Latin transliterations", () => {
    expect(normalizeArabic("Iguidi Élevé")).toBe("iguidi eleve");
  });

  it("converts Arabic-Indic digits", () => {
    expect(normalizeArabic("١٣٢٠")).toBe("1320");
  });
});

describe("queryTokens", () => {
  it("drops the definite article from longer tokens", () => {
    expect(queryTokens("المدافن الشمشوية")).toEqual(["مدافن", "شمشويه"]);
  });
});

describe("buildSearchText", () => {
  it("dedupes and skips empty parts", () => {
    expect(buildSearchText(["أحمد", null, "احمد", ""])).toBe("احمد");
  });
});

describe("slugify", () => {
  it("produces a hyphenated slug and never an empty one", () => {
    expect(slugify("مدفن أهل فلان")).toBe("مدفن-اهل-فلان");
    expect(slugify("!!!")).toBe("record");
  });
});
